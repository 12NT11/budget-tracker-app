import React from 'react';
import HeaderBadge from './components/HeaderBadge';
import KpiSummaryCard from './components/KpiSummaryCard';
import BudgetPaceCard from './components/BudgetPaceCard';
import CategoryDonutCard from './components/CategoryDonutCard';
import TransactionList from './components/TransactionList';

const App = () => (
  <div dir="rtl" className="bg-[#0b1329] min-h-screen text-slate-100 p-4 font-sans">
    <div className="max-w-md mx-auto space-y-4">
      <HeaderBadge />
      <KpiSummaryCard />
      <BudgetPaceCard />
      <CategoryDonutCard />
      <TransactionList />
    </div>
  </div>
);

export default App;
