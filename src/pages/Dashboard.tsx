import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { format, startOfMonth, endOfMonth, subMonths, addMonths } from 'date-fns'
import { Card } from '../components/ui/Card'
import { HealthBar } from '../components/dashboard/HealthBar'
import { FinancialHealthScore } from '../components/dashboard/FinancialHealthScore'
import { RoadmapWidget } from '../components/dashboard/RoadmapWidget'
import { CategoryDonut } from '../components/dashboard/CategoryDonut'
import { TopOffenders } from '../components/dashboard/TopOffenders'
import { QuickStats } from '../components/dashboard/QuickStats'
import { SavingsTracker } from '../components/dashboard/SavingsTracker'
import { useTransactions } from '../hooks/useTransactions'
import { useCategories } from '../hooks/useCategories'
import { useSettings } from '../hooks/useSettings'
import {
  sumByType,
  groupByCategory,
  groupByCategoryGroup,
  formatCurrency,
} from '../utils/calculations'
import { getMonthlyForecast, type Forecast } from '../utils/forecasting'
import { useCreditScores } from '../hooks/useCreditScores'
import type { CategoryGroup, Category } from '../db/database'
import { getCategoryIconClassName } from '../utils/colors'
import { Icon } from '../components/ui/Icon'

const CONFIDENCE_TIPS: Record<string, string> = {
  low: 'Less than 10 days of data this month. Estimate relies heavily on past months and may shift significantly.',
  medium: '10–19 days of data. Estimate blends your current pace with historical trends.',
  high: '20+ days of data. Estimate is based primarily on this month\'s actual spending pace.',
}

