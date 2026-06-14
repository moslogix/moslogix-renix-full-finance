import { ReactNode } from 'react'
import { clsx } from 'clsx'
import { DeltaResult } from '@/types/finance/finance.types'
import { deltaDisplay } from '@/lib/finance/formatters'

interface KpiCardProps {
  label: string
  value: string
  delta?: DeltaResult
  icon: ReactNode
  invertDeltaColor?: boolean
  isLoading?: boolean
}

export function KpiCard({ 
  label, 
  value, 
  delta, 
  icon, 
  invertDeltaColor = false,
  isLoading = false
}: KpiCardProps) {
  const deltaInfo = delta ? deltaDisplay(delta.pct, delta.direction, invertDeltaColor) : null

  if (isLoading) {
    return (
      <div className="rounded-xl border border-gray-800 bg-gray-900/40 p-6 flex flex-col justify-between h-[120px] animate-pulse">
        <div className="flex justify-between items-start">
          <div className="h-4 bg-gray-800 rounded w-24"></div>
          <div className="h-8 w-8 bg-gray-800 rounded-lg"></div>
        </div>
        <div className="space-y-2 mt-4">
          <div className="h-8 bg-gray-800 rounded w-32"></div>
          <div className="h-3 bg-gray-800 rounded w-16"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-6 hover:bg-gray-900/80 transition-colors">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-sm font-medium text-gray-400">{label}</h3>
        <div className="text-gray-500 bg-gray-950/50 p-2 rounded-lg border border-gray-800">
          {icon}
        </div>
      </div>
      
      <div className="flex items-baseline gap-3">
        <p className="text-2xl font-semibold tracking-tight text-gray-100">{value}</p>
      </div>

      {deltaInfo && (
        <p className={clsx("text-xs font-medium mt-2 flex items-center gap-1", deltaInfo.colorClass)}>
          {deltaInfo.text}
          <span className="text-gray-500 font-normal ml-1">vs prior period</span>
        </p>
      )}
    </div>
  )
}
