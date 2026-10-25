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
      .order('date', { ascending: false })

    if (filters.provider) {
      query = query.eq('provider', filters.provider)
    }

    if (filters.startDate) {
      query = query.gte('date', filters.startDate)
    }

    if (filters.endDate) {
      query = query.lte('date', filters.endDate)
    }

    if (filters.category) {
      query = query.eq('category', filters.category)
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
      .select('provider')
      .not('provider', 'is', null)

    if (error) throw error

    const providers = [...new Set(data.map(item => item.provider))]
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
      .select('category')
      .not('category', 'is', null)

    if (error) throw error

    const categories = [...new Set(data.map(item => item.category))]
    return categories
  } catch (error) {
    console.error('Failed to fetch categories:', error)
    return []
  }
}
