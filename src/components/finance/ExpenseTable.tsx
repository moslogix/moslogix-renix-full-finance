'use client'

import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  ColumnDef,
} from '@tanstack/react-table'
import { Expense } from '@/types/finance/finance.types'
import { fmtCurrency, fmtDate } from '@/lib/finance/formatters'
import { Paperclip, Trash2 } from 'lucide-react'

interface ExpenseTableProps {
  data: Expense[]
  isLoading?: boolean
  onDelete?: (id: string) => void
  isAdmin?: boolean
}

export function ExpenseTable({ data, isLoading, onDelete, isAdmin }: ExpenseTableProps) {
  
  const columns: ColumnDef<Expense>[] = [
    {
      header: 'Date',
      accessorKey: 'expense_date',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      cell: ({ row }) => <span className="text-gray-300">{fmtDate(row.original.expense_date as any)}</span>
    },
    {
      header: 'Category',
      accessorKey: 'category',
      cell: ({ row }) => (
        <span className="capitalize text-gray-300">
          {row.original.category.replace('_', ' ')}
        </span>
      )
    },
    {
      header: 'Description',
      accessorKey: 'description',
      cell: ({ row }) => (
        <span className="text-gray-300 truncate max-w-[200px] inline-block" title={row.original.description || undefined}>
          {row.original.description}
        </span>
      )
    },
    {
      header: 'Amount',
      accessorKey: 'amount',
      cell: ({ row }) => (
        <span className="font-medium text-gray-200 tabular-nums">
          {fmtCurrency(row.original.amount)}
        </span>
      )
    },
    {
      header: 'Receipt',
      accessorKey: 'receipt_url',
      cell: ({ row }) => {
        if (!row.original.receipt_url) return <span className="text-gray-600">-</span>
        return (
          <a 
            href={row.original.receipt_url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-gray-400 hover:text-emerald-400 transition-colors"
            title="View Receipt"
          >
            <Paperclip className="h-4 w-4" />
          </a>
        )
      }
    },
    {
      header: '',
      id: 'actions',
      cell: ({ row }) => {
        if (!isAdmin) return null
        return (
          <div className="flex justify-end">
            <button
              onClick={() => onDelete?.(row.original.id)}
              className="p-1 text-gray-500 hover:text-red-400 hover:bg-red-400/10 rounded transition-colors"
              title="Delete Expense"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        )
      }
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
        Loading expenses...
      </div>
    )
  }

  const totalAmount = data.reduce((sum, exp) => sum + exp.amount, 0)

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-950/50 overflow-hidden flex flex-col">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-900/80 border-b border-gray-800 text-gray-400 text-xs uppercase">
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <th key={header.id} className="px-4 py-3 font-medium whitespace-nowrap">
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
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
                  No expenses found for this period.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="bg-gray-900/80 p-4 border-t border-gray-800 flex justify-between items-center text-sm">
        <span className="text-gray-400">Total for filtered view</span>
        <span className="font-semibold text-gray-100 tabular-nums">{fmtCurrency(totalAmount)}</span>
      </div>
    </div>
  )
}
