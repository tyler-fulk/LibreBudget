import type { Debt } from '../db/database'

export interface PayoffPlanStep {
  debtId: number | undefined
  name: string
  balance: number
  interestRate: number
  monthlyPayment: number
  monthsToPayoff: number
  interestCost: number
  payoffMonth: number
}

export interface HighInterestPlanResult {
  steps: PayoffPlanStep[]
  totalMonths: number
  totalInterest: number
  totalExtraPaid: number
  completionDate: string
}

function buildSingleDebtSchedule(
  balance: number,
  annualRate: number,
  monthlyPayment: number,
): { months: number; interestCost: number } {
  let remaining = balance
  const monthlyRate = Math.min(annualRate, 100) / 100 / 12
  let months = 0
  let totalInterest = 0

  while (remaining > 0.01 && months < 600) {
    months++
    const interest = remaining * monthlyRate
    const payment = Math.min(monthlyPayment, remaining + interest)
    const principal = payment - interest
    remaining = Math.max(0, remaining - principal)
    totalInterest += interest
  }

  return { months, interestCost: totalInterest }
}

/**
 * Simulate avalanche/snowball payoff with minimums + extra payment.
 * Extra goes to the priority debt; when paid off, that payment rolls to the next.
 */
export function buildHighInterestPayoffPlan(
  debts: Debt[],
  options: {
    rateThreshold: number
    extraMonthly: number
    strategy: 'avalanche' | 'snowball'
    getEffectivePayment: (d: Debt) => number
  },
): HighInterestPlanResult {
  const { rateThreshold, extraMonthly, strategy, getEffectivePayment } = options

  const activeDebts = debts.filter((d) => d.balance > 0 && d.interestRate >= rateThreshold)
  if (activeDebts.length === 0) {
    const now = new Date()
    return {
      steps: [],
      totalMonths: 0,
      totalInterest: 0,
      totalExtraPaid: 0,
      completionDate: now.toISOString().slice(0, 7),
    }
  }

  const ordered =
    strategy === 'avalanche'
      ? [...activeDebts].sort((a, b) => b.interestRate - a.interestRate)
      : [...activeDebts].sort((a, b) => a.balance - b.balance)

  const steps: PayoffPlanStep[] = []
  let month = 0
  let totalInterest = 0

  // Simulate month-by-month
  const balances = new Map(ordered.map((d) => [d.id!, { ...d, balance: d.balance }]))
  let extraToAllocate = extraMonthly

  for (const debt of ordered) {
    const currentBalance = balances.get(debt.id!)!.balance
    if (currentBalance <= 0) continue

    const basePayment = getEffectivePayment(debt)
    const monthlyPayment = basePayment + extraToAllocate

    const { months: monthsToPayoff, interestCost } = buildSingleDebtSchedule(
      currentBalance,
      debt.interestRate,
      monthlyPayment,
    )

    totalInterest += interestCost
    month += monthsToPayoff

    steps.push({
      debtId: debt.id,
      name: debt.name,
      balance: currentBalance,
      interestRate: debt.interestRate,
      monthlyPayment,
      monthsToPayoff,
      interestCost,
      payoffMonth: month,
    })

    // Roll this debt's full payment into the next (snowball/avalanche)
    extraToAllocate = monthlyPayment
  }

  const completionDate = (() => {
    const d = new Date()
    d.setMonth(d.getMonth() + month)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })()

  return {
    steps,
    totalMonths: month,
    totalInterest,
    totalExtraPaid: extraMonthly * month,
    completionDate,
  }
}
