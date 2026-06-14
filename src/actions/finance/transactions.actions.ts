'use server'

import { createClient } from '@/lib/supabase/server'
import { ActionResponse, Transaction, TransactionFilters, PaginatedResult } from '@/types/finance/finance.types'

export async function getTransactions(
  filters: TransactionFilters,
  page: number = 1,
  pageSize: number = 50
): Promise<ActionResponse<PaginatedResult<Transaction>>> {
  try {
    const supabase = await createClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) throw new Error('Unauthorized')

    const { data: user } = await supabase
      .from('profiles')
      .select('store_id, role')
      .eq('id', authUser.id)
      .single()

    if (!user) {
      throw new Error('Forbidden')
    }

    const storeId = user.store_id

    // First try to get transactions from transactions table
    const { data: txData, error: txError } = await supabase
      .from('transactions')
      .select('*', { count: 'exact' })
      .eq('store_id', storeId)
      .gte('created_at', filters.dateFrom)
      .lte('created_at', filters.dateTo)
      .order('created_at', { ascending: false })

    if (!txError && txData && txData.length > 0) {
      let filteredData = txData

      if (filters.types && filters.types.length > 0) {
        filteredData = filteredData.filter((t: any) => filters.types!.includes(t.type))
      }
      if (filters.branchId && filters.branchId !== 'all') {
        filteredData = filteredData.filter((t: any) => t.branch_id === filters.branchId)
      }
      if (filters.userId) {
        filteredData = filteredData.filter((t: any) => t.created_by === filters.userId)
      }
      if (filters.amountMin !== undefined) {
        filteredData = filteredData.filter((t: any) => t.amount >= filters.amountMin!)
      }
      if (filters.amountMax !== undefined) {
        filteredData = filteredData.filter((t: any) => t.amount <= filters.amountMax!)
      }
      if (filters.search) {
        const searchLower = filters.search.toLowerCase()
        filteredData = filteredData.filter((t: any) => 
          (t.description || '').toLowerCase().includes(searchLower) || 
          (t.reference_id || '').toLowerCase().includes(searchLower)
        )
      }

      // Paginate the filtered data
      const total = filteredData.length
      const from = (page - 1) * pageSize
      const to = from + pageSize
      const paginatedData = filteredData.slice(from, to)

      return {
        data: {
          data: paginatedData as Transaction[],
          total,
          page,
          pageSize,
          totalPages: Math.ceil(total / pageSize)
        },
        error: null
      }
    }

    // Fallback: get data from orders and generate transactions
    let ordersQuery = supabase
      .from('orders')
      .select('*', { count: 'exact' })
      .eq('store_id', storeId)
      .gte('created_at', filters.dateFrom)
      .lte('created_at', filters.dateTo)
      .order('created_at', { ascending: false })

    if (filters.branchId && filters.branchId !== 'all') {
      ordersQuery = ordersQuery.eq('branch_id', filters.branchId)
    }

    const from = (page - 1) * pageSize
    const to = from + pageSize - 1
    ordersQuery = ordersQuery.range(from, to)

    const { data: ordersData, count: ordersCount, error: ordersError } = await ordersQuery

    if (ordersError) throw new Error(ordersError.message)

    // Generate transactions from orders
    const transactions: Transaction[] = []
    ordersData?.forEach((order: any) => {
      transactions.push({
        id: order.id,
        store_id: order.store_id,
        branch_id: order.branch_id,
        type: 'revenue',
        amount: order.total_amount,
        description: `Order #${order.order_number || order.id.slice(0, 8)}`,
        reference_id: order.id,
        reference_type: 'order',
        created_at: order.created_at,
        created_by: order.cashier_id
      })
      if (order.tax_amount > 0) {
        transactions.push({
          id: `${order.id}-tax`,
          store_id: order.store_id,
          branch_id: order.branch_id,
          type: 'tax',
          amount: order.tax_amount,
          description: `Tax for Order #${order.order_number || order.id.slice(0, 8)}`,
          reference_id: order.id,
          reference_type: 'order',
          created_at: order.created_at,
          created_by: order.cashier_id
        })
      }
    })

    return {
      data: {
        data: transactions,
        total: ordersCount || 0,
        page,
        pageSize,
        totalPages: ordersCount ? Math.ceil(ordersCount / pageSize) : 0
      },
      error: null
    }

  } catch (error: any) {
    console.error('getTransactions error:', error)
    return { data: null, error: error.message || 'Failed to fetch transactions' }
  }
}
