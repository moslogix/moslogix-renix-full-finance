'use client'

import { TopProduct } from '@/types/finance/finance.types'
import { fmtCurrency, fmtPct } from '@/lib/finance/formatters'

interface TopProductsTableProps {
  data: TopProduct[]
}

export function TopProductsTable({ data }: TopProductsTableProps) {
  if (!data || data.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500 text-sm py-12">
        No product data for this period
      </div>
    )
  }

  // Find max revenue for the mini bar chart
  const maxRevenue = Math.max(...data.map(d => d.revenue))

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left text-gray-300">
        <thead className="text-xs text-gray-500 uppercase bg-gray-900/50">
          <tr>
            <th scope="col" className="px-4 py-3 font-medium">Product Name</th>
            <th scope="col" className="px-4 py-3 font-medium text-right">Units</th>
            <th scope="col" className="px-4 py-3 font-medium text-right">Revenue</th>
            <th scope="col" className="px-4 py-3 font-medium text-right">Margin %</th>
          </tr>
        </thead>
        <tbody>
          {data.map((product, index) => (
            <tr key={product.productId} className="border-b border-gray-800/50 hover:bg-gray-800/20 transition-colors">
              <td className="px-4 py-3 font-medium text-gray-200">
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 text-xs w-4">{index + 1}.</span>
                  <span className="truncate max-w-[150px]" title={product.productName}>
                    {product.productName}
                  </span>
                </div>
              </td>
              <td className="px-4 py-3 text-right tabular-nums text-gray-400">
                {product.unitsSold.toLocaleString()}
              </td>
              <td className="px-4 py-3 text-right tabular-nums font-medium text-emerald-400">
                {fmtCurrency(product.revenue)}
                {/* Mini bar chart */}
                <div className="mt-1 h-1 w-full bg-gray-800 rounded-full overflow-hidden flex justify-end">
                  <div 
                    className="h-full bg-emerald-500/50 rounded-full" 
                    style={{ width: `${(product.revenue / maxRevenue) * 100}%` }}
                  />
                </div>
              </td>
              <td className="px-4 py-3 text-right tabular-nums">
                <span className={product.profitMargin >= 30 ? 'text-emerald-400' : product.profitMargin > 0 ? 'text-amber-400' : 'text-red-400'}>
                  {fmtPct(product.profitMargin)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
