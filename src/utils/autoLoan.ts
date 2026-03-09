/**
 * Auto loan utilities for the 20/3/8 rule evaluation.
 * Rule 1: Down payment >= 20% of car price
 * Rule 2: Loan term <= 36 months
 * Rule 3: Monthly payment <= 8% of monthly income
 */

export type DownPaymentMode = 'dollar' | 'percent'

export interface AutoLoanInputs {
  carPrice: number
  downPaymentDollars: number
  downPaymentPercent: number
  downPaymentMode: DownPaymentMode
  interestRatePercent: number
  loanTermMonths: number
  monthlyIncome: number
}

export interface AutoLoanResult {
  principal: number
  monthlyPayment: number
  downPaymentAmount: number
  rule1: { pass: boolean; required: number; shortfall: number }
  rule2: { pass: boolean; maxMonths: number; excess: number }
  rule3: { pass: boolean; maxPayment: number; excess: number }
}

/**
 * Amortized monthly payment: P * r(1+r)^n / ((1+r)^n - 1)
 * where P = principal, r = monthly rate, n = number of months
 */
export function monthlyPayment(
  principal: number,
  annualRatePercent: number,
  months: number
): number {
  if (principal <= 0) return 0
  if (months <= 0) return 0
  const r = annualRatePercent / 100 / 12
  if (Math.abs(r) < 1e-12) return principal / months
  const factor = Math.pow(1 + r, months)
  return principal * (r * factor) / (factor - 1)
}

/**
 * Max principal affordable for a given monthly payment (reverse of monthlyPayment).
 * P = PMT * ((1+r)^n - 1) / (r(1+r)^n)
 */
export function maxPrincipalForPayment(
  targetMonthlyPayment: number,
  annualRatePercent: number,
  months: number
): number {
  if (targetMonthlyPayment <= 0 || months <= 0) return 0
  const r = annualRatePercent / 100 / 12
  if (Math.abs(r) < 1e-12) return targetMonthlyPayment * months
  const factor = Math.pow(1 + r, months)
  return targetMonthlyPayment * (factor - 1) / (r * factor)
}

/**
 * Resolve down payment amount from either dollar or percent mode.
 */
export function resolveDownPayment(
  carPrice: number,
  downPaymentDollars: number,
  downPaymentPercent: number,
  mode: DownPaymentMode
): number {
  if (mode === 'dollar') return Math.min(carPrice, Math.max(0, downPaymentDollars))
  const pct = Math.max(0, Math.min(100, downPaymentPercent)) / 100
  return carPrice * pct
}

/**
 * Evaluate auto loan against the 20/3/8 rule.
 */
export function evaluateAutoLoan(inputs: AutoLoanInputs): AutoLoanResult {
  const downPaymentAmount = resolveDownPayment(
    inputs.carPrice,
    inputs.downPaymentDollars,
    inputs.downPaymentPercent,
    inputs.downPaymentMode
  )
  const principal = Math.max(0, inputs.carPrice - downPaymentAmount)
  const pmt = monthlyPayment(principal, inputs.interestRatePercent, inputs.loanTermMonths)

  const rule1Required = inputs.carPrice * 0.2
  const rule1Pass = downPaymentAmount >= rule1Required
  const rule1Shortfall = Math.max(0, rule1Required - downPaymentAmount)

  const rule2MaxMonths = 36
  const rule2Pass = inputs.loanTermMonths <= rule2MaxMonths
  const rule2Excess = Math.max(0, inputs.loanTermMonths - rule2MaxMonths)

  const rule3MaxPayment = inputs.monthlyIncome > 0 ? inputs.monthlyIncome * 0.08 : 0
  const rule3Pass = inputs.monthlyIncome > 0 && pmt <= rule3MaxPayment
  const rule3Excess = Math.max(0, pmt - rule3MaxPayment)

  return {
    principal,
    monthlyPayment: pmt,
    downPaymentAmount,
    rule1: { pass: rule1Pass, required: rule1Required, shortfall: rule1Shortfall },
    rule2: { pass: rule2Pass, maxMonths: rule2MaxMonths, excess: rule2Excess },
    rule3: { pass: rule3Pass, maxPayment: rule3MaxPayment, excess: rule3Excess },
  }
}
