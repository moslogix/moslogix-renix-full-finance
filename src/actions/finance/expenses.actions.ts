'use server'

import { createClient } from '@/lib/supabase/server'
import { ActionResponse, Expense, ExpenseInput, PaginatedResult, ExpenseFilters } from '@/types/finance/finance.types'

async function getAuthContext() {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) throw new Error('Unauthorized')

  const { data: user } = await supabase
    .from('profiles')
    .select('store_id, role')
    .eq('id', authUser.id)
    .single()

  if (!user) {
    throw new Error('Forbidden')
  }

  return { supabase, storeId: user.store_id, userId: authUser.id }
}

export async function getExpenses(
  filters: ExpenseFilters,
  page: number = 1,
  pageSize: number = 50
): Promise<ActionResponse<PaginatedResult<Expense>>> {
  try {
    const { supabase, storeId } = await getAuthContext()

    let query = supabase
      .from('expenses')
      .select('*', { count: 'exact' })
      .eq('store_id', storeId)
      .is('deleted_at', null)

    // Try expense_date first, fallback to created_at
    const { data: colTest } = await supabase
      .from('expenses')
      .select('expense_date')
      .eq('store_id', storeId)
      .limit(1)

    const hasExpenseDate = colTest && colTest.length > 0 && 'expense_date' in colTest[0]

    if (hasExpenseDate) {
      query = query.gte('expense_date', filters.dateFrom)
      query = query.lte('expense_date', filters.dateTo)
      query = query.order('expense_date', { ascending: false })
    } else {
      query = query.gte('created_at', filters.dateFrom)
      query = query.lte('created_at', filters.dateTo)
      query = query.order('created_at', { ascending: false })
    }

    if (filters.categories && filters.categories.length > 0) {
      query = query.in('category', filters.categories)
    }

    if (filters.branchId && filters.branchId !== 'all') {
      query = query.eq('branch_id', filters.branchId)
    }

    if (filters.amountMin !== undefined) {
      query = query.gte('amount', filters.amountMin)
    }

    if (filters.amountMax !== undefined) {
      query = query.lte('amount', filters.amountMax)
    }

    const from = (page - 1) * pageSize
    const to = from + pageSize - 1
    query = query.range(from, to)

    const { data, count, error } = await query

    if (error) {
      // Retry without deleted_at filter in case column doesn't exist
      let retryQuery = supabase
        .from('expenses')
        .select('*', { count: 'exact' })
        .eq('store_id', storeId)
        .gte('created_at', filters.dateFrom)
        .lte('created_at', filters.dateTo)
        .order('created_at', { ascending: false })

      if (filters.categories && filters.categories.length > 0) {
        retryQuery = retryQuery.in('category', filters.categories)
      }
      if (filters.branchId && filters.branchId !== 'all') {
        retryQuery = retryQuery.eq('branch_id', filters.branchId)
      }
      if (filters.amountMin !== undefined) retryQuery = retryQuery.gte('amount', filters.amountMin)
      if (filters.amountMax !== undefined) retryQuery = retryQuery.lte('amount', filters.amountMax)

      retryQuery = retryQuery.range(from, to)
      const retryResult = await retryQuery
      if (retryResult.error) throw new Error(retryResult.error.message)

      const normalizedData = (retryResult.data || []).map(exp => ({
        ...exp,
        expense_date: exp.expense_date || exp.created_at,
        updated_at: exp.updated_at || exp.created_at,
        deleted_at: exp.deleted_at || null
      })) as Expense[]

      return {
        data: {
          data: normalizedData,
          total: retryResult.count || 0,
          page,
          pageSize,
          totalPages: retryResult.count ? Math.ceil(retryResult.count / pageSize) : 0
        },
        error: null
      }
    }

    // Normalize expense data
    const normalizedData = (data || []).map(exp => ({
      ...exp,
      expense_date: exp.expense_date || exp.created_at,
      updated_at: exp.updated_at || exp.created_at,
      deleted_at: exp.deleted_at || null
    })) as Expense[]

    return {
      data: {
        data: normalizedData,
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

export async function createExpense(input: ExpenseInput): Promise<ActionResponse<Expense>> {
  try {
    const { supabase, storeId, userId } = await getAuthContext()

    const expenseData = {
      ...input,
      store_id: storeId,
      created_by: userId,
      branch_id: input.branch_id === 'all' ? null : input.branch_id,
      expense_date: input.expense_date || new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    // Insert expense
    const { data: expense, error } = await supabase
      .from('expenses')
      .insert(expenseData)
      .select()
      .single()

    if (error) {
      // If insert fails due to missing columns, try with minimal data
      const minimalData: any = {
        store_id: storeId,
        branch_id: input.branch_id === 'all' ? null : input.branch_id,
        category: input.category,
        amount: input.amount,
        description: input.description,
        receipt_url: input.receipt_url || null,
        created_by: userId,
      }
      const fallbackResult = await supabase.from('expenses').insert(minimalData).select().single()
      if (fallbackResult.error) throw new Error(fallbackResult.error.message)
      const savedExpense = fallbackResult.data as Expense

      // Write audit log (ignore errors)
      try {
        await supabase.from('audit_logs').insert({
          store_id: storeId,
          user_id: userId,
          action: 'expense.created',
          resource_type: 'expense',
          resource_id: savedExpense.id,
          old_data: null,
          new_data: savedExpense,
          ip_address: null,
          created_at: new Date().toISOString()
        })
      } catch (e) {
        // Ignore audit log errors
      }

      return { data: savedExpense, error: null }
    }

    // Write audit log (ignore errors)
    try {
      await supabase.from('audit_logs').insert({
        store_id: storeId,
        user_id: userId,
        action: 'expense.created',
        resource_type: 'expense',
        resource_id: expense.id,
        old_data: null,
        new_data: expense,
        ip_address: null,
        created_at: new Date().toISOString()
      })
    } catch (e) {
      // Ignore audit log errors
    }

    // Try to create transaction (ignore errors)
    try {
      await supabase.from('transactions').insert({
        store_id: storeId,
        branch_id: expenseData.branch_id,
        type: 'expense',
        amount: expenseData.amount,
        description: expenseData.description,
        reference_id: expense.id,
        reference_type: 'expense',
        created_by: userId,
        created_at: new Date().toISOString()
      })
    } catch (e) {
      // Ignore transaction errors
    }

    return { data: expense as Expense, error: null }
  } catch (error: any) {
    return { data: null, error: error.message }
  }
}

export async function deleteExpense(expenseId: string): Promise<ActionResponse<boolean>> {
  try {
    const { supabase, storeId, userId } = await getAuthContext()

    // Fetch old data for audit
    const { data: oldExpense } = await supabase
      .from('expenses')
      .select('*')
      .eq('id', expenseId)
      .eq('store_id', storeId)
      .single()

    if (!oldExpense) throw new Error('Expense not found')

    // Try soft delete first
    const { error: softDeleteError } = await supabase
      .from('expenses')
      .update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', expenseId)
      .eq('store_id', storeId)

    if (softDeleteError) {
      // If soft delete fails (column may not exist), try hard delete
      const { error: hardDeleteError } = await supabase
        .from('expenses')
        .delete()
        .eq('id', expenseId)
        .eq('store_id', storeId)
      
      if (hardDeleteError) throw new Error(hardDeleteError.message)
    }

    // Audit log (ignore errors)
    try {
      await supabase.from('audit_logs').insert({
        store_id: storeId,
        user_id: userId,
        action: 'expense.deleted',
        resource_type: 'expense',
        resource_id: expenseId,
        old_data: oldExpense,
        new_data: { ...oldExpense, deleted_at: new Date().toISOString() },
        created_at: new Date().toISOString()
      })
    } catch (e) {
      // Ignore
    }

    // Try to create adjustment transaction (ignore errors)
    try {
      await supabase.from('transactions').insert({
        store_id: storeId,
        branch_id: oldExpense.branch_id,
        type: 'adjustment',
        amount: oldExpense.amount,
        description: `Expense Deletion Adjustment: ${oldExpense.description}`,
        reference_id: expenseId,
        reference_type: 'expense',
        created_by: userId,
        created_at: new Date().toISOString()
      })
    } catch (e) {
      // Ignore
    }

    return { data: true, error: null }
  } catch (error: any) {
    return { data: null, error: error.message }
  }
}
