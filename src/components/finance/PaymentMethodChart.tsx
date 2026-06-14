'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts'
import { PaymentMethodBar } from '@/types/finance/finance.types'
import { fmtCurrency, fmtPct } from '@/lib/finance/formatters'

interface PaymentMethodChartProps {
  data: PaymentMethodBar[]
}

const COLORS: Record<string, string> = {
  cash: '#10b981', // emerald
  card: '#3b82f6', // blue
  wallet: '#f59e0b', // amber
  instapay: '#8b5cf6', // violet
  split: '#ec4899', // pink
}

export function PaymentMethodChart({ data }: PaymentMethodChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500 text-sm">
        No payment data for this period
      </div>
    )
  }

  const renderTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-gray-900 border border-gray-800 p-3 rounded-lg shadow-xl">
          <p className="text-gray-100 font-medium mb-1 capitalize">{data.method}</p>
          <p className="text-sm text-gray-300">{fmtCurrency(data.total)}</p>
          <p className="text-xs text-gray-400 mt-1">{fmtPct(data.percentage)} of total volume</p>
        </div>
      )
    }
    return null
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" horizontal={false} />
        <XAxis 
          type="number" 
          stroke="#4b5563"
          tickFormatter={(value) => `£${(value / 1000).toFixed(0)}k`}
          fontSize={12}
        />
        <YAxis 
          type="category" 
          dataKey="method" 
          stroke="#4b5563"
          fontSize={12}
          width={70}
          tickFormatter={(value) => value.charAt(0).toUpperCase() + value.slice(1)}
        />
        <Tooltip content={renderTooltip} cursor={{ fill: '#1f2937', opacity: 0.4 }} />
        <Bar dataKey="total" radius={[0, 4, 4, 0]} barSize={32}>
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[entry.method] || '#64748b'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
