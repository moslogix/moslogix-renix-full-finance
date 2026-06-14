'use client'

import { TaxRule } from '@/types/finance/finance.types'
import { fmtPct } from '@/lib/finance/formatters'
import { Edit2 } from 'lucide-react'
import clsx from 'clsx'

interface TaxRuleTableProps {
  data: TaxRule[]
  isLoading?: boolean
  onEdit: (rule: TaxRule) => void
  isAdmin: boolean
}

export function TaxRuleTable({ data, isLoading, onEdit, isAdmin }: TaxRuleTableProps) {
  if (isLoading) {
    return (
      <div className="w-full h-64 bg-gray-900/50 rounded-xl border border-gray-800 animate-pulse flex items-center justify-center text-gray-500">
        Loading tax rules...
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-950/50 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-900/80 border-b border-gray-800 text-gray-400 text-xs uppercase">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Tax Class</th>
              <th className="px-4 py-3 font-medium text-right">Rate</th>
              <th className="px-4 py-3 font-medium">Mode</th>
              <th className="px-4 py-3 font-medium">Status</th>
              {isAdmin && <th className="px-4 py-3 font-medium text-right">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/50">
            {data.length > 0 ? data.map(rule => (
              <tr key={rule.id} className="hover:bg-gray-800/30 transition-colors">
                <td className="px-4 py-3 font-medium text-gray-200">{rule.name}</td>
                <td className="px-4 py-3 text-gray-400 font-mono text-xs">{rule.tax_class}</td>
                <td className="px-4 py-3 text-right tabular-nums text-emerald-400">
                  {fmtPct(rule.rate * 100)}
                </td>
                <td className="px-4 py-3 text-gray-300 capitalize">{rule.mode}</td>
                <td className="px-4 py-3">
                  <span className={clsx(
                    "px-2 py-0.5 rounded text-xs font-medium border",
                    rule.is_active 
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                      : "bg-gray-500/10 text-gray-400 border-gray-500/20"
                  )}>
                    {rule.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                {isAdmin && (
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => onEdit(rule)}
                      className="p-1 text-gray-500 hover:text-blue-400 hover:bg-blue-400/10 rounded transition-colors"
                      title="Edit Rule"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                  </td>
                )}
              </tr>
            )) : (
              <tr>
                <td colSpan={isAdmin ? 6 : 5} className="px-4 py-12 text-center text-gray-500">
                  No tax rules configured.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
