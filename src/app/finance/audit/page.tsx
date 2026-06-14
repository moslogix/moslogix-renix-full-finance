'use client'

import { useState, useEffect } from 'react'
import { getAuditLogs, AuditLogWithUser } from '@/actions/finance/audit.actions'
import { AuditLog, PaginatedResult } from '@/types/finance/finance.types'
import { fmtDateTime } from '@/lib/finance/formatters'
import { Lock, History } from 'lucide-react'
import clsx from 'clsx'

export default function AuditLogPage() {
  const [data, setData] = useState<PaginatedResult<AuditLogWithUser> | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)

  useEffect(() => {
    async function load() {
      setIsLoading(true)
      try {
        const res = await getAuditLogs(page, 50)
        if (res.error) throw new Error(res.error)
        setData(res.data)
      } catch (err: any) {
        setError(err.message)
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [page])

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Audit Log</h1>
          <p className="text-sm text-gray-400 mt-1">
            Immutable record of all sensitive financial and system actions.
          </p>
        </div>
      </div>

      <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm p-4 rounded-xl flex gap-3 items-start">
        <Lock className="h-5 w-5 shrink-0 mt-0.5" />
        <p>
          <strong>Audit logs are immutable.</strong> All entries shown here are permanent, tamper-proof, and legally traceable to individual authenticated sessions.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {error}
        </div>
      )}

      <div className="rounded-xl border border-gray-800 bg-gray-950/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-900/80 border-b border-gray-800 text-gray-400 text-xs uppercase">
              <tr>
                <th className="px-4 py-3 font-medium">Timestamp</th>
                <th className="px-4 py-3 font-medium">User</th>
                <th className="px-4 py-3 font-medium">Action</th>
                <th className="px-4 py-3 font-medium">Resource</th>
                <th className="px-4 py-3 font-medium">Changes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/50">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-gray-500">
                    <div className="animate-pulse">Loading audit trail...</div>
                  </td>
                </tr>
              ) : data?.data.length ? (
                data.data.map((log: any) => (
                  <tr key={log.id} className="hover:bg-gray-800/30 transition-colors">
                    <td className="px-4 py-3 text-gray-300 whitespace-nowrap">
                      {fmtDateTime(log.created_at)}
                    </td>
                    <td className="px-4 py-3 text-gray-400">
                      {log.user_name || log.user_email || log.user_id?.slice(0, 8) + '...' || 'System'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={clsx(
                        "px-2 py-0.5 rounded text-xs font-medium border capitalize whitespace-nowrap",
                        log.action.includes('delete') ? "bg-red-500/10 text-red-400 border-red-500/20" :
                        log.action.includes('create') ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                        "bg-blue-500/10 text-blue-400 border-blue-500/20"
                      )}>
                        {log.action.replace('.', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 font-mono text-xs">
                      {log.resource_type}: {log.resource_id?.slice(0, 8)}...
                    </td>
                    <td className="px-4 py-3">
                      <button className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-100 transition-colors">
                        <History className="h-3.5 w-3.5" />
                        View Diff
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-gray-500">
                    No audit records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-400">
          <div>
            Showing {(page - 1) * data.pageSize + 1} to {Math.min(page * data.pageSize, data.total)} of {data.total}
          </div>
          <div className="flex gap-2">
            <button 
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
              className="px-3 py-1 bg-gray-900 border border-gray-800 rounded hover:bg-gray-800 disabled:opacity-50"
            >
              Previous
            </button>
            <button 
              disabled={page === data.totalPages}
              onClick={() => setPage(p => p + 1)}
              className="px-3 py-1 bg-gray-900 border border-gray-800 rounded hover:bg-gray-800 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
