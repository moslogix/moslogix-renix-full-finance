'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'
import { ProfitChartPoint } from '@/types/finance/finance.types'
import { fmtCurrency, fmtDate } from '@/lib/finance/formatters'

interface ProfitChartProps {
  data: ProfitChartPoint[]
}

export function ProfitChart({ data }: ProfitChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500 text-sm">
        No profit data for this period
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={data}
        margin={{ top: 5, right: 20, left: 20, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
        <XAxis 
          dataKey="period" 
          stroke="#4b5563"
          tickFormatter={(value) => fmtDate(value)}
          fontSize={12}
          tickMargin={10}
        />
        <YAxis 
          stroke="#4b5563"
          tickFormatter={(value) => `£${(value / 1000).toFixed(0)}k`}
          fontSize={12}
        />
        <Tooltip
          contentStyle={{ backgroundColor: '#111827', borderColor: '#1f2937', borderRadius: '0.5rem' }}
          labelFormatter={(label) => fmtDate(label)}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          formatter={(value: any) => [fmtCurrency(value), undefined]}
        />
        <Legend wrapperStyle={{ fontSize: '12px' }} />
        <Bar name="Gross Profit" dataKey="grossProfit" fill="#3b82f6" radius={[4, 4, 0, 0]} />
        <Bar name="Net Profit" dataKey="netProfit" fill="#10b981" radius={[4, 4, 0, 0]} />
        <Bar name="Expenses" dataKey="expenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
