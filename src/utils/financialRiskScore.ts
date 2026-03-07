import { format, startOfMonth, endOfMonth, subMonths, subDays } from 'date-fns'
import { db } from '../db/database'
import { sumByType } from './calculations'
import { getMonthlyForecast } from './forecasting'
import type { Transaction } from '../db/database'

export type Severity = 'high' | 'medium' | 'low'

export interface Finding {
  id: string
  title: string
  severity: Severity
  description: string
}

export interface FinancialRiskResult {
  score: number
  grade: string
  findings: Finding[]
}

const GRADE_RANGES: { min: number; label: string }[] = [
  { min: 9, label: 'Minimal' },
  { min: 7, label: 'Low' },
  { min: 5, label: 'Medium' },
  { min: 3, label: 'High' },
  { min: 0, label: 'Critical' },
]

function getGrade(score: number): string {
  for (const g of GRADE_RANGES) {
    if (score >= g.min) return g.label
  }
  return 'Critical'
}

function groupIncomeByCategory(transactions: Transaction[]): Record<number, number> {
  const grouped: Record<number, number> = {}
  for (const t of transactions) {
    if (t.type === 'income') {
      grouped[t.categoryId] = (grouped[t.categoryId] || 0) + t.amount
    }
  }
  return grouped
}

function checkIncomeConcentration(
  transactions: Transaction[],
  catNames: Map<number, string>,
): Finding[] {
  const incomeByCat = groupIncomeByCategory(transactions)
  const totalIncome = sumByType(transactions, 'income')
  if (totalIncome <= 0) return []

  const findings: Finding[] = []
  for (const [catId, amount] of Object.entries(incomeByCat)) {
    const pct = (amount / totalIncome) * 100
    const name = catNames.get(Number(catId)) ?? 'Unknown'
    if (pct >= 90) {
      findings.push({
        id: 'income-concentration-high',
        title: 'Income concentration',
        severity: 'high',
        description: `${name} accounts for ${pct.toFixed(0)}% of income (≥90% is a single point of failure).`,
      })
      break
    }
    if (pct >= 70) {
      findings.push({
        id: 'income-concentration-medium',
        title: 'Income concentration',
        severity: 'medium',
        description: `${name} accounts for ${pct.toFixed(0)}% of income (70–89%). Consider diversifying.`,
      })
      break
    }
  }
  return findings
}

function checkNoEmergencyFund(
  savingsGoals: { type: string; currentAmount: number }[],
): Finding[] {
  const hasEmergencyFund = savingsGoals.some(
    (g) => g.type === 'emergency_fund' && g.currentAmount > 0,
  )
  if (hasEmergencyFund) return []
  return [{
    id: 'no-emergency-fund',
    title: 'No emergency fund',
    severity: 'high',
    description: 'Add an emergency fund to protect against unexpected expenses.',
  }]
}

function checkEmergencyFund(
  totalSavings: number,
  avgMonthlyExpenses: number,
): Finding[] {
  if (avgMonthlyExpenses <= 0) return []
  const months = totalSavings / avgMonthlyExpenses
  if (months < 3) {
    return [{
      id: 'emergency-fund-high',
      title: 'Low emergency fund',
      severity: 'high',
      description: `Savings cover ${months.toFixed(1)} months of expenses. Target: 3+ months.`,
    }]
  }
  if (months < 6) {
    return [{
      id: 'emergency-fund-medium',
      title: 'Low emergency fund',
      severity: 'medium',
      description: `Savings cover ${months.toFixed(1)} months of expenses. Target: 6+ months.`,
    }]
  }
  return []
}

function checkDebtToIncome(totalMinPayment: number, totalIncome: number): Finding[] {
  if (totalIncome <= 0) return []
  const ratio = (totalMinPayment / totalIncome) * 100
  if (ratio > 43) {
    return [{
      id: 'debt-to-income-high',
      title: 'High debt-to-income',
      severity: 'high',
      description: `Debt payments are ${ratio.toFixed(0)}% of income (>43%).`,
    }]
  }
  if (ratio >= 36) {
    return [{
      id: 'debt-to-income-medium',
      title: 'High debt-to-income',
      severity: 'medium',
      description: `Debt payments are ${ratio.toFixed(0)}% of income (36–43%).`,
    }]
  }
  return []
}

function checkCreditScore(score: number): Finding[] {
  if (score < 580) {
    return [{
      id: 'credit-poor',
      title: 'Poor credit score',
      severity: 'high',
      description: `Score ${score} is below 580 (Poor).`,
    }]
  }
  if (score < 670) {
    return [{
      id: 'credit-fair',
      title: 'Fair credit score',
      severity: 'medium',
      description: `Score ${score} is in Fair range (580–669).`,
    }]
  }
  return []
}

function checkBudgetOverrun(projectedExpenses: number, budget: number): Finding[] {
  if (projectedExpenses <= budget) return []
  return [{
    id: 'budget-overrun',
    title: 'Budget overrun',
    severity: 'medium',
    description: `Projected spend (${projectedExpenses.toFixed(0)}) exceeds budget (${budget.toFixed(0)}).`,
  }]
}

