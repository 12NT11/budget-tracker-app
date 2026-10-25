import React, { useState, useMemo } from 'react';
import TransactionCard from './TransactionCard';

const TransactionList = ({ transactions = [], providers = [], categories = [] }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const filtered = useMemo(() => {
    let f = [...transactions];
    if (searchTerm) f = f.filter(tx => tx.description?.toLowerCase().includes(searchTerm.toLowerCase()));
    return f.sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [transactions, searchTerm]);

  return (
    <section className="rounded-2xl bg-slate-800/60 border border-slate-700 p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-slate-200">Transactions</h2>
        <span className="text-xs text-slate-400">{filtered.length}</span>
      </div>
      <input
        type="text"
        placeholder="Search..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="w-full mb-3 rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-400"
      />
      <div className="flex flex-col gap-2 max-h-[600px] overflow-y-auto">
        {filtered.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-6">No transactions found</p>
        ) : filtered.map(tx => (
          <TransactionCard key={tx.hash || tx.id} transaction={tx} />
        ))}
      </div>
    </section>
  );
};

export default TransactionList;
