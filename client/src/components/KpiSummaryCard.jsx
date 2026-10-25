import React from 'react';

const KpiSummaryCard = () => (
  <div className="bg-[#101935] rounded-2xl p-5 border border-slate-800/80 shadow-lg text-center">
    <p className="text-xs text-slate-400 mb-1">יתרה פנויה להוצאות משתנות</p>
    <div className="text-4xl font-black text-[#38bdf8] tracking-tight my-2 flex justify-center items-center gap-1">
      ₪11,153.40
    </div>
    <div className="grid grid-cols-4 gap-2 pt-4 border-t border-slate-800/80 text-center mt-3">
      <div>
        <p className="text-[10px] text-slate-400">הכנסה</p>
        <p className="text-xs font-bold text-slate-100">₪25,000</p>
      </div>
      <div>
        <p className="text-[10px] text-slate-400">משתנות</p>
        <p className="text-xs font-bold text-slate-100">₪8,200</p>
      </div>
      <div>
        <p className="text-[10px] text-slate-400">קבועות</p>
        <p className="text-xs font-bold text-slate-100">₪4,500</p>
      </div>
      <div>
        <p className="text-[10px] text-slate-400">בקנה</p>
        <p className="text-xs font-bold text-amber-400">₪1,200</p>
      </div>
    </div>
  </div>
);

export default KpiSummaryCard;
