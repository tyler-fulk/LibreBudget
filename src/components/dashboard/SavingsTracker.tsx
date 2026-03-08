import { formatCurrency } from '../../utils/calculations'

interface SavingsTrackerProps {
  saved: number
  budget: number
}

export function SavingsTracker({ saved, budget }: SavingsTrackerProps) {
  if (saved <= 0) return null

  const savingsPct = budget > 0 ? Math.min((saved / budget) * 100, 100) : 0
  const spendingBudget = Math.max(0, budget - saved)
  const spendingPct = 100 - savingsPct

  return (
    <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-blue-400" />
          <h3 className="text-sm font-medium text-slate-400">Saved This Month</h3>
        </div>
        <span className="text-xs text-blue-400 font-medium">{savingsPct.toFixed(1)}% of budget</span>
      </div>

      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold text-blue-400">{formatCurrency(saved)}</span>
        <span className="text-sm text-slate-500">locked away, off budget</span>
      </div>

      {/* Split bar: savings vs spending budget */}
      <div className="space-y-1.5">
        <div className="progress-track flex h-2.5 overflow-hidden rounded-full bg-slate-800">
          <div
            className="rounded-l-full bg-blue-500 transition-all duration-700"
            style={{ width: `${savingsPct}%` }}
          />
          <div
            className="rounded-r-full bg-slate-600 transition-all duration-700"
            style={{ width: `${spendingPct}%` }}
          />
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-blue-400">Savings</span>
          <span className="text-slate-400">
            {formatCurrency(spendingBudget)} spending budget remaining
          </span>
        </div>
      </div>
    </div>
  )
}
