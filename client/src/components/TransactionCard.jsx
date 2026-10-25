import React from 'react';
import ProviderBadge from './ProviderBadge';

const TransactionCard = ({ transaction }) => {
  const fmt = (amount) => new Intl.NumberFormat('he-IL', { style: 'currency', currency: transaction.currency || 'ILS' }).format(amount);
  const fmtDate = (d) => new Date(d).toLocaleDateString('he-IL', { month: 'short', day: 'numeric' });
  const cleared = transaction.status !== 'pending';

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-700 bg-slate-800/60 px-4 py-3">
      <div className="min-w-0 flex-1 text-right">
        <div className="flex items-center justify-end gap-2">
          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${cleared ? 'bg-emerald-500/15 text-emerald-400' : 'bg-orange-500/15 text-orange-400'}`}>
            {cleared ? 'ירד בבנק' : 'בקנה'}
          </span>
          <h3 className="truncate text-sm font-semibold text-slate-100">{transaction.description}</h3>
        </div>
        <p className="text-[11px] text-slate-500 mt-1">{fmtDate(transaction.date)}</p>
      </div>
      <div className="shrink-0 text-left">
        <p className="text-base font-bold text-slate-100">{fmt(transaction.amount)}</p>
      </div>
    </div>
  );
};

export default TransactionCard;
