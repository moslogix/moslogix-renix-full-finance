'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { TaxRule, TaxRuleInput } from '@/types/finance/finance.types'
import { upsertTaxRule } from '@/actions/finance/tax.actions'
import { toast } from 'react-hot-toast'
import { X, AlertTriangle } from 'lucide-react'

const taxRuleSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  tax_class: z.string().min(1, 'Tax class is required').regex(/^[a-z0-9_]+$/, 'Only lowercase letters, numbers, and underscores allowed'),
  rate: z.number().min(0, 'Rate cannot be negative').max(100, 'Rate cannot exceed 100%'),
  mode: z.enum(['inclusive', 'exclusive']),
  is_active: z.boolean()
})

type TaxRuleFormData = z.infer<typeof taxRuleSchema>

interface TaxRuleFormProps {
  initialData?: TaxRule
  onClose: () => void
  onSuccess: () => void
}

export function TaxRuleForm({ initialData, onClose, onSuccess }: TaxRuleFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const { register, handleSubmit, formState: { errors } } = useForm<TaxRuleFormData>({
    resolver: zodResolver(taxRuleSchema),
    defaultValues: initialData ? {
      name: initialData.name,
      tax_class: initialData.tax_class,
      rate: initialData.rate * 100, // Convert decimal to percentage for UI
      mode: initialData.mode,
      is_active: initialData.is_active
    } : {
      rate: 14, // Default Egypt VAT
      mode: 'inclusive',
      is_active: true
    }
  })

  const onSubmit = async (data: TaxRuleFormData) => {
    setIsSubmitting(true)
    try {
      const payload: TaxRuleInput = {
        ...data,
        rate: data.rate / 100 // Convert percentage back to decimal for DB
      }
      
      const res = await upsertTaxRule(initialData ? { ...payload, id: initialData.id } : payload)
      
      if (res.error) throw new Error(res.error)
      
      toast.success(initialData ? 'Tax rule updated' : 'Tax rule created')
      onSuccess()
    } catch (err: any) {
      toast.error(err.message || 'Failed to save tax rule')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-950/80 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <h2 className="text-lg font-semibold">{initialData ? 'Edit Tax Rule' : 'New Tax Rule'}</h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-white rounded transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit(onSubmit)} className="p-4 space-y-4 flex-1 overflow-y-auto">
          {initialData && (
            <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm p-3 rounded-lg flex gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <p>Warning: Modifying this rule affects new orders but will not retroactively alter historical transaction amounts.</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Rule Name</label>
            <input 
              type="text" 
              placeholder="e.g. Standard VAT 14%"
              {...register('name')}
              className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-gray-100 focus:outline-none focus:border-emerald-500"
            />
            {errors.name && <p className="text-xs text-red-400 mt-1">{errors.name.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Tax Class Identifier</label>
            <input 
              type="text" 
              disabled={!!initialData} // Cannot change identifier after creation usually
              placeholder="e.g. standard, zero_rated"
              {...register('tax_class')}
              className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-gray-100 disabled:opacity-50 focus:outline-none focus:border-emerald-500 font-mono text-sm"
            />
            {errors.tax_class && <p className="text-xs text-red-400 mt-1">{errors.tax_class.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Rate (%)</label>
              <div className="relative">
                <input 
                  type="number" 
                  step="0.01"
                  {...register('rate', { valueAsNumber: true })}
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg pl-3 pr-8 py-2 text-gray-100 focus:outline-none focus:border-emerald-500"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">%</span>
              </div>
              {errors.rate && <p className="text-xs text-red-400 mt-1">{errors.rate.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Mode</label>
              <select 
                {...register('mode')}
                className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-gray-100 focus:outline-none focus:border-emerald-500"
              >
                <option value="inclusive">Inclusive</option>
                <option value="exclusive">Exclusive</option>
              </select>
              {errors.mode && <p className="text-xs text-red-400 mt-1">{errors.mode.message}</p>}
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <input 
              type="checkbox" 
              id="is_active"
              {...register('is_active')}
              className="w-4 h-4 rounded border-gray-800 bg-gray-950 text-emerald-500 focus:ring-emerald-500/20"
            />
            <label htmlFor="is_active" className="text-sm font-medium text-gray-300">
              Rule is active
            </label>
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
              {isSubmitting ? 'Saving...' : 'Save Rule'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
