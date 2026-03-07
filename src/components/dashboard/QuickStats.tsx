import { formatCurrency } from '../../utils/calculations'

interface QuickStatsProps {
  totalIncome: number
  totalExpenses: number
  budget: number
}

export function QuickStats({ totalIncome, totalExpenses, budget }: QuickStatsProps) {
  const remaining = budget - totalExpenses
  const savingsRate = totalIncome > 0
    ? (((totalIncome - totalExpenses) / totalIncome) * 100)
    : 0

  const stats = [
    {
      label: 'Income',
      value: formatCurrency(totalIncome),
      color: 'text-green-400',
      bgColor: 'bg-green-500/10',
    },
    {
      label: 'Expenses',
      value: formatCurrency(totalExpenses),
      color: 'text-orange-400',
      bgColor: 'bg-orange-500/10',
    },
    {
      label: 'Remaining',
      value: formatCurrency(remaining),
      color: remaining >= 0 ? 'text-green-400' : 'text-red-400',
      bgColor: remaining >= 0 ? 'bg-green-500/10' : 'bg-red-500/10',
    },
    {
      label: 'Savings Rate',
      value: `${savingsRate.toFixed(1)}%`,
      color: savingsRate >= 20 ? 'text-green-400' : savingsRate >= 0 ? 'text-yellow-400' : 'text-red-400',
      bgColor: savingsRate >= 20 ? 'bg-green-500/10' : savingsRate >= 0 ? 'bg-yellow-500/10' : 'bg-red-500/10',
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className={`rounded-xl ${stat.bgColor} p-4`}
        >
          <p className="text-xs font-medium text-slate-400">{stat.label}</p>
          <p className={`mt-1 text-lg font-bold ${stat.color}`}>
            {stat.value}
          </p>
        </div>
      ))}
    </div>
  )
}
