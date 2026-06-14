'use client'

import { useState, useRef, useEffect } from 'react'
import { MapPin, ChevronDown } from 'lucide-react'
import { useFinanceStore } from '@/hooks/finance/useFinanceStore'
import clsx from 'clsx'
import type { Branch } from '@/types/finance/finance.types'

interface BranchSelectorProps {
  branches: Branch[]
}

export function BranchSelector({ branches }: BranchSelectorProps) {
  const { selectedBranchId, setSelectedBranchId } = useFinanceStore()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelect = (id: string | 'all') => {
    setSelectedBranchId(id)
    setIsOpen(false)
  }

  const selectedBranch = branches.find((b) => b.id === selectedBranchId)
  const displayText = selectedBranchId === 'all' ? 'All Branches' : selectedBranch?.name || 'Unknown Branch'

  if (branches.length === 0) return null

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-gray-900 border border-gray-800 rounded-lg text-sm hover:bg-gray-800 hover:border-gray-700 transition-colors"
      >
        <MapPin className="h-4 w-4 text-gray-400" />
        <span className="font-medium">{displayText}</span>
        <ChevronDown className="h-4 w-4 text-gray-500 ml-1" />
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-56 bg-gray-900 border border-gray-800 rounded-xl shadow-xl overflow-hidden z-50 py-1">
          <button
            onClick={() => handleSelect('all')}
            className={clsx(
              "w-full text-left px-4 py-2 text-sm transition-colors",
              selectedBranchId === 'all'
                ? "bg-emerald-500/10 text-emerald-400 font-medium"
                : "text-gray-300 hover:bg-gray-800 hover:text-gray-100"
            )}
          >
            All Branches
          </button>
          
          <div className="h-px bg-gray-800 my-1" />
          
          {branches.map((branch) => (
            <button
              key={branch.id}
              onClick={() => handleSelect(branch.id)}
              className={clsx(
                "w-full text-left px-4 py-2 text-sm transition-colors",
                selectedBranchId === branch.id
                  ? "bg-emerald-500/10 text-emerald-400 font-medium"
                  : "text-gray-300 hover:bg-gray-800 hover:text-gray-100"
              )}
            >
              {branch.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
