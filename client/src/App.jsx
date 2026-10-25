import React, { useState, useEffect } from 'react';
import DashboardSummary from './components/DashboardSummary';
import TransactionList from './components/TransactionList';
import CategoryChart from './components/CategoryChart';
import { fetchTransactions, getProviders, getCategories } from './services/supabase';
import './index.css';

function App() {
  const [transactions, setTransactions] = useState([]);
  const [providers, setProviders] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [transactionsData, providersData, categoriesData] = await Promise.all([
        fetchTransactions(),
        getProviders(),
        getCategories()
      ]);

      setTransactions(transactionsData);
      setProviders(providersData);
      setCategories(categoriesData);
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Failed to load transactions. Please check your Supabase configuration.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="app">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading your financial data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app">
        <div className="error-container">
          <h2>⚠️ Error</h2>
          <p>{error}</p>
          <button onClick={loadData} className="retry-button">Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div dir="rtl" lang="he" className="min-h-screen bg-slate-950 text-slate-100 p-4 max-w-md mx-auto space-y-4">
      <DashboardSummary transactions={transactions} />
      <CategoryChart transactions={transactions} />
      <TransactionList transactions={transactions} providers={providers} categories={categories} />
    </div>
  );
}

export default App;
