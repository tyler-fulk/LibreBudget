import { getHealthBarColor } from '../../utils/colors'
import { formatCurrency } from '../../utils/calculations'

interface HealthBarProps {
  spent: number
  budget: number
}

export function HealthBar({ spent, budget }: HealthBarProps) {
  const ratio = budget > 0 ? Math.min(spent / budget, 1.2) : 0
  const remaining = Math.max(budget - spent, 0)
  const percentage = Math.min(ratio * 100, 100)
  const color = getHealthBarColor(ratio)

  const label =
    ratio <= 0.5
      ? 'Looking great!'
      : ratio <= 0.75
        ? 'On track'
        : ratio <= 0.9
          ? 'Getting close...'
          : ratio <= 1
            ? 'Almost at limit!'
            : 'Over budget!'

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-slate-400">Budget Health</h3>
          <p className="text-lg font-bold" style={{ color }}>
            {label}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-slate-400">Remaining</p>
          <p className="text-lg font-bold text-slate-100">
            {formatCurrency(remaining)}
          </p>
        </div>
      </div>

      {/* HP Bar */}
      <div className="relative h-6 overflow-hidden rounded-full bg-slate-800">
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out"
          style={{
            width: `${percentage}%`,
            backgroundColor: color,
            boxShadow: `0 0 12px ${color}40`,
          }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-bold text-white drop-shadow-sm">
            {formatCurrency(spent)} / {formatCurrency(budget)}
          </span>
        </div>
      </div>

      <div className="flex justify-between text-xs text-slate-500">
        <span>{Math.round(percentage)}% used</span>
        <span>{Math.round(100 - Math.min(percentage, 100))}% left</span>
      </div>
    </div>
  )
}
