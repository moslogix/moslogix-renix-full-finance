'use server'

import { createClient } from '@/lib/supabase/server'
import { ActionResponse, TaxRule, TaxRuleInput } from '@/types/finance/finance.types'

const ADMIN_ROLES = ['admin', 'super_admin']

export async function getTaxRules(): Promise<ActionResponse<TaxRule[]>> {
  try {
    const supabase = await createClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) throw new Error('Unauthorized')

    const { data: user } = await supabase
      .from('profiles')
      .select('store_id, role')
      .eq('id', authUser.id)
      .single()

    if (!user) throw new Error('Unauthorized')

    const { data, error } = await supabase
      .from('tax_rules')
      .select('*')
      .eq('store_id', user.store_id)
      .order('is_active', { ascending: false })
      .order('name')

    if (error) throw new Error(error.message)

    return { data: data as TaxRule[], error: null }
  } catch (error: any) {
    return { data: null, error: error.message }
  }
}

export async function upsertTaxRule(input: TaxRuleInput & { id?: string }): Promise<ActionResponse<TaxRule>> {
  try {
    const supabase = await createClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) throw new Error('Unauthorized')

    const { data: user } = await supabase
      .from('profiles')
      .select('store_id, role')
      .eq('id', authUser.id)
      .single()

    // FIX: Allow both admin AND super_admin
    if (!user || !ADMIN_ROLES.includes(user.role)) throw new Error('Admin role required')

    // Check if changing an existing rule that products depend on
    if (!input.id) {
      const { data: existing } = await supabase
        .from('tax_rules')
        .select('id')
        .eq('store_id', user.store_id)
        .eq('tax_class', input.tax_class)
        .single()
      
      if (existing) {
        throw new Error(`Tax class '${input.tax_class}' already exists for this store`)
      }
    }

    const ruleData = {
      ...input,
      store_id: user.store_id,
      updated_at: new Date().toISOString()
    }

    let result;
    let action = 'tax_rule.updated';

    if (input.id) {
      const { data, error } = await supabase
        .from('tax_rules')
        .update(ruleData)
        .eq('id', input.id)
        .eq('store_id', user.store_id)
        .select()
        .single()
      if (error) throw new Error(error.message)
      result = data
    } else {
      action = 'tax_rule.created'
      const { data, error } = await supabase
        .from('tax_rules')
        .insert({ ...ruleData, created_at: new Date().toISOString() })
        .select()
        .single()
      if (error) throw new Error(error.message)
      result = data
    }

    // Audit Log (wrap in try/catch — audit failure should NOT break the operation)
    try {
      await supabase.from('audit_logs').insert({
        store_id: user.store_id,
        user_id: authUser.id,
        action,
        resource_type: 'tax_rule',
        resource_id: result.id,
        old_data: input.id ? { id: input.id } : null,
        new_data: result,
        ip_address: null
      })
    } catch (e) {
      // Audit log failure should not break the operation
    }

    return { data: result as TaxRule, error: null }
  } catch (error: any) {
    return { data: null, error: error.message }
  }
}
