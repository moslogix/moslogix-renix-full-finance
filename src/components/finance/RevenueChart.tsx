'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'
import { RevenueChartPoint } from '@/types/finance/finance.types'
import { fmtCurrency, fmtDate } from '@/lib/finance/formatters'

interface RevenueChartProps {
  data: RevenueChartPoint[]
}

export function RevenueChart({ data }: RevenueChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500 text-sm">
        No revenue data for this period
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart
        data={data}
        margin={{ top: 5, right: 20, left: 20, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
        <XAxis 
          dataKey="date" 
          stroke="#4b5563"
          tickFormatter={(value) => fmtDate(value)}
          fontSize={12}
          tickMargin={10}
        />
        <YAxis 
          stroke="#4b5563"
          tickFormatter={(value) => `£${(value / 1000).toFixed(0)}k`} // Placeholder symbol, use EGP formatting later
          fontSize={12}
        />
        <Tooltip
          contentStyle={{ backgroundColor: '#111827', borderColor: '#1f2937', borderRadius: '0.5rem' }}
          itemStyle={{ color: '#f3f4f6' }}
          labelFormatter={(label) => fmtDate(label)}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          formatter={(value: any) => [fmtCurrency(value), undefined]}
        />
        <Legend wrapperStyle={{ fontSize: '12px' }} />
        <Line 
          type="monotone" 
          name="Gross Revenue"
          dataKey="grossRevenue" 
          stroke="#3b82f6" 
          strokeWidth={2}
          dot={false}
        />
        <Line 
          type="monotone" 
          name="Net Revenue"
          dataKey="netRevenue" 
          stroke="#10b981" 
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
