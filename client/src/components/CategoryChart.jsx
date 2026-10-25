import React from 'react';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title
} from 'chart.js';
import { Doughnut } from 'react-chartjs-2';

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title
);

/**
 * CategoryChart - Visual breakdown of spending by category
 * @param {Object} props
 * @param {Array} props.transactions - Array of transaction objects
 */
const CategoryChart = ({ transactions = [] }) => {
  // Aggregate spending by category
  const categoryData = React.useMemo(() => {
    const categoryMap = {};
    
    transactions.forEach(tx => {
      const category = tx.category || 'Uncategorized';
      if (!categoryMap[category]) {
        categoryMap[category] = 0;
      }
      categoryMap[category] += tx.amount || 0;
    });

    // Sort by amount descending and take top 8
    const sortedCategories = Object.entries(categoryMap)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8);

    return sortedCategories;
  }, [transactions]);

  if (categoryData.length === 0) {
    return (
      <section className="chart-section">
        <h2 className="section-title">Spending by Category</h2>
        <div className="empty-state">
          <p>No category data available</p>
        </div>
      </section>
    );
  }

  const labels = categoryData.map(([category]) => category);
  const data = categoryData.map(([, amount]) => amount);

  const chartData = {
    labels,
    datasets: [
      {
        label: 'Amount (ILS)',
        data,
        backgroundColor: [
          '#3b82f6',
          '#ef4444',
          '#10b981',
          '#f59e0b',
          '#8b5cf6',
          '#ec4899',
          '#06b6d4',
          '#84cc16',
        ],
        borderColor: [
          '#2563eb',
          '#dc2626',
          '#059669',
          '#d97706',
          '#7c3aed',
          '#db2777',
          '#0891b2',
          '#65a30d',
        ],
        borderWidth: 2,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: '#e2e8f0',
          padding: 12,
          font: {
            size: 11
          }
        }
      },
      tooltip: {
        backgroundColor: '#1e293b',
        titleColor: '#e2e8f0',
        bodyColor: '#e2e8f0',
        borderColor: '#475569',
        borderWidth: 1,
        callbacks: {
          label: function(context) {
            const label = context.label || '';
            const value = context.parsed || 0;
            const formattedValue = new Intl.NumberFormat('he-IL', {
              style: 'currency',
              currency: 'ILS'
            }).format(value);
            return `${label}: ${formattedValue}`;
          }
        }
      }
    },
    maintainAspectRatio: true,
  };

  return (
    <section className="chart-section">
      <h2 className="section-title">Spending by Category</h2>
      <div className="chart-container">
        <Doughnut data={chartData} options={options} />
      </div>
    </section>
  );
};

export default CategoryChart;
