'use server'

import { createClient } from '@/lib/supabase/server'
import { getPriorPeriod } from '@/lib/finance/dateRanges'
import type { DateRange } from '@/types/finance/finance.types'
import { 
  calcGrossRevenue, 
  calcTotalRefunds, 
  calcNetRevenue, 
  calcTaxCollected,
  calcTotalExpenses,
  calcCOGS,
  calcGrossProfit,
  calcNetProfit,
  calcProfitMarginPct,
  calcDelta
} from '@/lib/finance/calculations'
import type { 
  ActionResponse, 
  Transaction, 
  Expense, 
  OrderItemWithCost,
  RevenueChartPoint,
  ProfitChartPoint,
  ExpenseCategorySlice,
  PaymentMethodBar,
  TopProduct,
  DeltaResult
} from '@/types/finance/finance.types'

export interface DashboardMetrics {
  grossRevenue: { value: number; delta: DeltaResult }
  netRevenue: { value: number; delta: DeltaResult }
  totalExpenses: { value: number; delta: DeltaResult }
  grossProfit: { value: number; delta: DeltaResult }
  netProfit: { value: number; delta: DeltaResult }
  profitMargin: { value: number; delta: DeltaResult }
  taxCollected: { value: number; delta: DeltaResult }
  totalRefunds: { value: number; delta: DeltaResult }
}

export interface DashboardData {
  metrics: DashboardMetrics
  charts: {
    revenue: RevenueChartPoint[]
    profit: ProfitChartPoint[]
    expenses: ExpenseCategorySlice[]
    payments: PaymentMethodBar[]
    topProducts: TopProduct[]
  }
}

/**
 * Validates session and gets storeId
 */
async function getAuthContext() {
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

  return { supabase, storeId: user.store_id, userId: authUser.id }
}

