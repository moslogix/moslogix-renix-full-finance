'use client'

import { useState, useEffect } from 'react'
import { getTaxRules } from '@/actions/finance/tax.actions'
import { TaxRuleTable } from '@/components/finance/TaxRuleTable'
import { TaxRuleForm } from '@/components/finance/TaxRuleForm'
import { TaxRule } from '@/types/finance/finance.types'
import { Plus } from 'lucide-react'
import toast from 'react-hot-toast'

export default function TaxRulesPage() {
  const [data, setData] = useState<TaxRule[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingRule, setEditingRule] = useState<TaxRule | undefined>()

  const loadData = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await getTaxRules()
      if (response.error) throw new Error(response.error)
      if (response.data) setData(response.data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleEdit = (rule: TaxRule) => {
    setEditingRule(rule)
    setIsFormOpen(true)
  }

  const handleCreate = () => {
    setEditingRule(undefined)
    setIsFormOpen(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Tax Rules</h1>
          <p className="text-sm text-gray-400 mt-1">
            Configure VAT rates and classes compliant with Egyptian law.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={handleCreate}
            className="flex items-center gap-2 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-sm text-white font-medium transition-colors"
          >
            <Plus className="h-4 w-4" />
            New Tax Rule
          </button>
        </div>
      </div>

      <div className="bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm p-4 rounded-xl">
        <h3 className="font-medium mb-1 flex items-center gap-2">
          <span>ℹ️</span> Egypt E-Invoicing Note
        </h3>
        <p className="opacity-90 pl-6">
          Standard VAT rate in Egypt is 14%. Changing existing tax classes that are already mapped to products will affect future orders but maintain historical ledger integrity.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {error}
        </div>
      )}

      <TaxRuleTable 
        data={data} 
        isLoading={isLoading} 
        onEdit={handleEdit}
        isAdmin={true} // Would be from session
      />

      {isFormOpen && (
        <TaxRuleForm 
          initialData={editingRule}
          onClose={() => setIsFormOpen(false)}
          onSuccess={() => {
            setIsFormOpen(false)
            loadData()
          }}
        />
      )}
    </div>
  )
}
