import { useState, useEffect } from 'react'
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns'
import { Card } from '../components/ui/Card'
import { db, type CategoryGroup } from '../db/database'
import { sumByType, groupByCategoryGroup, formatCurrency } from '../utils/calculations'
import { GROUP_COLORS, getCategoryIconClassName } from '../utils/colors'
import { Icon } from '../components/ui/Icon'

interface MonthlyEntry {
  label: string      // full month name e.g. "January"
  shortLabel: string // e.g. "Jan"
  income: number
  spending: number
  saved: number
}

interface YearData {
  totalIncome: number
  totalSpending: number
  totalSaved: number
  savingsRate: number
  // Monthly highlights
  bestSavingsMonth: { label: string; saved: number }
  lowestSpendingMonth: { label: string; spending: number }
  highestSpendingMonth: { label: string; spending: number }
  // Category insights
  biggestExpenseCategory: { name: string; icon: string; total: number; group: CategoryGroup } | null
  biggestSavingsCategory: { name: string; icon: string; total: number; group: CategoryGroup } | null
  biggestSingleExpense: { description: string; amount: number; date: string; categoryName: string } | null
  // Breakdowns
  needsTotal: number
  wantsTotal: number
  savingsCategoryTotals: { name: string; icon: string; total: number; group: CategoryGroup }[]
  // Extra stats
  avgMonthlySpending: number
  avgMonthlySaved: number
  monthsWithSavings: number
  savingsStreak: number
  incomeTrend: number | null  // % change H1→H2, null if not enough data
  monthly: MonthlyEntry[]
  monthCount: number
  transactionCount: number
}

