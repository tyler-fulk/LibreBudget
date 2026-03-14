import { useState, useEffect, useMemo } from 'react'
import type { ParsedRow } from '../utils/csvImport'
import type { Category } from '../db/database'
import { Button } from './ui/Button'

interface EditableRow extends ParsedRow {
  selected: boolean
  isDuplicate: boolean
}

type Filter = 'all' | 'matched' | 'uncertain' | 'unmatched'

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

  useEffect(() => {
    if (open) {
      setFilter('all')
      setEditableRows(
        rows.map((row, i) => ({
          ...row,
          // Pre-select high-confidence and uncertain rows (uncertain has a best-guess).
          // Only unmatched (no guess at all) and duplicates start unchecked.
          selected: !duplicateIndices.has(i) && row.categoryConfidence !== 'none',
          isDuplicate: duplicateIndices.has(i),
        })),
      )
    }
  }, [open, rows, duplicateIndices])

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

  const visibleRows = useMemo(() => {
    if (filter === 'matched')   return editableRows.filter((r) => r.categoryConfidence === 'high')
    if (filter === 'uncertain') return editableRows.filter((r) => r.categoryConfidence === 'low')
    if (filter === 'unmatched') return editableRows.filter((r) => r.categoryConfidence === 'none')
    return editableRows // 'all'
  }, [editableRows, filter])

  if (!open) return null

  const selectedCount = editableRows.filter((r) => r.selected).length
  const dupCount = duplicateIndices.size

  const toggleAll = (select: boolean) => {
    setEditableRows((prev) =>
      prev.map((r) => {
        const visible =
          filter === 'matched'   ? r.categoryConfidence === 'high' :
          filter === 'uncertain' ? r.categoryConfidence === 'low'  :
          filter === 'unmatched' ? r.categoryConfidence === 'none' :
          true // 'all'
        return visible ? { ...r, selected: select } : r
      }),
    )
  }

  /** Update a row by its original index (stable across filter changes) */
  const updateRow = (originalIndex: number, updates: Partial<EditableRow>) => {
    setEditableRows((prev) =>
      prev.map((r, i) => (i === originalIndex ? { ...r, ...updates } : r)),
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
      f === 'unmatched' ? 'bg-red-500' : f === 'uncertain' ? 'bg-yellow-400' : f === 'matched' ? 'bg-green-500' : null
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
        {/* Dot-only on xs, full label on sm+ */}
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
              <h2 className="text-lg font-semibold text-slate-100">
                Review CSV Import
              </h2>
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
            {/* Select All / Deselect All */}
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

            {/* Legend — dots only on mobile, dots + labels on sm+ */}
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

          {/* Selected count + filter tabs */}
          <div className="mt-2 flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
            <div className="flex items-center gap-1">
              {filterBtn('all', 'All')}
              {filterBtn('matched', 'Matched', counts.matched)}
              {filterBtn('uncertain', 'Uncertain', counts.uncertain)}
              {filterBtn('unmatched', 'Unmatched', counts.unmatched)}
            </div>
            <span className="shrink-0 text-xs text-slate-500">
              {selectedCount}/{editableRows.length} selected
            </span>
          </div>
        </div>

        {/* Column headers — desktop only */}
        <div
          className="hidden shrink-0 gap-2 border-b border-slate-800 px-6 py-2 md:grid"
          style={{ gridTemplateColumns: '28px 110px 86px 86px 1fr 160px' }}
        >
          <div />
          <div className="text-center text-xs font-medium text-slate-500">Date</div>
          <div className="text-center text-xs font-medium text-slate-500">Type</div>
          <div className="text-center text-xs font-medium text-slate-500">Amount</div>
          <div className="text-center text-xs font-medium text-slate-500">Description</div>
          <div className="text-center text-xs font-medium text-slate-500">Category</div>
        </div>

        {/* Rows */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-2">
          {visibleRows.length === 0 && (
            <p className="py-8 text-center text-sm text-slate-500">
              {filter === 'all' ? 'No transactions to display.' : 'No transactions match this filter.'}
            </p>
          )}

          {visibleRows.map((row) => {
            // Find the stable original index for updates
            const originalIndex = editableRows.indexOf(row)
            // dimContainer: deselected rows that already have a category — grey the whole row
            const dimContainer = !row.selected && row.categoryConfidence !== 'none'
            // dimField: deselected unmatched rows — grey individual fields but NOT the category
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
                      onChange={(e) => updateRow(originalIndex, {
                            selected: e.target.checked,
                            ...(e.target.checked && row.categoryConfidence === 'low'
                              ? { categoryConfidence: 'high' }
                              : {}),
                          })}
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
                        onChange={(e) =>
                          updateRow(originalIndex, {
                            categoryName: e.target.value,
                            categoryConfidence: e.target.value ? 'high' : 'none',
                            ...(e.target.value ? { selected: true } : {}),
                          })
                        }
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
                        onChange={(e) => updateRow(originalIndex, {
                          selected: e.target.checked,
                          ...(e.target.checked && row.categoryConfidence === 'low'
                            ? { categoryConfidence: 'high' }
                            : {}),
                        })}
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
                        onChange={(e) =>
                          updateRow(originalIndex, {
                            categoryName: e.target.value,
                            categoryConfidence: e.target.value ? 'high' : 'none',
                            ...(e.target.value ? { selected: true } : {}),
                          })
                        }
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
