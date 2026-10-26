import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

const CATEGORY_MAP = [
  { keys: ['mortgage','loan','rent'], cat: 'Housing' },
  { keys: ['electric','water','gas','internet','phone'], cat: 'Utilities' },
  { keys: ['netflix','spotify','subscription','prime'], cat: 'Subscriptions' },
  { keys: ['insurance'], cat: 'Insurance' },
];

function categorize(desc) {
  const d = (desc || '').toLowerCase();
  for (const m of CATEGORY_MAP) if (m.keys.some(k => d.includes(k))) return m.cat;
  return 'General';
}

async function main() {
  const { data: txs, error } = await supabase.from('transactions').select('*');
  if (error) throw error;
  const groups = new Map();
  for (const t of (txs || [])) {
    const key = (t.description || t.desc || t.merchant || '').trim().toLowerCase();
    if (!key) continue;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(t);
  }
  const rows = [];
  for (const [key, items] of groups) {
    if (items.length < 2) continue;
    const dates = items.map(t => new Date(t.value_date || t.date).getTime()).filter(Boolean).sort((a,b)=>a-b);
    if (dates.length < 2) continue;
    const gaps = [];
    for (let i=1;i<dates.length;i++) gaps.push((dates[i]-dates[i-1])/(1000*60*60*24));
    const avgGap = gaps.reduce((a,b)=>a+b,0)/gaps.length;
    let frequency = null;
    if (avgGap >= 25 && avgGap <= 35) frequency = 'monthly';
    else if (avgGap >= 5 && avgGap <= 9) frequency = 'weekly';
    else continue;
    const amounts = items.map(t => Math.abs(Number(t.chargedAmount ?? t.amount ?? 0))).filter(n=>!isNaN(n));
    const avgAmt = amounts.reduce((a,b)=>a+b,0)/(amounts.length||1);
    const day = new Date(dates[dates.length-1]).getDate();
    rows.push({
      id: key.replace(/\s+/g,'-'),
      merchant: items[0].description || items[0].desc || key,
      category: categorize(items[0].description || items[0].desc || key),
      frequency,
      estimated_amount: Math.round(avgAmt*100)/100,
      day_of_month: day,
      occurrences_count: items.length,
      last_charged: new Date(dates[dates.length-1]).toISOString().slice(0,10),
      is_active: true,
      updated_at: new Date().toISOString(),
    });
  }
  if (rows.length) {
    const { error: upErr } = await supabase.from('recurring_expenses').upsert(rows, { onConflict: 'id' });
    if (upErr) throw upErr;
  }
  console.log('Upserted', rows.length, 'recurring expenses');
}

main().catch(e => { console.error(e); process.exit(1); });

