import { useState, useEffect, useMemo } from 'react'
import type { ParsedRow } from '../utils/csvImport'
import type { Category } from '../db/database'
import { Button } from './ui/Button'

interface EditableRow extends ParsedRow {
  selected: boolean
  isDuplicate: boolean
}

type Filter = 'all' | 'matched' | 'uncertain' | 'unmatched'
type SortCol = 'date' | 'type' | 'amount' | 'description' | 'category'
interface SortState { col: SortCol | null; dir: 'asc' | 'desc' }

interface ColumnFilters {
  dateFrom: string
  dateTo: string
  type: 'all' | 'income' | 'expense'
  amountMin: string
  amountMax: string
  description: string
  category: string
  hideDuplicates: boolean
}

const DEFAULT_COL_FILTERS: ColumnFilters = {
  dateFrom: '',
  dateTo: '',
  type: 'all',
  amountMin: '',
  amountMax: '',
  description: '',
  category: '',
  hideDuplicates: false,
}

interface Props {
  open: boolean
  rows: ParsedRow[]
  duplicateIndices: Set<number>
  categories: Category[]
  defaultCategoryId: number
  onConfirm: (rows: ParsedRow[]) => Promise<void>
  onClose: () => void
}

/** Small dot indicator for category confidence */
function ConfidenceDot({ confidence }: { confidence: ParsedRow['categoryConfidence'] }) {
  if (confidence === 'high') {
    return (
      <span
        title="Category auto-matched (high confidence)"
        className="inline-block h-2 w-2 shrink-0 rounded-full bg-green-500"
      />
    )
  }
  if (confidence === 'low') {
    return (
      <span
        title="Category inferred from keywords — please verify"
        className="inline-block h-2 w-2 shrink-0 rounded-full bg-yellow-400"
      />
    )
  }
  return (
    <span
      title="Could not determine category — please assign manually"
      className="inline-block h-2 w-2 shrink-0 rounded-full bg-red-500"
    />
  )
}

/**
 * Jaccard similarity on alphabetic word tokens (min 3 chars).
 * Returns 0–1; >= 0.5 considered "similar enough" for propagation.
 */
function descSimilarity(a: string, b: string): number {
  const tokenize = (s: string) =>
    new Set(
      s
        .toLowerCase()
        .replace(/[^a-z]/g, ' ')
        .split(/\s+/)
        .filter((t) => t.length >= 3),
    )
  const ta = tokenize(a)
  const tb = tokenize(b)
  if (ta.size === 0 && tb.size === 0) return 1
  if (ta.size === 0 || tb.size === 0) return 0
  let intersection = 0
  for (const t of ta) if (tb.has(t)) intersection++
  const union = ta.size + tb.size - intersection
  return intersection / union
}

