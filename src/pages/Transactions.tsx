import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { EncryptionBadge } from '../components/ui/EncryptionBadge'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { useToast } from '../components/ui/Toast'
import { useTransactions } from '../hooks/useTransactions'
import { useCategories } from '../hooks/useCategories'
import { formatCurrency } from '../utils/calculations'
import { GROUP_COLORS, GROUP_LABELS, getCategoryIconClassName } from '../utils/colors'
import { EXPENSE_GROUPS } from '../db/database'
import type { Transaction } from '../db/database'
import { Icon } from '../components/ui/Icon'

export default function Transactions() {
  const { transactions, deleteTransaction, updateTransaction, addTransaction } = useTransactions()
  const { categories, getCategoryById, categoriesByGroup } = useCategories()
  const { showToast } = useToast()
  const [filter, setFilter] = useState<'all' | 'income' | 'expense'>('all')
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<number | 'all'>('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [amountMin, setAmountMin] = useState('')
  const [amountMax, setAmountMax] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [editingTx, setEditingTx] = useState<Transaction | null>(null)
  const [editAmount, setEditAmount] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editNote, setEditNote] = useState('')
  const [editCategoryId, setEditCategoryId] = useState<number | null>(null)
  const [expandedTx, setExpandedTx] = useState<number | null>(null)

  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      if (filter !== 'all' && t.type !== filter) return false
      if (categoryFilter !== 'all' && t.categoryId !== categoryFilter) return false
      if (dateFrom && t.date < dateFrom) return false
      if (dateTo && t.date > dateTo) return false
      if (amountMin && t.amount < parseFloat(amountMin)) return false
      if (amountMax && t.amount > parseFloat(amountMax)) return false
      if (search) {
        const q = search.toLowerCase()
        const cat = getCategoryById(t.categoryId)
        const haystack = `${t.description} ${t.note || ''} ${cat?.name || ''}`.toLowerCase()
        if (!haystack.includes(q)) return false
      }
      return true
    })
  }, [transactions, filter, search, categoryFilter, dateFrom, dateTo, amountMin, amountMax, getCategoryById])

  const grouped = filtered.reduce<Record<string, Transaction[]>>((acc, tx) => {
    const key = tx.date
    if (!acc[key]) acc[key] = []
    acc[key].push(tx)
    return acc
  }, {})

  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a))

  const openEdit = (tx: Transaction) => {
    setEditingTx(tx)
    setEditAmount(tx.amount.toString())
    setEditDescription(tx.description)
    setEditNote(tx.note || '')
    setEditCategoryId(tx.categoryId)
  }

  const saveEdit = async () => {
    if (!editingTx?.id || editCategoryId == null) return
    await updateTransaction(editingTx.id, {
      amount: parseFloat(editAmount),
      description: editDescription,
      note: editNote,
      categoryId: editCategoryId,
    })
    setEditingTx(null)
  }

  const handleDelete = async (tx: Transaction) => {
    if (!tx.id) return
    await deleteTransaction(tx.id)
    showToast('Transaction deleted', {
      label: 'Undo',
      onClick: async () => {
        const { id: _id, ...rest } = tx
        await addTransaction(rest)
      },
    })
  }

  const clearFilters = () => {
    setSearch('')
    setCategoryFilter('all')
    setDateFrom('')
    setDateTo('')
    setAmountMin('')
    setAmountMax('')
    setFilter('all')
  }

  const hasActiveFilters = search || categoryFilter !== 'all' || dateFrom || dateTo || amountMin || amountMax

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold">Transactions</h1>
          <EncryptionBadge />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-400">{filtered.length} entries</span>
          <Link
            to="/add"
            className="inline-flex items-center gap-1.5 rounded-xl bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700"
          >
            <Icon name="Plus" size={18} />
            Add Transaction
          </Link>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <svg className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text" value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search description, notes, category..."
          className="w-full rounded-xl border border-slate-800 bg-slate-900 py-2.5 pl-11 pr-4 text-slate-100 placeholder-slate-500 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
        />
        {hasActiveFilters && (
          <button onClick={clearFilters} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 hover:text-slate-300">Clear</button>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 rounded-xl bg-slate-900 border border-slate-800 p-1">
        {(['all', 'expense', 'income'] as const).map((f) => (
          <button
            key={f} onClick={() => setFilter(f)}
            className={`flex-1 rounded-lg py-2 text-sm font-medium capitalize transition-colors ${filter === f ? 'bg-slate-800 text-slate-100' : 'text-slate-500 hover:text-slate-300'}`}
          >{f}</button>
        ))}
      </div>

      {/* Advanced filters toggle */}
      <button onClick={() => setShowFilters(!showFilters)}
        className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300">
        <svg className={`h-3 w-3 transition-transform ${showFilters ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        Advanced filters {hasActiveFilters ? '(active)' : ''}
      </button>

      {showFilters && (
        <Card className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs text-slate-500">From</label>
              <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-slate-100 focus:border-green-500 focus:outline-none" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500">To</label>
              <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-slate-100 focus:border-green-500 focus:outline-none" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs text-slate-500">Min Amount</label>
              <input type="number" step="0.01" value={amountMin} onChange={(e) => setAmountMin(e.target.value)}
                placeholder="$0" className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-slate-100 placeholder-slate-600 focus:border-green-500 focus:outline-none" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500">Max Amount</label>
              <input type="number" step="0.01" value={amountMax} onChange={(e) => setAmountMax(e.target.value)}
                placeholder="$∞" className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-slate-100 placeholder-slate-600 focus:border-green-500 focus:outline-none" />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-500">Category</label>
            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-slate-100 focus:border-green-500 focus:outline-none">
              <option value="all">All categories</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </Card>
      )}

      {/* Transaction list */}
      {sortedDates.length === 0 && (
        <Card className="text-center">
          <p className="text-slate-400 py-8">
            {hasActiveFilters ? 'No matching transactions.' : 'No transactions yet. Start by adding one!'}
          </p>
        </Card>
      )}

      {sortedDates.map((date) => (
        <div key={date} className="space-y-2">
          <h3 className="px-1 text-sm font-medium text-slate-500">
            {format(parseISO(date), 'EEEE, MMM d, yyyy')}
          </h3>
          <div className="space-y-2">
            {grouped[date].map((tx) => {
              const cat = getCategoryById(tx.categoryId)
              const isExpanded = expandedTx === tx.id
              return (
                <div key={tx.id}>
                  <Card className="flex items-center gap-3 !p-4 group cursor-pointer" onClick={() => setExpandedTx(isExpanded ? null : (tx.id ?? null))}>
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                      style={{ backgroundColor: cat ? `${GROUP_COLORS[cat.group]}15` : '#334155' }}>
                      <Icon name={cat?.icon ?? 'Wallet'} size={20} className={cat ? getCategoryIconClassName(cat.group) : ''} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-slate-200">
                        {tx.description || cat?.name || 'Transaction'}
                      </p>
                      <div className="flex items-center gap-2 flex-wrap">
                        {cat && (
                          <>
                            <span
                              className="rounded px-1.5 py-0.5 text-[10px] font-medium"
                              style={{ backgroundColor: `${GROUP_COLORS[cat.group]}25`, color: GROUP_COLORS[cat.group] }}
                              title={`Core: ${GROUP_LABELS[cat.group]}`}
                            >
                              {GROUP_LABELS[cat.group]}
                            </span>
                            <Badge color={GROUP_COLORS[cat.group]}>{cat.name}</Badge>
                          </>
                        )}
                        {tx.note && <Icon name="FileText" size={14} className="text-slate-600" />}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-semibold ${tx.type === 'income' ? 'text-green-400' : 'text-slate-200'}`}>
                        {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                      </p>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={(e) => { e.stopPropagation(); openEdit(tx) }}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200" title="Edit">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); handleDelete(tx) }}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-red-900/30 hover:text-red-400" title="Delete">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </Card>
                  {isExpanded && tx.note && (
                    <div className="ml-14 mt-1 rounded-xl bg-slate-800/50 px-4 py-2 text-sm text-slate-400">
                      <Icon name="FileText" size={14} className="inline mr-1 align-middle" /> {tx.note}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}

      {/* Edit modal */}
      <Modal open={!!editingTx} onClose={() => setEditingTx(null)} title="Edit Transaction">
        <div className="space-y-4">
          <div>
            <label className="mb-1 flex items-center gap-2 text-sm text-slate-400">
              Category
              <EncryptionBadge />
            </label>
            <select
              value={editCategoryId ?? ''}
              onChange={(e) => setEditCategoryId(e.target.value ? Number(e.target.value) : null)}
              className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-slate-100 focus:border-green-500 focus:outline-none"
            >
              {editingTx?.type === 'income'
                ? categoriesByGroup('income').map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))
                : EXPENSE_GROUPS.flatMap((g) =>
                    categoriesByGroup(g).map((c) => (
                      <option key={c.id} value={c.id}>{c.name} ({GROUP_LABELS[g]})</option>
                    ))
                  )}
            </select>
          </div>
          <div>
            <label className="mb-1 flex items-center gap-2 text-sm text-slate-400">
              Amount
              <EncryptionBadge />
            </label>
            <input type="number" step="0.01" value={editAmount} onChange={(e) => setEditAmount(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-slate-100 focus:border-green-500 focus:outline-none" />
          </div>
          <div>
            <label className="mb-1 flex items-center gap-2 text-sm text-slate-400">
              Description
              <EncryptionBadge />
            </label>
            <input type="text" value={editDescription} onChange={(e) => setEditDescription(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-slate-100 focus:border-green-500 focus:outline-none" />
          </div>
          <div>
            <label className="mb-1 flex items-center gap-2 text-sm text-slate-400">
              Note
              <EncryptionBadge />
            </label>
            <textarea value={editNote} onChange={(e) => setEditNote(e.target.value)} rows={2}
              className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-slate-100 focus:border-green-500 focus:outline-none resize-none" />
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setEditingTx(null)} className="flex-1">Cancel</Button>
            <Button onClick={saveEdit} className="flex-1" disabled={editCategoryId == null}>Save</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
