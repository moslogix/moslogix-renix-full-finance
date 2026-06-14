'use client'

import { useEffect, useState } from 'react'
import { useFinanceStore } from '@/hooks/finance/useFinanceStore'
import { getDashboardData, DashboardData } from '@/actions/finance/dashboard.actions'
import { getBranches } from '@/actions/finance/branches.actions'
import { KpiCard } from '@/components/finance/KpiCard'
import { RevenueChart } from '@/components/finance/RevenueChart'
import { ProfitChart } from '@/components/finance/ProfitChart'
import { ExpenseBreakdownChart } from '@/components/finance/ExpenseBreakdownChart'
import { PaymentMethodChart } from '@/components/finance/PaymentMethodChart'
import { TopProductsTable } from '@/components/finance/TopProductsTable'
import { DateRangePicker } from '@/components/finance/DateRangePicker'
import { BranchSelector } from '@/components/finance/BranchSelector'
import { Branch } from '@/types/finance/finance.types'
import { 
  Banknote, 
  Wallet, 
  TrendingUp, 
  LineChart, 
  Percent, 
  Receipt,
  ArrowDownCircle,
  ArrowUpCircle
} from 'lucide-react'
import { fmtCurrency, fmtPct } from '@/lib/finance/formatters'

export default function FinanceDashboardPage() {
  const { dateRange, selectedBranchId } = useFinanceStore()
  const [data, setData] = useState<DashboardData | null>(null)
  const [branches, setBranches] = useState<Branch[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingBranches, setIsLoadingBranches] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch branches on mount
  useEffect(() => {
    let isMounted = true
    async function loadBranches() {
      try {
        const response = await getBranches()
        if (response.error) throw new Error(response.error)
        if (isMounted) setBranches(response.data || [])
      } catch (err: any) {
        console.error('Failed to load branches:', err)
      } finally {
        if (isMounted) setIsLoadingBranches(false)
      }
    }
    loadBranches()
    return () => { isMounted = false }
  }, [])

  useEffect(() => {
    let isMounted = true
    
    async function loadData() {
      setIsLoading(true)
      setError(null)
      try {
        const response = await getDashboardData(dateRange, selectedBranchId)
        if (response.error) throw new Error(response.error)
        if (isMounted && response.data) setData(response.data)
      } catch (err: any) {
          if (isMounted) setError(err.message)
        } finally {
          if (isMounted) setIsLoading(false)
        }
    }

    // Debounce the fetch slightly to avoid spamming while picking custom dates
    const timer = setTimeout(loadData, 400)
    return () => {
      isMounted = false
      clearTimeout(timer)
    }
  }, [dateRange, selectedBranchId])

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Finance Dashboard</h1>
          <p className="text-sm text-gray-400 mt-1">
            Real-time financial overview and KPIs.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <BranchSelector branches={branches} />
          <DateRangePicker />
        </div>
      </div>
      
      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          Error loading dashboard data: {error}
        </div>
      )}

      {/* KPI Cards Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Gross Revenue"
          value={data ? fmtCurrency(data.metrics.grossRevenue.value) : '0.00 EGP'}
          delta={data?.metrics.grossRevenue.delta}
          icon={<Banknote className="h-5 w-5" />}
          isLoading={isLoading}
        />
        <KpiCard
          label="Net Revenue"
          value={data ? fmtCurrency(data.metrics.netRevenue.value) : '0.00 EGP'}
          delta={data?.metrics.netRevenue.delta}
          icon={<Wallet className="h-5 w-5" />}
          isLoading={isLoading}
        />
        <KpiCard
          label="Gross Profit"
          value={data ? fmtCurrency(data.metrics.grossProfit.value) : '0.00 EGP'}
          delta={data?.metrics.grossProfit.delta}
          icon={<TrendingUp className="h-5 w-5" />}
          isLoading={isLoading}
        />
        <KpiCard
          label="Net Profit"
          value={data ? fmtCurrency(data.metrics.netProfit.value) : '0.00 EGP'}
          delta={data?.metrics.netProfit.delta}
          icon={<LineChart className="h-5 w-5" />}
          isLoading={isLoading}
        />
        <KpiCard
          label="Profit Margin"
          value={data ? fmtPct(data.metrics.profitMargin.value) : '0.0%'}
          delta={data?.metrics.profitMargin.delta}
          icon={<Percent className="h-5 w-5" />}
          isLoading={isLoading}
        />
        <KpiCard
          label="Total Expenses"
          value={data ? fmtCurrency(data.metrics.totalExpenses.value) : '0.00 EGP'}
          delta={data?.metrics.totalExpenses.delta}
          icon={<ArrowDownCircle className="h-5 w-5" />}
          invertDeltaColor={true} // For expenses, UP is bad (red)
          isLoading={isLoading}
        />
        <KpiCard
          label="Tax Collected"
          value={data ? fmtCurrency(data.metrics.taxCollected.value) : '0.00 EGP'}
          delta={data?.metrics.taxCollected.delta}
          icon={<Receipt className="h-5 w-5" />}
          isLoading={isLoading}
        />
        <KpiCard
          label="Total Refunds"
          value={data ? fmtCurrency(data.metrics.totalRefunds.value) : '0.00 EGP'}
          delta={data?.metrics.totalRefunds.delta}
          icon={<ArrowUpCircle className="h-5 w-5" />}
          invertDeltaColor={true} // For refunds, UP is bad (red)
          isLoading={isLoading}
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-800 bg-gray-900/30 p-6 h-[400px] flex flex-col">
          <div className="mb-6">
            <h3 className="font-medium text-gray-200">Revenue Over Time</h3>
            <p className="text-xs text-gray-500 mt-1">Gross vs Net Revenue trends</p>
          </div>
          <div className="flex-1 min-h-0">
            {isLoading ? (
              <div className="h-full w-full bg-gray-800/50 animate-pulse rounded-lg" />
            ) : (
              <RevenueChart data={data?.charts.revenue || []} />
            )}
          </div>
        </div>

        <div className="rounded-xl border border-gray-800 bg-gray-900/30 p-6 h-[400px] flex flex-col">
          <div className="mb-6">
            <h3 className="font-medium text-gray-200">Profit Breakdown</h3>
            <p className="text-xs text-gray-500 mt-1">Gross Profit vs Net Profit & Expenses</p>
          </div>
          <div className="flex-1 min-h-0">
            {isLoading ? (
              <div className="h-full w-full bg-gray-800/50 animate-pulse rounded-lg" />
            ) : (
              <ProfitChart data={data?.charts.profit || []} />
            )}
          </div>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-gray-800 bg-gray-900/30 p-6 h-[350px] flex flex-col">
          <div className="mb-4">
            <h3 className="font-medium text-gray-200">Expenses by Category</h3>
            <p className="text-xs text-gray-500 mt-1">Distribution of operating costs</p>
          </div>
          <div className="flex-1 min-h-0">
            {isLoading ? (
              <div className="h-full w-full rounded-full bg-gray-800/50 animate-pulse m-auto aspect-square max-h-[200px]" />
            ) : (
              <ExpenseBreakdownChart data={data?.charts.expenses || []} />
            )}
          </div>
        </div>

        <div className="rounded-xl border border-gray-800 bg-gray-900/30 p-6 h-[350px] flex flex-col">
          <div className="mb-4">
            <h3 className="font-medium text-gray-200">Payment Methods</h3>
            <p className="text-xs text-gray-500 mt-1">Revenue by payment type</p>
          </div>
          <div className="flex-1 min-h-0">
            {isLoading ? (
              <div className="h-full w-full bg-gray-800/50 animate-pulse rounded-lg" />
            ) : (
              <PaymentMethodChart data={data?.charts.payments || []} />
            )}
          </div>
        </div>

        <div className="rounded-xl border border-gray-800 bg-gray-900/30 p-6 h-[350px] flex flex-col lg:col-span-1">
          <div className="mb-4">
            <h3 className="font-medium text-gray-200">Top 10 Products</h3>
            <p className="text-xs text-gray-500 mt-1">By revenue contribution</p>
          </div>
          <div className="flex-1 min-h-0 overflow-hidden rounded-lg border border-gray-800/50 bg-gray-950/50">
            {isLoading ? (
              <div className="h-full w-full bg-gray-800/50 animate-pulse" />
            ) : (
              <TopProductsTable data={data?.charts.topProducts || []} />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