export default function YearReview() {
  const [year, setYear] = useState(new Date().getFullYear())
  const [data, setData] = useState<YearData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadYear() }, [year])

  const loadYear = async () => {
    setLoading(true)
    const yearDate = new Date(year, 0, 1)
    const start = format(startOfYear(yearDate), 'yyyy-MM-dd')
    const end = format(endOfYear(yearDate), 'yyyy-MM-dd')

    const allTxs = await db.transactions
      .where('date').between(start, end, true, true).toArray()

    if (allTxs.length === 0) {
      setData(null)
      setLoading(false)
      return
    }

    const categories = await db.categories.toArray()
    const catMap = new Map(categories.map((c) => [c.id!, c]))

    const totalIncome = sumByType(allTxs, 'income')
    const groupTotals = await groupByCategoryGroup(allTxs)

    const totalSpending = groupTotals.needs + groupTotals.wants
    const totalSaved = groupTotals.savings
    const savingsRate = totalIncome > 0 ? (totalSaved / totalIncome) * 100 : 0

    // Per-month breakdown
    const monthly: MonthlyEntry[] = []
    for (let m = 0; m < 12; m++) {
      const d = new Date(year, m, 1)
      const ms = format(startOfMonth(d), 'yyyy-MM-dd')
      const me = format(endOfMonth(d), 'yyyy-MM-dd')
      const mtxs = allTxs.filter((t) => t.date >= ms && t.date <= me)
      if (mtxs.length === 0) continue
      const mg = await groupByCategoryGroup(mtxs)
      monthly.push({
        label: format(d, 'MMMM'),
        shortLabel: format(d, 'MMM'),
        income: sumByType(mtxs, 'income'),
        spending: mg.needs + mg.wants,
        saved: mg.savings,
      })
    }

    const fallback = { label: '-', shortLabel: '-', saved: 0, spending: 0, income: 0 }
    const bestSavingsMonth = monthly.reduce((best, m) => m.saved > best.saved ? m : best, monthly[0] ?? fallback)
    const highestSpendingMonth = monthly.reduce((w, m) => m.spending > w.spending ? m : w, monthly[0] ?? fallback)
    const spendingMonths = monthly.filter((m) => m.spending > 0)
    const lowestSpendingMonth = spendingMonths.reduce((b, m) => m.spending < b.spending ? m : b, spendingMonths[0] ?? fallback)

    // Category totals split by savings vs spending
    const expenseByCat: Record<number, number> = {}
    const savingsByCat: Record<number, number> = {}
    for (const t of allTxs) {
      if (t.type !== 'expense') continue
      const cat = catMap.get(t.categoryId)
      if (!cat) continue
      if (cat.group === 'savings') {
        savingsByCat[t.categoryId] = (savingsByCat[t.categoryId] || 0) + t.amount
      } else {
        expenseByCat[t.categoryId] = (expenseByCat[t.categoryId] || 0) + t.amount
      }
    }

    const topExpenseEntry = Object.entries(expenseByCat).sort((a, b) => b[1] - a[1])[0]
    const topExpenseCat = topExpenseEntry ? catMap.get(Number(topExpenseEntry[0])) : null

    const topSavingsEntry = Object.entries(savingsByCat).sort((a, b) => b[1] - a[1])[0]
    const topSavingsCat = topSavingsEntry ? catMap.get(Number(topSavingsEntry[0])) : null

    const savingsCategoryTotals = Object.entries(savingsByCat)
      .map(([id, total]) => {
        const cat = catMap.get(Number(id))
        return cat ? { name: cat.name, icon: cat.icon, total, group: cat.group } : null
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)
      .sort((a, b) => b.total - a.total)

    // Biggest single expense (non-savings category)
    const nonSavingExpenses = allTxs
      .filter((t) => t.type === 'expense' && catMap.get(t.categoryId)?.group !== 'savings')
      .sort((a, b) => b.amount - a.amount)
    const bigTx = nonSavingExpenses[0] ?? null
    const bigTxCat = bigTx ? catMap.get(bigTx.categoryId) : null

    // Extra stats
    const avgMonthlySpending = monthly.length > 0 ? totalSpending / monthly.length : 0
    const avgMonthlySaved = monthly.length > 0 ? totalSaved / monthly.length : 0
    const monthsWithSavings = monthly.filter((m) => m.saved > 0).length

    // Longest savings streak (consecutive months with saved > 0)
    let streak = 0, maxStreak = 0, cur = 0
    for (let m = 0; m < 12; m++) {
      const entry = monthly.find((e) => e.label === format(new Date(year, m, 1), 'MMMM'))
      if (entry && entry.saved > 0) {
        cur++
        maxStreak = Math.max(maxStreak, cur)
      } else if (entry) {
        cur = 0
      }
    }
    streak = maxStreak

    // Income trend: H1 vs H2 (only if both halves have data)
    const h1 = monthly.filter((_, i) => {
      const idx = ['January','February','March','April','May','June'].indexOf(monthly[i]?.label)
      return idx !== -1
    })
    const h1Income = monthly
      .filter((m) => ['January','February','March','April','May','June'].includes(m.label))
      .reduce((s, m) => s + m.income, 0)
    const h2Income = monthly
      .filter((m) => ['July','August','September','October','November','December'].includes(m.label))
      .reduce((s, m) => s + m.income, 0)
    const incomeTrend = h1Income > 0 && h2Income > 0
      ? ((h2Income - h1Income) / h1Income) * 100
      : null

    void h1

    setData({
      totalIncome,
      totalSpending,
      totalSaved,
      savingsRate,
      bestSavingsMonth: { label: bestSavingsMonth.label, saved: bestSavingsMonth.saved },
      highestSpendingMonth: { label: highestSpendingMonth.label, spending: highestSpendingMonth.spending },
      lowestSpendingMonth: { label: lowestSpendingMonth.label, spending: lowestSpendingMonth.spending },
      biggestExpenseCategory: topExpenseCat
        ? { name: topExpenseCat.name, icon: topExpenseCat.icon, total: Number(topExpenseEntry![1]), group: topExpenseCat.group }
        : null,
      biggestSavingsCategory: topSavingsCat
        ? { name: topSavingsCat.name, icon: topSavingsCat.icon, total: Number(topSavingsEntry![1]), group: topSavingsCat.group }
        : null,
      biggestSingleExpense: bigTx
        ? { description: bigTx.description || bigTxCat?.name || 'Unknown', amount: bigTx.amount, date: bigTx.date, categoryName: bigTxCat?.name ?? '' }
        : null,
      needsTotal: groupTotals.needs,
      wantsTotal: groupTotals.wants,
      savingsCategoryTotals,
      avgMonthlySpending,
      avgMonthlySaved,
      monthsWithSavings,
      savingsStreak: streak,
      incomeTrend,
      monthly,
      monthCount: monthly.length,
      transactionCount: allTxs.length,
    })
    setLoading(false)
  }

  if (loading) {
    return <div className="flex h-64 items-center justify-center"><p className="text-slate-400">Loading...</p></div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Year in Review</h1>
          <p className="text-sm text-slate-400">Your {year} financial summary</p>
        </div>
        <div className="flex gap-1">
          <button onClick={() => setYear((y) => y - 1)}
            className="rounded-lg px-3 py-1.5 text-sm text-slate-400 hover:bg-slate-800 hover:text-slate-200">←</button>
          <span className="flex items-center px-2 text-sm font-medium text-slate-200">{year}</span>
          <button onClick={() => setYear((y) => Math.min(y + 1, new Date().getFullYear()))}
            className="rounded-lg px-3 py-1.5 text-sm text-slate-400 hover:bg-slate-800 hover:text-slate-200"
            disabled={year >= new Date().getFullYear()}>→</button>
        </div>
      </div>

      {!data ? (
        <Card className="text-center"><p className="text-slate-400 py-8">No transactions found for {year}.</p></Card>
      ) : (
        <>
          {/* Hero */}
          {data.totalSaved > 0 && (
            <div className="rounded-2xl border border-blue-800 bg-blue-900/20 p-6 text-center">
              <p className="text-lg text-blue-300 mb-1">You put away</p>
              <p className="text-4xl font-bold text-blue-400">{formatCurrency(data.totalSaved)}</p>
              <p className="text-sm text-blue-300/70 mt-1">into savings in {year} — great work!</p>
            </div>
          )}

          {/* Key stats */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <p className="text-xs text-slate-500">Total Income</p>
              <p className="text-2xl font-bold text-green-400">{formatCurrency(data.totalIncome)}</p>
              <p className="text-xs text-slate-500 mt-0.5">{data.transactionCount} transactions</p>
            </Card>
            <Card>
              <p className="text-xs text-slate-500">Total Spending</p>
              <p className="text-2xl font-bold text-slate-200">{formatCurrency(data.totalSpending)}</p>
              <p className="text-xs text-slate-500 mt-0.5">needs + wants only</p>
            </Card>
            <Card>
              <p className="text-xs text-slate-500">Total Saved</p>
              <p className="text-2xl font-bold text-blue-400">{formatCurrency(data.totalSaved)}</p>
              <p className="text-xs text-slate-500 mt-0.5">savings contributions</p>
            </Card>
            <Card>
              <p className="text-xs text-slate-500">Savings Rate</p>
              <p className={`text-2xl font-bold ${data.savingsRate >= 20 ? 'text-green-400' : data.savingsRate >= 10 ? 'text-blue-400' : 'text-slate-200'}`}>
                {data.savingsRate.toFixed(1)}%
              </p>
              <p className="text-xs text-slate-500 mt-0.5">of income saved</p>
            </Card>
          </div>

          {/* Month-by-month horizontal chart */}
          {data.monthly.length > 0 && (
            <Card>
              <h3 className="text-sm font-medium text-slate-400 mb-4">Month by Month</h3>
              <div className="space-y-2">
                {data.monthly.map((m) => {
                  const maxVal = Math.max(...data.monthly.map((x) => x.spending + x.saved), 1)
                  const spendPct = (m.spending / maxVal) * 100
                  const savePct = (m.saved / maxVal) * 100
                  return (
                    <div key={m.label} className="flex items-center gap-2">
                      <span className="w-16 shrink-0 truncate text-right text-xs text-slate-400">{m.label}</span>
                      <div className="flex-1 flex h-5 rounded-full overflow-hidden bg-slate-800 gap-px">
                        {m.spending > 0 && (
                          <div
                            className="h-full transition-all duration-500 rounded-l-full"
                            style={{ width: `${spendPct}%`, backgroundColor: '#64748b' }}
                            title={`Spending: ${formatCurrency(m.spending)}`}
                          />
                        )}
                        {m.saved > 0 && (
                          <div
                            className="h-full transition-all duration-500"
                            style={{
                              width: `${savePct}%`,
                              backgroundColor: '#3b82f6',
                              borderRadius: m.spending === 0 ? '9999px' : '0 9999px 9999px 0',
                            }}
                            title={`Saved: ${formatCurrency(m.saved)}`}
                          />
                        )}
                      </div>
                      <span className="w-20 shrink-0 text-right text-xs text-slate-500">
                        {formatCurrency(m.spending + m.saved)}
                      </span>
                    </div>
                  )
                })}
              </div>
              <div className="flex items-center gap-4 mt-3 pt-3 border-t border-slate-800">
                <span className="flex items-center gap-1.5 text-xs text-slate-400">
                  <span className="h-2.5 w-2.5 rounded-sm bg-slate-500 inline-block" /> Spending
                </span>
                <span className="flex items-center gap-1.5 text-xs text-slate-400">
                  <span className="h-2.5 w-2.5 rounded-sm bg-blue-500 inline-block" /> Savings
                </span>
              </div>
            </Card>
          )}

          {/* Monthly highlights */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <p className="text-xs text-slate-500 mb-1">Best Savings Month</p>
              <p className="font-medium text-blue-400">{data.bestSavingsMonth.label}</p>
              <p className="text-sm text-slate-400">
                {data.bestSavingsMonth.saved > 0
                  ? `Saved ${formatCurrency(data.bestSavingsMonth.saved)}`
                  : 'No savings recorded'}
              </p>
            </Card>
            <Card>
              <p className="text-xs text-slate-500 mb-1">Highest Spending Month</p>
              <p className="font-medium text-orange-400">{data.highestSpendingMonth.label}</p>
              <p className="text-sm text-slate-400">Spent {formatCurrency(data.highestSpendingMonth.spending)}</p>
            </Card>
            <Card>
              <p className="text-xs text-slate-500 mb-1">Lowest Spending Month</p>
              <p className="font-medium text-green-400">{data.lowestSpendingMonth.label}</p>
              <p className="text-sm text-slate-400">
                {data.lowestSpendingMonth.spending > 0
                  ? `Spent ${formatCurrency(data.lowestSpendingMonth.spending)}`
                  : 'No spending'}
              </p>
            </Card>
          </div>

          {/* Insights: By the Numbers */}
          <Card>
            <h3 className="text-sm font-medium text-slate-400 mb-4">By the Numbers</h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Stat label="Avg. Monthly Spending" value={formatCurrency(data.avgMonthlySpending)} />
              <Stat label="Avg. Monthly Savings" value={formatCurrency(data.avgMonthlySaved)} color="text-blue-400" />
              <Stat
                label="Months with Savings"
                value={`${data.monthsWithSavings} of ${data.monthCount}`}
                color={data.monthsWithSavings === data.monthCount ? 'text-green-400' : 'text-slate-200'}
              />
              {data.savingsStreak > 1 && (
                <Stat
                  label="Longest Savings Streak"
                  value={`${data.savingsStreak} month${data.savingsStreak !== 1 ? 's' : ''}`}
                  color="text-blue-400"
                />
              )}
              {data.biggestExpenseCategory && (
                <Stat
                  label="Top Expense Category"
                  value={data.biggestExpenseCategory.name}
                  sub={formatCurrency(data.biggestExpenseCategory.total)}
                />
              )}
              {data.biggestSavingsCategory && (
                <Stat
                  label="Top Savings Category"
                  value={data.biggestSavingsCategory.name}
                  sub={formatCurrency(data.biggestSavingsCategory.total)}
                  color="text-blue-400"
                />
              )}
              {data.biggestSingleExpense && (
                <Stat
                  label="Biggest Single Expense"
                  value={formatCurrency(data.biggestSingleExpense.amount)}
                  sub={`${data.biggestSingleExpense.description} · ${format(new Date(data.biggestSingleExpense.date), 'MMM d')}`}
                  color="text-orange-400"
                />
              )}
              {data.incomeTrend !== null && (
                <Stat
                  label="Income Trend (H1 → H2)"
                  value={`${data.incomeTrend >= 0 ? '+' : ''}${data.incomeTrend.toFixed(1)}%`}
                  color={data.incomeTrend >= 0 ? 'text-green-400' : 'text-red-400'}
                  sub="second half vs first half"
                />
              )}
            </div>
          </Card>

          {/* Spending + Savings breakdown */}
          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <h3 className="text-sm font-medium text-slate-400 mb-4">Spending Breakdown</h3>
              <div className="space-y-3">
                {([['needs', data.needsTotal], ['wants', data.wantsTotal]] as [CategoryGroup, number][]).map(([group, amount]) => {
                  const pct = data.totalSpending > 0 ? (amount / data.totalSpending) * 100 : 0
                  return (
                    <div key={group}>
                      <div className="flex justify-between text-sm mb-1">
                        <span style={{ color: GROUP_COLORS[group] }} className="capitalize">{group}</span>
                        <span className="text-slate-400">
                          {formatCurrency(amount)} <span className="text-slate-600">({pct.toFixed(0)}%)</span>
                        </span>
                      </div>
                      <div className="h-2.5 overflow-hidden rounded-full bg-slate-800">
                        <div className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${pct}%`, backgroundColor: GROUP_COLORS[group] }} />
                      </div>
                    </div>
                  )
                })}
                {data.totalSpending === 0 && (
                  <p className="text-sm text-slate-500 text-center py-2">No spending recorded</p>
                )}
              </div>
            </Card>

            <Card>
              <h3 className="text-sm font-medium text-slate-400 mb-4">Savings Breakdown</h3>
              {data.savingsCategoryTotals.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-2">No savings recorded</p>
              ) : (
                <div className="space-y-3">
                  {data.savingsCategoryTotals.map((cat) => {
                    const pct = data.totalSaved > 0 ? (cat.total / data.totalSaved) * 100 : 0
                    return (
                      <div key={cat.name}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="flex items-center gap-1.5 text-blue-400">
                            <Icon name={cat.icon} size={14} className={getCategoryIconClassName(cat.group)} />
                            {cat.name}
                          </span>
                          <span className="text-slate-400">
                            {formatCurrency(cat.total)} <span className="text-slate-600">({pct.toFixed(0)}%)</span>
                          </span>
                        </div>
                        <div className="h-2.5 overflow-hidden rounded-full bg-slate-800">
                          <div className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${pct}%`, backgroundColor: '#3b82f6' }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  )
}

function Stat({
  label,
  value,
  sub,
  color = 'text-slate-200',
}: {
  label: string
  value: string
  sub?: string
  color?: string
}) {
  return (
    <div className="rounded-xl bg-slate-800/50 px-4 py-3">
      <p className="text-xs text-slate-500 mb-0.5">{label}</p>
      <p className={`text-lg font-bold ${color}`}>{value}</p>
      {sub && <p className="text-xs text-slate-500 mt-0.5 truncate">{sub}</p>}
    </div>
  )
}
