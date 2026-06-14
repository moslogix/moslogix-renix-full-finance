'use client'

import { useState, useRef, useEffect } from 'react'
import { Calendar, ChevronDown } from 'lucide-react'
import { useFinanceStore } from '@/hooks/finance/useFinanceStore'
import { DatePreset } from '@/types/finance/finance.types'
import { fmtDate } from '@/lib/finance/formatters'
import { startOfDay, endOfDay } from 'date-fns'
import clsx from 'clsx'

const PRESETS: { value: DatePreset; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'this_week', label: 'This Week' },
  { value: 'last_week', label: 'Last Week' },
  { value: 'this_month', label: 'This Month' },
  { value: 'last_month', label: 'Last Month' },
  { value: 'this_quarter', label: 'This Quarter' },
  { value: 'this_year', label: 'This Year' },
  { value: 'custom', label: 'Custom Range' },
]

export function DateRangePicker() {
  const { dateRange, setPreset, setDateRange } = useFinanceStore()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Custom date state
  const [customFrom, setCustomFrom] = useState(dateRange.from.toISOString().split('T')[0])
  const [customTo, setCustomTo] = useState(dateRange.to.toISOString().split('T')[0])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleApplyCustom = () => {
    const fromDate = startOfDay(new Date(customFrom))
    const toDate = endOfDay(new Date(customTo))
    
    if (fromDate > toDate) {
      alert('Start date must be before end date')
      return
    }

    setDateRange({
      from: fromDate,
      to: toDate,
      preset: 'custom',
    })
    setIsOpen(false)
  }

  const handlePresetSelect = (preset: DatePreset) => {
    if (preset !== 'custom') {
      setPreset(preset)
      setIsOpen(false)
    } else {
      // If custom is selected, we just switch the view, we don't close
      setDateRange({ ...dateRange, preset: 'custom' })
    }
  }

  const isCustom = dateRange.preset === 'custom'
  const displayText = isCustom 
    ? `${fmtDate(dateRange.from)} - ${fmtDate(dateRange.to)}`
    : PRESETS.find(p => p.value === dateRange.preset)?.label || 'Select Date'

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-gray-900 border border-gray-800 rounded-lg text-sm hover:bg-gray-800 hover:border-gray-700 transition-colors"
      >
        <Calendar className="h-4 w-4 text-gray-400" />
        <span className="font-medium">{displayText}</span>
        <ChevronDown className="h-4 w-4 text-gray-500 ml-1" />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-72 bg-gray-900 border border-gray-800 rounded-xl shadow-xl overflow-hidden z-50">
          <div className="p-2 border-b border-gray-800">
            <div className="grid grid-cols-2 gap-1">
              {PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  onClick={() => handlePresetSelect(preset.value)}
                  className={clsx(
                    "text-left px-3 py-2 text-sm rounded-md transition-colors",
                    dateRange.preset === preset.value
                      ? "bg-emerald-500/10 text-emerald-400 font-medium"
                      : "text-gray-300 hover:bg-gray-800 hover:text-gray-100"
                  )}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
          
          {isCustom && (
            <div className="p-4 space-y-4 bg-gray-950/50">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">From</label>
                  <input
                    type="date"
                    value={customFrom}
                    onChange={(e) => setCustomFrom(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-800 rounded-md px-3 py-1.5 text-sm text-gray-100 focus:outline-none focus:border-emerald-500/50"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">To</label>
                  <input
                    type="date"
                    value={customTo}
                    onChange={(e) => setCustomTo(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-800 rounded-md px-3 py-1.5 text-sm text-gray-100 focus:outline-none focus:border-emerald-500/50"
                  />
                </div>
              </div>
              <button
                onClick={handleApplyCustom}
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-md transition-colors"
              >
                Apply Custom Range
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
