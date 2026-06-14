'use client'

import { useState, useEffect } from 'react'
import { useFinanceStore } from '@/hooks/finance/useFinanceStore'
import { getExpenses, deleteExpense } from '@/actions/finance/expenses.actions'
import { getBranches } from '@/actions/finance/branches.actions'
import { DateRangePicker } from '@/components/finance/DateRangePicker'
import { BranchSelector } from '@/components/finance/BranchSelector'
import { ExpenseTable } from '@/components/finance/ExpenseTable'
import { ExpenseForm } from '@/components/finance/ExpenseForm'
import { Expense, ExpenseFilters, PaginatedResult, EGYPT_EXPENSE_CATEGORIES, Branch } from '@/types/finance/finance.types'
import { Plus, Download } from 'lucide-react'
import { endOfDay, startOfDay } from 'date-fns'
import toast from 'react-hot-toast'

export default function ExpensesPage() {
  const { dateRange, selectedBranchId } = useFinanceStore()
  
  const [data, setData] = useState<PaginatedResult<Expense> | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [branches, setBranches] = useState<Branch[]>([])
  
  // Local filters
  const [categoryFilter, setCategoryFilter] = useState<string>('')
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

  const loadData = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const filters: ExpenseFilters = {
        dateFrom: startOfDay(dateRange.from).toISOString(),
        dateTo: endOfDay(dateRange.to).toISOString(),
        branchId: selectedBranchId,
        categories: categoryFilter ? [categoryFilter] : undefined
      }
      
      const response = await getExpenses(filters, page, 50)
      
      if (response.error) throw new Error(response.error)
      if (response.data) setData(response.data)
        
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [dateRange, selectedBranchId, categoryFilter, page])

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this expense? This action will be audited.')) return
    try {
      const res = await deleteExpense(id)
      if (res.error) throw new Error(res.error)
      toast.success('Expense deleted successfully')
      loadData()
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  return (
    <div className="space-y-6 relative">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Expense Management</h1>
          <p className="text-sm text-gray-400 mt-1">
            Track and categorize store operating costs.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-3 py-2 bg-gray-900 border border-gray-800 rounded-lg text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors">
            <Download className="h-4 w-4" />
            Export
          </button>
          <button 
            onClick={() => setIsFormOpen(true)}
            className="flex items-center gap-2 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-sm text-white font-medium transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Expense
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center bg-gray-900/30 p-3 rounded-xl border border-gray-800">
        <div className="flex-1 w-full">
          <select 
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value)
              setPage(1)
            }}
            className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-emerald-500/50"
          >
            <option value="">All Categories</option>
            {EGYPT_EXPENSE_CATEGORIES.map(cat => (
              <option key={cat.key} value={cat.key}>{cat.label}</option>
            ))}
          </select>
        </div>
        <div className="h-6 w-px bg-gray-800 hidden sm:block"></div>
        <div className="flex items-center gap-3 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <BranchSelector branches={branches} />
          <DateRangePicker />
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Table */}
      <ExpenseTable 
        data={data?.data || []} 
        isLoading={isLoading} 
        onDelete={handleDelete}
        isAdmin={true} // Would be derived from session
      />

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

      {/* Form Modal */}
      {isFormOpen && (
        <ExpenseForm 
          branches={branches}
          onClose={() => setIsFormOpen(false)}
          onSuccess={() => {
            setIsFormOpen(false)
            loadData()
          }}
        />
      )}
    </div>
  )
}
