import { useEffect, useRef } from 'react'
import { Card } from '../ui/Card'
import { formatCurrency } from '../../utils/calculations'
import { maxAffordableRent } from '../../utils/rentAffordability'
import { useRentCalculatorState } from '../../hooks/useRentCalculatorState'
import { useSettings } from '../../hooks/useSettings'

const INPUT_CLASS =
  'w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500'

const CAPS = { agi: 10_000_000 } as const

function clamp(value: number, max: number): number {
  return isNaN(value) ? 0 : Math.max(0, Math.min(value, max))
}

export function RentAffordabilityCalculator() {
  const { state, updateState } = useRentCalculatorState()
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
  const result = agiNum > 0 ? maxAffordableRent({ agiAnnual: agiNum, dtiPercent: 30 }) : null

  return (
    <Card>
      <h2 className="text-lg font-semibold text-slate-200 mb-4">
        Rent Affordability Calculator
      </h2>
      <p className="text-sm text-slate-400 mb-4">
        Estimate the maximum rent you can afford using the 30% rule: rent should not exceed 30% of
        gross monthly income.
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

        {result && (
          <div className="rounded-xl border border-green-800 bg-green-900/20 p-4 space-y-2">
            <p className="text-xs text-slate-400">Max affordable rent (30% DTI)</p>
            <p className="text-2xl font-bold text-green-400">
              {formatCurrency(result.maxMonthlyRent)}/mo
            </p>
            <p className="text-xs text-slate-500">
              {result.dtiPercent}% of {formatCurrency(result.monthlyGrossIncome)}/mo gross income
            </p>
          </div>
        )}
      </div>
    </Card>
  )
}
