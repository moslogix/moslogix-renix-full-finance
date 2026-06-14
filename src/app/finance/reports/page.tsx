'use client'

import { useState, useEffect } from 'react'
import { useFinanceStore } from '@/hooks/finance/useFinanceStore'
import { generatePnLReport, PnLReportData } from '@/actions/finance/reports.actions'
import { getBranches } from '@/actions/finance/branches.actions'
import { DateRangePicker } from '@/components/finance/DateRangePicker'
import { BranchSelector } from '@/components/finance/BranchSelector'
import { fmtCurrency, fmtPct } from '@/lib/finance/formatters'
import { Download, FileText } from 'lucide-react'
import { Branch } from '@/types/finance/finance.types'

export default function ReportsPage() {
  const { dateRange, selectedBranchId } = useFinanceStore()
  const [data, setData] = useState<PnLReportData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [branches, setBranches] = useState<Branch[]>([])

  // Fetch branches on mount
  useEffect(() => {
    let isMounted = true
    async function loadBranches() {
      try {
        const response = await getBranches()
        if (isMounted && response.data) setBranches(response.data)
      } catch (err) {
        console.error('Failed to load branches:', err)
      }
    }
    loadBranches()
    return () => { isMounted = false }
  }, [])

  useEffect(() => {
    async function load() {
      setIsLoading(true)
      try {
        const res = await generatePnLReport(dateRange, selectedBranchId)
        if (res.error) throw new Error(res.error)
        setData(res.data)
      } catch (err: any) {
        setError(err.message)
      } finally {
        setIsLoading(false)
      }
    }
    const t = setTimeout(load, 300)
    return () => clearTimeout(t)
  }, [dateRange, selectedBranchId])

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Financial Reports</h1>
          <p className="text-sm text-gray-400 mt-1">
            Generate and export standard accounting statements.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <BranchSelector branches={branches} />
          <DateRangePicker />
          <button className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-sm text-white font-medium transition-colors">
            <Download className="h-4 w-4" />
            Export PDF
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* P&L Statement */}
      <div className="max-w-4xl mx-auto bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="bg-gray-800/50 p-6 text-center border-b border-gray-800">
          <FileText className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
          <h2 className="text-xl font-bold text-gray-100">Income Statement (P&L)</h2>
          <p className="text-gray-400 text-sm mt-1">
            For the period {dateRange.from.toLocaleDateString()} to {dateRange.to.toLocaleDateString()}
          </p>
        </div>

        <div className="p-8">
          {isLoading ? (
            <div className="h-64 flex items-center justify-center animate-pulse text-gray-500">
              Generating report...
            </div>
          ) : data ? (
            <div className="space-y-8 font-mono text-sm">
              
              {/* Revenue */}
              <div>
                <h3 className="font-bold text-gray-300 uppercase tracking-wider mb-3 border-b border-gray-800 pb-2">Revenue</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-gray-400">
                    <span>Gross Sales Revenue</span>
                    <span>{fmtCurrency(data.grossRevenue)}</span>
                  </div>
                  <div className="flex justify-between text-gray-400 border-b border-dashed border-gray-800 pb-2">
                    <span>Less: Refunds & Returns</span>
                    <span>({fmtCurrency(0)}) {/* MOCK FOR NOW */}</span>
                  </div>
                  <div className="flex justify-between font-bold text-gray-200 pt-1">
                    <span>Net Revenue</span>
                    <span>{fmtCurrency(data.grossRevenue)}</span>
                  </div>
                </div>
              </div>

              {/* COGS & Gross Profit */}
              <div>
                <h3 className="font-bold text-gray-300 uppercase tracking-wider mb-3 border-b border-gray-800 pb-2">Cost of Goods Sold</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-gray-400 border-b border-dashed border-gray-800 pb-2">
                    <span>Total Cost of Goods Sold</span>
                    <span>({fmtCurrency(data.cogs)})</span>
                  </div>
                  <div className="flex justify-between font-bold text-gray-200 pt-1">
                    <span>Gross Profit</span>
                    <span className="text-emerald-400">{fmtCurrency(data.grossProfit)}</span>
                  </div>
                </div>
              </div>

              {/* Operating Expenses */}
              <div>
                <h3 className="font-bold text-gray-300 uppercase tracking-wider mb-3 border-b border-gray-800 pb-2">Operating Expenses</h3>
                <div className="space-y-2 pl-4">
                  {data.expenses.map(exp => (
                    <div key={exp.category} className="flex justify-between text-gray-400 capitalize">
                      <span>{exp.category.replace('_', ' ')}</span>
                      <span>{fmtCurrency(exp.amount)}</span>
                    </div>
                  ))}
                  {data.expenses.length === 0 && (
                    <div className="text-gray-600 italic">No expenses recorded</div>
                  )}
                  <div className="flex justify-between font-bold text-gray-200 border-t border-dashed border-gray-800 pt-2 mt-2">
                    <span>Total Operating Expenses</span>
                    <span>({fmtCurrency(data.totalExpenses)})</span>
                  </div>
                </div>
              </div>

              {/* Net Income */}
              <div className="border-t-2 border-gray-700 pt-4 mt-8">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-bold text-gray-100">Net Profit</span>
                  <span className={`text-xl font-bold tabular-nums ${data.netProfit >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                    {fmtCurrency(data.netProfit)}
                  </span>
                </div>
                <div className="flex justify-between items-center mt-2 text-gray-400">
                  <span>Net Profit Margin</span>
                  <span>{fmtPct(data.profitMargin)}</span>
                </div>
              </div>

              {/* Tax Note */}
              <div className="mt-12 bg-gray-950 p-4 rounded border border-gray-800 text-xs text-gray-500">
                <p><strong>Note:</strong> Taxes collected ({fmtCurrency(data.taxesCollected)}) are held as a liability and are not recognized as revenue per Egyptian Accounting Standards (EAS).</p>
              </div>

            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500">
              No data available
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
