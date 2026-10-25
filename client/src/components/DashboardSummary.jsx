import React from 'react';
import { format, startOfMonth, endOfMonth } from 'date-fns';

const formatCurrency = (amount) =>
  new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(amount);

const DashboardSummary = ({ transactions = [] }) => {
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const monthlyTransactions = transactions.filter(tx => {
    const d = new Date(tx.date);
    return d >= monthStart && d <= monthEnd;
  });
  const monthlyTotal = monthlyTransactions.reduce((s, tx) => s + (tx.amount || 0), 0);
  const income = monthlyTransactions.filter(t => (t.amount || 0) > 0).reduce((s, t) => s + t.amount, 0);
  const fixed = monthlyTransactions.filter(t => t.type === 'fixed').reduce((s, t) => s + Math.abs(t.amount || 0), 0);
  const variable = monthlyTransactions.filter(t => t.type !== 'fixed').reduce((s, t) => s + Math.abs(t.amount || 0), 0);
  const pending = monthlyTransactions.filter(t => t.status === 'pending').reduce((s, t) => s + Math.abs(t.amount || 0), 0);

  const day = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const pacePct = Math.round((day / daysInMonth) * 100);
  const utilPct = income ? Math.round((variable / income) * 100) : 0;
  const dailyAvg = variable / (day || 1);

  return (
    <section className="mb-6 space-y-4">
      <div className="rounded-2xl bg-slate-900 border border-slate-700 p-5 shadow-lg shadow-cyan-500/10">
        <p className="text-xs uppercase tracking-widest text-slate-400 mb-2">Available balance for variable expenses</p>
        <p className="text-4xl font-bold text-cyan-400 drop-shadow-[0_0_12px_rgba(34,211,238,0.6)]">
          {new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(11153.4)}
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          { label: 'Income', labelHe: 'הכנסה', value: income, color: 'text-emerald-400' },
          { label: 'Fixed', labelHe: 'קבועות', value: fixed, color: 'text-blue-400' },
          { label: 'Variable', labelHe: 'משתנות', value: variable, color: 'text-amber-400' },
          { label: 'Pending', labelHe: 'בקנה', value: pending, color: 'text-orange-400' },
        ].map(m => (
          <div key={m.label} className="rounded-xl bg-slate-800/60 border border-slate-700 p-3">
            <p className="text-[10px] text-slate-400">{m.labelHe} · {m.label}</p>
            <p className={`text-sm font-semibold ${m.color}`}>{formatCurrency(m.value || 0)}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl bg-slate-800/60 border border-slate-700 p-4">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
          <span>Pace (Day {day} of {daysInMonth})</span>
          <span>{utilPct}% utilized</span>
        </div>
        <div className="h-2 w-full rounded-full bg-slate-700 overflow-hidden">
          <div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400" style={{ width: `${pacePct}%` }} />
        </div>
        <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2">
          <span>Daily avg: {formatCurrency(dailyAvg)}</span>
          <span>{pacePct}% of month</span>
        </div>
      </div>
    </section>
  );
};

export default DashboardSummary;
