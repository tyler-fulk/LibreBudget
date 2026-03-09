import { useEffect, useState } from 'react'
import { Card } from '../components/ui/Card'
import { formatCurrency } from '../utils/calculations'
import {
  futureValue,
  targetFromWithdrawalRule,
  requiredContribution,
} from '../utils/compoundInterest'
import { useCalculatorState } from '../hooks/useCalculatorState'
import { useHomeHousingType } from '../hooks/useHomeHousingType'
import { AutoLoanCalculator } from '../components/calculators/AutoLoanCalculator'
import { HouseAffordabilityCalculator } from '../components/calculators/HouseAffordabilityCalculator'
import { RentAffordabilityCalculator } from '../components/calculators/RentAffordabilityCalculator'

const TARGET_RETIREMENT_AGES = [59.5, 60, 62, 65, 67, 70] as const
const WITHDRAWAL_RATE_OPTIONS = [1.5, 2, 2.5, 3, 3.5, 4] as const

/** Caps to keep inputs realistic and avoid overflow/absurd results */
const CAPS = {
  initialBalance: 999_999_999,
  contributionMonthly: 500_000,
  contributionYearly: 6_000_000,
  years: 80,
  annualRatePercent: 30,
  desiredAnnualIncome: 10_000_000,
  currentAge: 120,
} as const

function clamp(value: number, max: number): number {
  return isNaN(value) ? 0 : Math.max(0, Math.min(value, max))
}

