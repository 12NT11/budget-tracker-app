import { createClient } from '@supabase/supabase-js';
import Fuse from 'fuse.js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function main() {
  console.log("🔍 שולף נתונים מ-Supabase לניתוח וקיבוץ חכם...");

  // 1. שליפת כל ההוצאות הקבועות שכבר קיימות בבסיס הנתונים (ה"מילון" הדינמי שלך)
  const { data: existingRecurring, error: recError } = await supabase.from('recurring_expenses').select('*');
  if (recError) throw recError;

  // 2. שליפת כל התנועות האחרונות מ-Financy
  const { data: txs, error: txError } = await supabase.from('transactions').select('*');
  if (txError) throw txError;

  // הגדרת Fuse.js לחיפוש חכם על ההוצאות הקבועות הקיימות
  // threshold: 0.3 אומר דמיון גבוה (0 = זהות מוחלטת, 1 = שונה לחלוטין)
  const fuse = new Fuse(existingRecurring || [], {
    keys: ['merchant'],
    threshold: 0.35, 
    includeScore: true
  });

  const groups = new Map();

  for (const t of (txs || [])) {
    const rawDesc = (t.description || t.desc || t.merchantName || '').trim();
    if (!rawDesc) continue;

    // נבדוק האם העсקאה הזו דומה למשהו שכבר קיים בטבלת recurring_expenses
    const searchResults = fuse.search(rawDesc);

    let groupKey = '';
    
    if (searchResults.length > 0 && searchResults[0].score <= 0.35) {
      // נמצאה התאמה חזקה לספק קיים! משייכים אותו אוטומטית לאותה קבוצה
      groupKey = searchResults[0].item.id;
    } else {
      // לא נמצאה התאמה – ניצור מזהה נקי חדש על בסיס התיאור
      let clean = rawDesc.toLowerCase().replace(/\d{2}[\/\-\.]\d{2}[\/\-\.]?\d{2,4}/g, '').replace(/[\d#]+/g, '').trim();
      groupKey = clean ? clean.replace(/\s+/g, '_') : 'unknown';
    }

    if (groupKey === 'unknown') continue;

    if (!groups.has(groupKey)) {
      groups.set(groupKey, { merchantName: rawDesc, items: [] });
    }
    groups.get(groupKey).items.push(t);
  }

  // מכאן והלאה מריצים את לוגיקת המרווחים והסכומים (Frequency & Amount stability) על הקבוצות שנוצרו
  console.log(`✨ נוצרו/עודכנו ${groups.size} קבוצות עסקאות בעזרת Fuse.js.`);
}

main().catch(console.error);
