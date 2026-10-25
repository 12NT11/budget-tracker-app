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
      .order('valueDate', { ascending: false })

    if (filters.providerId) {
      query = query.eq('providerId', filters.providerId)
    }

    if (filters.startDate) {
      query = query.gte('valueDate', filters.startDate)
    }

    if (filters.endDate) {
      query = query.lte('valueDate', filters.endDate)
    }

    if (filters.category) {
      query = query.eq('subCategory', filters.category)
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
      .select('providerId')
      .not('providerId', 'is', null)

    if (error) throw error

    const providers = [...new Set(data.map(item => item.providerId))]
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
      .select('subCategory, mainCategory')
      .not('subCategory', 'is', null)

    if (error) throw error

    const categories = [...new Set(data.map(item => item.subCategory || item.mainCategory))]
    return categories
  } catch (error) {
    console.error('Failed to fetch categories:', error)
    return []
  }
}
