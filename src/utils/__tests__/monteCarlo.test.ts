import { describe, it, expect } from 'vitest'
import { runMonteCarloSimulation, type MonteCarloParams } from '../monteCarlo'
import { futureValue } from '../compoundInterest'

/** Shared base params for tests */
const BASE_PARAMS: MonteCarloParams = {
  initialBalance: 100_000,
  annualContribution: 12_000,
  meanReturnPercent: 7,
  returnStdDevPercent: 15,
  inflationMeanPercent: 3,
  inflationStdDevPercent: 1,
  annualFeePercent: 0,
  contributionIncreasePercent: 0,
  currentAge: 30,
  retirementAge: 65,
  endAge: 90,
  withdrawalRatePercent: 4,
  desiredAnnualIncome: 50_000,
  numTrials: 1000,
  samplePaths: 10,
  useVariableLongevity: false,
  useRegimeSwitching: false,
  seed: 42,
}

describe('Monte Carlo Engine', () => {
  // ── 1. Deterministic equivalence ──
  describe('deterministic mode (stdDev=0, inflationSD=0)', () => {
    it('should match futureValue() for accumulation-only scenario', () => {
      // retirementAge past endAge so no withdrawal phase occurs
      const params: MonteCarloParams = {
        ...BASE_PARAMS,
        returnStdDevPercent: 0,
        inflationMeanPercent: 0,
        inflationStdDevPercent: 0,
        annualFeePercent: 0,
        retirementAge: 91,
        endAge: 90,
        desiredAnnualIncome: 0,
        withdrawalRatePercent: 0,
        numTrials: 10,
        seed: 1,
      }

      const result = runMonteCarloSimulation(params)

      const expected = futureValue({
        initialBalance: 100_000,
        contribution: 12_000,
        contributionFrequency: 'yearly',
        years: 60,
        annualRatePercent: 7,
      })

      expect(result.percentiles.p10).toBeCloseTo(result.percentiles.p90, 0)

      const pctDiff = Math.abs(result.percentiles.p50 - expected) / expected
      expect(pctDiff).toBeLessThan(0.01)
    })

    it('all percentiles should be equal when stdDev=0', () => {
      const params: MonteCarloParams = {
        ...BASE_PARAMS,
        returnStdDevPercent: 0,
        inflationMeanPercent: 0,
        inflationStdDevPercent: 0,
        annualFeePercent: 0,
        numTrials: 50,
        seed: 99,
      }

      const result = runMonteCarloSimulation(params)

      expect(result.percentiles.p10).toBeCloseTo(result.percentiles.p50, 2)
      expect(result.percentiles.p50).toBeCloseTo(result.percentiles.p90, 2)
    })
  })

  // ── 2. Log-normal distribution check ──
  describe('log-normal distribution', () => {
    it('ending wealth should be approximately log-normally distributed', () => {
      const params: MonteCarloParams = {
        ...BASE_PARAMS,
        retirementAge: 90,
        endAge: 90,
        desiredAnnualIncome: 0,
        inflationMeanPercent: 0,
        inflationStdDevPercent: 0,
        annualFeePercent: 0,
        numTrials: 5000,
        seed: 123,
      }

      const result = runMonteCarloSimulation(params)

      const rightTail = result.percentiles.p90 - result.percentiles.p50
      const leftTail = result.percentiles.p50 - result.percentiles.p10
      expect(rightTail).toBeGreaterThan(leftTail)
    })
  })

  // ── 3. Guaranteed success scenario ──
  it('should return ~100% success with large balance and small withdrawal', () => {
    const params: MonteCarloParams = {
      ...BASE_PARAMS,
      initialBalance: 10_000_000,
      annualContribution: 0,
      meanReturnPercent: 7,
      returnStdDevPercent: 10,
      desiredAnnualIncome: 1_000,
      numTrials: 500,
      seed: 55,
    }

    const result = runMonteCarloSimulation(params)
    expect(result.probabilityOfSuccess).toBeGreaterThanOrEqual(99)
  })

  // ── 4. Guaranteed failure scenario ──
  it('should return ~0% success with zero balance and large withdrawal', () => {
    const params: MonteCarloParams = {
      ...BASE_PARAMS,
      initialBalance: 0,
      annualContribution: 0,
      meanReturnPercent: 7,
      returnStdDevPercent: 15,
      desiredAnnualIncome: 100_000,
      currentAge: 64,
      retirementAge: 65,
      endAge: 90,
      numTrials: 500,
      seed: 77,
    }

    const result = runMonteCarloSimulation(params)
    expect(result.probabilityOfSuccess).toBeLessThanOrEqual(1)
    expect(result.failureYear).not.toBeNull()
  })

  // ── 5. Percentile ordering ──
  it('should always have p10 <= p50 <= p90', () => {
    const result = runMonteCarloSimulation({ ...BASE_PARAMS, seed: 42 })
    expect(result.percentiles.p10).toBeLessThanOrEqual(result.percentiles.p50)
    expect(result.percentiles.p50).toBeLessThanOrEqual(result.percentiles.p90)
  })

  // ── 6. Reproducibility ──
  it('should produce identical results with the same seed', () => {
    const r1 = runMonteCarloSimulation({ ...BASE_PARAMS, seed: 999 })
    const r2 = runMonteCarloSimulation({ ...BASE_PARAMS, seed: 999 })

    expect(r1.probabilityOfSuccess).toBe(r2.probabilityOfSuccess)
    expect(r1.percentiles.p10).toBe(r2.percentiles.p10)
    expect(r1.percentiles.p50).toBe(r2.percentiles.p50)
    expect(r1.percentiles.p90).toBe(r2.percentiles.p90)
    expect(r1.failureYear).toBe(r2.failureYear)
  })

  it('should produce different results with different seeds', () => {
    const r1 = runMonteCarloSimulation({ ...BASE_PARAMS, seed: 1 })
    const r2 = runMonteCarloSimulation({ ...BASE_PARAMS, seed: 2 })

    expect(r1.percentiles.p50).not.toBe(r2.percentiles.p50)
  })

  // ── 7. Inflation impact ──
  it('higher inflation should reduce ending balance during retirement', () => {
    // Immediate retirement isolates the withdrawal-inflation effect
    const shared: MonteCarloParams = {
      ...BASE_PARAMS,
      initialBalance: 1_000_000,
      annualContribution: 0,
      currentAge: 65,
      retirementAge: 65,
      endAge: 90,
      desiredAnnualIncome: 40_000,
      returnStdDevPercent: 0,
      inflationStdDevPercent: 0,
      numTrials: 10,
    }
    const lowInflation = runMonteCarloSimulation({
      ...shared,
      inflationMeanPercent: 1,
      seed: 42,
    })
    const highInflation = runMonteCarloSimulation({
      ...shared,
      inflationMeanPercent: 6,
      seed: 42,
    })

    // Higher inflation grows withdrawals faster, depleting the portfolio more
    expect(highInflation.percentiles.p50).toBeLessThan(lowInflation.percentiles.p50)
  })

  // ── 8. Fee drag ──
  it('higher fees should reduce ending balance', () => {
    const noFee = runMonteCarloSimulation({
      ...BASE_PARAMS,
      annualFeePercent: 0,
      returnStdDevPercent: 0,
      inflationStdDevPercent: 0,
      seed: 42,
    })
    const highFee = runMonteCarloSimulation({
      ...BASE_PARAMS,
      annualFeePercent: 2,
      returnStdDevPercent: 0,
      inflationStdDevPercent: 0,
      seed: 42,
    })

    expect(highFee.percentiles.p50).toBeLessThan(noFee.percentiles.p50)
  })

  // ── 9. Path output ──
  it('should return the requested number of sample paths', () => {
    const result = runMonteCarloSimulation({
      ...BASE_PARAMS,
      samplePaths: 10,
      numTrials: 100,
      seed: 42,
    })

    expect(result.paths.length).toBe(10)
    for (const path of result.paths) {
      expect(path[0].year).toBe(0)
      expect(path[0].balance).toBe(100_000)
      expect(path.length).toBeGreaterThan(1)
    }
  })

  // ── 10. Contribution annual increase ──
  it('higher contribution increase should produce larger ending balance', () => {
    const noRaise = runMonteCarloSimulation({
      ...BASE_PARAMS,
      returnStdDevPercent: 0,
      inflationMeanPercent: 0,
      inflationStdDevPercent: 0,
      contributionIncreasePercent: 0,
      seed: 42,
    })
    const withRaise = runMonteCarloSimulation({
      ...BASE_PARAMS,
      returnStdDevPercent: 0,
      inflationMeanPercent: 0,
      inflationStdDevPercent: 0,
      contributionIncreasePercent: 3,
      seed: 42,
    })

    expect(withRaise.percentiles.p50).toBeGreaterThan(noRaise.percentiles.p50)
  })

  // ── 11. Variable longevity ──
  it('should run with variable longevity enabled', () => {
    const result = runMonteCarloSimulation({
      ...BASE_PARAMS,
      useVariableLongevity: true,
      numTrials: 500,
      seed: 42,
    })

    expect(result.probabilityOfSuccess).toBeGreaterThanOrEqual(0)
    expect(result.probabilityOfSuccess).toBeLessThanOrEqual(100)
    expect(result.trialCount).toBe(500)
  })

  // ── 12. SWR vs fixed income withdrawal modes produce different outcomes ──
  describe('withdrawal modes', () => {
    it('SWR and fixed income modes should produce different results', () => {
      const swrResult = runMonteCarloSimulation({
        ...BASE_PARAMS,
        desiredAnnualIncome: undefined,
        withdrawalRatePercent: 4,
        returnStdDevPercent: 0,
        inflationStdDevPercent: 0,
        numTrials: 100,
        seed: 42,
      })
      const incomeResult = runMonteCarloSimulation({
        ...BASE_PARAMS,
        desiredAnnualIncome: 50_000,
        withdrawalRatePercent: 4,
        returnStdDevPercent: 0,
        inflationStdDevPercent: 0,
        numTrials: 100,
        seed: 42,
      })

      // The two modes lock in different withdrawal amounts, so results should differ
      expect(swrResult.percentiles.p50).not.toBe(incomeResult.percentiles.p50)
    })

    it('SWR mode should use balance * rate as initial withdrawal', () => {
      // Deterministic: retire immediately with known balance
      const result = runMonteCarloSimulation({
        ...BASE_PARAMS,
        initialBalance: 1_000_000,
        annualContribution: 0,
        desiredAnnualIncome: undefined,
        withdrawalRatePercent: 4,
        meanReturnPercent: 0,
        returnStdDevPercent: 0,
        inflationMeanPercent: 0,
        inflationStdDevPercent: 0,
        annualFeePercent: 0,
        currentAge: 65,
        retirementAge: 65,
        endAge: 90,
        numTrials: 10,
        seed: 1,
      })

      // 4% of $1M = $40k/yr, over 25 years = $1M total withdrawals
      // Balance should deplete exactly at year 25
      expect(result.probabilityOfSuccess).toBe(0)
      expect(result.failureYear).toBe(90)
    })
  })

  // ── 13. Inflation bounds ──
  describe('inflation bounds', () => {
    it('inflation should be clamped between -2% and 20%', () => {
      // Use extremely high volatility to force extreme samples
      const result = runMonteCarloSimulation({
        ...BASE_PARAMS,
        retirementAge: 90,
        endAge: 90,
        desiredAnnualIncome: 0,
        inflationMeanPercent: 10,
        inflationStdDevPercent: 50,
        returnStdDevPercent: 0,
        annualFeePercent: 0,
        numTrials: 50,
        seed: 42,
      })

      // If inflation were unclamped, extreme draws would cause wildly different outcomes.
      // The simulation should complete without NaN or Infinity.
      expect(result.probabilityOfSuccess).toBeGreaterThanOrEqual(0)
      expect(Number.isFinite(result.percentiles.p50)).toBe(true)
    })
  })

  // ── 14. Immediate retirement edge case ──
  it('should handle immediate retirement (retirementAge == currentAge)', () => {
    const result = runMonteCarloSimulation({
      ...BASE_PARAMS,
      initialBalance: 500_000,
      annualContribution: 0,
      currentAge: 65,
      retirementAge: 65,
      endAge: 90,
      desiredAnnualIncome: 30_000,
      returnStdDevPercent: 10,
      numTrials: 200,
      seed: 42,
    })

    expect(result.probabilityOfSuccess).toBeGreaterThanOrEqual(0)
    expect(result.probabilityOfSuccess).toBeLessThanOrEqual(100)
    expect(result.yearsSimulated).toBe(25)
  })

  // ── 15. yearlyPercentiles structure ──
  describe('yearlyPercentiles', () => {
    it('should have correct length and ordering at each year', () => {
      const result = runMonteCarloSimulation({
        ...BASE_PARAMS,
        numTrials: 500,
        seed: 42,
      })

      // Should have entries for year 0 through yearsSimulated
      expect(result.yearlyPercentiles.length).toBe(result.yearsSimulated + 1)
      expect(result.yearlyPercentiles[0].year).toBe(0)

      for (const yp of result.yearlyPercentiles) {
        expect(yp.p10).toBeLessThanOrEqual(yp.p25)
        expect(yp.p25).toBeLessThanOrEqual(yp.p50)
        expect(yp.p50).toBeLessThanOrEqual(yp.p75)
        expect(yp.p75).toBeLessThanOrEqual(yp.p90)
      }
    })

    it('year 0 should always equal initial balance (no variance)', () => {
      const result = runMonteCarloSimulation({
        ...BASE_PARAMS,
        numTrials: 100,
        seed: 42,
      })

      const y0 = result.yearlyPercentiles[0]
      expect(y0.p10).toBe(BASE_PARAMS.initialBalance)
      expect(y0.p50).toBe(BASE_PARAMS.initialBalance)
      expect(y0.p90).toBe(BASE_PARAMS.initialBalance)
    })
  })

  // ── 16. yearsSimulated with variable longevity ──
  it('yearsSimulated should reflect max trial horizon with variable longevity', () => {
    const fixedResult = runMonteCarloSimulation({
      ...BASE_PARAMS,
      useVariableLongevity: false,
      endAge: 90,
      numTrials: 500,
      seed: 42,
    })

    const variableResult = runMonteCarloSimulation({
      ...BASE_PARAMS,
      useVariableLongevity: true,
      endAge: 90,
      numTrials: 500,
      seed: 42,
    })

    // Fixed should always equal endAge - currentAge
    expect(fixedResult.yearsSimulated).toBe(90 - BASE_PARAMS.currentAge)

    // Variable longevity samples death ages up to 100, so max horizon
    // should be >= the fixed horizon (some trials live past endAge)
    expect(variableResult.yearsSimulated).toBeGreaterThanOrEqual(fixedResult.yearsSimulated)
  })

  // ── 17. Regime switching (bear market crash clustering) ──
  describe('regime switching', () => {
    it('should reduce success rate compared to IID returns', () => {
      const noRegime = runMonteCarloSimulation({
        ...BASE_PARAMS,
        useRegimeSwitching: false,
        numTrials: 2000,
        seed: 42,
      })
      const withRegime = runMonteCarloSimulation({
        ...BASE_PARAMS,
        useRegimeSwitching: true,
        numTrials: 2000,
        seed: 42,
      })

      // Clustered bear markets should generally reduce success probability
      expect(withRegime.probabilityOfSuccess).toBeLessThan(noRegime.probabilityOfSuccess)
    })

    it('should produce lower median ending balance than IID', () => {
      const noRegime = runMonteCarloSimulation({
        ...BASE_PARAMS,
        useRegimeSwitching: false,
        numTrials: 2000,
        seed: 42,
      })
      const withRegime = runMonteCarloSimulation({
        ...BASE_PARAMS,
        useRegimeSwitching: true,
        numTrials: 2000,
        seed: 42,
      })

      // Bear market clustering reduces expected outcomes
      expect(withRegime.percentiles.p50).toBeLessThan(noRegime.percentiles.p50)
    })

    it('should be reproducible with same seed', () => {
      const r1 = runMonteCarloSimulation({ ...BASE_PARAMS, useRegimeSwitching: true, seed: 123 })
      const r2 = runMonteCarloSimulation({ ...BASE_PARAMS, useRegimeSwitching: true, seed: 123 })

      expect(r1.probabilityOfSuccess).toBe(r2.probabilityOfSuccess)
      expect(r1.percentiles.p50).toBe(r2.percentiles.p50)
    })

    it('should have no effect when returnStdDev is 0', () => {
      const noRegime = runMonteCarloSimulation({
        ...BASE_PARAMS,
        returnStdDevPercent: 0,
        inflationStdDevPercent: 0,
        useRegimeSwitching: false,
        numTrials: 10,
        seed: 42,
      })
      const withRegime = runMonteCarloSimulation({
        ...BASE_PARAMS,
        returnStdDevPercent: 0,
        inflationStdDevPercent: 0,
        useRegimeSwitching: true,
        numTrials: 10,
        seed: 42,
      })

      // With zero volatility, regime switching can't affect returns
      expect(withRegime.percentiles.p50).toBe(noRegime.percentiles.p50)
    })
  })
})
