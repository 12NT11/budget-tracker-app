import React from 'react';

const BudgetPaceCard = () => (
  <div className="bg-[#101935] rounded-2xl p-4 border border-slate-800/80 space-y-2">
    <div className="flex justify-between text-xs mb-1">
      <span className="text-slate-300">קצב ניצול תקציב משתנה</span>
      <span className="text-emerald-400 font-semibold">קצב מצוין (יום 10 מתוך 31)</span>
    </div>
    <div className="w-full bg-slate-800/90 h-2 rounded-full overflow-hidden">
      <div className="bg-emerald-400 h-full rounded-full transition-all duration-500" style={{ width: '19%' }} />
    </div>
    <div className="flex justify-between text-[11px] text-slate-400">
      <span>מומלץ ליום: ~350 ₪</span>
      <span>ניצול: 198 ₪ (2%)</span>
    </div>
  </div>
);

export default BudgetPaceCard;
