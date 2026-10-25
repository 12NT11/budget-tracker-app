import React from 'react';
import { Chart as ChartJS, ArcElement, Tooltip } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip);

const data = [
  { name: 'מזון', value: 4200, color: '#38bdf8' },
  { name: 'תחבורה', value: 1800, color: '#34d399' },
  { name: 'בילויים', value: 1200, color: '#f59e0b' },
  { name: 'קניות', value: 900, color: '#a78bfa' },
];

const CategoryDonutCard = () => (
  <div className="bg-[#101935] rounded-2xl p-4 border border-slate-800/80 space-y-3">
    <div className="flex gap-4 border-b border-slate-800/80 pb-2 text-xs font-medium">
      <span className="text-[#38bdf8] border-b-2 border-[#38bdf8] pb-2 -mb-2 font-bold">קטגוריות</span>
      <span className="text-slate-400">ספקים</span>
    </div>
    <div className="flex items-center justify-between gap-2 h-36">
      <div className="w-1/2 h-full">
        <Doughnut
          data={{ labels: data.map(d => d.name), datasets: [{ data: data.map(d => d.value), backgroundColor: data.map(d => d.color), borderWidth: 0 }] }}
          options={{ cutout: '65%', plugins: { legend: { display: false } }, maintainAspectRatio: false }}
        />
      </div>
      <div className="w-1/2 space-y-2 text-xs">
        {data.map((d) => (
          <div key={d.name} className="flex justify-between items-center text-slate-300">
            <span className="font-bold">₪{d.value.toLocaleString()}</span>
            <span className="flex items-center gap-1.5">
              {d.name}
              <span className="w-2 h-2 rounded-full" style={{ background: d.color }} />
            </span>
          </div>
        ))}
      </div>
    </div>
  </div>
);

export default CategoryDonutCard;