export function CSVImportModal({
  open,
  rows,
  duplicateIndices,
  categories,
  onConfirm,
  onClose,
}: Props) {
  const [editableRows, setEditableRows] = useState<EditableRow[]>([])
  const [importing, setImporting] = useState(false)
  const [filter, setFilter] = useState<Filter>('all')
  const [colFilters, setColFilters] = useState<ColumnFilters>(DEFAULT_COL_FILTERS)
  const [showColFilters, setShowColFilters] = useState(false)
  const [similarUpdateMsg, setSimilarUpdateMsg] = useState<string | null>(null)
  const [sort, setSort] = useState<SortState>({ col: null, dir: 'asc' })

  useEffect(() => {
    if (open) {
      setFilter('all')
      setColFilters(DEFAULT_COL_FILTERS)
      setShowColFilters(false)
      setSimilarUpdateMsg(null)
      setSort({ col: null, dir: 'asc' })
      setEditableRows(
        rows.map((row, i) => ({
          ...row,
          selected: !duplicateIndices.has(i) && row.categoryConfidence !== 'none',
          isDuplicate: duplicateIndices.has(i),
        })),
      )
    }
  }, [open, rows, duplicateIndices])

  // Auto-dismiss similar-update banner after 4 s
  useEffect(() => {
    if (!similarUpdateMsg) return
    const t = setTimeout(() => setSimilarUpdateMsg(null), 4000)
    return () => clearTimeout(t)
  }, [similarUpdateMsg])

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  const counts = useMemo(() => {
    const matched = editableRows.filter((r) => r.categoryConfidence === 'high').length
    const uncertain = editableRows.filter((r) => r.categoryConfidence === 'low').length
    const unmatched = editableRows.filter((r) => r.categoryConfidence === 'none').length
    return { matched, uncertain, unmatched }
  }, [editableRows])

  const hasActiveColFilters = useMemo(
    () =>
      colFilters.dateFrom ||
      colFilters.dateTo ||
      colFilters.type !== 'all' ||
      colFilters.amountMin ||
      colFilters.amountMax ||
      colFilters.description ||
      colFilters.category,
    [colFilters],
  )

  const visibleRows = useMemo(() => {
    let filtered = editableRows

    // Confidence tab filter
    if (filter === 'matched')        filtered = filtered.filter((r) => r.categoryConfidence === 'high')
    else if (filter === 'uncertain') filtered = filtered.filter((r) => r.categoryConfidence === 'low')
    else if (filter === 'unmatched') filtered = filtered.filter((r) => r.categoryConfidence === 'none')

    // Column filters
    if (colFilters.dateFrom)         filtered = filtered.filter((r) => r.date >= colFilters.dateFrom)
    if (colFilters.dateTo)           filtered = filtered.filter((r) => r.date <= colFilters.dateTo)
    if (colFilters.type !== 'all')   filtered = filtered.filter((r) => r.type === colFilters.type)
    if (colFilters.amountMin !== '') filtered = filtered.filter((r) => r.amount >= parseFloat(colFilters.amountMin))
    if (colFilters.amountMax !== '') filtered = filtered.filter((r) => r.amount <= parseFloat(colFilters.amountMax))
    if (colFilters.description) {
      const q = colFilters.description.toLowerCase()
      filtered = filtered.filter((r) => r.description.toLowerCase().includes(q))
    }
    if (colFilters.category) {
      const q = colFilters.category.toLowerCase()
      filtered = filtered.filter((r) => r.categoryName.toLowerCase().includes(q))
    }
    if (colFilters.hideDuplicates) filtered = filtered.filter((r) => !r.isDuplicate)

    // Sort
    if (sort.col) {
      const col = sort.col
      filtered = [...filtered].sort((a, b) => {
        let cmp = 0
        if (col === 'date')        cmp = a.date.localeCompare(b.date)
        else if (col === 'type')   cmp = a.type.localeCompare(b.type)
        else if (col === 'amount') cmp = a.amount - b.amount
        else if (col === 'description') cmp = a.description.localeCompare(b.description)
        else if (col === 'category')    cmp = a.categoryName.localeCompare(b.categoryName)
        return sort.dir === 'asc' ? cmp : -cmp
      })
    }

    return filtered
  }, [editableRows, filter, colFilters, sort])

  if (!open) return null

  const selectedCount = editableRows.filter((r) => r.selected).length
  const dupCount = duplicateIndices.size

  const toggleAll = (select: boolean) => {
    const visibleSet = new Set(visibleRows)
    setEditableRows((prev) =>
      prev.map((r) => (visibleSet.has(r) ? { ...r, selected: select } : r)),
    )
  }

  /** Update a row by its original index (stable across filter changes) */
  const updateRow = (originalIndex: number, updates: Partial<EditableRow>) => {
    setEditableRows((prev) =>
      prev.map((r, i) => (i === originalIndex ? { ...r, ...updates } : r)),
    )
  }

  /**
   * Set category on one row, then propagate to all rows that:
   *  - have the same transaction type (expense / income)
   *  - share >= 50% word-token overlap with the changed row's description
   */
  const handleCategoryChange = (originalIndex: number, newCategoryName: string) => {
    const changedRow = editableRows[originalIndex]

    // Compute similar row indices synchronously before setState
    const similarIndices = new Set<number>()
    if (newCategoryName) {
      editableRows.forEach((r, i) => {
        if (
          i !== originalIndex &&
          r.type === changedRow.type &&
          descSimilarity(r.description, changedRow.description) >= 0.5
        ) {
          similarIndices.add(i)
        }
      })
    }

    setEditableRows((prev) =>
      prev.map((r, i) => {
        if (i === originalIndex) {
          return {
            ...r,
            categoryName: newCategoryName,
            categoryConfidence: newCategoryName ? ('high' as const) : ('none' as const),
            ...(newCategoryName ? { selected: true } : {}),
          }
        }
        if (similarIndices.has(i)) {
          return {
            ...r,
            categoryName: newCategoryName,
            categoryConfidence: 'high' as const,
            selected: true,
          }
        }
        return r
      }),
    )

    if (similarIndices.size > 1) {
      setSimilarUpdateMsg(
        `Applied "${newCategoryName}" to ${similarIndices.size} similar transaction${similarIndices.size !== 1 ? 's' : ''}`,
      )
    }
  }

  const handleSort = (col: SortCol) => {
    setSort((prev) =>
      prev.col === col && prev.dir === 'asc'
        ? { col, dir: 'desc' }
        : { col, dir: 'asc' },
    )
  }

  const handleConfirm = async () => {
    setImporting(true)
    try {
      const toImport = editableRows
        .filter((r) => r.selected)
        .map(({ selected: _s, isDuplicate: _d, ...row }) => row)
      await onConfirm(toImport)
    } finally {
      setImporting(false)
    }
  }

  const filterBtn = (f: Filter, label: string, count?: number) => {
    const dotColor =
      f === 'unmatched' ? 'bg-red-500' :
      f === 'uncertain' ? 'bg-yellow-400' :
      f === 'matched'   ? 'bg-green-500' : null
    const badgeClass =
      f === 'unmatched' ? 'bg-red-500/20 text-red-400' :
      f === 'matched'   ? 'bg-green-500/20 text-green-400' :
      'bg-yellow-500/20 text-yellow-400'

    return (
      <button
        type="button"
        onClick={() => setFilter(f)}
        className={`flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-medium transition-colors ${
          filter === f ? 'bg-slate-700 text-slate-100' : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        {dotColor ? (
          <>
            <span className={`inline-block h-2 w-2 shrink-0 rounded-full ${dotColor} sm:hidden`} />
            <span className="hidden sm:inline">{label}</span>
          </>
        ) : (
          <span>{label}</span>
        )}
        {count !== undefined && count > 0 && (
          <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${badgeClass}`}>
            {count}
          </span>
        )}
      </button>
    )
  }

  const cfInput =
    'w-full rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-slate-100 focus:border-green-500 focus:outline-none'

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pb-20 md:items-center md:pb-4">
      <div className="fixed inset-0 bg-black/60" onClick={onClose} />

      <div
        className="relative flex w-full max-w-4xl flex-col rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl"
        style={{ maxHeight: 'min(90dvh, 90vh)' }}
      >
        {/* Header */}
        <div className="shrink-0 overflow-hidden border-b border-slate-800 p-5">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-100">Review CSV Import</h2>
              <p className="mt-0.5 text-xs text-slate-500">
                {rows.length} transaction{rows.length !== 1 ? 's' : ''} found
                {dupCount > 0 && (
                  <span className="ml-1 text-yellow-400">
                    · {dupCount} possible duplicate{dupCount !== 1 ? 's' : ''} pre-unchecked
                  </span>
                )}
              </p>
            </div>
            <button
              onClick={onClose}
              className="ml-4 shrink-0 rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Select controls + legend */}
          <div className="mt-3 flex items-center justify-between gap-2 overflow-hidden">
            <div className="flex shrink-0 items-center gap-2">
              <button
                onClick={() => toggleAll(true)}
                className="rounded-md bg-slate-800 px-2.5 py-1 text-xs font-medium text-green-400 hover:bg-slate-700 hover:text-green-300"
              >
                Select All
              </button>
              <button
                onClick={() => toggleAll(false)}
                className="rounded-md bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-400 hover:bg-slate-700 hover:text-slate-300"
              >
                Deselect All
              </button>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="flex items-center gap-1" title="Matched">
                <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
                <span className="hidden sm:inline">Matched</span>
              </span>
              <span className="flex items-center gap-1" title="Uncertain">
                <span className="inline-block h-2 w-2 rounded-full bg-yellow-400" />
                <span className="hidden sm:inline">Uncertain</span>
              </span>
              <span className="flex items-center gap-1" title="Unmatched">
                <span className="inline-block h-2 w-2 rounded-full bg-red-500" />
                <span className="hidden sm:inline">Unmatched</span>
              </span>
            </div>
          </div>

          {/* Confidence filter tabs + selected count + column-filter toggle */}
          <div className="mt-2 flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
            <div className="flex items-center gap-1">
              {filterBtn('all', 'All')}
              {filterBtn('matched', 'Matched', counts.matched)}
              {filterBtn('uncertain', 'Uncertain', counts.uncertain)}
              {filterBtn('unmatched', 'Unmatched', counts.unmatched)}
            </div>
            <div className="flex items-center gap-2">
              <span className="shrink-0 text-xs text-slate-500">
                {selectedCount}/{editableRows.length} selected
              </span>
              <button
                type="button"
                onClick={() => setShowColFilters((v) => !v)}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                  showColFilters || hasActiveColFilters
                    ? 'bg-green-600/20 text-green-400'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z"
                  />
                </svg>
                Filters
                {hasActiveColFilters && (
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-400" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Column Filters Panel */}
        {showColFilters && (
          <div className="shrink-0 border-b border-slate-800 bg-slate-900 px-5 py-3">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:flex lg:flex-wrap lg:gap-2">
              <div className="flex flex-col gap-0.5">
                <label className="text-[10px] font-medium uppercase tracking-wide text-slate-500">
                  Date from
                </label>
                <input
                  type="date"
                  value={colFilters.dateFrom}
                  onChange={(e) => setColFilters((f) => ({ ...f, dateFrom: e.target.value }))}
                  className={cfInput}
                />
              </div>
              <div className="flex flex-col gap-0.5">
                <label className="text-[10px] font-medium uppercase tracking-wide text-slate-500">
                  Date to
                </label>
                <input
                  type="date"
                  value={colFilters.dateTo}
                  onChange={(e) => setColFilters((f) => ({ ...f, dateTo: e.target.value }))}
                  className={cfInput}
                />
              </div>
              <div className="flex flex-col gap-0.5">
                <label className="text-[10px] font-medium uppercase tracking-wide text-slate-500">
                  Type
                </label>
                <select
                  value={colFilters.type}
                  onChange={(e) =>
                    setColFilters((f) => ({
                      ...f,
                      type: e.target.value as ColumnFilters['type'],
                    }))
                  }
                  className={cfInput}
                >
                  <option value="all">All types</option>
                  <option value="income">Income</option>
                  <option value="expense">Expense</option>
                </select>
              </div>
              <div className="flex flex-col gap-0.5">
                <label className="text-[10px] font-medium uppercase tracking-wide text-slate-500">
                  Min $
                </label>
                <input
                  type="number"
                  value={colFilters.amountMin}
                  min={0}
                  step="0.01"
                  placeholder="0.00"
                  onChange={(e) => setColFilters((f) => ({ ...f, amountMin: e.target.value }))}
                  className={cfInput}
                />
              </div>
              <div className="flex flex-col gap-0.5">
                <label className="text-[10px] font-medium uppercase tracking-wide text-slate-500">
                  Max $
                </label>
                <input
                  type="number"
                  value={colFilters.amountMax}
                  min={0}
                  step="0.01"
                  placeholder="∞"
                  onChange={(e) => setColFilters((f) => ({ ...f, amountMax: e.target.value }))}
                  className={cfInput}
                />
              </div>
              <div className="flex flex-col gap-0.5">
                <label className="text-[10px] font-medium uppercase tracking-wide text-slate-500">
                  Description
                </label>
                <input
                  type="text"
                  value={colFilters.description}
                  placeholder="Search…"
                  onChange={(e) => setColFilters((f) => ({ ...f, description: e.target.value }))}
                  className={cfInput}
                />
              </div>
              <div className="flex flex-col gap-0.5">
                <label className="text-[10px] font-medium uppercase tracking-wide text-slate-500">
                  Category
                </label>
                <input
                  type="text"
                  value={colFilters.category}
                  placeholder="Search…"
                  onChange={(e) => setColFilters((f) => ({ ...f, category: e.target.value }))}
                  className={cfInput}
                />
              </div>
              <div className="flex flex-col justify-end gap-0.5">
                <label className="invisible text-[10px]">x</label>
                <button
                  type="button"
                  onClick={() => setColFilters((f) => ({ ...f, hideDuplicates: !f.hideDuplicates }))}
                  className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                    colFilters.hideDuplicates
                      ? 'bg-yellow-500/20 text-yellow-400'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  <span className={`inline-block h-2 w-2 shrink-0 rounded-full ${colFilters.hideDuplicates ? 'bg-yellow-400' : 'bg-slate-500'}`} />
                  Hide duplicates
                </button>
              </div>
              {hasActiveColFilters && (
                <div className="flex flex-col justify-end gap-0.5">
                  <label className="invisible text-[10px]">x</label>
                  <button
                    type="button"
                    onClick={() => setColFilters(DEFAULT_COL_FILTERS)}
                    className="rounded-md bg-slate-700 px-3 py-1 text-xs font-medium text-slate-300 hover:bg-slate-600"
                  >
                    Clear all
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Similar-transactions update banner */}
        {similarUpdateMsg && (
          <div className="shrink-0 flex items-center justify-between border-b border-green-500/20 bg-green-500/10 px-5 py-2">
            <div className="flex items-center gap-2 text-xs text-green-400">
              <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
              {similarUpdateMsg}
            </div>
            <button
              type="button"
              onClick={() => setSimilarUpdateMsg(null)}
              className="ml-2 shrink-0 text-slate-500 hover:text-slate-300"
            >
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Column headers — desktop only, clickable to sort */}
        <div
          className="hidden shrink-0 gap-2 border-b border-slate-800 px-6 py-1.5 md:grid"
          style={{ gridTemplateColumns: '28px 110px 86px 86px 1fr 160px' }}
        >
          <div />
          {(['date', 'type', 'amount', 'description', 'category'] as SortCol[]).map((col) => (
            <button
              key={col}
              type="button"
              onClick={() => handleSort(col)}
              className="flex w-full items-center justify-center gap-1 text-xs font-medium capitalize text-slate-500 transition-colors hover:text-slate-300"
            >
              {col}
              <span className="text-[10px] leading-none">
                {sort.col === col ? (sort.dir === 'asc' ? '↑' : '↓') : <span className="opacity-30">↕</span>}
              </span>
            </button>
          ))}
        </div>

        {/* Rows */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-2">
          {visibleRows.length === 0 && (
            <p className="py-8 text-center text-sm text-slate-500">
              {filter === 'all' && !hasActiveColFilters
                ? 'No transactions to display.'
                : 'No transactions match the current filters.'}
            </p>
          )}

          {visibleRows.map((row) => {
            const originalIndex = editableRows.indexOf(row)
            const dimContainer = !row.selected && row.categoryConfidence !== 'none'
            const dimField = !row.selected && row.categoryConfidence === 'none'
            const fieldDim = dimField ? 'opacity-40' : ''

            return (
              <div
                key={originalIndex}
                className={`mb-2 transition-colors md:rounded-lg md:px-2 md:py-2 ${
                  row.isDuplicate
                    ? 'md:border md:border-yellow-500/25 md:bg-yellow-500/5'
                    : 'md:hover:bg-slate-800/30'
                } ${dimContainer ? 'opacity-40' : ''}`}
              >
                {/* Desktop: single grid row */}
                <div
                  className="hidden items-center gap-2 md:grid"
                  style={{ gridTemplateColumns: '28px 110px 86px 86px 1fr 160px' }}
                >
                  <input
                    type="checkbox"
                    checked={row.selected}
                    onChange={(e) =>
                      updateRow(originalIndex, {
                        selected: e.target.checked,
                        ...(e.target.checked && row.categoryConfidence === 'low'
                          ? { categoryConfidence: 'high' }
                          : {}),
                      })
                    }
                    className={`h-4 w-4 cursor-pointer accent-green-500 ${fieldDim}`}
                  />
                  <input
                    type="date"
                    value={row.date}
                    onChange={(e) => updateRow(originalIndex, { date: e.target.value })}
                    className={`w-full rounded-lg border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-slate-100 focus:border-green-500 focus:outline-none ${fieldDim}`}
                  />
                  <button
                    type="button"
                    onClick={() =>
                      updateRow(originalIndex, {
                        type: row.type === 'income' ? 'expense' : 'income',
                      })
                    }
                    className={`rounded-lg px-2 py-1 text-xs font-medium transition-colors ${
                      row.type === 'income'
                        ? 'bg-green-600/20 text-green-400 hover:bg-green-600/30'
                        : 'bg-red-600/20 text-red-400 hover:bg-red-600/30'
                    } ${fieldDim}`}
                  >
                    {row.type === 'income' ? 'Income' : 'Expense'}
                  </button>
                  <div className={`relative ${fieldDim}`}>
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                      $
                    </span>
                    <input
                      type="number"
                      value={row.amount}
                      min={0}
                      step="0.01"
                      onChange={(e) =>
                        updateRow(originalIndex, { amount: parseFloat(e.target.value) || 0 })
                      }
                      className="w-full rounded-lg border border-slate-700 bg-slate-800 py-1 pl-5 pr-2 text-xs text-slate-100 focus:border-green-500 focus:outline-none"
                    />
                  </div>
                  {/* Description + duplicate badge */}
                  <div className={`relative ${fieldDim}`}>
                    {row.isDuplicate && (
                      <span className="absolute -right-1 -top-1 z-10 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-yellow-500 text-[8px] font-bold text-black">
                        !
                      </span>
                    )}
                    <input
                      type="text"
                      value={row.description}
                      onChange={(e) => updateRow(originalIndex, { description: e.target.value })}
                      className="w-full rounded-lg border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-slate-100 focus:border-green-500 focus:outline-none"
                      placeholder="Description"
                    />
                  </div>
                  {/* Category dropdown + confidence dot — always full opacity */}
                  <div className="flex items-center gap-1.5">
                    <ConfidenceDot confidence={row.categoryConfidence} />
                    <select
                      value={row.categoryName}
                      onChange={(e) => handleCategoryChange(originalIndex, e.target.value)}
                      className={`w-full rounded-lg border bg-slate-800 px-2 py-1 text-xs text-slate-100 focus:border-green-500 focus:outline-none ${
                        row.categoryConfidence === 'none'
                          ? 'border-red-500/50'
                          : row.categoryConfidence === 'low'
                            ? 'border-yellow-500/50'
                            : 'border-slate-700'
                      }`}
                    >
                      <option value="" style={{ opacity: 0.4 }}>— assign category —</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.name}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Mobile: card layout */}
                <div className="md:hidden rounded-xl border border-slate-700 bg-slate-800 p-3 space-y-3">
                  {/* Row 1: checkbox + description + duplicate badge */}
                  <div className="flex items-center gap-2.5">
                    <input
                      type="checkbox"
                      checked={row.selected}
                      onChange={(e) =>
                        updateRow(originalIndex, {
                          selected: e.target.checked,
                          ...(e.target.checked && row.categoryConfidence === 'low'
                            ? { categoryConfidence: 'high' }
                            : {}),
                        })
                      }
                      className={`h-4 w-4 shrink-0 cursor-pointer accent-green-500 ${fieldDim}`}
                    />
                    <input
                      type="text"
                      value={row.description}
                      onChange={(e) => updateRow(originalIndex, { description: e.target.value })}
                      className={`min-w-0 flex-1 bg-transparent border-b border-slate-700 pb-0.5 text-sm font-medium text-slate-100 placeholder-slate-500 focus:border-green-500 focus:outline-none ${fieldDim}`}
                      placeholder="Description"
                    />
                    {row.isDuplicate && (
                      <span className="shrink-0 rounded-full bg-yellow-500/20 px-1.5 py-0.5 text-[10px] font-medium text-yellow-400">
                        dup
                      </span>
                    )}
                  </div>

                  {/* Row 2: date + type toggle + amount */}
                  <div className={`flex items-center gap-2 ${fieldDim}`}>
                    <input
                      type="date"
                      value={row.date}
                      onChange={(e) => updateRow(originalIndex, { date: e.target.value })}
                      className="h-7 w-24 shrink-0 rounded-lg border border-slate-700 bg-slate-900 px-2 leading-none text-xs text-slate-300 focus:border-green-500 focus:outline-none [appearance:none] [-webkit-appearance:none]"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        updateRow(originalIndex, {
                          type: row.type === 'income' ? 'expense' : 'income',
                        })
                      }
                      className={`shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                        row.type === 'income'
                          ? 'bg-green-600/20 text-green-400'
                          : 'bg-red-600/20 text-red-400'
                      }`}
                    >
                      {row.type === 'income' ? 'Income' : 'Expense'}
                    </button>
                    <div className="relative h-7 shrink-0">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-slate-400">$</span>
                      <input
                        type="number"
                        value={row.amount}
                        min={0}
                        step="0.01"
                        onChange={(e) =>
                          updateRow(originalIndex, { amount: parseFloat(e.target.value) || 0 })
                        }
                        className={`h-7 w-24 rounded-lg border border-slate-700 bg-slate-900 pl-5 pr-2 text-xs font-semibold leading-none focus:border-green-500 focus:outline-none ${
                          row.type === 'income' ? 'text-green-400' : 'text-red-400'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Row 3: category + confidence dot */}
                  <div className="flex items-center gap-1.5">
                    <ConfidenceDot confidence={row.categoryConfidence} />
                    <select
                      value={row.categoryName}
                      onChange={(e) => handleCategoryChange(originalIndex, e.target.value)}
                      className={`w-full rounded-lg border bg-slate-900 px-2 py-1.5 text-xs text-slate-100 focus:border-green-500 focus:outline-none ${
                        row.categoryConfidence === 'none'
                          ? 'border-red-500/50'
                          : row.categoryConfidence === 'low'
                            ? 'border-yellow-500/50'
                            : 'border-slate-700'
                      }`}
                    >
                      <option value="" style={{ opacity: 0.4 }}>— assign category —</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.name}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-slate-800 p-4">
          {(counts.unmatched > 0 || counts.uncertain > 0) && (filter === 'all' || filter === 'matched') && (
            <div className="mb-3 flex flex-col gap-1.5">
              {counts.uncertain > 0 && (
                <div className="flex items-center justify-between gap-2 rounded-lg bg-yellow-500/10 px-3 py-2">
                  <div className="flex items-center gap-2 text-xs text-yellow-400">
                    <span className="inline-block h-2 w-2 shrink-0 rounded-full bg-yellow-400" />
                    <span>{counts.uncertain} uncertain — best-guess, pre-selected</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFilter('uncertain')}
                    className="shrink-0 text-xs font-medium text-yellow-400 underline hover:text-yellow-300"
                  >
                    Review
                  </button>
                </div>
              )}
              {counts.unmatched > 0 && (
                <div className="flex items-center justify-between gap-2 rounded-lg bg-red-500/10 px-3 py-2">
                  <div className="flex items-center gap-2 text-xs text-red-400">
                    <span className="inline-block h-2 w-2 shrink-0 rounded-full bg-red-500" />
                    <span>{counts.unmatched} unmatched — unselected</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFilter('unmatched')}
                    className="shrink-0 text-xs font-medium text-red-400 underline hover:text-red-300"
                  >
                    Assign
                  </button>
                </div>
              )}
            </div>
          )}
          <div className="flex gap-3">
            <Button variant="secondary" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={selectedCount === 0 || importing}
              className="flex-1"
            >
              {importing
                ? 'Importing...'
                : `Import ${selectedCount} Transaction${selectedCount !== 1 ? 's' : ''}`}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
