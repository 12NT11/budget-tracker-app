import React, { useEffect, useMemo, useState } from 'react';
import { fetchRecurringExpenses } from '../services/supabase';
import { RECURRING_EXPENSES, generateRecurringTransactions } from '../data/recurringExpenses';

const TransactionCard = ({ item }) => {
  const pending = item.status === 'pending';
  return (
    <div className={`flex justify-between items-center bg-[#101935] rounded-2xl p-4 border border-slate-800/80 relative overflow-hidden mb-2.5 shadow-md ${pending ? 'border-r-4 border-r-amber-500' : 'border-r-4 border-r-emerald-500'}`}>
      <div className="text-left">
        <p className={`text-base font-extrabold ${pending ? 'text-amber-400' : 'text-slate-100'}`}>{item.amount}</p>
      </div>
      <div className="text-right">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-bold text-slate-100">{item.desc}</span>
          <span className={`text-[10px] px-2 py-0.5 rounded-md font-medium ${pending ? 'bg-amber-500/10 text-amber-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
            {pending ? 'מתוכנן' : 'ירד'}
          </span>
        </div>
        <p className="text-xs text-slate-400">{item.date} · {item.cat}</p>
      </div>
    </div>
  );
};

const TransactionList = () => {
  const [items, setItems] = useState([]);

  useEffect(() => {
    (async () => {
      const recurring = await fetchRecurringExpenses(true);
      const generated = generateRecurringTransactions(recurring, items);
      if (generated.length) {
        setItems((prev) => [...prev, ...generated]);
      }
    })();
  }, []);

  const sortedItems = useMemo(
    () => [...items].sort((a, b) => (b.sortDate || 0) - (a.sortDate || 0)),
    [items]
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <button className="bg-sky-500/10 text-sky-400 text-xs px-3 py-1.5 rounded-xl border border-sky-500/30 font-semibold">
          + עסקה קבועה
        </button>
        <h3 className="text-sm font-bold text-slate-200">תזרמי מחזור (לפי תאריך)</h3>
      </div>
      {sortedItems.map((it) => (
        <TransactionCard key={it.id} item={it} />
      ))}
    </div>
  );
};

export default TransactionList;
