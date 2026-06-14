import { create } from 'zustand'
import { getDateRangeForPreset } from '@/lib/finance/dateRanges'
import type { DatePreset, DateRange } from '@/types/finance/finance.types'

interface FinanceState {
  // Store Context
  storeId: string | null
  setStoreId: (id: string) => void
  
  // Date Range Context
  dateRange: DateRange
  setDateRange: (range: DateRange) => void
  setPreset: (preset: DatePreset) => void
  
  // Branch Context
  selectedBranchId: string | 'all'
  setSelectedBranchId: (id: string | 'all') => void
}

const defaultDateRange = getDateRangeForPreset('this_month')

export const useFinanceStore = create<FinanceState>((set) => ({
  storeId: null,
  setStoreId: (id) => set({ storeId: id }),
  
  dateRange: defaultDateRange,
  setDateRange: (range) => set({ dateRange: range }),
  setPreset: (preset) => set({ dateRange: getDateRangeForPreset(preset) }),
  
  selectedBranchId: 'all',
  setSelectedBranchId: (id) => set({ selectedBranchId: id }),
}))
