'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  ReceiptText,
  CreditCard,
  BarChart3,
  Percent,
  History,
  Store,
} from 'lucide-react'
import clsx from 'clsx'

const navItems = [
  { href: '/finance', icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { href: '/finance/transactions', icon: ReceiptText, label: 'Transactions' },
  { href: '/finance/expenses', icon: CreditCard, label: 'Expenses' },
  { href: '/finance/reports', icon: BarChart3, label: 'Reports' },
  { href: '/finance/tax', icon: Percent, label: 'Tax Rules' },
  { href: '/finance/audit', icon: History, label: 'Audit Log' },
]

export function FinanceSidebar() {
  const pathname = usePathname()

  return (
    <div className="w-64 border-r border-gray-800 bg-gray-950/50 backdrop-blur-xl h-[calc(100vh-4rem)] flex flex-col">
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const isActive = item.exact 
            ? pathname === item.href 
            : pathname.startsWith(item.href)

          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors",
                isActive
                  ? "bg-emerald-500/10 text-emerald-400 font-medium"
                  : "text-gray-400 hover:bg-gray-900 hover:text-gray-100"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          )
        })}
      </nav>
      
      <div className="p-4 border-t border-gray-800">
        <a 
          href="/admin" 
          className="flex items-center gap-3 px-3 py-2 text-sm text-gray-400 rounded-md hover:bg-gray-900 hover:text-gray-100 transition-colors"
        >
          <Store className="h-4 w-4" />
          Back to Admin
        </a>
      </div>
    </div>
  )
}
