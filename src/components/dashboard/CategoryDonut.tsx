import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { EXPENSE_GROUPS, type CategoryGroup } from '../../db/database'
import { GROUP_COLORS, GROUP_LABELS } from '../../utils/colors'
import { formatCurrency } from '../../utils/calculations'

interface CategoryDonutProps {
  breakdown: Record<CategoryGroup, number>
}

export function CategoryDonut({ breakdown }: CategoryDonutProps) {
  const data = EXPENSE_GROUPS
    .map((group) => ({
      name: GROUP_LABELS[group],
      value: breakdown[group] ?? 0,
      color: GROUP_COLORS[group],
    }))
    .filter((d) => d.value > 0)

  const total = data.reduce((s, d) => s + d.value, 0)
  const withPct = data.map((d) => ({
    ...d,
    percentage: total > 0 ? ((d.value / total) * 100).toFixed(1) : '0',
  }))

  if (total === 0) {
    return (
      <div className="flex h-52 items-center justify-center text-slate-500">
        No expenses yet this period
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-slate-400">Spending Breakdown</h3>
      <div className="flex items-center gap-4">
        <div className="h-44 w-44 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={withPct}
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={70}
                paddingAngle={3}
                dataKey="value"
                strokeWidth={0}
              >
                {withPct.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.[0]) return null
                  const d = payload[0].payload
                  return (
                    <div className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm shadow-xl">
                      <p className="font-medium" style={{ color: d.color }}>
                        {d.name}
                      </p>
                      <p className="text-slate-300">{formatCurrency(d.value)}</p>
                    </div>
                  )
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="space-y-2 flex-1">
          {withPct.map((d) => (
            <div key={d.name} className="flex items-center gap-2">
              <div
                className="h-3 w-3 rounded-full shrink-0"
                style={{ backgroundColor: d.color }}
              />
              <span className="flex-1 text-sm text-slate-300">{d.name}</span>
              <span className="text-sm font-medium text-slate-200">
                {d.percentage}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
