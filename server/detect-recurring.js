import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

function categorize(desc) {
  const d = (desc || '').toLowerCase();
  if (['mortgage', 'loan', 'rent', 'משכנתא', 'שכירות', 'הלוואה'].some(k => d.includes(k))) return 'Housing';
  if (['electric', 'water', 'gas', 'internet', 'phone', 'חשמל', 'מים', 'גז', 'אינטרנט', 'טלפון', 'בזק', 'הוט', 'פרטנר', 'סלקום', 'גולן', '012'].some(k => d.includes(k))) return 'Utilities';
  if (['netflix', 'spotify', 'subscription', 'prime', 'apple', 'google', 'openai', 'github', 'yes', 'דיסני', 'מנוי'].some(k => d.includes(k))) return 'Subscriptions';
  if (['insurance', 'ביטוח', 'הפניקס', 'מגדל', 'כלל', 'הראל', 'מנורה'].some(k => d.includes(k))) return 'Insurance';
  if (['arnona', 'ארנונה', 'עיריית', 'ועד בית'].some(k => d.includes(k))) return 'Housing';
  return 'General';
}

// ניקוי שם הספק כדי ליצור מפתח אחיד
function normalizeMerchant(raw) {
  if (!raw) return 'unknown';
  let name = raw.toLowerCase();
  name = name.replace(/\d{2}[\/\-\.]\d{2}[\/\-\.]?\d{2,4}/g, ''); // הסרת תאריכים
  name = name.replace(/[\d#]+/g, ''); // הסרת מספרים
  name = name.replace(/['"„“]/g, '');
  name = name.trim().replace(/\s+/g, '_');
  return name.length > 1 ? name : 'unknown';
}

async function main() {
  console.log("🔍 שולף תנועות מ-Supabase לניתוח מחדש...");
  const { data: txs, error } = await supabase.from('transactions').select('*');
  if (error) throw error;

  const groups = new Map();

  for (const t of (txs || [])) {
    const rawDesc = t.description || t.desc || t.merchantName || '';
    const normKey = normalizeMerchant(rawDesc);
    if (normKey === 'unknown') continue;

    if (!groups.has(normKey)) {
      groups.set(normKey, { items: [], originalNames: new Set() });
    }
    groups.get(normKey).items.push(t);
    groups.get(normKey).originalNames.add(rawDesc.trim());
  }

  const rows = [];
  const now = new Date().getTime();
  const ONE_DAY = 1000 * 60 * 60 * 24;

  for (const [normKey, data] of groups) {
    const items = data.items;
    // מאפשרים גם 2 הופעות לפחות (למנויים חדשים או שירותים שחויבו פעמיים)
    if (items.length < 2) continue;

    const sortedItems = items.sort((a, b) => {
      const dateA = new Date(a.valueDate?.value || a.bookingDate?.value || a.date).getTime();
      const dateB = new Date(b.valueDate?.value || b.bookingDate?.value || b.date).getTime();
      return dateA - dateB;
    });

    const dates = sortedItems.map(t => new Date(t.valueDate?.value || t.bookingDate?.value || t.date).getTime()).filter(Boolean);
    if (dates.length < 2) continue;

    const gaps = [];
    for (let i = 1; i < dates.length; i++) {
      gaps.push((dates[i] - dates[i - 1]) / ONE_DAY);
    }

    const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;
    let frequency = null;

    // טווח גמיש יותר למרווחים חודשיים (20 עד 45 ימים) ושבועיים (5 עד 12 ימים)
    if (avgGap >= 20 && avgGap <= 45) {
      frequency = 'monthly';
    } else if (avgGap >= 5 && avgGap <= 12) {
      frequency = 'weekly';
    } else {
      continue;
    }

    // בדיקה שהתשלום האחרון בוצע לאחרונה (פעיל בחודשיים האחרונים)
    const lastDate = dates[dates.length - 1];
    const daysSinceLastCharge = (now - lastDate) / ONE_DAY;
    const maxDaysAllowed = frequency === 'monthly' ? 60 : 14;
    if (daysSinceLastCharge > maxDaysAllowed) continue;

    const amounts = sortedItems.map(t => Math.abs(Number(t.chargedAmount ?? t.originalAmount ?? 0))).filter(n => !isNaN(n) && n > 0);
    if (amounts.length === 0) continue;

    const avgAmt = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    const maxAmt = Math.max(...amounts);
    const minAmt = Math.min(...amounts);

    // מתן גמישות בסכומים (במיוחד לחשבונות משתנים כמו חשמל/מים/ארנונה)
    const bestMerchantName = Array.from(data.originalNames)[0];
    const category = categorize(bestMerchantName);
    const isFlexible = ['Utilities', 'Housing'].includes(category);
    const allowedDiff = isFlexible ? Math.max(avgAmt * 0.6, 300) : Math.max(avgAmt * 0.25, 40);

    if (maxAmt - minAmt > allowedDiff && items.length > 2) continue;

    const lastDateObj = new Date(lastDate);
    
    // יצירת מזהה ייחודי בטוח לחלוטין שמורכב מהשם המנורמל + Hash קצר של הסכום/קבוצה כדי למנוע דריסות
    const uniqueId = `${normKey}_${crypto.createHash('md5').update(bestMerchantName).digest('hex').slice(0, 6)}`;

    rows.push({
      id: uniqueId,
      merchant: bestMerchantName,
      category: category,
      frequency: frequency,
      estimated_amount: Math.round(avgAmt * 100) / 100,
      day_of_month: lastDateObj.getDate(),
      occurrences_count: items.length,
      last_charged: lastDateObj.toISOString().slice(0, 10),
      is_active: true,
      updated_at: new Date().toISOString(),
    });
  }

  console.log(`✨ סך הכל נמצאו ${rows.length} הוצאות קבועות תקינות ללא התנגשויות.`);

  if (rows.length > 0) {
    // מנקים את הטבלה קודם או מעדכנים
    const { error: upErr } = await supabase.from('recurring_expenses').upsert(rows, { onConflict: 'id' });
    if (upErr) throw upErr;
    console.log("✅ נשמרו בהצלחה ב-Supabase!");
  } else {
    console.log("⚠️ לא נמצאו הוצאות קבועות שעונות על הקריטריונים.");
  }
}

main().catch(e => { 
  console.error("❌ שגיאה בריצת הסקריפט:", e); 
  process.exit(1); 
});
