import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

/**
 * Fetch all transactions from Supabase
 * @param {Object} filters - Optional filters
 * @returns {Promise<Array>} Array of transactions
 */
export async function fetchTransactions(filters = {}) {
  try {
    let query = supabase
      .from('transactions')
      .select('*')
      .order('value_date', { ascending: false })

    if (filters.provider_id) {
      query = query.eq('provider_id', filters.provider_id)
    }

    if (filters.startDate) {
      query = query.gte('value_date', filters.startDate)
    }

    if (filters.endDate) {
      query = query.lte('value_date', filters.endDate)
    }

    if (filters.category) {
      query = query.eq('sub_category', filters.category)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching transactions:', error)
      throw error
    }

    return data || []
  } catch (error) {
    console.error('Failed to fetch transactions:', error)
    return []
  }
}

/**
 * Get unique providers from transactions
 * @returns {Promise<Array>} Array of unique providers
 */
export async function getProviders() {
  try {
    const { data, error } = await supabase
      .from('transactions')
      .select('provider_id')
      .not('provider_id', 'is', null)

    if (error) throw error

    const providers = [...new Set(data.map(item => item.provider_id))]
    return providers
  } catch (error) {
    console.error('Failed to fetch providers:', error)
    return []
  }
}

/**
 * Get unique categories from transactions
 * @returns {Promise<Array>} Array of unique categories
 */
export async function getCategories() {
  try {
    const { data, error } = await supabase
      .from('transactions')
      .select('sub_category, main_category')
      .not('sub_category', 'is', null)

    if (error) throw error

    const categories = [...new Set(data.map(item => item.sub_category || item.main_category))]
    return categories
  } catch (error) {
    console.error('Failed to fetch categories:', error)
    return []
  }
}

export async function fetchRecurringExpenses(activeOnly = false) {
  try {
    let q = supabase.from('recurring_expenses').select('*');
    if (activeOnly) q = q.eq('is_active', true);
    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  } catch (e) { console.error(e); return []; }
}

export async function upsertRecurringExpense(row) {
  const { data, error } = await supabase.from('recurring_expenses').upsert(row, { onConflict: 'id' }).select();
  if (error) throw error;
  return data;
}
