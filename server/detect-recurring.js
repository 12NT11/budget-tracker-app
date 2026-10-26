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
  { keys: ['electric', 'water', 'gas', 'internet', 'phone', 'חשמל', 'מים', 'גז', 'אינטרנט', 'טלפון', 'בזק', 'הוט', 'פרטנר', 'סלקום', 'גולן', '012', 'הוט מובייל'], cat: 'Utilities' },
  { keys: ['netflix', 'spotify', 'subscription', 'prime', 'apple', 'google', 'netifly', 'github', 'openai', 'yes', 'דיסני', 'טלוויזיה', 'מנוי'], cat: 'Subscriptions' },
  { keys: ['insurance', 'ביטוח', 'הפניקס', 'מגדל', 'כלל', 'הראל', 'מנורה', 'איילון'], cat: 'Insurance' },
  { keys: ['arnona', 'ארנונה', 'עיריית', 'ועד בית'], cat: 'Housing' },
];

function categorize(desc) {
  const d = (desc || '').toLowerCase();
  for (const m of CATEGORY_MAP) {
    if (m.keys.some(k => d.includes(k))) return m.cat;
  }
  return 'General';
}

function normalizeMerchantName(rawName) {
  if (!rawName) return 'unknown';
  let name = rawName.toLowerCase();
  name = name.replace(/\d{2}[\/\-\.]\d{2}[\/\-\.]?\d{2,4}/g, ''); // הסרת תאריכים
  name = name.replace(/[\d#]+/g, ''); // הסרת ספרות
  name = name.replace(/['"„“]/g, ''); // הסרת מרכאות
  name = name.trim().replace(/\s+/g, '_');
  return name || 'unknown';
}

async function main() {
  console.log("🔍 שולף תנועות מ-Supabase לניתוח מעמיק של הוצאות קבועות...");
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
    
    // מאפשרים גם 2 הופעות לפחות (כדי לא לפספס מנויים חדשים או דברים שקרו פעמיים)
    if (items.length < 2) continue;

    const sortedItems = items.sort((a, b) => {
      const dateA = new Date(a.value_date || a.date || a.booking_date).getTime();
      const dateB = new Date(b.value_date || b.date || b.booking_date).getTime();
      return dateA - dateB;
    });

    const dates = sortedItems.map(t => new Date(t.value_date || t.date || t.booking_date).getTime()).filter(Boolean);
    if (dates.length < 2) continue;

    const gaps = [];
    for (let i = 1; i < dates.length; i++) {
      gaps.push((dates[i] - dates[i - 1]) / (1000 * 60 * 60 * 24));
    }

    const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;
    let frequency = null;

    // הרחבת הטווח ל-24 עד 37 ימים כדי לתפוס תנודות של סופי שבוע וחגים
    if (avgGap >= 24 && avgGap <= 37) {
      frequency = 'monthly';
    } else if (avgGap >= 5 && avgGap <= 10) {
      frequency = 'weekly';
    } else {
      // אם יש רק 2 הופעות אבל הן בהפרש הגיוני של חודש (למשל פעם אחת בחודש שעבר ופעם בחודש הנוכחי)
      if (items.length === 2 && gaps[0] >= 20 && gaps[0] <= 45) {
        frequency = 'monthly';
      } else {
        continue;
      }
    }

    const amounts = sortedItems.map(t => Math.abs(Number(t.chargedAmount ?? t.amount ?? t.originalAmount ?? t.original_amount ?? 0))).filter(n => !isNaN(n));
    if (amounts.length === 0) continue;

    const avgAmt = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    const maxAmt = Math.max(...amounts);
    const minAmt = Math.min(...amounts);
    
    // מתן גמישות בסכומים: מאפשרים סטייה של עד 35% (מצוין לחשבונות חשמל/מים שמשתנים) 
    // אלא אם מדובר בסכום קטן מאוד.
    const isCategoryFlexible = categorize(Array.from(groupData.originalNames)[0]) === 'Utilities';
    const allowedDiff = isCategoryFlexible ? Math.max(avgAmt * 0.4, 150) : Math.max(avgAmt * 0.15, 20);

    if (maxAmt - minAmt > allowedDiff && items.length > 2) {
      continue;
    }

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
    console.log(`✨ נמצאו ${rows.length} הוצאות קבועות מאוזנות. מעדכן ב-Supabase...`);
    const { error: upErr } = await supabase.from('recurring_expenses').upsert(rows, { onConflict: 'id' });
    if (upErr) throw upErr;
  } else {
    console.log("⚠️ לא נמצאו הוצאות קבועות.");
  }

  console.log('✅ הסתיים בהצלחה!');
}

main().catch(e => { 
  console.error("❌ שגיאה בריצת הסקריפט:", e); 
  process.exit(1); 
});
