import { format, subMonths, startOfMonth, endOfMonth, getDaysInMonth, getDate } from 'date-fns'
import { db } from '../db/database'
import { sumByType } from './calculations'

export interface Forecast {
  projectedExpenses: number
  projectedIncome: number
  projectedNet: number
  daysLeft: number
  dailyBurnRate: number
  onTrack: boolean
  confidence: 'low' | 'medium' | 'high'
}

export async function getMonthlyForecast(budget: number): Promise<Forecast> {
  const now = new Date()
  const dayOfMonth = getDate(now)
  const daysInMonth = getDaysInMonth(now)
  const daysLeft = daysInMonth - dayOfMonth

  const start = format(startOfMonth(now), 'yyyy-MM-dd')
  const today = format(now, 'yyyy-MM-dd')

  const currentTxs = await db.transactions
    .where('date').between(start, today, true, true).toArray()

  const currentExpenses = sumByType(currentTxs, 'expense')
  const currentIncome = sumByType(currentTxs, 'income')

  const pastMonthsData: { expenses: number; income: number }[] = []
  for (let i = 1; i <= 3; i++) {
    const d = subMonths(now, i)
    const ms = format(startOfMonth(d), 'yyyy-MM-dd')
    const me = format(endOfMonth(d), 'yyyy-MM-dd')
    const txs = await db.transactions.where('date').between(ms, me, true, true).toArray()
    pastMonthsData.push({
      expenses: sumByType(txs, 'expense'),
      income: sumByType(txs, 'income'),
    })
  }

  const avgPastExpenses = pastMonthsData.length > 0
    ? pastMonthsData.reduce((s, m) => s + m.expenses, 0) / pastMonthsData.length
    : 0
  const avgPastIncome = pastMonthsData.length > 0
    ? pastMonthsData.reduce((s, m) => s + m.income, 0) / pastMonthsData.length
    : 0

  const dailyBurnRate = dayOfMonth > 0 ? currentExpenses / dayOfMonth : 0

  const projectedExpenses = dayOfMonth >= 15
    ? currentExpenses + (dailyBurnRate * daysLeft)
    : (currentExpenses + avgPastExpenses) / 2 * (daysInMonth / dayOfMonth)

  const projectedIncome = dayOfMonth >= 20
    ? currentIncome
    : Math.max(currentIncome, avgPastIncome)

  const confidence: Forecast['confidence'] = dayOfMonth >= 20 ? 'high' : dayOfMonth >= 10 ? 'medium' : 'low'

  return {
    projectedExpenses: Math.round(projectedExpenses * 100) / 100,
    projectedIncome: Math.round(projectedIncome * 100) / 100,
    projectedNet: Math.round((projectedIncome - projectedExpenses) * 100) / 100,
    daysLeft,
    dailyBurnRate: Math.round(dailyBurnRate * 100) / 100,
    onTrack: projectedExpenses <= budget,
    confidence,
  }
}
