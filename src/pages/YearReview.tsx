import { useState, useEffect } from 'react'
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns'
import { Card } from '../components/ui/Card'
import { db, type CategoryGroup } from '../db/database'
import { sumByType, groupByCategoryGroup, formatCurrency } from '../utils/calculations'
import { GROUP_COLORS, GROUP_LABELS, getCategoryIconClassName } from '../utils/colors'
import { Icon } from '../components/ui/Icon'

interface YearData {
  totalIncome: number
  totalExpenses: number
  netSaved: number
  savingsRate: number
  bestMonth: { label: string; saved: number }
  worstMonth: { label: string; overspent: number }
  biggestCategory: { name: string; icon: string; total: number; group: CategoryGroup } | null
  groupTotals: Record<CategoryGroup, number>
  monthCount: number
  transactionCount: number
}

export default function YearReview() {
  const [year, setYear] = useState(new Date().getFullYear())
  const [data, setData] = useState<YearData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadYear()
  }, [year])

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

    const totalIncome = sumByType(allTxs, 'income')
    const totalExpenses = sumByType(allTxs, 'expense')
    const groupTotals = await groupByCategoryGroup(allTxs)

    const monthStats: { label: string; saved: number }[] = []
    for (let m = 0; m < 12; m++) {
      const d = new Date(year, m, 1)
      const ms = format(startOfMonth(d), 'yyyy-MM-dd')
      const me = format(endOfMonth(d), 'yyyy-MM-dd')
      const mtxs = allTxs.filter((t) => t.date >= ms && t.date <= me)
      const mi = sumByType(mtxs, 'income')
      const me2 = sumByType(mtxs, 'expense')
      if (mi > 0 || me2 > 0) {
        monthStats.push({ label: format(d, 'MMMM'), saved: mi - me2 })
      }
    }

    const bestMonth = monthStats.reduce((best, m) => m.saved > best.saved ? m : best, monthStats[0] || { label: '-', saved: 0 })
    const worstMonth = monthStats.reduce((worst, m) => m.saved < worst.saved ? m : worst, monthStats[0] || { label: '-', overspent: 0 })

    const categories = await db.categories.toArray()
    const catSpending: Record<number, number> = {}
    for (const t of allTxs) {
      if (t.type === 'expense') {
        catSpending[t.categoryId] = (catSpending[t.categoryId] || 0) + t.amount
      }
    }
    const topCatId = Object.entries(catSpending).sort((a, b) => b[1] - a[1])[0]
    const topCat = topCatId ? categories.find((c) => c.id === Number(topCatId[0])) : null

    setData({
      totalIncome,
      totalExpenses,
      netSaved: totalIncome - totalExpenses,
      savingsRate: totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0,
      bestMonth,
      worstMonth: { label: worstMonth.label, overspent: Math.abs(worstMonth.saved) },
      biggestCategory: topCat ? { name: topCat.name, icon: topCat.icon, total: Number(topCatId![1]), group: topCat.group } : null,
      groupTotals: groupTotals,
      monthCount: monthStats.length,
      transactionCount: allTxs.length,
    })
    setLoading(false)
  }

  if (loading) {
    return <div className="flex h-64 items-center justify-center"><p className="text-slate-400">Loading...</p></div>
  }

  return (
    <div className="space-y-6">
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
          {data.netSaved > 0 && (
            <div className="rounded-2xl border border-green-800 bg-green-900/20 p-6 text-center">
              <p className="text-lg text-green-300 mb-1">You saved</p>
              <p className="text-4xl font-bold text-green-400">{formatCurrency(data.netSaved)}</p>
              <p className="text-sm text-green-300/70 mt-1">in {year} — great work!</p>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <p className="text-xs text-slate-500">Total Income</p>
              <p className="text-2xl font-bold text-green-400">{formatCurrency(data.totalIncome)}</p>
            </Card>
            <Card>
              <p className="text-xs text-slate-500">Total Expenses</p>
              <p className="text-2xl font-bold text-slate-200">{formatCurrency(data.totalExpenses)}</p>
            </Card>
            <Card>
              <p className="text-xs text-slate-500">Savings Rate</p>
              <p className={`text-2xl font-bold ${data.savingsRate >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {data.savingsRate.toFixed(1)}%
              </p>
            </Card>
            <Card>
              <p className="text-xs text-slate-500">Transactions</p>
              <p className="text-2xl font-bold text-slate-200">{data.transactionCount}</p>
              <p className="text-xs text-slate-500">across {data.monthCount} months</p>
            </Card>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <p className="text-xs text-slate-500 mb-1">Best Month</p>
              <p className="font-medium text-green-400">{data.bestMonth.label}</p>
              <p className="text-sm text-slate-400">Saved {formatCurrency(data.bestMonth.saved)}</p>
            </Card>
            <Card>
              <p className="text-xs text-slate-500 mb-1">Toughest Month</p>
              <p className="font-medium text-orange-400">{data.worstMonth.label}</p>
              <p className="text-sm text-slate-400">
                {data.worstMonth.overspent > 0 ? `Overspent ${formatCurrency(data.worstMonth.overspent)}` : 'Still positive!'}
              </p>
            </Card>
            {data.biggestCategory && (
              <Card>
                <p className="text-xs text-slate-500 mb-1">Biggest Expense Category</p>
                <p className="font-medium text-slate-200 flex items-center gap-2">
                  <Icon name={data.biggestCategory.icon} size={18} className={getCategoryIconClassName(data.biggestCategory.group)} /> {data.biggestCategory.name}
                </p>
                <p className="text-sm text-slate-400">{formatCurrency(data.biggestCategory.total)}</p>
              </Card>
            )}
          </div>

          <Card>
            <h3 className="text-sm font-medium text-slate-400 mb-4">Spending Breakdown</h3>
            <div className="space-y-3">
              {(['needs', 'wants', 'investments'] as const).map((group) => {
                const amount = data.groupTotals[group]
                const pct = data.totalExpenses > 0 ? (amount / data.totalExpenses) * 100 : 0
                return (
                  <div key={group}>
                    <div className="flex justify-between text-sm mb-1">
                      <span style={{ color: GROUP_COLORS[group] }}>{GROUP_LABELS[group]}</span>
                      <span className="text-slate-400">{formatCurrency(amount)} ({pct.toFixed(0)}%)</span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-slate-800">
                      <div className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, backgroundColor: GROUP_COLORS[group] }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>
        </>
      )}
    </div>
  )
}
