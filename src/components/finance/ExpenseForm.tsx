'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { EGYPT_EXPENSE_CATEGORIES } from '@/types/finance/finance.types'
import { createExpense } from '@/actions/finance/expenses.actions'
import { toast } from 'react-hot-toast'
import { X, Upload } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const expenseSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  category: z.string().min(1, 'Category is required'),
  description: z.string().min(1, 'Description is required'),
  expense_date: z.string().min(1, 'Date is required'),
  branch_id: z.string(),
})

type ExpenseFormData = z.infer<typeof expenseSchema>

interface ExpenseFormProps {
  onClose: () => void
  onSuccess: () => void
  branches: { id: string; name: string }[]
}

export function ExpenseForm({ onClose, onSuccess, branches }: ExpenseFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [receiptFile, setReceiptFile] = useState<File | null>(null)
  
  const { register, handleSubmit, formState: { errors } } = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      expense_date: new Date().toISOString().split('T')[0],
      branch_id: 'all'
    }
  })

  const onSubmit = async (data: ExpenseFormData) => {
    setIsSubmitting(true)
    try {
      let receipt_url = ''
      
      // Upload receipt if provided
      if (receiptFile) {
        const supabase = createClient()
        const fileExt = receiptFile.name.split('.').pop()
        const fileName = `${Math.random()}.${fileExt}`
        const filePath = `receipts/${fileName}`
        
        const { error: uploadError, data: uploadData } = await supabase.storage
          .from('finance_assets')
          .upload(filePath, receiptFile)
          
        if (uploadError) throw new Error(`Failed to upload receipt: ${uploadError.message}`)
        
        const { data: publicUrlData } = supabase.storage
          .from('finance_assets')
          .getPublicUrl(filePath)
          
        receipt_url = publicUrlData.publicUrl
      }

      const res = await createExpense({
        ...data,
        receipt_url: receipt_url || undefined
      })
      
      if (res.error) throw new Error(res.error)
      
      toast.success('Expense recorded successfully')
      onSuccess()
    } catch (err: any) {
      toast.error(err.message || 'Failed to save expense')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-950/80 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <h2 className="text-lg font-semibold">Add Expense</h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-white rounded transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit(onSubmit)} className="p-4 space-y-4 flex-1 overflow-y-auto">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Amount (EGP)</label>
            <input 
              type="number" 
              step="0.01"
              {...register('amount', { valueAsNumber: true })}
              className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-gray-100 focus:outline-none focus:border-emerald-500"
            />
            {errors.amount && <p className="text-xs text-red-400 mt-1">{errors.amount.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Date</label>
            <input 
              type="date" 
              {...register('expense_date')}
              className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-gray-100 focus:outline-none focus:border-emerald-500"
            />
            {errors.expense_date && <p className="text-xs text-red-400 mt-1">{errors.expense_date.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Category</label>
            <select 
              {...register('category')}
              className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-gray-100 focus:outline-none focus:border-emerald-500"
            >
              <option value="">Select Category</option>
              {EGYPT_EXPENSE_CATEGORIES.map(cat => (
                <option key={cat.key} value={cat.key}>{cat.label}</option>
              ))}
            </select>
            {errors.category && <p className="text-xs text-red-400 mt-1">{errors.category.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Branch</label>
            <select 
              {...register('branch_id')}
              className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-gray-100 focus:outline-none focus:border-emerald-500"
            >
              <option value="all">Head Office / All Branches</option>
              {branches.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
            <textarea 
              {...register('description')}
              rows={3}
              className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-gray-100 focus:outline-none focus:border-emerald-500 resize-none"
            />
            {errors.description && <p className="text-xs text-red-400 mt-1">{errors.description.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Receipt (Optional)</label>
            <div className="flex items-center gap-3">
              <label className="cursor-pointer flex items-center justify-center gap-2 px-4 py-2 border border-gray-800 border-dashed rounded-lg bg-gray-950 hover:bg-gray-800 transition-colors w-full">
                <Upload className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-400">{receiptFile ? receiptFile.name : 'Upload File'}</span>
                <input 
                  type="file" 
                  accept="image/*,.pdf" 
                  className="hidden" 
                  onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                />
              </label>
            </div>
          </div>
          
          <div className="pt-4 border-t border-gray-800 flex justify-end gap-3 mt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 bg-gray-900 border border-gray-800 text-gray-300 rounded-lg hover:bg-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : 'Save Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
