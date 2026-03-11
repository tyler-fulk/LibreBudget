import { useEffect, useRef } from 'react'
import { Card } from '../ui/Card'
import { formatCurrency } from '../../utils/calculations'
import { maxAffordableHomePrice } from '../../utils/houseAffordability'
import { useHouseCalculatorState } from '../../hooks/useHouseCalculatorState'
import { getPropertyTaxRateFromZip } from '../../data/propertyTaxRates'
import { useSettings } from '../../hooks/useSettings'

const INPUT_CLASS =
  'w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500'

/** Caps to keep inputs realistic */
const CAPS = {
  agi: 10_000_000,
  downPaymentDollars: 5_000_000,
  interestRatePercent: 30,
  loanTermYears: 30,
  propertyTaxPercent: 5,
  homeInsurancePercent: 2,
  hoaDues: 10_000,
} as const

function clamp(value: number, max: number): number {
  return isNaN(value) ? 0 : Math.max(0, Math.min(value, max))
}

export function HouseAffordabilityCalculator() {
  const { state, updateState } = useHouseCalculatorState()
  const { settings } = useSettings()
  const monthOverride = settings[`monthlyBudget-${new Date().toISOString().slice(0, 7)}`]
  const defaultStored = settings['monthlyBudget']
  const budgetForPrefill =
    monthOverride != null
      ? parseFloat(monthOverride)
      : defaultStored != null
        ? parseFloat(defaultStored)
        : 0

  const prefilled = useRef(false)
  useEffect(() => {
    if (!prefilled.current && state.agi === '' && budgetForPrefill > 0) {
      prefilled.current = true
      updateState({ agi: String(Math.round(budgetForPrefill * 12)) })
    }
  }, [budgetForPrefill, state.agi, updateState])

  const agiNum = clamp(parseFloat(state.agi) || 0, CAPS.agi)
  const downPaymentDollarsNum = clamp(parseFloat(state.downPaymentDollars) || 0, CAPS.downPaymentDollars)
  const downPaymentPercentNum = Math.max(0, Math.min(100, parseFloat(state.downPaymentPercent) || 0))
  const interestRateNum = clamp(parseFloat(state.interestRate) || 0, CAPS.interestRatePercent)
  const loanTermYearsNum = Math.max(1, Math.min(CAPS.loanTermYears, Math.round(parseFloat(state.loanTermYears) || 0)))
  const propertyTaxManualNum = clamp(parseFloat(state.propertyTaxManual) || 0, CAPS.propertyTaxPercent)
  const homeInsuranceRateNum = clamp(parseFloat(state.homeInsuranceRate) || 0, CAPS.homeInsurancePercent)
  const hoaDuesNum = clamp(parseFloat(state.hoaDues) || 0, CAPS.hoaDues)

  const propertyTaxRate =
    state.propertyTaxSource === 'zip'
      ? getPropertyTaxRateFromZip(state.zipCode)
      : propertyTaxManualNum / 100
  const homeInsuranceRate = homeInsuranceRateNum / 100

  const result =
    agiNum > 0 && loanTermYearsNum > 0
      ? maxAffordableHomePrice({
          agiAnnual: agiNum,
          downPaymentDollars: downPaymentDollarsNum,
          downPaymentPercent: downPaymentPercentNum,
          downPaymentMode: state.downPaymentMode,
          interestRatePercent: interestRateNum,
          loanTermYears: loanTermYearsNum,
          propertyTaxRateAnnual: propertyTaxRate,
          homeInsuranceRateAnnual: homeInsuranceRate,
          hoaMonthly: hoaDuesNum,
          dtiPercent: 28,
        })
      : null

  return (
    <Card>
      <h2 className="text-lg font-semibold text-slate-200 mb-4">
        Home Affordability Calculator
      </h2>
      <p className="text-sm text-slate-400 mb-4">
        Estimate the maximum home price you can afford using the 28% front-end DTI rule: housing costs
        (P&amp;I + property tax + insurance + HOA) should not exceed 28% of gross monthly income.
      </p>

      <div className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm text-slate-400">Annual gross income (AGI) ($)</label>
          <input
            type="number"
            step="1000"
            min="0"
            max={CAPS.agi}
            value={state.agi}
            onChange={(e) => updateState({ agi: e.target.value })}
            onBlur={(e) => {
              const v = parseFloat(e.target.value)
              if (e.target.value !== '' && !isNaN(v) && v > CAPS.agi)
                updateState({ agi: String(CAPS.agi) })
            }}
            placeholder={budgetForPrefill > 0 ? String(Math.round(budgetForPrefill * 12)) : '120000'}
            className={INPUT_CLASS}
          />
          {budgetForPrefill > 0 && (
            <p className="text-xs text-slate-500 mt-1">
              ~{formatCurrency(budgetForPrefill * 12)}/year if based on monthly budget
            </p>
          )}
        </div>

        <div>
          <label className="mb-1.5 block text-sm text-slate-400">Down payment</label>
          <div className="flex gap-2 rounded-xl bg-slate-800 p-1 mb-2">
            <button
              type="button"
              onClick={() => updateState({ downPaymentMode: 'percent' })}
              className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
                state.downPaymentMode === 'percent'
                  ? 'bg-slate-700 text-slate-100'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              %
            </button>
            <button
              type="button"
              onClick={() => updateState({ downPaymentMode: 'dollar' })}
              className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
                state.downPaymentMode === 'dollar'
                  ? 'bg-slate-700 text-slate-100'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              $
            </button>
          </div>
          {state.downPaymentMode === 'percent' ? (
            <input
              type="number"
              step="0.5"
              min="0"
              max="100"
              value={state.downPaymentPercent}
              onChange={(e) => updateState({ downPaymentPercent: e.target.value })}
              placeholder="20"
              className={INPUT_CLASS}
            />
          ) : (
            <input
              type="number"
              step="1000"
              min="0"
              max={CAPS.downPaymentDollars}
              value={state.downPaymentDollars}
              onChange={(e) => updateState({ downPaymentDollars: e.target.value })}
              onBlur={(e) => {
                const v = parseFloat(e.target.value)
                if (e.target.value !== '' && !isNaN(v) && v > CAPS.downPaymentDollars)
                  updateState({ downPaymentDollars: String(CAPS.downPaymentDollars) })
              }}
              placeholder="50000"
              className={INPUT_CLASS}
            />
          )}
        </div>

        <div>
          <label className="mb-1.5 block text-sm text-slate-400">Interest rate (%)</label>
          <input
            type="number"
            step="0.1"
            min="0"
            max={CAPS.interestRatePercent}
            value={state.interestRate}
            onChange={(e) => updateState({ interestRate: e.target.value })}
            onBlur={(e) => {
              const v = parseFloat(e.target.value)
              if (e.target.value !== '' && !isNaN(v) && v > CAPS.interestRatePercent)
                updateState({ interestRate: String(CAPS.interestRatePercent) })
            }}
            placeholder="7"
            className={INPUT_CLASS}
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm text-slate-400">Loan term (years)</label>
          <input
            type="number"
            step="1"
            min="1"
            max={CAPS.loanTermYears}
            value={state.loanTermYears}
            onChange={(e) => updateState({ loanTermYears: e.target.value })}
            onBlur={(e) => {
              const v = parseFloat(e.target.value)
              if (e.target.value !== '' && !isNaN(v)) {
                if (v > CAPS.loanTermYears) updateState({ loanTermYears: String(CAPS.loanTermYears) })
                else if (v < 1) updateState({ loanTermYears: '1' })
              }
            }}
            placeholder="30"
            className={INPUT_CLASS}
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm text-slate-400">Property tax</label>
          <div className="flex gap-2 rounded-xl bg-slate-800 p-1 mb-2">
            <button
              type="button"
              onClick={() => updateState({ propertyTaxSource: 'zip' })}
              className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
                state.propertyTaxSource === 'zip'
                  ? 'bg-slate-700 text-slate-100'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Estimate from ZIP
            </button>
            <button
              type="button"
              onClick={() => updateState({ propertyTaxSource: 'manual' })}
              className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
                state.propertyTaxSource === 'manual'
                  ? 'bg-slate-700 text-slate-100'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Manual %
            </button>
          </div>
          {state.propertyTaxSource === 'zip' ? (
            <>
              <input
                type="text"
                inputMode="numeric"
                maxLength={5}
                value={state.zipCode}
                onChange={(e) => updateState({ zipCode: e.target.value.replace(/\D/g, '').slice(0, 5) })}
                placeholder="12345"
                className={INPUT_CLASS}
              />
              {state.zipCode.length >= 3 && (
                <p className="text-xs text-slate-500 mt-1">
                  Est. rate: {(propertyTaxRate * 100).toFixed(2)}%/year
                </p>
              )}
              <p className="text-xs text-slate-500 mt-1">
                Not hyperlocal—estimate based on first 3 digits only. For more accuracy, use Manual % and enter your own tax rate.
              </p>
            </>
          ) : (
            <input
              type="number"
              step="0.1"
              min="0"
              max={CAPS.propertyTaxPercent}
              value={state.propertyTaxManual}
              onChange={(e) => updateState({ propertyTaxManual: e.target.value })}
              onBlur={(e) => {
                const v = parseFloat(e.target.value)
                if (e.target.value !== '' && !isNaN(v) && v > CAPS.propertyTaxPercent)
                  updateState({ propertyTaxManual: String(CAPS.propertyTaxPercent) })
              }}
              placeholder="1.2"
              className={INPUT_CLASS}
            />
          )}
        </div>

        <div>
          <label className="mb-1.5 block text-sm text-slate-400">
            Home insurance (annual % of home value)
          </label>
          <input
            type="number"
            step="0.05"
            min="0"
            max={CAPS.homeInsurancePercent}
            value={state.homeInsuranceRate}
            onChange={(e) => updateState({ homeInsuranceRate: e.target.value })}
            onBlur={(e) => {
              const v = parseFloat(e.target.value)
              if (e.target.value !== '' && !isNaN(v) && v > CAPS.homeInsurancePercent)
                updateState({ homeInsuranceRate: String(CAPS.homeInsurancePercent) })
            }}
            placeholder="0.35"
            className={INPUT_CLASS}
          />
          <p className="text-xs text-slate-500 mt-1">Typical range: 0.2–0.5%. Default 0.35%.</p>
        </div>

        <div>
          <label className="mb-1.5 block text-sm text-slate-400">HOA dues ($/month)</label>
          <input
            type="number"
            step="10"
            min="0"
            max={CAPS.hoaDues}
            value={state.hoaDues}
            onChange={(e) => updateState({ hoaDues: e.target.value })}
            onBlur={(e) => {
              const v = parseFloat(e.target.value)
              if (e.target.value !== '' && !isNaN(v) && v > CAPS.hoaDues)
                updateState({ hoaDues: String(CAPS.hoaDues) })
            }}
            placeholder="0"
            className={INPUT_CLASS}
          />
        </div>

        {result && result.maxAffordablePrice > 0 && (
          <div className="rounded-xl border border-green-800 bg-green-900/20 p-4 space-y-3">
            <p className="text-xs text-slate-400">Max affordable home price (28% DTI)</p>
            <p className="text-2xl font-bold text-green-400">
              {formatCurrency(result.maxAffordablePrice)}
            </p>
            <div className="text-sm text-slate-300 space-y-1 pt-2 border-t border-slate-700/50">
              <p>
                Down payment: {formatCurrency(result.downPaymentAmount)} · Loan: {formatCurrency(result.loanAmount)}
              </p>
              <p className="text-xs text-slate-400">Monthly housing breakdown:</p>
              <ul className="text-xs space-y-0.5">
                <li>P&amp;I: {formatCurrency(result.monthlyPrincipalInterest)}</li>
                <li>Property tax: {formatCurrency(result.monthlyPropertyTax)}</li>
                <li>Insurance: {formatCurrency(result.monthlyInsurance)}</li>
                <li>HOA: {formatCurrency(result.monthlyHOA)}</li>
              </ul>
              <p className="font-medium text-slate-200 pt-1">
                Total: {formatCurrency(result.totalMonthlyHousing)}/mo
                ({result.dtiPercent.toFixed(1)}% of gross income)
              </p>
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}
