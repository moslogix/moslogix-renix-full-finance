'use server'

import { createClient } from '@/lib/supabase/server'
import type { DateRange } from '@/types/finance/finance.types'
import { getPriorPeriod } from '@/lib/finance/dateRanges'
import { 
  calcGrossRevenue, 
  calcTotalRefunds, 
  calcNetRevenue, 
  calcTaxCollected,
  calcTotalExpenses,
  calcCOGS,
  calcGrossProfit,
  calcNetProfit,
  calcProfitMarginPct
} from '@/lib/finance/calculations'
import { ActionResponse, Transaction, Expense, OrderItemWithCost } from '@/types/finance/finance.types'

export interface PnLReportData {
  grossRevenue: number
  cogs: number
  grossProfit: number
  expenses: { category: string; amount: number }[]
  totalExpenses: number
  netProfit: number
  profitMargin: number
  taxesCollected: number
}

export async function generatePnLReport(range: DateRange, branchId: string | 'all'): Promise<ActionResponse<PnLReportData>> {
  try {
    const supabase = await createClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) throw new Error('Unauthorized')

    const { data: user } = await supabase
      .from('profiles')
      .select('store_id, role')
      .eq('id', authUser.id)
      .single()

    if (!user) throw new Error('Unauthorized')

    const storeId = user.store_id

    // Fetch orders as primary data source
    let ordersQuery = supabase
      .from('orders')
      .select('*')
      .eq('store_id', storeId)
      .in('status', ['confirmed', 'completed', 'delivered'])
      .gte('created_at', range.from.toISOString())
      .lte('created_at', range.to.toISOString())

    if (branchId !== 'all') {
      ordersQuery = ordersQuery.eq('branch_id', branchId)
    }

    const { data: ordersData } = await ordersQuery
    const orders: any[] = ordersData || []
    const orderIds = orders.map(o => o.id)

    // Fetch transactions (may be empty)
    let txQuery = supabase
      .from('transactions')
      .select('amount, type')
      .eq('store_id', storeId)
      .gte('created_at', range.from.toISOString())
      .lte('created_at', range.to.toISOString())
      .in('type', ['revenue', 'refund', 'tax'])

    if (branchId !== 'all') {
      txQuery = txQuery.eq('branch_id', branchId)
    }

    const { data: txData } = await txQuery
    let transactions = (txData || []) as Transaction[]

    // Build from orders if no transactions
    if (transactions.length === 0 && orders.length > 0) {
      transactions = []
      orders.forEach(order => {
        transactions.push({
          id: order.id,
          store_id: order.store_id,
          branch_id: order.branch_id,
          type: 'revenue',
          amount: order.total_amount || 0,
          description: '',
          reference_id: order.id,
          reference_type: 'order',
          created_at: order.created_at,
          created_by: null
        })
        if (order.tax_amount > 0) {
          transactions.push({
            id: `${order.id}-tax`,
            store_id: order.store_id,
            branch_id: order.branch_id,
            type: 'tax',
            amount: order.tax_amount,
            description: '',
            reference_id: order.id,
            reference_type: 'order',
            created_at: order.created_at,
            created_by: null
          })
        }
      })
    }

    // Fetch expenses
    let expQuery = supabase
      .from('expenses')
      .select('amount, category')
      .eq('store_id', storeId)
      .is('deleted_at', null)
      .gte('expense_date', range.from.toISOString())
      .lte('expense_date', range.to.toISOString())

    if (branchId !== 'all') {
      expQuery = expQuery.eq('branch_id', branchId)
    }

    let { data: expData } = await expQuery
    let expenses = (expData || []) as Expense[]

    // Retry without expense_date / deleted_at if needed
    if (expenses.length === 0) {
      let expRetry = supabase
        .from('expenses')
        .select('amount, category')
        .eq('store_id', storeId)
        .gte('created_at', range.from.toISOString())
        .lte('created_at', range.to.toISOString())
      if (branchId !== 'all') expRetry = expRetry.eq('branch_id', branchId)
      const { data: expData2 } = await expRetry
      expenses = (expData2 || []) as Expense[]
    }

    // Fetch COGS from order items
    let orderItems: any[] = []
    if (orderIds.length > 0) {
      const { data: oiData } = await supabase
        .from('order_items')
        .select('cost_price, quantity')
        .in('order_id', orderIds)
      orderItems = oiData || []
    }

    const grossRev = calcGrossRevenue(transactions)
    const refunds = calcTotalRefunds(transactions)
    const netRev = calcNetRevenue(grossRev, refunds)
    const cogs = calcCOGS(orderItems as OrderItemWithCost[])
    const grossProfit = calcGrossProfit(netRev, cogs)
    
    const expByCategory = new Map<string, number>()
    expenses.forEach(e => {
      expByCategory.set(e.category, (expByCategory.get(e.category) || 0) + e.amount)
    })
    
    const expensesList = Array.from(expByCategory.entries()).map(([category, amount]) => ({ category, amount }))
    const totalExp = calcTotalExpenses(expenses)
    
    const netProfit = calcNetProfit(grossProfit, totalExp)
    const margin = calcProfitMarginPct(netProfit, netRev)
    const tax = calcTaxCollected(transactions)

    return {
      data: {
        grossRevenue: grossRev,
        cogs,
        grossProfit,
        expenses: expensesList,
        totalExpenses: totalExp,
        netProfit,
        profitMargin: margin,
        taxesCollected: tax
      },
      error: null
    }

  } catch (error: any) {
    return { data: null, error: error.message }
  }
}
