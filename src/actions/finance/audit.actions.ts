'use server'

import { createClient } from '@/lib/supabase/server'
import { ActionResponse, AuditLog, PaginatedResult } from '@/types/finance/finance.types'

export interface AuditLogWithUser extends AuditLog {
  user_name?: string | null
  user_email?: string | null
}

export async function getAuditLogs(
  page: number = 1,
  pageSize: number = 50
): Promise<ActionResponse<PaginatedResult<AuditLogWithUser>>> {
  try {
    const supabase = await createClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) throw new Error('Unauthorized')

    const { data: user } = await supabase
      .from('profiles')
      .select('store_id, role')
      .eq('id', authUser.id)
      .single()

    if (!user || !['admin', 'manager', 'super_admin'].includes(user.role)) {
      throw new Error('Forbidden')
    }

    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    // Fetch audit logs without the join (no FK relationship between audit_logs and users/profiles)
    const { data, count, error } = await supabase
      .from('audit_logs')
      .select('*', { count: 'exact' })
      .eq('store_id', user.store_id)
      .order('created_at', { ascending: false })
      .range(from, to)

    if (error) throw new Error(error.message)

    // Resolve user names/emails separately from profiles
    const logs = (data || []) as AuditLogWithUser[]
    const uniqueUserIds = Array.from(new Set(logs.map(l => l.user_id).filter(Boolean))) as string[]

    if (uniqueUserIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name, email')
        .in('id', uniqueUserIds)

      const profileMap = new Map((profiles || []).map(p => [p.id, p]))
      logs.forEach(log => {
        if (log.user_id) {
          const profile = profileMap.get(log.user_id)
          log.user_name = profile?.name || null
          log.user_email = profile?.email || null
        }
      })
    }

    return {
      data: {
        data: logs,
        total: count || 0,
        page,
        pageSize,
        totalPages: count ? Math.ceil(count / pageSize) : 0
      },
      error: null
    }

  } catch (error: any) {
    return { data: null, error: error.message }
  }
}
