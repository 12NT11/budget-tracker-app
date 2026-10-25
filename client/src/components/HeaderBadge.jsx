import React from 'react';

const HeaderBadge = () => (
  <div className="flex justify-between items-center text-xs text-slate-400 mb-2">
    <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
      מסונכרן
    </div>
    <div className="bg-[#131d38] border border-slate-700/60 px-3 py-1 rounded-full text-slate-300 font-medium">
      25 אוקטובר 2026
    </div>
  </div>
);

export default HeaderBadge;
