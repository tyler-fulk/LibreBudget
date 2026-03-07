import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { Card } from '../components/ui/Card'
import { EncryptionBadge } from '../components/ui/EncryptionBadge'
import { Button } from '../components/ui/Button'
import { useCategories } from '../hooks/useCategories'
import { useTransactions } from '../hooks/useTransactions'
import { EXPENSE_GROUPS, type TransactionType, type CategoryGroup } from '../db/database'
import { Icon } from '../components/ui/Icon'
import { GROUP_LABELS, GROUP_COLORS, getCategoryIconClassName } from '../utils/colors'

export default function AddTransaction() {
  const navigate = useNavigate()
  const { categoriesByGroup } = useCategories()
  const { transactions, addTransaction } = useTransactions()

  const [type, setType] = useState<TransactionType>('expense')
  const [amount, setAmount] = useState('')
  const [categoryId, setCategoryId] = useState<number | null>(null)
  const [description, setDescription] = useState('')
  const [note, setNote] = useState('')
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [saving, setSaving] = useState(false)
  const [duplicateWarning, setDuplicateWarning] = useState(false)

  const activeGroups: CategoryGroup[] = type === 'expense' ? EXPENSE_GROUPS : ['income']

  const isDuplicate = useMemo(() => {
    if (!amount || !categoryId) return false
    const amt = parseFloat(amount)
    return transactions.some(
      (t) => t.amount === amt && t.categoryId === categoryId && t.date === date && t.type === type,
    )
  }, [amount, categoryId, date, type, transactions])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!amount || !categoryId) return

    if (isDuplicate && !duplicateWarning) {
      setDuplicateWarning(true)
      return
    }

    setSaving(true)
    await addTransaction({
      amount: parseFloat(amount),
      type,
      categoryId,
      description,
      note,
      date,
    })
    setSaving(false)

    setAmount('')
    setCategoryId(null)
    setDescription('')
    setNote('')
    setDuplicateWarning(false)
    navigate('/transactions')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-bold">Add Transaction</h1>
        <EncryptionBadge />
      </div>

      <Card>
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Type toggle */}
          <div className="flex gap-2 rounded-xl bg-slate-800 p-1">
            <button
              type="button"
              onClick={() => { setType('expense'); setCategoryId(null) }}
              className={`flex-1 rounded-lg py-2.5 text-sm font-medium transition-colors ${
                type === 'expense'
                  ? 'bg-orange-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Expense
            </button>
            <button
              type="button"
              onClick={() => { setType('income'); setCategoryId(null) }}
              className={`flex-1 rounded-lg py-2.5 text-sm font-medium transition-colors ${
                type === 'income'
                  ? 'bg-green-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Income
            </button>
          </div>

          {/* Amount */}
          <div>
            <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-slate-400">
              Amount
              <EncryptionBadge />
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                $
              </span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full rounded-xl border border-slate-700 bg-slate-800 py-3 pl-8 pr-4 text-lg text-slate-100 placeholder-slate-500 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                required
              />
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-slate-400">
              Category
              <EncryptionBadge />
            </label>
            <div className="space-y-3">
              {activeGroups.map((group) => {
                const cats = categoriesByGroup(group)
                if (cats.length === 0) return null
                return (
                  <div key={group}>
                    {activeGroups.length > 1 && (
                      <p
                        className="mb-1.5 text-xs font-semibold uppercase tracking-wider"
                        style={{ color: GROUP_COLORS[group] }}
                      >
                        {GROUP_LABELS[group]}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-2">
                      {cats.map((cat) => (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setCategoryId(cat.id!)}
                          className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                            categoryId === cat.id
                              ? 'border-transparent text-white'
                              : 'border-slate-700 text-slate-300 hover:border-slate-600'
                          }`}
                          style={
                            categoryId === cat.id
                              ? { backgroundColor: GROUP_COLORS[cat.group] }
                              : undefined
                          }
                        >
                          <Icon
                            name={cat.icon}
                            size={18}
                            className={categoryId === cat.id ? '' : getCategoryIconClassName(cat.group)}
                          />
                          {cat.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-slate-400">
              Description
              <EncryptionBadge />
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What was this for?"
              className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
            />
          </div>

          {/* Note */}
          <div>
            <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-slate-400">
              Note <span className="text-slate-600 font-normal">(optional)</span>
              <EncryptionBadge />
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Additional details, receipt info, etc."
              rows={2}
              className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500 resize-none"
            />
          </div>

          {/* Date */}
          <div>
            <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-slate-400">
              Date
              <EncryptionBadge />
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-slate-100 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
            />
          </div>

          {/* Duplicate warning */}
          {duplicateWarning && (
            <div className="rounded-xl border border-yellow-700 bg-yellow-900/20 p-3 text-sm text-yellow-300">
              <Icon name="AlertTriangle" size={18} className="inline mr-1 align-middle" /> A similar transaction already exists on this date. Submit again to confirm.
            </div>
          )}

          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={!amount || !categoryId || saving}
          >
            {saving ? 'Saving...' : duplicateWarning ? 'Add Anyway' : `Add ${type === 'income' ? 'Income' : 'Expense'}`}
          </Button>
        </form>
      </Card>
    </div>
  )
}
