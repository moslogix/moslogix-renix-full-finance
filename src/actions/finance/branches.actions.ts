'use server'

import { createClient } from '@/lib/supabase/server'
import { ActionResponse, Branch } from '@/types/finance/finance.types'

export async function getBranches(): Promise<ActionResponse<Branch[]>> {
  try {
    const supabase = await createClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) throw new Error('Unauthorized')

    const { data: user } = await supabase
      .from('profiles')
      .select('store_id, role')
      .eq('id', authUser.id)
      .single()

    if (!user) throw new Error('Forbidden')

    const { data, error } = await supabase
      .from('branches')
      .select('*')
      .eq('store_id', user.store_id)
      .order('name')

    if (error) throw new Error(error.message)

    return { data: data as Branch[], error: null }
  } catch (error: any) {
    return { data: null, error: error.message }
  }
}
