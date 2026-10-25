import React from 'react';

/**
 * ProviderBadge - Visual tag for credit card/bank providers
 * @param {Object} props
 * @param {string} props.provider - Provider name (Max, Isracard, Hapoalim, etc.)
 */
const ProviderBadge = ({ provider }) => {
  const getProviderColor = (providerName) => {
    if (!providerName) return '#64748b';
    
    const name = providerName.toLowerCase();
    if (name.includes('max')) return '#e11d48';
    if (name.includes('isracard')) return '#2563eb';
    if (name.includes('hapoalim')) return '#16a34a';
    if (name.includes('leumi')) return '#9333ea';
    if (name.includes('pepper')) return '#ea580c';
    if (name.includes('discount')) return '#0891b2';
    if (name.includes('mizrahi')) return '#ca8a04';
    
    return '#64748b';
  };

  const getProviderStyle = (color) => ({
    display: 'inline-block',
    padding: '0.25rem 0.625rem',
    borderRadius: '6px',
    fontSize: '0.75rem',
    fontWeight: '600',
    backgroundColor: `${color}20`,
    color: color,
    border: `1px solid ${color}40`
  });

  if (!provider) return null;

  return (
    <span style={getProviderStyle(getProviderColor(provider))}>
      {provider}
    </span>
  );
};

export default ProviderBadge;
