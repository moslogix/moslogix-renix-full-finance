'use client'

import { useState, useEffect } from 'react'
import { useFinanceStore } from '@/hooks/finance/useFinanceStore'
import { getTransactions } from '@/actions/finance/transactions.actions'
import { getBranches } from '@/actions/finance/branches.actions'
import { DateRangePicker } from '@/components/finance/DateRangePicker'
import { BranchSelector } from '@/components/finance/BranchSelector'
import { TransactionTable } from '@/components/finance/TransactionTable'
import { Transaction, TransactionFilters, PaginatedResult, Branch } from '@/types/finance/finance.types'
import { Search, Filter, Download } from 'lucide-react'
import { endOfDay, startOfDay } from 'date-fns'

export default function TransactionsPage() {
  const { dateRange, selectedBranchId } = useFinanceStore()
  
  const [data, setData] = useState<PaginatedResult<Transaction> | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [branches, setBranches] = useState<Branch[]>([])
  
  // Local filters
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

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
    let isMounted = true
    
    async function loadData() {
      setIsLoading(true)
      setError(null)
      try {
        const filters: TransactionFilters = {
          dateFrom: startOfDay(dateRange.from).toISOString(),
          dateTo: endOfDay(dateRange.to).toISOString(),
          branchId: selectedBranchId,
          search: search || undefined
        }
        
        const response = await getTransactions(filters, page, 50)
        
        if (response.error) throw new Error(response.error)
        if (isMounted && response.data) setData(response.data)
          
      } catch (err: any) {
        if (isMounted) setError(err.message)
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }

    const timer = setTimeout(loadData, 400) // debounce
    return () => {
      isMounted = false
      clearTimeout(timer)
    }
  }, [dateRange, selectedBranchId, search, page])

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value)
    setPage(1) // Reset to first page on search
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Transaction Ledger</h1>
          <p className="text-sm text-gray-400 mt-1">
            Immutable log of all financial events.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-3 py-2 bg-gray-900 border border-gray-800 rounded-lg text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors">
            <Download className="h-4 w-4" />
            Export
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center bg-gray-900/30 p-3 rounded-xl border border-gray-800">
        <div className="flex-1 relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <input 
            type="text" 
            placeholder="Search reference or description..." 
            value={search}
            onChange={handleSearchChange}
            className="w-full bg-gray-950 border border-gray-800 rounded-lg pl-9 pr-4 py-2 text-sm text-gray-100 placeholder:text-gray-600 focus:outline-none focus:border-emerald-500/50"
          />
        </div>
        <div className="h-6 w-px bg-gray-800 hidden sm:block"></div>
        <div className="flex items-center gap-3 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <BranchSelector branches={branches} />
          <DateRangePicker />
          <button className="flex items-center gap-2 px-3 py-2 bg-gray-900 border border-gray-800 rounded-lg text-sm text-gray-300 hover:bg-gray-800 transition-colors">
            <Filter className="h-4 w-4" />
            More
          </button>
        </div>
      </div>

      {/* Alert about immutability */}
      <div className="bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm p-3 rounded-lg flex items-start gap-3">
        <div className="mt-0.5 shrink-0">ℹ️</div>
        <div>
          <span className="font-medium">Immutable Ledger:</span> Transactions cannot be edited or deleted. To correct an error, you must issue a refund or a new adjustment entry.
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Table */}
      <TransactionTable data={data?.data || []} isLoading={isLoading} />

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-400">
          <div>
            Showing {(page - 1) * data.pageSize + 1} to {Math.min(page * data.pageSize, data.total)} of {data.total}
          </div>
          <div className="flex gap-2">
            <button 
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
              className="px-3 py-1 bg-gray-900 border border-gray-800 rounded hover:bg-gray-800 disabled:opacity-50"
            >
              Previous
            </button>
            <button 
              disabled={page === data.totalPages}
              onClick={() => setPage(p => p + 1)}
              className="px-3 py-1 bg-gray-900 border border-gray-800 rounded hover:bg-gray-800 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
