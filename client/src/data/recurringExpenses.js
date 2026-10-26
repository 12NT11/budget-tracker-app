import { startOfMonth, endOfMonth } from 'date-fns';

export const STATUS_PENDING = 'Pending';
export const STATUS_CLEARED = 'Cleared';

/**
 * Recurring / fixed expenses (הוצאות קבועות).
 *
 * Structure (can also be mirrored as a Supabase `recurring_expenses` table):
 *   CREATE TABLE recurring_expenses (
 *     id UUID PRIMARY KEY,
 *     name TEXT NOT NULL,
 *     amount DECIMAL(10,2) NOT NULL,
 *     category TEXT,
 *     day_of_month INTEGER NOT NULL CHECK (day_of_month BETWEEN 1 AND 31),
 *     status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending','Cleared')),
 *     type TEXT NOT NULL DEFAULT 'fixed',
 *     created_at TIMESTAMPTZ DEFAULT NOW()
 *   );
 */
export const RECURRING_EXPENSES = [
  { id: 'rec-mortgage', name: 'משכנתא', amount: 4500, category: 'דיור', dayOfMonth: 1, status: 'Pending', type: 'fixed' },
  { id: 'rec-arnona', name: 'ארנונה', amount: 420, category: 'דיור', dayOfMonth: 10, status: 'Pending', type: 'fixed' },
  { id: 'rec-electric', name: 'חשמל', amount: 350, category: 'בית', dayOfMonth: 15, status: 'Pending', type: 'fixed' },
  { id: 'rec-health', name: 'ביטוח בריאות', amount: 450, category: 'ביטוח', dayOfMonth: 20, status: 'Cleared', type: 'fixed' },
  { id: 'rec-cinema', name: 'מנוי קולנוע', amount: 99, category: 'בילויים', dayOfMonth: 25, status: 'Pending', type: 'fixed' },
];

const formatILDate = (d) =>
  new Date(d).toLocaleDateString('he-IL', { day: 'numeric', month: 'short' });

/**
 * Generate recurring transactions for the current active month.
 *
 * - One transaction per recurring expense, scheduled on its `dayOfMonth`
 *   (clamped to the last day of the month for short months).
 * - Skips any recurring expense already present in `existingTransactions`
 *   (matched by description + date) to prevent duplicates.
 * - Each generated item carries `type: 'fixed'` and `isRecurring: true` so it
 *   flows through the existing fixed/variable/pending aggregations.
 */
export function generateRecurringTransactions(recurringExpenses, existingTransactions = []) {
  const now = new Date();
  const start = startOfMonth(now);
  const end = endOfMonth(now);
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const existingKeys = new Set(
    existingTransactions.map((it) => `${String(it.desc || it.name || '')}|${it.date}`)
  );

  const generated = [];

  for (const rec of recurringExpenses) {
    const day = Math.min(rec.dayOfMonth ?? rec.day_of_month, daysInMonth);
    const date = new Date(year, month, day);
    if (date < start || date > end) continue;

    const dateDisplay = formatILDate(date);
    if (existingKeys.has(`${rec.name}|${dateDisplay}`)) continue;

    generated.push({
      id: `recurring-${rec.id}-${year}-${month}`,
      desc: rec.name,
      amount: `₪${rec.amount.toLocaleString('he-IL')}.0`,
      date: dateDisplay,
      cat: rec.category,
      status: rec.status === STATUS_CLEARED ? 'cleared' : 'pending',
      type: rec.type || 'fixed',
      isRecurring: true,
      sortDate: date.getTime(),
    });
  }

  return generated;
}
