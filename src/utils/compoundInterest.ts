export type ContributionFrequency = 'monthly' | 'yearly'

export interface FutureValueParams {
  initialBalance: number
  contribution: number
  contributionFrequency: ContributionFrequency
  years: number
  annualRatePercent: number
  annualRaisePercent?: number // annual increase to contributions (e.g. 2 = 2%)
}

/**
 * Future value with regular contributions (end-of-period).
 *
 * When annualRaisePercent > 0, contributions grow each year so we iterate
 * year-by-year.  When 0 (default), uses the closed-form FV formula.
 */
export function futureValue(params: FutureValueParams): number {
  const { initialBalance, contribution, contributionFrequency, years, annualRatePercent, annualRaisePercent = 0 } = params
  const r = annualRatePercent / 100
  const raise = annualRaisePercent / 100

  // Fast path: no annual raise → closed-form
  if (raise === 0) {
    let i: number
    let n: number

    if (contributionFrequency === 'monthly') {
      i = r / 12
      n = Math.max(0, 12 * years)
    } else {
      i = r
      n = Math.max(0, years)
    }

    const factor = Math.pow(1 + i, n)

    if (Math.abs(i) < 1e-10) {
      return initialBalance + contribution * n
    }

    return initialBalance * factor + contribution * ((factor - 1) / i)
  }

  // With annual raise: iterate year-by-year
  let balance = initialBalance
  let annualContribution = contributionFrequency === 'monthly' ? contribution * 12 : contribution
  const monthlyRate = r / 12

  for (let y = 0; y < Math.max(0, years); y++) {
    if (contributionFrequency === 'monthly') {
      const monthlyContribution = annualContribution / 12
      for (let m = 0; m < 12; m++) {
        balance *= (1 + monthlyRate)
        balance += monthlyContribution
      }
    } else {
      balance *= (1 + r)
      balance += annualContribution
    }
    annualContribution *= (1 + raise)
  }

  return balance
}

/**
 * Target retirement portfolio needed using a safe withdrawal rate.
 * Target = Desired Annual Income ÷ (rate/100)
 * E.g. 4% rule: income × 25; 2% rule: income × 50
 */
export function targetFromWithdrawalRule(
  annualIncome: number,
  withdrawalRatePercent: number
): number {
  const rate = Math.max(0.1, Math.min(10, withdrawalRatePercent)) / 100
  return annualIncome / rate
}

export interface RequiredContributionParams {
  initialBalance: number
  targetFutureValue: number
  annualRatePercent: number
  years: number
  contributionFrequency: ContributionFrequency
}

/**
 * Reverse-engineer compound interest to solve for required contribution.
 * PMT = (FV - P(1+i)^n) * i / ((1+i)^n - 1)
 * Returns { monthly, yearly } or null if invalid (e.g. years <= 0).
 * Returns { monthly: 0, yearly: 0 } if goal already met.
 */
export function requiredContribution(
  params: RequiredContributionParams
): { monthly: number; yearly: number } | null {
  const { initialBalance, targetFutureValue, annualRatePercent, years, contributionFrequency } = params

  if (years <= 0) return null

  const r = annualRatePercent / 100
  let i: number
  let n: number

  if (contributionFrequency === 'monthly') {
    i = r / 12
    n = 12 * years
  } else {
    i = r
    n = years
  }

  const factor = Math.pow(1 + i, n)
  const futureFromPrincipal = initialBalance * factor

  if (targetFutureValue <= futureFromPrincipal) {
    return { monthly: 0, yearly: 0 }
  }

  let pmt: number
  if (Math.abs(i) < 1e-10) {
    pmt = (targetFutureValue - initialBalance) / n
  } else {
    const denom = (factor - 1) / i
    pmt = (targetFutureValue - futureFromPrincipal) / denom
  }

  pmt = Math.max(0, pmt)

  if (contributionFrequency === 'monthly') {
    return { monthly: pmt, yearly: pmt * 12 }
  }
  return { monthly: pmt / 12, yearly: pmt }
}
