import { useState, useEffect, useRef } from 'react'
import { Card } from '../ui/Card'
import { formatCurrency, getCurrentMonth } from '../../utils/calculations'
import {
  evaluateAutoLoan,
  resolveDownPayment,
  maxPrincipalForPayment,
  type DownPaymentMode,
} from '../../utils/autoLoan'
import { useSettings } from '../../hooks/useSettings'
import { Check, X } from 'lucide-react'

const INPUT_CLASS =
  'w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500'

/** Caps to keep inputs realistic and avoid overflow/absurd results */
const CAPS = {
  carPrice: 2_000_000,
  downPaymentDollars: 2_000_000,
  interestRatePercent: 30,
  loanTermMonths: 96,
  monthlyIncome: 500_000,
} as const

function clamp(value: number, max: number): number {
  return isNaN(value) ? 0 : Math.max(0, Math.min(value, max))
}

export function AutoLoanCalculator() {
  const { settings } = useSettings()
  const month = getCurrentMonth()
  const monthOverride = settings[`monthlyBudget-${month}`]
  const defaultStored = settings['monthlyBudget']
  const budgetForPrefill =
    monthOverride != null
      ? parseFloat(monthOverride)
      : defaultStored != null
        ? parseFloat(defaultStored)
        : 0
  const [carPrice, setCarPrice] = useState('')
  const [downPaymentMode, setDownPaymentMode] = useState<DownPaymentMode>('percent')
  const [downPaymentDollars, setDownPaymentDollars] = useState('')
  const [downPaymentPercent, setDownPaymentPercent] = useState('20')
  const [interestRate, setInterestRate] = useState('')
  const [loanTermMonths, setLoanTermMonths] = useState('36')
  const [monthlyIncome, setMonthlyIncome] = useState('')
  const prefilled = useRef(false)
  useEffect(() => {
    if (!prefilled.current && monthlyIncome === '' && budgetForPrefill > 0) {
      prefilled.current = true
      setMonthlyIncome(String(Math.round(budgetForPrefill)))
    }
  }, [budgetForPrefill, monthlyIncome])

  const carPriceNum = clamp(parseFloat(carPrice) || 0, CAPS.carPrice)
  const downPaymentDollarsNum = clamp(parseFloat(downPaymentDollars) || 0, CAPS.downPaymentDollars)
  const downPaymentPercentNum = Math.max(0, Math.min(100, parseFloat(downPaymentPercent) || 0))
  const interestRateNum = clamp(parseFloat(interestRate) || 0, CAPS.interestRatePercent)
  const loanTermNum = Math.max(1, Math.min(CAPS.loanTermMonths, Math.round(parseFloat(loanTermMonths) || 0)))
  const monthlyIncomeNum = clamp(parseFloat(monthlyIncome) || 0, CAPS.monthlyIncome)

  const result =
    carPriceNum > 0 && loanTermNum > 0
      ? evaluateAutoLoan({
          carPrice: carPriceNum,
          downPaymentDollars: downPaymentDollarsNum,
          downPaymentPercent: downPaymentPercentNum,
          downPaymentMode,
          interestRatePercent: interestRateNum,
          loanTermMonths: loanTermNum,
          monthlyIncome: monthlyIncomeNum,
        })
      : null

  const downPaymentAmount =
    carPriceNum > 0
      ? resolveDownPayment(
          carPriceNum,
          downPaymentDollarsNum,
          downPaymentPercentNum,
          downPaymentMode
        )
      : 0

  return (
    <Card>
      <h2 className="text-lg font-semibold text-slate-200 mb-4">
        Auto Calculator (20/3/8 Rule)
      </h2>
      <p className="text-sm text-slate-400 mb-4">
        Evaluate car purchases against the 20/3/8 rule: 20% down, 3-year loan, payment ≤ 8% of income.
      </p>

      <div className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm text-slate-400">Car price ($)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            max={CAPS.carPrice}
            value={carPrice}
            onChange={(e) => setCarPrice(e.target.value)}
            onBlur={(e) => {
              const v = parseFloat(e.target.value)
              if (e.target.value !== '' && !isNaN(v) && v > CAPS.carPrice)
                setCarPrice(String(CAPS.carPrice))
            }}
            placeholder="35000"
            className={INPUT_CLASS}
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm text-slate-400">Down payment</label>
          <div className="flex gap-2 rounded-xl bg-slate-800 p-1 mb-2">
            <button
              type="button"
              onClick={() => setDownPaymentMode('percent')}
              className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
                downPaymentMode === 'percent'
                  ? 'bg-slate-700 text-slate-100'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              %
            </button>
            <button
              type="button"
              onClick={() => setDownPaymentMode('dollar')}
              className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
                downPaymentMode === 'dollar'
                  ? 'bg-slate-700 text-slate-100'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              $
            </button>
          </div>
          {downPaymentMode === 'percent' ? (
            <input
              type="number"
              step="0.5"
              min="0"
              max="100"
              value={downPaymentPercent}
              onChange={(e) => setDownPaymentPercent(e.target.value)}
              placeholder="20"
              className={INPUT_CLASS}
            />
          ) : (
            <input
              type="number"
              step="0.01"
              min="0"
              max={CAPS.downPaymentDollars}
              value={downPaymentDollars}
              onChange={(e) => setDownPaymentDollars(e.target.value)}
              onBlur={(e) => {
                const v = parseFloat(e.target.value)
                if (e.target.value !== '' && !isNaN(v) && v > CAPS.downPaymentDollars)
                  setDownPaymentDollars(String(CAPS.downPaymentDollars))
              }}
              placeholder="7000"
              className={INPUT_CLASS}
            />
          )}
          {carPriceNum > 0 && (
            <p className="text-xs text-slate-500 mt-1">
              = {formatCurrency(downPaymentAmount)} down
            </p>
          )}
        </div>

        <div>
          <label className="mb-1.5 block text-sm text-slate-400">Interest rate (%)</label>
          <input
            type="number"
            step="0.1"
            min="0"
            max={CAPS.interestRatePercent}
            value={interestRate}
            onChange={(e) => setInterestRate(e.target.value)}
            onBlur={(e) => {
              const v = parseFloat(e.target.value)
              if (e.target.value !== '' && !isNaN(v) && v > CAPS.interestRatePercent)
                setInterestRate(String(CAPS.interestRatePercent))
            }}
            placeholder="7.5"
            className={INPUT_CLASS}
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm text-slate-400">Loan term (months)</label>
          <input
            type="number"
            step="1"
            min="1"
            max={CAPS.loanTermMonths}
            value={loanTermMonths}
            onChange={(e) => setLoanTermMonths(e.target.value)}
            onBlur={(e) => {
              const v = parseFloat(e.target.value)
              if (e.target.value !== '' && !isNaN(v)) {
                if (v > CAPS.loanTermMonths) setLoanTermMonths(String(CAPS.loanTermMonths))
                else if (v < 1) setLoanTermMonths('1')
              }
            }}
            placeholder="36"
            className={INPUT_CLASS}
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm text-slate-400">
            Monthly income ($)
            {budgetForPrefill > 0 && Math.abs((parseFloat(monthlyIncome) || 0) - budgetForPrefill) < 1 && (
              <span className="ml-2 text-xs text-slate-500">(from budget)</span>
            )}
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            max={CAPS.monthlyIncome}
            value={monthlyIncome}
            onChange={(e) => setMonthlyIncome(e.target.value)}
            onBlur={(e) => {
              const v = parseFloat(e.target.value)
              if (e.target.value !== '' && !isNaN(v) && v > CAPS.monthlyIncome)
                setMonthlyIncome(String(CAPS.monthlyIncome))
            }}
            placeholder="5000"
            className={INPUT_CLASS}
          />
        </div>

        {result && (
          <>
            <div className="rounded-xl border border-green-800 bg-green-900/20 p-4">
              <p className="text-xs text-slate-400 mb-1">Estimated monthly payment</p>
              <p className="text-2xl font-bold text-green-400">
                {formatCurrency(result.monthlyPayment)}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Principal: {formatCurrency(result.principal)}
              </p>
            </div>

            <div className="space-y-2 pt-2">
              <p className="text-sm font-medium text-slate-400">20/3/8 rule checklist</p>

              <div
                className={`flex items-start gap-3 rounded-lg px-3 py-2.5 ${
                  result.rule1.pass ? 'bg-green-500/10 border border-green-500/30' : 'bg-red-500/10 border border-red-500/30'
                }`}
              >
                {result.rule1.pass ? (
                  <Check className="h-5 w-5 shrink-0 text-green-400" strokeWidth={2} />
                ) : (
                  <X className="h-5 w-5 shrink-0 text-red-400" strokeWidth={2} />
                )}
                <div className="min-w-0">
                  <p className={`text-sm font-medium ${result.rule1.pass ? 'text-green-400' : 'text-red-400'}`}>
                    Rule 1: Down payment ≥ 20%
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {result.rule1.pass
                      ? `Pass — ${formatCurrency(result.downPaymentAmount)} meets 20% (${formatCurrency(result.rule1.required)})`
                      : `Increase down payment by ${formatCurrency(result.rule1.shortfall)} to reach 20% (${formatCurrency(result.rule1.required)})`}
                  </p>
                </div>
              </div>

              <div
                className={`flex items-start gap-3 rounded-lg px-3 py-2.5 ${
                  result.rule2.pass ? 'bg-green-500/10 border border-green-500/30' : 'bg-red-500/10 border border-red-500/30'
                }`}
              >
                {result.rule2.pass ? (
                  <Check className="h-5 w-5 shrink-0 text-green-400" strokeWidth={2} />
                ) : (
                  <X className="h-5 w-5 shrink-0 text-red-400" strokeWidth={2} />
                )}
                <div className="min-w-0">
                  <p className={`text-sm font-medium ${result.rule2.pass ? 'text-green-400' : 'text-red-400'}`}>
                    Rule 2: Term ≤ {result.rule2.maxMonths} months
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {result.rule2.pass
                      ? `Pass — ${loanTermNum} months is within limit`
                      : `Reduce loan term by ${result.rule2.excess} months (max ${result.rule2.maxMonths})`}
                  </p>
                </div>
              </div>

              <div
                className={`flex items-start gap-3 rounded-lg px-3 py-2.5 ${
                  result.rule3.pass ? 'bg-green-500/10 border border-green-500/30' : 'bg-red-500/10 border border-red-500/30'
                }`}
              >
                {result.rule3.pass ? (
                  <Check className="h-5 w-5 shrink-0 text-green-400" strokeWidth={2} />
                ) : (
                  <X className="h-5 w-5 shrink-0 text-red-400" strokeWidth={2} />
                )}
                <div className="min-w-0">
                  <p className={`text-sm font-medium ${result.rule3.pass ? 'text-green-400' : 'text-red-400'}`}>
                    Rule 3: Payment ≤ 8% of income
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {result.rule3.pass
                      ? `Pass — ${formatCurrency(result.monthlyPayment)} ≤ 8% (${formatCurrency(result.rule3.maxPayment)})`
                      : monthlyIncomeNum > 0
                        ? `Reduce payment by ${formatCurrency(result.rule3.excess)} — need income ≥ ${formatCurrency(result.monthlyPayment / 0.08)}/mo, or lower price/down/term`
                        : 'Enter monthly income to check'}
                  </p>
                </div>
              </div>
            </div>
          </>
        )}

        {monthlyIncomeNum > 0 && loanTermNum > 0 && (
          <div className="mt-6 pt-4 border-t border-slate-700 space-y-3">
            <p className="text-sm font-medium text-slate-400">
              Max affordable estimates (8% of income = {formatCurrency(monthlyIncomeNum * 0.08)}/mo)
            </p>
            <p className="text-xs text-slate-500">
              Max loan at each rate for {loanTermNum} months. Add your down payment for max car price.
            </p>
            <div className="rounded-lg border border-slate-700 bg-slate-800/50 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left py-2 px-3 text-slate-400 font-medium">Rate</th>
                    <th className="text-right py-2 px-3 text-slate-400 font-medium">Max loan</th>
                    <th className="text-right py-2 px-3 text-slate-400 font-medium">Max car price</th>
                  </tr>
                </thead>
                <tbody>
                  {[2, 4, 6, 8, 10, 12].map((rate) => {
                    const maxPrincipal = maxPrincipalForPayment(
                      monthlyIncomeNum * 0.08,
                      rate,
                      loanTermNum
                    )
                    const maxCarPrice =
                      downPaymentMode === 'dollar'
                        ? maxPrincipal + downPaymentDollarsNum
                        : downPaymentPercentNum < 100
                          ? maxPrincipal / (1 - downPaymentPercentNum / 100)
                          : maxPrincipal
                    return (
                      <tr key={rate} className="border-b border-slate-700/50 last:border-0">
                        <td className="py-2 px-3 text-slate-300">{rate}%</td>
                        <td className="py-2 px-3 text-right text-slate-200 font-medium tabular-nums">
                          {formatCurrency(maxPrincipal)}
                        </td>
                        <td className="py-2 px-3 text-right text-green-400 font-medium tabular-nums">
                          {formatCurrency(maxCarPrice)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}