function checkDominantExpenseCategory(
  transactions: Transaction[],
  catNames: Map<number, string>,
): Finding[] {
  const expenseByCat: Record<number, number> = {}
  let totalExpenses = 0
  for (const t of transactions) {
    if (t.type === 'expense') {
      expenseByCat[t.categoryId] = (expenseByCat[t.categoryId] || 0) + t.amount
      totalExpenses += t.amount
    }
  }
  if (totalExpenses <= 0) return []

  for (const [catId, amount] of Object.entries(expenseByCat)) {
    const pct = (amount / totalExpenses) * 100
    if (pct > 50) {
      const name = catNames.get(Number(catId)) ?? 'Unknown'
      return [{
        id: 'dominant-expense',
        title: 'Dominant expense category',
        severity: 'low',
        description: `${name} is ${pct.toFixed(0)}% of expenses.`,
      }]
    }
  }
  return []
}

function checkSavingsRate(totalIncome: number, totalExpenses: number): Finding[] {
  if (totalIncome <= 0) return []
  const savingsRate = ((totalIncome - totalExpenses) / totalIncome) * 100
  if (savingsRate < 0) {
    return [{
      id: 'negative-savings',
      title: 'Negative savings rate',
      severity: 'high',
      description: 'Spending exceeds income.',
    }]
  }
  if (savingsRate < 10) {
    return [{
      id: 'low-savings',
      title: 'Low savings rate',
      severity: 'low',
      description: `Savings rate is ${savingsRate.toFixed(1)}% (<10%).`,
    }]
  }
  return []
}

function checkNoRecentData(hasRecentTx: boolean): Finding[] {
  if (hasRecentTx) return []
  return [{
    id: 'no-recent-data',
    title: 'No recent data',
    severity: 'low',
    description: 'No transactions in the last 30 days.',
  }]
}

export async function getFinancialRiskScore(): Promise<FinancialRiskResult> {
  const now = new Date()
  const thisMonthStart = format(startOfMonth(now), 'yyyy-MM-dd')
  const thisMonthEnd = format(endOfMonth(now), 'yyyy-MM-dd')
  const thirtyDaysAgo = format(subDays(now, 30), 'yyyy-MM-dd')

  const [
    currentTxs,
    savingsGoals,
    debts,
    creditScores,
    settings,
    categories,
    recentTxs,
  ] = await Promise.all([
    db.transactions.where('date').between(thisMonthStart, thisMonthEnd, true, true).toArray(),
    db.savingsGoals.toArray(),
    db.debts.toArray(),
    db.creditScores.orderBy('date').toArray(),
    db.settings.toArray(),
    db.categories.toArray(),
    db.transactions.where('date').between(thirtyDaysAgo, thisMonthEnd, true, true).toArray(),
  ])

  const settingsMap = Object.fromEntries(settings.map((s) => [s.key, s.value]))
  const monthlyBudget = parseFloat(settingsMap['monthlyBudget'] ?? '3000')
  const catMap = new Map(categories.filter((c): c is typeof c & { id: number } => c.id != null).map((c) => [c.id, c]))
  const catNames = new Map<number, string>(
    [...catMap.entries()].map(([id, c]) => [id, c.name]),
  )

  const totalIncome = sumByType(currentTxs, 'income')
  const totalExpenses = sumByType(currentTxs, 'expense')
  const totalSavings = savingsGoals.reduce((s, g) => s + g.currentAmount, 0)
  const totalMinPayment = debts.reduce((s, d) => s + d.minimumPayment, 0)
  const latestCredit = creditScores.length > 0 ? creditScores[creditScores.length - 1] : null

  let avgMonthlyExpenses = totalExpenses
  const pastMonths: { expenses: number }[] = []
  for (let i = 1; i <= 3; i++) {
    const d = subMonths(now, i)
    const ms = format(startOfMonth(d), 'yyyy-MM-dd')
    const me = format(endOfMonth(d), 'yyyy-MM-dd')
    const txs = await db.transactions.where('date').between(ms, me, true, true).toArray()
    pastMonths.push({ expenses: sumByType(txs, 'expense') })
  }
  if (pastMonths.length > 0) {
    const currentOrPast = [totalExpenses, ...pastMonths.map((m) => m.expenses)]
    avgMonthlyExpenses = currentOrPast.reduce((a, b) => a + b, 0) / currentOrPast.length
  }

  const forecast = await getMonthlyForecast(monthlyBudget)
  const hasRecentTx = recentTxs.length > 0

  const allFindings: Finding[] = [
    ...checkIncomeConcentration(currentTxs, catNames),
    ...checkNoEmergencyFund(savingsGoals),
    ...checkEmergencyFund(totalSavings, avgMonthlyExpenses),
    ...(debts.length > 0 ? checkDebtToIncome(totalMinPayment, totalIncome) : []),
    ...(latestCredit ? checkCreditScore(latestCredit.score) : []),
    ...checkBudgetOverrun(forecast.projectedExpenses, monthlyBudget),
    ...checkDominantExpenseCategory(currentTxs, catNames),
    ...checkSavingsRate(totalIncome, totalExpenses),
    ...checkNoRecentData(hasRecentTx),
  ]

  let score = 10
  for (const f of allFindings) {
    if (f.severity === 'high') score -= 3
    else if (f.severity === 'medium') score -= 1.5
    else score -= 0.5
  }
  score = Math.max(0, Math.min(10, Math.round(score * 10) / 10))

  return {
    score,
    grade: getGrade(score),
    findings: allFindings,
  }
}
