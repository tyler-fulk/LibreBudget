import { format, subMonths, startOfMonth, endOfMonth, getDaysInMonth, getDate } from 'date-fns'
import { db } from '../db/database'
import { sumByType } from './calculations'

export interface Forecast {
  /** Projected spending (needs + wants only, excludes savings contributions) */
  projectedExpenses: number
  projectedIncome: number
  projectedNet: number
  daysLeft: number
  /** Daily burn rate for variable spending only (excludes fixed costs like rent) */
  dailyBurnRate: number
  /** Effective spending budget = full budget minus savings already set aside */
  effectiveBudget: number
  onTrack: boolean
  confidence: 'low' | 'medium' | 'high'
}

/**
 * Categories averaging fewer than this many transactions/month are treated as
 * "fixed monthly costs" (rent, insurance, loan payments, etc.) and their full
 * amount is used directly rather than being extrapolated via a daily burn rate.
 */
const FIXED_FREQ_THRESHOLD = 1.5

export async function getMonthlyForecast(budget: number): Promise<Forecast> {
  const now = new Date()
  const dayOfMonth = getDate(now)
  const daysInMonth = getDaysInMonth(now)
  const daysLeft = daysInMonth - dayOfMonth

  const start = format(startOfMonth(now), 'yyyy-MM-dd')
  const today = format(now, 'yyyy-MM-dd')

  const categories = await db.categories.toArray()
  const catMap = new Map(categories.map((c) => [c.id!, c]))

  const currentTxs = await db.transactions
    .where('date').between(start, today, true, true).toArray()

  // Split current spending: savings group is excluded; rest split by category
  const currentCatAmount = new Map<number, number>()
  let currentSavings = 0

  for (const t of currentTxs) {
    if (t.type !== 'expense') continue
    const cat = catMap.get(t.categoryId)
    if (!cat) continue
    if (cat.group === 'savings') { currentSavings += t.amount; continue }
    currentCatAmount.set(t.categoryId, (currentCatAmount.get(t.categoryId) ?? 0) + t.amount)
  }
  const currentIncome = sumByType(currentTxs, 'income')

  // ── Historical data: past 3 months ──────────────────────────────────────────
  interface CatStat { totalAmount: number; totalTxCount: number }
  const catStats = new Map<number, CatStat>()
  let totalPastIncome = 0
  let pastMonthCount = 0

  for (let i = 1; i <= 3; i++) {
    const d = subMonths(now, i)
    const ms = format(startOfMonth(d), 'yyyy-MM-dd')
    const me = format(endOfMonth(d), 'yyyy-MM-dd')
    const txs = await db.transactions.where('date').between(ms, me, true, true).toArray()
    if (txs.length === 0) continue
    pastMonthCount++
    totalPastIncome += sumByType(txs, 'income')

    for (const t of txs) {
      if (t.type !== 'expense') continue
      const cat = catMap.get(t.categoryId)
      if (!cat || cat.group === 'savings') continue
      const s = catStats.get(t.categoryId) ?? { totalAmount: 0, totalTxCount: 0 }
      catStats.set(t.categoryId, {
        totalAmount: s.totalAmount + t.amount,
        totalTxCount: s.totalTxCount + 1,
      })
    }
  }

  const hasHistory = pastMonthCount > 0

  // ── Classify categories and build projection ─────────────────────────────────
  //
  // Fixed categories (rent, insurance, loan): take the full amount as-is.
  //   – If already paid this month: use max(paid, historical avg).
  //   – If not yet paid but historically appears: add historical avg as expected cost.
  //
  // Variable categories (food, entertainment): compute a daily burn rate and
  //   extrapolate for remaining days.

  let fixedProjected = 0
  let variableSpent = 0
  const seenFixedCatIds = new Set<number>()

  for (const [catId, amount] of currentCatAmount) {
    const stat = catStats.get(catId)
    const avgFreq = stat && hasHistory ? stat.totalTxCount / pastMonthCount : null

    // No history? Treat as fixed if the charge is > 5% of budget (catches rent, car payments, etc.)
    const isFixed = avgFreq !== null
      ? avgFreq < FIXED_FREQ_THRESHOLD
      : amount > budget * 0.05

    if (isFixed) {
      const histAvg = stat && hasHistory ? stat.totalAmount / pastMonthCount : amount
      // Use whichever is larger — handles rent increases and first-month entries
      fixedProjected += Math.max(amount, histAvg)
      seenFixedCatIds.add(catId)
    } else {
      variableSpent += amount
    }
  }

  // Add expected fixed costs for known categories not yet paid this month.
  // Only add them if we're less than 70% through the month (otherwise likely skipped).
  if (hasHistory && dayOfMonth / daysInMonth < 0.7) {
    for (const [catId, stat] of catStats) {
      if (seenFixedCatIds.has(catId) || currentCatAmount.has(catId)) continue
      const avgFreq = stat.totalTxCount / pastMonthCount
      if (avgFreq >= FIXED_FREQ_THRESHOLD) continue
      const avgAmount = stat.totalAmount / pastMonthCount
      if (avgAmount > 0) fixedProjected += avgAmount
    }
  }

  // ── Variable daily rate ──────────────────────────────────────────────────────
  const variableDailyRate = dayOfMonth > 0 ? variableSpent / dayOfMonth : 0

  // Historical variable daily rate (only variable categories)
  let historicalVariableMonthly = 0
  for (const [catId, stat] of catStats) {
    const avgFreq = stat.totalTxCount / pastMonthCount
    if (avgFreq >= FIXED_FREQ_THRESHOLD) {
      historicalVariableMonthly += stat.totalAmount / pastMonthCount
    }
  }
  const historicalVariableDailyRate = historicalVariableMonthly / 30

  // Smooth blend: 100% historical at day 1, 100% current pace at day 20+
  const currentWeight = Math.min(dayOfMonth / 20, 1)
  const blendedVariableRate = hasHistory
    ? variableDailyRate * currentWeight + historicalVariableDailyRate * (1 - currentWeight)
    : variableDailyRate

  // ── Final projections ────────────────────────────────────────────────────────
  const projectedExpenses = fixedProjected + variableSpent + blendedVariableRate * daysLeft

  const avgPastMonthlyIncome = hasHistory ? totalPastIncome / pastMonthCount : 0
  const projectedIncome = Math.max(currentIncome, avgPastMonthlyIncome)

  const effectiveBudget = Math.max(0, budget - currentSavings)
  const confidence: Forecast['confidence'] =
    dayOfMonth >= 20 ? 'high' : dayOfMonth >= 10 ? 'medium' : 'low'

  return {
    projectedExpenses: Math.round(projectedExpenses * 100) / 100,
    projectedIncome: Math.round(projectedIncome * 100) / 100,
    projectedNet: Math.round((projectedIncome - projectedExpenses - currentSavings) * 100) / 100,
    daysLeft,
    dailyBurnRate: Math.round(variableDailyRate * 100) / 100,
    effectiveBudget: Math.round(effectiveBudget * 100) / 100,
    onTrack: projectedExpenses <= effectiveBudget,
    confidence,
  }
}
