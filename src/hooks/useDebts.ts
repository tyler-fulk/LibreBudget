import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Debt } from '../db/database'

export interface PayoffScheduleEntry {
  month: number
  payment: number
  principal: number
  interest: number
  balance: number
}

function buildPayoffSchedule(
  balance: number,
  annualRate: number,
  monthlyPayment: number,
): PayoffScheduleEntry[] {
  const schedule: PayoffScheduleEntry[] = []
  let remaining = balance
  const monthlyRate = Math.min(annualRate, 100) / 100 / 12 // clamp rate to avoid typos
  let month = 0

  while (remaining > 0.01 && month < 600) {
    month++
    const interest = remaining * monthlyRate
    const payment = Math.min(monthlyPayment, remaining + interest)
    const principal = payment - interest
    remaining = Math.max(0, remaining - principal)
    schedule.push({ month, payment, principal, interest, balance: remaining })
  }

  return schedule
}

/**
 * Calculate required monthly payment to pay off by target date (YYYY-MM).
 * Uses standard loan formula: PMT = P * r * (1+r)^n / ((1+r)^n - 1)
 * Returns null if target date is in the past or invalid.
 */
export function calcRequiredPayment(
  balance: number,
  annualRate: number,
  targetDateStr: string,
): number | null {
  if (!targetDateStr || balance <= 0) return null

  const parts = targetDateStr.split('-').map(Number)
  const y = parts[0]
  const m = parts[1]
  if (!y || !m || m < 1 || m > 12) return null

  const targetDate = new Date(y, m - 1, 1)
  const now = new Date()
  const monthsLeft = (targetDate.getFullYear() - now.getFullYear()) * 12 + (targetDate.getMonth() - now.getMonth())
  if (monthsLeft < 1) return null

  // Sanity check: rate over 100% is likely a typo (e.g. 2400 instead of 24)
  const clampedRate = Math.min(annualRate, 100)
  const monthlyRate = clampedRate / 100 / 12

  if (monthlyRate === 0) return Math.round((balance / monthsLeft) * 100) / 100
  const factor = Math.pow(1 + monthlyRate, monthsLeft)
  const pmt = (balance * monthlyRate * factor) / (factor - 1)
  return Math.round(pmt * 100) / 100
}

export function useDebts() {
  const debts = useLiveQuery(() => db.debts.toArray()) ?? []

  const addDebt = async (debt: Omit<Debt, 'id' | 'createdAt'>) => {
    const withOriginal = { ...debt, originalBalance: debt.balance, createdAt: new Date().toISOString() }
    return db.debts.add(withOriginal)
  }

  const updateDebt = async (id: number, changes: Partial<Debt>) => {
    const existing = await db.debts.get(id)
    if (existing && changes.balance != null && changes.balance > (existing.originalBalance ?? existing.balance)) {
      changes = { ...changes, originalBalance: changes.balance }
    }
    return db.debts.update(id, changes)
  }

  const deleteDebt = async (id: number) => {
    return db.debts.delete(id)
  }

  const totalDebt = debts.reduce((sum, d) => sum + d.balance, 0)
  const totalMinPayment = debts.reduce((sum, d) => sum + d.minimumPayment, 0)

  /** Effective monthly payment: targetMonthlyPayment if set, else minimumPayment. */
  const getEffectivePayment = (debt: Debt) =>
    debt.targetMonthlyPayment ?? debt.minimumPayment

  const getPayoffSchedule = (debt: Debt) =>
    buildPayoffSchedule(debt.balance, debt.interestRate, getEffectivePayment(debt))

  const getSnowballOrder = () =>
    [...debts].sort((a, b) => a.balance - b.balance)

  const getAvalancheOrder = () =>
    [...debts].sort((a, b) => b.interestRate - a.interestRate)

  return {
    debts,
    addDebt,
    updateDebt,
    deleteDebt,
    totalDebt,
    totalMinPayment,
    getPayoffSchedule,
    getSnowballOrder,
    getAvalancheOrder,
    getEffectivePayment,
  }
}