export default function Calculator() {
  const { state, updateState, reset } = useCalculatorState()
  const { housingType, setHousingType } = useHomeHousingType()
  const [autoResetKey, setAutoResetKey] = useState(0)
  const [homeResetKey, setHomeResetKey] = useState(0)

  const handleReset = () => {
    if (mode === 'autoLoan') setAutoResetKey((k) => k + 1)
    else if (mode === 'houseAffordability') setHomeResetKey((k) => k + 1)
    else reset()
  }
  const {
    mode,
    initialBalance,
    contribution,
    contributionFrequency,
    years,
    annualRate,
    desiredAnnualIncome,
    withdrawalRatePercent,
    currentAge,
    targetRetirementAge,
  } = state

  const contributionMax =
    contributionFrequency === 'monthly' ? CAPS.contributionMonthly : CAPS.contributionYearly

  // Cap contribution when switching frequency (e.g. yearly → monthly)
  useEffect(() => {
    const v = parseFloat(contribution)
    if (contribution !== '' && !isNaN(v) && v > contributionMax)
      updateState({ contribution: String(contributionMax) })
  }, [contributionFrequency, contribution, contributionMax, updateState])

  const initialBalanceNum = clamp(parseFloat(initialBalance) || 0, CAPS.initialBalance)
  const contributionNum = clamp(parseFloat(contribution) || 0, contributionMax)
  const yearsNum = clamp(parseFloat(years) || 0, CAPS.years)
  const annualRateNum = clamp(parseFloat(annualRate) || 0, CAPS.annualRatePercent)
  const currentAgeNum = clamp(parseFloat(currentAge) || 0, CAPS.currentAge)

  const desiredIncomeNum = clamp(parseFloat(desiredAnnualIncome) || 0, CAPS.desiredAnnualIncome)
  const targetRetirementGoal = desiredIncomeNum > 0
    ? targetFromWithdrawalRule(desiredIncomeNum, withdrawalRatePercent)
    : null

  const yearsToGrow = mode === 'goalSeeker'
    ? targetRetirementAge - currentAgeNum
    : yearsNum

  const futureBalance =
    mode === 'standard' && yearsNum > 0
      ? futureValue({
          initialBalance: initialBalanceNum,
          contribution: contributionNum,
          contributionFrequency,
          years: yearsNum,
          annualRatePercent: annualRateNum,
        })
      : null

  const requiredResult =
    mode === 'goalSeeker' &&
    targetRetirementGoal !== null &&
    targetRetirementGoal > 0 &&
    yearsToGrow > 0
      ? requiredContribution({
          initialBalance: initialBalanceNum,
          targetFutureValue: targetRetirementGoal,
          annualRatePercent: annualRateNum,
          years: yearsToGrow,
          contributionFrequency,
        })
      : null

  const goalSeekerInvalid = mode === 'goalSeeker' && currentAge !== '' && yearsToGrow <= 0

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Calculators</h1>
          <p className="text-sm text-slate-400">
            {mode === 'autoLoan'
              ? 'Auto evaluation (20/3/8 rule)'
              : mode === 'houseAffordability'
                ? housingType === 'renting'
                  ? 'Max affordable rent (30% rule)'
                  : 'Max affordable home price (28% DTI)'
                : 'Compound interest and retirement goal planning'}
          </p>
        </div>
        <button
          type="button"
          onClick={handleReset}
          className="self-end sm:self-auto rounded-2xl border border-slate-800 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-300 hover:border-slate-700 hover:bg-slate-800 hover:text-slate-200 transition-colors"
        >
          Reset Calculator
        </button>
      </div>

      {/* Mode toggle */}
      <div className="flex gap-2 rounded-xl bg-slate-900 border border-slate-800 p-1">
        <button
          type="button"
          onClick={() => updateState({ mode: 'standard' })}
          className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
            mode === 'standard' ? 'bg-slate-700 text-slate-100' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Standard
        </button>
        <button
          type="button"
          onClick={() => updateState({ mode: 'goalSeeker' })}
          className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
            mode === 'goalSeeker' ? 'bg-slate-700 text-slate-100' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Retirement
        </button>
        <button
          type="button"
          onClick={() => updateState({ mode: 'autoLoan' })}
          className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
            mode === 'autoLoan' ? 'bg-slate-700 text-slate-100' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Auto
        </button>
        <button
          type="button"
          onClick={() => updateState({ mode: 'houseAffordability' })}
          className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
            mode === 'houseAffordability' ? 'bg-slate-700 text-slate-100' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Home
        </button>
      </div>

      {/* Owning / Renting toggle - only when Home mode */}
      {mode === 'houseAffordability' && (
        <div className="flex gap-2 rounded-xl bg-slate-900 border border-slate-800 p-1">
          <button
            type="button"
            onClick={() => setHousingType('owning')}
            className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
              housingType === 'owning' ? 'bg-slate-700 text-slate-100' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Owning
          </button>
          <button
            type="button"
            onClick={() => setHousingType('renting')}
            className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
              housingType === 'renting' ? 'bg-slate-700 text-slate-100' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Renting
          </button>
        </div>
      )}

      {mode === 'autoLoan' ? (
        <AutoLoanCalculator key={autoResetKey} />
      ) : mode === 'houseAffordability' ? (
        housingType === 'renting' ? (
          <RentAffordabilityCalculator key={homeResetKey} />
        ) : (
          <HouseAffordabilityCalculator key={homeResetKey} />
        )
      ) : (
      <>
      {/* Phase 1: Compound Interest Calculator */}
      <Card>
        <h2 className="text-lg font-semibold text-slate-200 mb-4">
          Compound Interest Calculator
        </h2>

        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm text-slate-400">
              Initial balance ($)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              max={CAPS.initialBalance}
              value={initialBalance}
              onChange={(e) => updateState({ initialBalance: e.target.value })}
              onBlur={(e) => {
                const v = parseFloat(e.target.value)
                if (e.target.value !== '' && !isNaN(v) && v > CAPS.initialBalance)
                  updateState({ initialBalance: String(CAPS.initialBalance) })
              }}
              placeholder="0"
              className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm text-slate-400">
              Additional contributions ($)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              max={contributionMax}
              value={contribution}
              onChange={(e) => updateState({ contribution: e.target.value })}
              onBlur={(e) => {
                const v = parseFloat(e.target.value)
                if (e.target.value !== '' && !isNaN(v) && v > contributionMax)
                  updateState({ contribution: String(contributionMax) })
              }}
              placeholder="0"
              className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm text-slate-400">
              Contribution frequency
            </label>
            <div className="flex gap-2 rounded-xl bg-slate-800 p-1">
              <button
                type="button"
                onClick={() => updateState({ contributionFrequency: 'monthly' })}
                className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
                  contributionFrequency === 'monthly'
                    ? 'bg-slate-700 text-slate-100'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => updateState({ contributionFrequency: 'yearly' })}
                className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
                  contributionFrequency === 'yearly'
                    ? 'bg-slate-700 text-slate-100'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Yearly
              </button>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm text-slate-400">
              Years to grow
            </label>
            {mode === 'goalSeeker' ? (
              <div className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-slate-400">
                {currentAge !== '' && !isNaN(currentAgeNum)
                  ? `${yearsToGrow > 0 ? yearsToGrow : 0} years (from age ${currentAgeNum} to ${targetRetirementAge})`
                  : 'Enter current age below'}
              </div>
            ) : (
              <input
                type="number"
                step="1"
                min="0"
                max={CAPS.years}
                value={years}
                onChange={(e) => updateState({ years: e.target.value })}
                onBlur={(e) => {
                  const v = parseFloat(e.target.value)
                  if (e.target.value !== '' && !isNaN(v) && v > CAPS.years)
                    updateState({ years: String(CAPS.years) })
                }}
                placeholder="10"
                className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
              />
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-sm text-slate-400">
              Interest rate / Rate of return (%)
            </label>
            <input
              type="number"
              step="0.1"
              min="0"
              max={CAPS.annualRatePercent}
              value={annualRate}
              onChange={(e) => updateState({ annualRate: e.target.value })}
              onBlur={(e) => {
                const v = parseFloat(e.target.value)
                if (e.target.value !== '' && !isNaN(v) && v > CAPS.annualRatePercent)
                  updateState({ annualRate: String(CAPS.annualRatePercent) })
              }}
              placeholder="7"
              className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
            />
          </div>

          {mode === 'standard' && futureBalance !== null && (
            <div className="rounded-xl border border-green-800 bg-green-900/20 p-4">
              <p className="text-xs text-slate-400 mb-1">Final future balance</p>
              <p className="text-2xl font-bold text-green-400">
                {formatCurrency(futureBalance)}
              </p>
            </div>
          )}
        </div>
      </Card>

      {/* Years to Retirement - only in Retirement Calculator mode */}
      {mode === 'goalSeeker' && (
        <Card>
          <h2 className="text-lg font-semibold text-slate-200 mb-4">
            Years to Retirement
          </h2>
          <p className="text-sm text-slate-400 mb-4">
            Find the contribution needed to hit your target using initial balance, rate, and target retirement goal.
          </p>
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm text-slate-400">
                Current age
              </label>
              <input
                type="number"
                step="1"
                min="0"
                max={CAPS.currentAge}
                value={currentAge}
                onChange={(e) => updateState({ currentAge: e.target.value })}
                onBlur={(e) => {
                  const v = parseFloat(e.target.value)
                  if (e.target.value !== '' && !isNaN(v) && v > CAPS.currentAge)
                    updateState({ currentAge: String(CAPS.currentAge) })
                }}
                placeholder="35"
                className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm text-slate-400">
                Target retirement age
              </label>
              <select
                value={targetRetirementAge}
                onChange={(e) => updateState({ targetRetirementAge: parseFloat(e.target.value) })}
                className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-slate-100 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
              >
                {TARGET_RETIREMENT_AGES.map((age) => (
                  <option key={age} value={age}>
                    {age}
                  </option>
                ))}
              </select>
            </div>
            {goalSeekerInvalid && (
              <p className="text-sm text-red-400">
                Target age must be after current age.
              </p>
            )}
            {requiredResult !== null && !goalSeekerInvalid && (
              <div className="rounded-xl border border-green-800 bg-green-900/20 p-4 space-y-2">
                {requiredResult.monthly === 0 && requiredResult.yearly === 0 ? (
                  <div className="space-y-1">
                    <p className="text-lg font-semibold text-green-400">
                      Goal already met
                    </p>
                    <p className="text-xs text-slate-400">
                      Your initial balance will reach the target without additional contributions.
                    </p>
                  </div>
                ) : (
                  <>
                    <p className="text-xs text-slate-400 mb-1">Required contribution</p>
                    <p className="text-2xl font-bold text-green-400">
                      {contributionFrequency === 'monthly'
                        ? formatCurrency(requiredResult.monthly)
                        : formatCurrency(requiredResult.yearly)}
                      <span className="text-sm font-normal text-slate-400 ml-2">
                        {contributionFrequency === 'monthly' ? '/ month' : '/ year'}
                      </span>
                    </p>
                    <p className="text-xs text-slate-500">
                      {contributionFrequency === 'monthly'
                        ? `${formatCurrency(requiredResult.yearly)} per year`
                        : `${formatCurrency(requiredResult.monthly)} per month`}
                    </p>
                  </>
                )}
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Know Your Number - only in Retirement Calculator mode */}
      {mode === 'goalSeeker' && (
      <Card>
        <h2 className="text-lg font-semibold text-slate-200 mb-4">
          Know Your Number
        </h2>
        <p className="text-sm text-slate-400 mb-4">
          Use a safe withdrawal rate to find the retirement portfolio you need.
        </p>
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 flex items-center gap-2 text-sm text-slate-400">
              Withdrawal rate (%)
              <div className="relative group/tip">
                <span className="inline-flex cursor-help">
                  <svg className="h-3.5 w-3.5 text-slate-500 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20 10 10 0 000-20z" />
                  </svg>
                </span>
                <div className="absolute left-0 top-full mt-2 w-72 rounded-xl border border-slate-700 bg-slate-800 p-3 shadow-lg z-10 opacity-0 pointer-events-none group-hover/tip:opacity-100 group-hover/tip:pointer-events-auto transition-opacity duration-150 space-y-2">
                  <p className="text-xs text-slate-300 leading-relaxed">
                    The percentage of your portfolio you plan to withdraw each year in retirement. The 4% rule is a common guideline: withdraw 4% annually.
                  </p>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Use 3–3.5% for a more conservative plan, or 2–2.5% if you expect a long retirement. Lower rates = larger target portfolio.
                  </p>
                </div>
              </div>
            </label>
            <select
              value={WITHDRAWAL_RATE_OPTIONS.includes(withdrawalRatePercent as (typeof WITHDRAWAL_RATE_OPTIONS)[number]) ? withdrawalRatePercent : 4}
              onChange={(e) => updateState({ withdrawalRatePercent: parseFloat(e.target.value) })}
              className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-slate-100 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
            >
              {WITHDRAWAL_RATE_OPTIONS.map((rate) => (
                <option key={rate} value={rate}>
                  {rate}%
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm text-slate-400">
              Desired annual retirement income ($)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              max={CAPS.desiredAnnualIncome}
              value={desiredAnnualIncome}
              onChange={(e) => updateState({ desiredAnnualIncome: e.target.value })}
              onBlur={(e) => {
                const v = parseFloat(e.target.value)
                if (e.target.value !== '' && !isNaN(v) && v > CAPS.desiredAnnualIncome)
                  updateState({ desiredAnnualIncome: String(CAPS.desiredAnnualIncome) })
              }}
              placeholder="60000"
              className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
            />
          </div>
          {targetRetirementGoal !== null && (
            <div className="rounded-xl border border-green-800 bg-green-900/20 p-4">
              <p className="text-xs text-slate-400 mb-1">Target retirement goal</p>
              <p className="text-2xl font-bold text-green-400">
                {formatCurrency(targetRetirementGoal)}
              </p>
            </div>
          )}
        </div>
      </Card>
      )}
      </>
      )}
    </div>
  )
}
