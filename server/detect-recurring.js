import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const CATEGORY_MAP = [
  { keys: ['mortgage', 'loan', 'rent', 'משכנתא', 'שכירות', 'הלוואה'], cat: 'Housing' },
  { keys: ['electric', 'water', 'gas', 'internet', 'phone', 'חשמל', 'מים', 'גז', 'אינטרנט', 'טלפון', 'בזק', 'הוט', 'פרטנר', 'סלקום'], cat: 'Utilities' },
  { keys: ['netflix', 'spotify', 'subscription', 'prime', 'apple', 'google', 'netifly', 'github', 'openai', 'מנוי'], cat: 'Subscriptions' },
  { keys: ['insurance', 'ביטוח', 'הפניקס', 'מגדל', 'כלל', 'הראל'], cat: 'Insurance' },
  { keys: ['arnona', 'ארנונה', 'עיריית'], cat: 'Housing' },
];

function categorize(desc) {
  const d = (desc || '').toLowerCase();
  for (const m of CATEGORY_MAP) {
    if (m.keys.some(k => d.includes(k))) return m.cat;
  }
  return 'General';
}

// נורמליזציה חכמה של שם העסק כדי לאחד מופעים שונים של אותו חיוב
function normalizeMerchantName(rawName) {
  if (!rawName) return 'unknown';
  let name = rawName.toLowerCase();
  // הסרת תאריכים, מספרים רצים, מזהי אסמכתאות וסימנים מיוחדים
  name = name.replace(/\d{2}[\/\-\.]\d{2}[\/\-\.]?\d{2,4}/g, ''); // הסרת תאריכים
  name = name.replace(/[\d#]+/g, ''); // הסרת ספרות
  name = name.replace(/['"„“]/g, ''); // הסרת מרכאות
  name = name.trim().replace(/\s+/g, '_');
  return name || 'unknown';
}

async function main() {
  console.log("🔍 שולף תנועות מ-Supabase לניתוח הוצאות קבועות...");
  const { data: txs, error } = await supabase.from('transactions').select('*');
  if (error) throw error;

  const groups = new Map();
  for (const t of (txs || [])) {
    const rawDesc = t.description || t.desc || t.merchant || '';
    const normKey = normalizeMerchantName(rawDesc);
    if (normKey === 'unknown' || normKey.length < 2) continue;

    if (!groups.has(normKey)) {
      groups.set(normKey, { originalNames: new Set(), items: [] });
    }
    groups.get(normKey).originalNames.add(rawDesc.trim());
    groups.get(normKey).items.push(t);
  }

  const rows = [];

  for (const [normKey, groupData] of groups) {
    const items = groupData.items;
    // נדרשות לפחות 3 הופעות (במקום 2) כדי לסנן מראש עברות חד-פעמיות או צירופי מקריות
    if (items.length < 3) continue;

    // מיון לפי תאריך עולה
    const sortedItems = items.sort((a, b) => {
      const dateA = new Date(a.value_date || a.date || a.booking_date).getTime();
      const dateB = new Date(b.value_date || b.date || b.booking_date).getTime();
      return dateA - dateB;
    });

    const dates = sortedItems.map(t => new Date(t.value_date || t.date || t.booking_date).getTime()).filter(Boolean);
    if (dates.length < 3) continue;

    const gaps = [];
    for (let i = 1; i < dates.length; i++) {
      gaps.push((dates[i] - dates[i - 1]) / (1000 * 60 * 60 * 24));
    }

    const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;
    let frequency = null;

    // מרווח חודשי צריך להיות יציב יחסית (בין 26 ל-34 ימים)
    if (avgGap >= 26 && avgGap <= 34) {
      frequency = 'monthly';
    } else if (avgGap >= 6 && avgGap <= 8) {
      frequency = 'weekly';
    } else {
      continue;
    }

    // בדיקת יציבות סכומים (הוצאה קבועה חייבת להיות עם סכום דומה מאוד)
    const amounts = sortedItems.map(t => Math.abs(Number(t.chargedAmount ?? t.amount ?? t.originalAmount ?? t.original_amount ?? 0))).filter(n => !isNaN(n));
    if (amounts.length < 3) continue;

    const avgAmt = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    const maxAmt = Math.max(...amounts);
    const minAmt = Math.min(...amounts);
    
    // אם יש סטיית תקן גדולה מדי בסכומים (מעל 15% הפרש), זה כנראה לא מנוי קבוע או שכר דירה
    if (maxAmt - minAmt > avgAmt * 0.15 && (maxAmt - minAmt) > 10) {
      continue;
    }

    // בחירת השם הנקי והייצוגי ביותר
    const bestMerchantName = Array.from(groupData.originalNames)[0];
    const lastDateObj = new Date(dates[dates.length - 1]);
    const dayOfMonth = lastDateObj.getDate();

    rows.push({
      id: normKey,
      merchant: bestMerchantName,
      category: categorize(bestMerchantName),
      frequency: frequency,
      estimated_amount: Math.round(avgAmt * 100) / 100,
      day_of_month: dayOfMonth,
      occurrences_count: items.length,
      last_charged: lastDateObj.toISOString().slice(0, 10),
      is_active: true,
      updated_at: new Date().toISOString(),
    });
  }

  if (rows.length > 0) {
    console.log(`✨ נמצאו ${rows.rows?.length || rows.length} הוצאות קבועות תקינות. מעדכן ב-Supabase...`);
    const { error: upErr } = await supabase.from('recurring_expenses').upsert(rows, { onConflict: 'id' });
    if (upErr) throw upErr;
  } else {
    console.log("⚠️ לא נמצאו הוצאות קבועות שעומדות בקריטריונים הנוקשים.");
  }

  console.log('✅ הסתיים בהצלחה!');
}

main().catch(e => { 
  console.error("❌ שגיאה בריצת הסקריפט:", e); 
  process.exit(1); 
});
