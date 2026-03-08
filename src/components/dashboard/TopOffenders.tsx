import type { Category } from '../../db/database'
import { formatCurrency } from '../../utils/calculations'
import { GROUP_COLORS, getCategoryIconClassName } from '../../utils/colors'
import { Icon } from '../ui/Icon'

interface TopOffendersProps {
  categorySpending: { category: Category; total: number }[]
}

export function TopOffenders({ categorySpending }: TopOffendersProps) {
  const sorted = [...categorySpending]
    .filter(({ category }) => category.group !== 'savings')
    .sort((a, b) => b.total - a.total)
    .slice(0, 5)

  const max = sorted[0]?.total ?? 0

  if (sorted.length === 0) {
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-slate-400">Top Expenses</h3>
        <p className="text-sm text-slate-500 py-4 text-center">
          No expense data yet
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-slate-400">Top Expenses</h3>
      <div className="space-y-3">
        {sorted.map(({ category, total }, i) => {
          const width = max > 0 ? (total / max) * 100 : 0
          const color = GROUP_COLORS[category.group]
          return (
            <div key={category.id} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-slate-200">
                  <Icon name={category.icon} size={18} className={getCategoryIconClassName(category.group)} />
                  <span className="text-xs font-medium text-slate-400">
                    #{i + 1}
                  </span>
                  {category.name}
                </span>
                <span className="font-medium text-slate-200">
                  {formatCurrency(total)}
                </span>
              </div>
              <div className="progress-track h-2 overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${width}%`,
                    backgroundColor: color,
                  }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
