import React, { useState, useMemo } from 'react';
import TransactionCard from './TransactionCard';

/**
 * TransactionList - Searchable and filterable transactions table
 * @param {Object} props
 * @param {Array} props.transactions - Array of transaction objects
 * @param {Array} props.providers - Available providers for filtering
 * @param {Array} props.categories - Available categories for filtering
 */
const TransactionList = ({ transactions = [], providers = [], categories = [] }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProvider, setSelectedProvider] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('date-desc');

  const filteredAndSortedTransactions = useMemo(() => {
    let filtered = [...transactions];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(tx =>
        tx.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Provider filter
    if (selectedProvider !== 'all') {
      filtered = filtered.filter(tx => tx.provider === selectedProvider);
    }

    // Category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(tx => tx.category === selectedCategory);
    }

    // Sort
    filtered.sort((a, b) => {
      if (sortBy === 'date-desc') {
        return new Date(b.date) - new Date(a.date);
      } else if (sortBy === 'date-asc') {
        return new Date(a.date) - new Date(b.date);
      } else if (sortBy === 'amount-desc') {
        return b.amount - a.amount;
      } else if (sortBy === 'amount-asc') {
        return a.amount - b.amount;
      }
      return 0;
    });

    return filtered;
  }, [transactions, searchTerm, selectedProvider, selectedCategory, sortBy]);

  const formatTotal = (amounts) => {
    const total = amounts.reduce((sum, tx) => sum + (tx.amount || 0), 0);
    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: 'ILS'
    }).format(total);
  };

  return (
    <section className="transaction-list-section">
      <div className="section-header">
        <h2 className="section-title">Transactions</h2>
        <span className="transaction-count">
          {filteredAndSortedTransactions.length} transaction{filteredAndSortedTransactions.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Filters */}
      <div className="filters-container">
        <input
          type="text"
          placeholder="Search transactions..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />

        <div className="filter-row">
          <select
            value={selectedProvider}
            onChange={(e) => setSelectedProvider(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Providers</option>
            {providers.map(provider => (
              <option key={provider} value={provider}>{provider}</option>
            ))}
          </select>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Categories</option>
            {categories.map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="filter-select"
          >
            <option value="date-desc">Newest First</option>
            <option value="date-asc">Oldest First</option>
            <option value="amount-desc">Amount: High to Low</option>
            <option value="amount-asc">Amount: Low to High</option>
          </select>
        </div>

        {filteredAndSortedTransactions.length > 0 && (
          <div className="filter-summary">
            <span>Total: {formatTotal(filteredAndSortedTransactions)}</span>
          </div>
        )}
      </div>

      {/* Transaction List */}
      <div className="transactions-container">
        {filteredAndSortedTransactions.length === 0 ? (
          <div className="empty-state">
            <p>No transactions found</p>
            <span>Try adjusting your filters</span>
          </div>
        ) : (
          filteredAndSortedTransactions.map((transaction) => (
            <TransactionCard key={transaction.hash || transaction.id} transaction={transaction} />
          ))
        )}
      </div>
    </section>
  );
};

export default TransactionList;
