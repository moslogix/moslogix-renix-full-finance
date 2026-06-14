import { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { FINANCE_ALLOWED_ROLES } from '@/types/finance/finance.types'
import { FinanceSidebar } from './components/FinanceSidebar'

export default async function FinanceLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient()

  // Verify auth session
  const { data: { user: authUser } } = await supabase.auth.getUser()
  
  if (!authUser) {
    redirect('/login')
  }

  // Fetch user role and store settings
  const { data: userData, error: userError } = await supabase
    .from('profiles')
    .select('role, store_id')
    .eq('id', authUser.id)
    .single()

  if (userError || !userData) {
    console.error('Finance Auth Error:', userError)
    redirect('/login')
  }

  // Enforce access control - No cashiers allowed
  if (!FINANCE_ALLOWED_ROLES.includes(userData.role as any)) {
    // We don't have a POS route in the finance module, so redirect to an error or logout
    redirect('/unauthorized') 
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col">
      {/* Top Header */}
      <header className="h-16 border-b border-gray-800 bg-gray-950 flex items-center px-6 shrink-0 z-10 relative">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30">
            <span className="text-emerald-500 font-bold text-lg">F</span>
          </div>
          <span className="font-semibold text-lg tracking-tight">Finance</span>
        </div>
        <div className="ml-auto flex items-center gap-4">
          <span className="text-sm text-gray-400">
            {authUser.email}
          </span>
          <span className="px-2.5 py-1 rounded-full bg-gray-800 text-xs font-medium text-gray-300 capitalize border border-gray-700">
            {userData.role.replace('_', ' ')}
          </span>
          
          <form action="/auth/signout" method="post">
            <button className="text-xs text-gray-400 hover:text-white px-2 py-1 rounded hover:bg-gray-800 transition-colors">
              Sign out
            </button>
          </form>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden relative">
        <FinanceSidebar />
        <main className="flex-1 overflow-y-auto bg-gray-950 p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
