'use client'

import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  ColumnDef,
} from '@tanstack/react-table'
import { Transaction } from '@/types/finance/finance.types'
import { fmtCurrency, fmtDateTime } from '@/lib/finance/formatters'
import { Lock } from 'lucide-react'
import clsx from 'clsx'

interface TransactionTableProps {
  data: Transaction[]
  isLoading?: boolean
}

export function TransactionTable({ data, isLoading }: TransactionTableProps) {
  
  const columns: ColumnDef<Transaction>[] = [
    {
      header: 'Date & Time',
      accessorKey: 'created_at',
      cell: ({ row }) => <span className="text-gray-300">{fmtDateTime(row.original.created_at)}</span>
    },
    {
      header: 'Type',
      accessorKey: 'type',
      cell: ({ row }) => {
        const type = row.original.type
        const colors = {
          revenue: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
          refund: 'bg-red-500/10 text-red-400 border-red-500/20',
          tax: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
          expense: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
          adjustment: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
        }
        return (
          <span className={clsx(
            "px-2 py-0.5 rounded text-xs font-medium border capitalize",
            colors[type as keyof typeof colors] || 'bg-gray-800 text-gray-300'
          )}>
            {type}
          </span>
        )
      }
    },
    {
      header: 'Description',
      accessorKey: 'description',
      cell: ({ row }) => (
        <span className="text-gray-300 truncate max-w-[200px] inline-block" title={row.original.description || ''}>
          {row.original.description || '-'}
        </span>
      )
    },
    {
      header: 'Reference',
      accessorKey: 'reference_id',
      cell: ({ row }) => (
        <span className="text-gray-400 font-mono text-xs">
          {row.original.reference_id || '-'}
        </span>
      )
    },
    {
      header: 'Amount',
      accessorKey: 'amount',
      cell: ({ row }) => {
        const amt = row.original.amount
        return (
          <span className={clsx("font-medium tabular-nums", amt >= 0 ? "text-emerald-400" : "text-red-400")}>
            {fmtCurrency(amt)}
          </span>
        )
      }
    },
    {
      header: '',
      id: 'immutable',
      cell: () => (
        <div className="flex justify-end pr-2" title="This record is immutable. Financial corrections must be made via new adjustment entries.">
          <Lock className="h-4 w-4 text-gray-600" />
        </div>
      )
    }
  ]

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  if (isLoading) {
    return (
      <div className="w-full h-64 bg-gray-900/50 rounded-xl border border-gray-800 animate-pulse flex items-center justify-center text-gray-500">
        Loading transactions...
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-950/50 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-900/80 border-b border-gray-800 text-gray-400 text-xs uppercase">
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <th key={header.id} className="px-4 py-3 font-medium whitespace-nowrap">
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-gray-800/50">
            {table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map(row => (
                <tr key={row.id} className="hover:bg-gray-800/30 transition-colors">
                  {row.getVisibleCells().map(cell => (
                    <td key={cell.id} className="px-4 py-3 whitespace-nowrap">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center text-gray-500">
                  No transactions found for this period.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
