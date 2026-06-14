'use client'

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'
import { ExpenseCategorySlice } from '@/types/finance/finance.types'
import { fmtCurrency, fmtPct } from '@/lib/finance/formatters'

interface ExpenseBreakdownChartProps {
  data: ExpenseCategorySlice[]
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#64748b']

export function ExpenseBreakdownChart({ data }: ExpenseBreakdownChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500 text-sm">
        No expenses for this period
      </div>
    )
  }

  const renderTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-gray-900 border border-gray-800 p-3 rounded-lg shadow-xl">
          <p className="text-gray-100 font-medium mb-1 capitalize">{data.category.replace('_', ' ')}</p>
          <p className="text-sm text-gray-300">{fmtCurrency(data.total)}</p>
          <p className="text-xs text-gray-400 mt-1">{fmtPct(data.percentage)} of total</p>
        </div>
      )
    }
    return null
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="45%"
          innerRadius={60}
          outerRadius={80}
          paddingAngle={2}
          dataKey="total"
          nameKey="category"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip content={renderTooltip} />
        <Legend 
          wrapperStyle={{ fontSize: '12px', textTransform: 'capitalize' }}
          formatter={(value) => value.replace('_', ' ')}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}
