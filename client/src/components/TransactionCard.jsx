import React from 'react';
import ProviderBadge from './ProviderBadge';

/**
 * TransactionCard - Individual transaction display card
 * @param {Object} props
 * @param {Object} props.transaction - Transaction object
 */
const TransactionCard = ({ transaction }) => {
  const formatAmount = (amount) => {
    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: transaction.currency || 'ILS'
    }).format(amount);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('he-IL', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="transaction-card">
      <div className="transaction-card-header">
        <div className="transaction-info">
          <h3 className="transaction-description">{transaction.description}</h3>
          <div className="transaction-meta">
            <span className="transaction-date">{formatDate(transaction.date)}</span>
            {transaction.category && (
              <span className="transaction-category">• {transaction.category}</span>
            )}
          </div>
        </div>
        <div className="transaction-amount-section">
          <div className="transaction-amount">{formatAmount(transaction.amount)}</div>
          <ProviderBadge provider={transaction.provider} />
        </div>
      </div>
    </div>
  );
};

export default TransactionCard;