export async function getDashboardData(
  range: DateRange,
  branchId: string | 'all'
): Promise<ActionResponse<DashboardData>> {
  try {
    const { supabase, storeId } = await getAuthContext()
    const priorRange = getPriorPeriod(range)

    // ═══════════════════════════════════════════════════════════════
    // CURRENT PERIOD: Fetch ORDERS first (most reliable data source)
    // NOTE: POS creates orders with status 'confirmed', not 'completed'
    // ═══════════════════════════════════════════════════════════════
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

    const { data: ordersData, error: ordersError } = await ordersQuery
    if (ordersError) console.warn('[Finance Dashboard] Orders query failed:', ordersError.message)
    const orders: any[] = ordersData || []
    console.log(`[Finance Dashboard] Found ${orders.length} orders for store ${storeId}`)
    const orderIds = orders.map((o: any) => o.id)

    // Fetch ORDER ITEMS by order IDs
    let orderItems: any[] = []
    if (orderIds.length > 0) {
      const { data: oiData, error: oiError } = await supabase
        .from('order_items')
        .select('*')
        .in('order_id', orderIds)
      if (oiError) console.warn('[Finance Dashboard] Order items query failed:', oiError.message)
      orderItems = oiData || []
    }

    // Fetch EXPENSES
    let expQuery = supabase
      .from('expenses')
      .select('*')
      .eq('store_id', storeId)
      .is('deleted_at', null)
      .gte('expense_date', range.from.toISOString())
      .lte('expense_date', range.to.toISOString())

    if (branchId !== 'all') {
      expQuery = expQuery.eq('branch_id', branchId)
    }

    const { data: expData, error: expError } = await expQuery
    if (expError) {
      // Retry without deleted_at and expense_date (columns may not exist)
      console.warn('[Finance Dashboard] Expenses query with deleted_at/expense_date failed:', expError.message, '— retrying without those filters')
      let expRetry = supabase
        .from('expenses')
        .select('*')
        .eq('store_id', storeId)
        .gte('created_at', range.from.toISOString())
        .lte('created_at', range.to.toISOString())
      if (branchId !== 'all') expRetry = expRetry.eq('branch_id', branchId)
      const { data: expData2, error: expError2 } = await expRetry
      if (expError2) console.warn('[Finance Dashboard] Expenses query failed:', expError2.message)
      expData2?.forEach((e: any) => { e.expense_date = e.expense_date || e.created_at })
      const expenses = (expData2 || []) as Expense[]
      var currentExpenses = expenses
    } else {
      var currentExpenses = (expData || []) as Expense[]
    }

    // Fetch TRANSACTIONS (may be empty if table was just created)
    let txQuery = supabase
      .from('transactions')
      .select('*')
      .eq('store_id', storeId)
      .gte('created_at', range.from.toISOString())
      .lte('created_at', range.to.toISOString())
      .in('type', ['revenue', 'refund', 'tax'])

    if (branchId !== 'all') {
      txQuery = txQuery.eq('branch_id', branchId)
    }

    const { data: txData, error: txError } = await txQuery
    if (txError) console.warn('[Finance Dashboard] Transactions query failed:', txError.message)
    const transactions = (txData || []) as Transaction[]

    // Fetch PAYMENTS by order IDs
    let paymentsData: any[] = []
    if (orderIds.length > 0) {
      const { data: pData, error: pError } = await supabase
        .from('payments')
        .select('method, amount, created_at, order_id')
        .eq('status', 'completed')
        .in('order_id', orderIds)
      if (pError) {
        console.warn('[Finance Dashboard] Payments query failed:', pError.message)
      } else {
        paymentsData = pData || []
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // BUILD TRANSACTIONS FROM ORDERS IF TRANSACTIONS TABLE IS EMPTY
    // ═══════════════════════════════════════════════════════════════
    let allTransactions = [...transactions]

    if (allTransactions.length === 0 && orders.length > 0) {
      orders.forEach((order: any) => {
        allTransactions.push({
          id: order.id,
          store_id: order.store_id,
          branch_id: order.branch_id,
          type: 'revenue',
          amount: order.total_amount || 0,
          description: `Order #${order.order_number || order.id.slice(0, 8)}`,
          reference_id: order.id,
          reference_type: 'order',
          created_at: order.created_at,
          created_by: order.created_by
        })
        if (order.tax_amount > 0) {
          allTransactions.push({
            id: `${order.id}-tax`,
            store_id: order.store_id,
            branch_id: order.branch_id,
            type: 'tax',
            amount: order.tax_amount,
            description: `Tax for Order #${order.order_number || order.id.slice(0, 8)}`,
            reference_id: order.id,
            reference_type: 'order',
            created_at: order.created_at,
            created_by: order.created_by
          })
        }
        if (order.status === 'refunded' || order.refund_amount > 0) {
          allTransactions.push({
            id: `${order.id}-refund`,
            store_id: order.store_id,
            branch_id: order.branch_id,
            type: 'refund',
            amount: -(order.refund_amount || order.total_amount),
            description: `Refund for Order #${order.order_number || order.id.slice(0, 8)}`,
            reference_id: order.id,
            reference_type: 'order',
            created_at: order.updated_at || order.created_at,
            created_by: order.created_by
          })
        }
      })
    }

    // ═══════════════════════════════════════════════════════════════
    // CURRENT PERIOD METRICS
    // ═══════════════════════════════════════════════════════════════
    const currentGrossRev = calcGrossRevenue(allTransactions)
    const currentRefunds = calcTotalRefunds(allTransactions)
    const currentNetRev = calcNetRevenue(currentGrossRev, currentRefunds)
    const currentTax = calcTaxCollected(allTransactions)
    const currentExp = calcTotalExpenses(currentExpenses)
    const currentCOGS = calcCOGS(orderItems as OrderItemWithCost[])
    const currentGrossProf = calcGrossProfit(currentNetRev, currentCOGS)
    const currentNetProf = calcNetProfit(currentGrossProf, currentExp)
    const currentMargin = calcProfitMarginPct(currentNetProf, currentNetRev)

    console.log(`[Finance Dashboard] Metrics: grossRev=${currentGrossRev}, netRev=${currentNetRev}, expenses=${currentExp}, COGS=${currentCOGS}, grossProf=${currentGrossProf}, netProf=${currentNetProf}`)

    // ═══════════════════════════════════════════════════════════════
    // PRIOR PERIOD DATA
    // ═══════════════════════════════════════════════════════════════
    let pOrdersQuery = supabase
      .from('orders')
      .select('*')
      .eq('store_id', storeId)
      .in('status', ['confirmed', 'completed', 'delivered'])
      .gte('created_at', priorRange.from.toISOString())
      .lte('created_at', priorRange.to.toISOString())

    if (branchId !== 'all') {
      pOrdersQuery = pOrdersQuery.eq('branch_id', branchId)
    }

    const { data: pOrdersData, error: pOrdersError } = await pOrdersQuery
    if (pOrdersError) console.warn('[Finance Dashboard] Prior orders query failed:', pOrdersError.message)
    const pOrders: any[] = pOrdersData || []
    const pOrderIds = pOrders.map((o: any) => o.id)

    // Prior transactions
    let pTxQuery = supabase
      .from('transactions')
      .select('type, amount, created_at')
      .eq('store_id', storeId)
      .gte('created_at', priorRange.from.toISOString())
      .lte('created_at', priorRange.to.toISOString())
      .in('type', ['revenue', 'refund', 'tax'])

    if (branchId !== 'all') {
      pTxQuery = pTxQuery.eq('branch_id', branchId)
    }

    const { data: pTxData, error: pTxError } = await pTxQuery
    if (pTxError) console.warn('[Finance Dashboard] Prior transactions query failed:', pTxError.message)
    const pTransactions = (pTxData || []) as Transaction[]

    // Prior order items
    let pOrderItems: any[] = []
    if (pOrderIds.length > 0) {
      const { data: pOiData, error: pOiError } = await supabase
        .from('order_items')
        .select('cost_price, quantity')
        .in('order_id', pOrderIds)
      if (pOiError) console.warn('[Finance Dashboard] Prior order items query failed:', pOiError.message)
      pOrderItems = pOiData || []
    }

    // Prior expenses
    let pExpQuery = supabase
      .from('expenses')
      .select('amount, category, expense_date, created_at')
      .eq('store_id', storeId)
      .is('deleted_at', null)
      .gte('expense_date', priorRange.from.toISOString())
      .lte('expense_date', priorRange.to.toISOString())

    if (branchId !== 'all') {
      pExpQuery = pExpQuery.eq('branch_id', branchId)
    }

    const { data: pExpData, error: pExpError } = await pExpQuery
    let pExpenses: Expense[] = []
    if (pExpError) {
      // Retry without deleted_at / expense_date
      let pExpRetry = supabase
        .from('expenses')
        .select('amount, category, created_at')
        .eq('store_id', storeId)
        .gte('created_at', priorRange.from.toISOString())
        .lte('created_at', priorRange.to.toISOString())
      if (branchId !== 'all') pExpRetry = pExpRetry.eq('branch_id', branchId)
      const { data: pExpData2 } = await pExpRetry
      pExpenses = (pExpData2 || []) as Expense[]
    } else {
      pExpenses = (pExpData || []) as Expense[]
    }

    // Build prior transactions from orders if needed
    let allPTransactions = [...pTransactions]
    if (allPTransactions.length === 0 && pOrders.length > 0) {
      pOrders.forEach((order: any) => {
        allPTransactions.push({
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
          allPTransactions.push({
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

    const priorGrossRev = calcGrossRevenue(allPTransactions)
    const priorRefunds = calcTotalRefunds(allPTransactions)
    const priorNetRev = calcNetRevenue(priorGrossRev, priorRefunds)
    const priorTax = calcTaxCollected(allPTransactions)
    const priorExp = calcTotalExpenses(pExpenses)
    const priorCOGS = calcCOGS(pOrderItems as OrderItemWithCost[])
    const priorGrossProf = calcGrossProfit(priorNetRev, priorCOGS)
    const priorNetProf = calcNetProfit(priorGrossProf, priorExp)
    const priorMargin = calcProfitMarginPct(priorNetProf, priorNetRev)

    // ═══════════════════════════════════════════════════════════════
    // CHART AGGREGATIONS
    // ═══════════════════════════════════════════════════════════════

    // Expense Donut
    const expenseMap = new Map<string, number>()
    currentExpenses.forEach(e => {
      expenseMap.set(e.category, (expenseMap.get(e.category) || 0) + e.amount)
    })
    const totalExpForChart = Array.from(expenseMap.values()).reduce((a, b) => a + b, 0)
    const expensesChart: ExpenseCategorySlice[] = Array.from(expenseMap.entries())
      .map(([category, total]) => ({
        category,
        total,
        percentage: totalExpForChart > 0 ? (total / totalExpForChart) * 100 : 0
      }))
      .sort((a, b) => b.total - a.total)

    // Payments Bar
    const payMap = new Map<string, number>()
    let totalPay = 0
    paymentsData.forEach(p => {
      payMap.set(p.method, (payMap.get(p.method) || 0) + p.amount)
      totalPay += p.amount
    })
    const paymentsChart: PaymentMethodBar[] = Array.from(payMap.entries()).map(([method, total]) => ({
      method, total, percentage: totalPay > 0 ? (total/totalPay)*100 : 0
    }))

    // Top Products
    const prodMap = new Map<string, { name: string, units: number, rev: number, cost: number }>()
    orderItems.forEach((oi: any) => {
      const existing = prodMap.get(oi.product_id) || { name: oi.product_name || 'Unknown', units: 0, rev: 0, cost: 0 }
      existing.units += oi.quantity
      existing.rev += oi.total_amount || oi.total_price || 0
      existing.cost += (oi.cost_price || 0) * oi.quantity
      prodMap.set(oi.product_id, existing)
    })
    
    const topProductsChart: TopProduct[] = Array.from(prodMap.entries())
      .map(([productId, data]) => ({
        productId,
        productName: data.name,
        unitsSold: data.units,
        revenue: data.rev,
        costPrice: data.cost,
        profitMargin: data.rev > 0 ? ((data.rev - data.cost) / data.rev) * 100 : 0
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10)

    // Time-series: Revenue chart
    const revMap = new Map<string, { gross: number, net: number, refunds: number }>()
    allTransactions.forEach(t => {
      const dateStr = t.created_at.split('T')[0]
      const existing = revMap.get(dateStr) || { gross: 0, net: 0, refunds: 0 }
      if (t.type === 'revenue') existing.gross += t.amount
      if (t.type === 'refund') existing.refunds += Math.abs(t.amount)
      existing.net = existing.gross - existing.refunds
      revMap.set(dateStr, existing)
    })
    
    const revenueChart: RevenueChartPoint[] = Array.from(revMap.entries())
      .map(([date, data]) => ({
        date,
        grossRevenue: data.gross,
        netRevenue: data.net,
        refunds: data.refunds
      }))
      .sort((a, b) => a.date.localeCompare(b.date))

    // Profit chart
    const profMap = new Map<string, { grossProf: number, netProf: number, exp: number }>()
    revMap.forEach((data, dateStr) => {
      profMap.set(dateStr, { grossProf: data.net, netProf: data.net, exp: 0 })
    })
    // Subtract COGS per day
    orderItems.forEach((oi: any) => {
      const matchingOrder = orders.find((o: any) => o.id === oi.order_id)
      const dateStr = matchingOrder?.created_at?.split('T')[0]
      if (!dateStr) return
      const cogs = (oi.cost_price || 0) * oi.quantity
      const existing = profMap.get(dateStr) || { grossProf: 0, netProf: 0, exp: 0 }
      existing.grossProf -= cogs
      existing.netProf -= cogs
      profMap.set(dateStr, existing)
    })
    // Subtract Expenses per day
    currentExpenses.forEach(e => {
      const dateStr = (e.expense_date || e.created_at).split('T')[0]
      const existing = profMap.get(dateStr) || { grossProf: 0, netProf: 0, exp: 0 }
      existing.exp += e.amount
      existing.netProf -= e.amount
      profMap.set(dateStr, existing)
    })

    const profitChart: ProfitChartPoint[] = Array.from(profMap.entries())
      .map(([period, data]) => ({
        period,
        grossProfit: data.grossProf,
        netProfit: data.netProf,
        expenses: data.exp
      }))
      .sort((a, b) => a.period.localeCompare(b.period))

    return {
      data: {
        metrics: {
          grossRevenue: { value: currentGrossRev, delta: calcDelta(currentGrossRev, priorGrossRev) },
          netRevenue: { value: currentNetRev, delta: calcDelta(currentNetRev, priorNetRev) },
          totalExpenses: { value: currentExp, delta: calcDelta(currentExp, priorExp) },
          grossProfit: { value: currentGrossProf, delta: calcDelta(currentGrossProf, priorGrossProf) },
          netProfit: { value: currentNetProf, delta: calcDelta(currentNetProf, priorNetProf) },
          profitMargin: { value: currentMargin, delta: calcDelta(currentMargin, priorMargin) },
          taxCollected: { value: currentTax, delta: calcDelta(currentTax, priorTax) },
          totalRefunds: { value: currentRefunds, delta: calcDelta(currentRefunds, priorRefunds) }
        },
        charts: {
          revenue: revenueChart,
          profit: profitChart,
          expenses: expensesChart,
          payments: paymentsChart,
          topProducts: topProductsChart
        }
      },
      error: null
    }

  } catch (error: any) {
    console.error('getDashboardData error:', error)
    return { data: null, error: error.message || 'Failed to fetch dashboard data' }
  }
}