export default function Dashboard() {
  const { getMonthlyBudget } = useSettings()
  const [viewDate, setViewDate] = useState(new Date())
  const monthlyBudget = getMonthlyBudget(format(viewDate, 'yyyy-MM'))

  const start = format(startOfMonth(viewDate), 'yyyy-MM-dd')
  const end = format(endOfMonth(viewDate), 'yyyy-MM-dd')
  const isCurrentMonth = format(viewDate, 'yyyy-MM') === format(new Date(), 'yyyy-MM')

  const { transactions } = useTransactions(start, end)
  const { getCategoryById } = useCategories()
  const [forecast, setForecast] = useState<Forecast | null>(null)

  const [groupBreakdown, setGroupBreakdown] = useState<Record<CategoryGroup, number>>({
    needs: 0, wants: 0, savings: 0, income: 0,
  })

  const totalIncome = sumByType(transactions, 'income')
  const totalExpenses = sumByType(transactions, 'expense')

  const savedThisMonth = groupBreakdown.savings
  const spendingExpenses = groupBreakdown.needs + groupBreakdown.wants
  const effectiveBudget = Math.max(0, monthlyBudget - savedThisMonth)

  const categorySpending = Object.entries(groupByCategory(transactions))
    .map(([catId, total]) => ({
      category: getCategoryById(Number(catId)),
      total,
    }))
    .filter((item): item is { category: Category; total: number } => !!item.category)

  useEffect(() => {
    groupByCategoryGroup(transactions).then(setGroupBreakdown)
  }, [transactions])

  useEffect(() => {
    if (isCurrentMonth) {
      getMonthlyForecast(monthlyBudget).then(setForecast)
    } else {
      setForecast(null)
    }
  }, [isCurrentMonth, monthlyBudget, transactions])

  const confidenceColors = { low: 'text-yellow-400', medium: 'text-blue-400', high: 'text-green-400' }

  return (
    <div className="space-y-6">
      {/* Header with date navigation */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <div className="flex items-center gap-2 mt-0.5">
            <button onClick={() => setViewDate((d) => subMonths(d, 1))}
              className="text-slate-500 hover:text-slate-300 text-sm">←</button>
            <p className="text-sm text-slate-400">{format(viewDate, 'MMMM yyyy')}</p>
            <button onClick={() => setViewDate((d) => addMonths(d, 1))}
              className="text-slate-500 hover:text-slate-300 text-sm"
              disabled={isCurrentMonth}>→</button>
            {!isCurrentMonth && (
              <button onClick={() => setViewDate(new Date())}
                className="text-xs text-green-400 hover:text-green-300 ml-1">Today</button>
            )}
          </div>
        </div>
        <Link to="/add"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-600 text-xl font-medium leading-none text-white hover:bg-green-700 transition-colors">
          <span className="block -translate-y-0.5">+</span>
        </Link>
      </div>

      <QuickStats
        totalIncome={totalIncome}
        totalExpenses={totalExpenses}
        savedThisMonth={savedThisMonth}
        effectiveBudget={effectiveBudget}
      />

      <SavingsTracker saved={savedThisMonth} budget={monthlyBudget} />

      <Card>
        <HealthBar spent={spendingExpenses} budget={effectiveBudget} saved={savedThisMonth} />
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card><CategoryDonut breakdown={groupBreakdown} /></Card>
        <Card><TopOffenders categorySpending={categorySpending} /></Card>
      </div>

      <FinancialHealthScore />

      <RoadmapWidget />

      {/* Forecast (current month only) */}
      {forecast && isCurrentMonth && (
        <Card>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-slate-400">Month-End Forecast</h3>
            <div className="relative group/tip">
              <span className={`text-xs font-medium ${confidenceColors[forecast.confidence]} flex items-center gap-1`}>
                {forecast.confidence === 'low' ? 'Low' : forecast.confidence === 'medium' ? 'Medium' : 'High'} Confidence
                <svg className="h-3.5 w-3.5 opacity-60 cursor-help" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20 10 10 0 000-20z" />
                </svg>
              </span>
              <div className="absolute right-0 top-full mt-2 w-64 rounded-xl border border-slate-700 bg-slate-800 p-3 shadow-lg z-10 opacity-0 pointer-events-none group-hover/tip:opacity-100 group-hover/tip:pointer-events-auto transition-opacity duration-150">
                <p className="text-xs text-slate-300 leading-relaxed">
                  {CONFIDENCE_TIPS[forecast.confidence]}
                </p>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-xs text-slate-500">Projected Spend</p>
              <p className={`text-lg font-bold ${forecast.onTrack ? 'text-slate-200' : 'text-red-400'}`}>
                {formatCurrency(forecast.projectedExpenses)}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Daily Burn</p>
              <p className="text-lg font-bold text-slate-200">{formatCurrency(forecast.dailyBurnRate)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Days Left</p>
              <p className="text-lg font-bold text-slate-200">{forecast.daysLeft}</p>
            </div>
          </div>
          {!forecast.onTrack && (
            <p className="mt-2 text-xs text-red-400">
              ⚠ On pace to exceed your {formatCurrency(monthlyBudget)} budget
            </p>
          )}
        </Card>
      )}

      {/* Credit Score */}
      <CreditWidget />

      {/* Recent transactions */}
      <Card>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-slate-400">Recent Transactions</h3>
          <Link to="/transactions" className="text-xs text-green-400 hover:text-green-300">View all</Link>
        </div>
        {transactions.length === 0 ? (
          <p className="text-center text-sm text-slate-500 py-6">
            No transactions yet.{' '}
            <Link to="/add" className="text-green-400 hover:text-green-300">Add your first one</Link>
          </p>
        ) : (
          <div className="space-y-2">
            {transactions.slice(0, 5).map((tx) => {
              const cat = getCategoryById(tx.categoryId)
              return (
                <div key={tx.id} className="flex items-center gap-3 rounded-xl bg-slate-800/50 p-3">
                  <Icon name={cat?.icon ?? 'Wallet'} size={20} className={cat ? getCategoryIconClassName(cat.group) : ''} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-200">
                      {tx.description || cat?.name || 'Transaction'}
                    </p>
                    <p className="text-xs text-slate-500">{format(new Date(tx.date), 'MMM d')}</p>
                  </div>
                  <p className={`text-sm font-semibold ${tx.type === 'income' ? 'text-green-400' : 'text-slate-200'}`}>
                    {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                  </p>
                </div>
              )
            })}
          </div>
        )}
      </Card>
    </div>
  )
}

const SCORE_RANGES = [
  { label: 'Exceptional', min: 800, max: 850, color: '#22c55e' },
  { label: 'Very Good', min: 740, max: 799, color: '#84cc16' },
  { label: 'Good', min: 670, max: 739, color: '#eab308' },
  { label: 'Fair', min: 580, max: 669, color: '#f97316' },
  { label: 'Poor', min: 300, max: 579, color: '#ef4444' },
]

function CreditWidget() {
  const { latest, change } = useCreditScores()
  const rating = latest
    ? SCORE_RANGES.find((r) => latest.score >= r.min && latest.score <= r.max) ?? SCORE_RANGES[4]
    : null

  return (
    <Card>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-slate-400">Credit Score</h3>
        <Link to="/credit-score" className="text-xs text-green-400 hover:text-green-300">
          {latest ? 'Details' : 'Add score'}
        </Link>
      </div>
      {latest ? (
        <div className="flex items-center gap-4">
          <p className="text-3xl font-bold" style={{ color: rating?.color }}>{latest.score}</p>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium" style={{ color: rating?.color }}>{rating?.label}</span>
              {change !== null && change !== 0 && (
                <span className={`text-xs ${change > 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {change > 0 ? '↑' : '↓'} {Math.abs(change)} pts
                </span>
              )}
            </div>
            <div className="flex gap-0.5 h-1.5 rounded-full overflow-hidden mt-1.5">
              {SCORE_RANGES.slice().reverse().map((r) => (
                <div key={r.label} className="flex-1 rounded-sm"
                  style={{ backgroundColor: r.color, opacity: latest.score >= r.min ? 1 : 0.15 }} />
              ))}
            </div>
          </div>
        </div>
      ) : (
        <p className="text-sm text-slate-500 py-2">
          No score logged yet.{' '}
          <Link to="/credit-score" className="text-green-400 hover:text-green-300">Track your credit</Link>
        </p>
      )}
    </Card>
  )
}
