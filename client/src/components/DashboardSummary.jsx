import React from 'react';
import { format, startOfMonth, endOfMonth } from 'date-fns';

/**
 * DashboardSummary - Total spent, monthly budget stats
 * @param {Object} props
 * @param {Array} props.transactions - Array of transaction objects
 */
const DashboardSummary = ({ transactions = [] }) => {
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  // Calculate monthly total
  const monthlyTransactions = transactions.filter(tx => {
    const txDate = new Date(tx.date);
    return txDate >= monthStart && txDate <= monthEnd;
  });

  const monthlyTotal = monthlyTransactions.reduce((sum, tx) => sum + (tx.amount || 0), 0);
  const totalSpent = transactions.reduce((sum, tx) => sum + (tx.amount || 0), 0);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: 'ILS',
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <section className="dashboard-summary">
      <h1 className="app-title">Personal Finance Tracker</h1>
      
      <div className="summary-cards">
        <div className="summary-card primary">
          <div className="summary-card-label">This Month</div>
          <div className="summary-card-amount">{formatCurrency(monthlyTotal)}</div>
          <div className="summary-card-subtext">{format(now, 'MMMM yyyy')}</div>
        </div>

        <div className="summary-card">
          <div className="summary-card-label">Total Spent</div>
          <div className="summary-card-amount">{formatCurrency(totalSpent)}</div>
          <div className="summary-card-subtext">{transactions.length} transactions</div>
        </div>

        <div className="summary-card">
          <div className="summary-card-label">Avg. Per Transaction</div>
          <div className="summary-card-amount">
            {transactions.length > 0 
              ? formatCurrency(totalSpent / transactions.length)
              : formatCurrency(0)
            }
          </div>
          <div className="summary-card-subtext">All time</div>
        </div>
      </div>
    </section>
  );
};

export default DashboardSummary;
