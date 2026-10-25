import React from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend);

const COLORS = ['#22d3ee', '#f97316', '#a3e635', '#818cf8', '#f472b6', '#34d399', '#facc15', '#94a3b8'];

const CategoryChart = ({ transactions = [] }) => {
  const categoryData = React.useMemo(() => {
    const map = {};
    transactions.forEach(tx => {
      const c = tx.category || 'Uncategorized';
      map[c] = (map[c] || 0) + (tx.amount || 0);
    });
    return Object.entries(map).sort(([, a], [, b]) => b - a).slice(0, 8);
  }, [transactions]);

  if (categoryData.length === 0) {
    return <section className="rounded-2xl bg-slate-800/60 border border-slate-700 p-4"><h2 className="text-sm font-semibold text-slate-200 mb-2">Spending by Category</h2><p className="text-xs text-slate-400">No category data</p></section>;
  }

  const labels = categoryData.map(([c]) => c);
  const data = categoryData.map(([, a]) => a);
  const fmt = (v) => new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS' }).format(v);

  const chartData = {
    labels,
    datasets: [{ data, backgroundColor: COLORS, borderColor: '#0f172a', borderWidth: 2 }],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { backgroundColor: '#1e293b', titleColor: '#e2e8f0', bodyColor: '#e2e8f0' } },
    cutout: '68%',
  };

  return (
    <section className="rounded-2xl bg-slate-800/60 border border-slate-700 p-4">
      <h2 className="text-sm font-semibold text-slate-200 mb-3">Spending by Category</h2>
      <div className="flex flex-col sm:flex-row items-center gap-4">
        <div className="w-40 h-40 shrink-0">
          <Doughnut data={chartData} options={options} />
        </div>
        <ul className="flex-1 w-full space-y-2">
          {categoryData.map(([label, amount], i) => (
            <li key={label} className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-2 text-slate-300">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i] }} />
                {label}
              </span>
              <span className="text-slate-400">{fmt(amount)}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
};

export default CategoryChart;
