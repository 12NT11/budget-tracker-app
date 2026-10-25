import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

const data = [
  { name: 'מזון', value: 4200 },
  { name: 'תחבורה', value: 1800 },
  { name: 'בילויים', value: 1200 },
  { name: 'קניות', value: 900 },
];
const COLORS = ['#38bdf8', '#34d399', '#f59e0b', '#a78bfa'];

const CategoryDonutCard = () => (
  <div className="bg-[#101935] rounded-2xl p-4 border border-slate-800/80 space-y-3">
    <div className="flex gap-4 border-b border-slate-800/80 pb-2 text-xs font-medium">
      <span className="text-[#38bdf8] border-b-2 border-[#38bdf8] pb-2 -mb-2 font-bold">קטגוריות</span>
      <span className="text-slate-400">ספקים</span>
    </div>
    <div className="flex items-center justify-between gap-2 h-36">
      <div className="w-1/2 h-full">
        <ResponsiveContainer>
          <PieChart>
            <Pie data={data} innerRadius={35} outerRadius={55} paddingAngle={2} dataKey="value">
              {data.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="w-1/2 space-y-2 text-xs">
        {data.map((d, i) => (
          <div key={d.name} className="flex justify-between items-center text-slate-300">
            <span className="font-bold">₪{d.value.toLocaleString()}</span>
            <span className="flex items-center gap-1.5">
              {d.name}
              <span className="w-2 h-2 rounded-full" style={{ background: COLORS[i] }} />
            </span>
          </div>
        ))}
      </div>
    </div>
  </div>
);

export default CategoryDonutCard;
