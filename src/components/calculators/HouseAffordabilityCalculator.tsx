import { useEffect, useRef } from 'react'
import { Card } from '../ui/Card'
import { formatCurrency } from '../../utils/calculations'
import { maxAffordableHomePrice } from '../../utils/houseAffordability'
import { useHouseCalculatorState } from '../../hooks/useHouseCalculatorState'
import { getPropertyTaxRateFromZip } from '../../data/propertyTaxRates'
import { useSettings } from '../../hooks/useSettings'
import { Home, DollarSign, Percent, Building2 } from 'lucide-react'

const INPUT =
  'w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500'

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
    monthOverride != null ? parseFloat(monthOverride)
      : defaultStored != null ? parseFloat(defaultStored) : 0

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
          agiAnnual: agiNum, downPaymentDollars: downPaymentDollarsNum,
          downPaymentPercent: downPaymentPercentNum, downPaymentMode: state.downPaymentMode,
          interestRatePercent: interestRateNum, loanTermYears: loanTermYearsNum,
          propertyTaxRateAnnual: propertyTaxRate, homeInsuranceRateAnnual: homeInsuranceRate,
          hoaMonthly: hoaDuesNum, dtiPercent: 28,
        })
      : null

  return (
    <div className="space-y-4">
      {/* Income & Loan */}
      <Card data-tour="home-income">
        <div className="flex items-start gap-3 mb-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10">
            <Home size={20} className="text-emerald-400" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-slate-200">Income & Loan</h2>
            <p className="text-xs text-slate-500 leading-relaxed">28% front-end DTI rule for housing costs</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm text-slate-400">Annual gross income ($)</label>
            <input type="number" step="1000" min="0" max={CAPS.agi} value={state.agi}
              onChange={(e) => updateState({ agi: e.target.value })}
              onBlur={(e) => { const v = parseFloat(e.target.value); if (e.target.value !== '' && !isNaN(v) && v > CAPS.agi) updateState({ agi: String(CAPS.agi) }) }}
              placeholder={budgetForPrefill > 0 ? String(Math.round(budgetForPrefill * 12)) : '120000'}
              className={INPUT} />
            {budgetForPrefill > 0 && (
              <p className="text-xs text-slate-600 mt-1">~{formatCurrency(budgetForPrefill * 12)}/year from monthly budget</p>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-sm text-slate-400">Down payment</label>
            <div className="flex gap-2 rounded-xl bg-slate-800 p-1 mb-2">
              {(['percent', 'dollar'] as const).map((m) => (
                <button key={m} type="button" onClick={() => updateState({ downPaymentMode: m })}
                  className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${state.downPaymentMode === m ? 'bg-slate-600 text-slate-100' : 'text-slate-400 hover:text-slate-200'}`}>
                  {m === 'percent' ? '%' : '$'}
                </button>
              ))}
            </div>
            {state.downPaymentMode === 'percent' ? (
              <input type="number" step="0.5" min="0" max="100" value={state.downPaymentPercent}
                onChange={(e) => updateState({ downPaymentPercent: e.target.value })}
                placeholder="20" className={INPUT} />
            ) : (
              <input type="number" step="1000" min="0" max={CAPS.downPaymentDollars} value={state.downPaymentDollars}
                onChange={(e) => updateState({ downPaymentDollars: e.target.value })}
                onBlur={(e) => { const v = parseFloat(e.target.value); if (e.target.value !== '' && !isNaN(v) && v > CAPS.downPaymentDollars) updateState({ downPaymentDollars: String(CAPS.downPaymentDollars) }) }}
                placeholder="50000" className={INPUT} />
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm text-slate-400">Interest rate (%)</label>
              <input type="number" step="0.1" min="0" max={CAPS.interestRatePercent} value={state.interestRate}
                onChange={(e) => updateState({ interestRate: e.target.value })}
                onBlur={(e) => { const v = parseFloat(e.target.value); if (e.target.value !== '' && !isNaN(v) && v > CAPS.interestRatePercent) updateState({ interestRate: String(CAPS.interestRatePercent) }) }}
                placeholder="7" className={INPUT} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm text-slate-400">Loan term (years)</label>
              <input type="number" step="1" min="1" max={CAPS.loanTermYears} value={state.loanTermYears}
                onChange={(e) => updateState({ loanTermYears: e.target.value })}
                onBlur={(e) => { const v = parseFloat(e.target.value); if (e.target.value !== '' && !isNaN(v)) { if (v > CAPS.loanTermYears) updateState({ loanTermYears: String(CAPS.loanTermYears) }); else if (v < 1) updateState({ loanTermYears: '1' }) } }}
                placeholder="30" className={INPUT} />
            </div>
          </div>
        </div>
      </Card>

      {/* Costs */}
      <Card data-tour="home-costs">
        <div className="flex items-start gap-3 mb-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10">
            <Percent size={20} className="text-amber-400" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-slate-200">Recurring Costs</h2>
            <p className="text-xs text-slate-500 leading-relaxed">Property tax, insurance, and HOA</p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Property tax */}
          <div>
            <label className="mb-1.5 block text-sm text-slate-400">Property tax</label>
            <div className="flex gap-2 rounded-xl bg-slate-800 p-1 mb-2">
              {(['zip', 'manual'] as const).map((m) => (
                <button key={m} type="button" onClick={() => updateState({ propertyTaxSource: m })}
                  className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${state.propertyTaxSource === m ? 'bg-slate-600 text-slate-100' : 'text-slate-400 hover:text-slate-200'}`}>
                  {m === 'zip' ? 'Estimate from ZIP' : 'Manual %'}
                </button>
              ))}
            </div>
            {state.propertyTaxSource === 'zip' ? (
              <>
                <input type="text" inputMode="numeric" maxLength={5} value={state.zipCode}
                  onChange={(e) => updateState({ zipCode: e.target.value.replace(/\D/g, '').slice(0, 5) })}
                  placeholder="12345" className={INPUT} />
                {state.zipCode.length >= 3 && (
                  <p className="text-xs text-slate-500 mt-1">Est. rate: {(propertyTaxRate * 100).toFixed(2)}%/year</p>
                )}
                <p className="text-xs text-slate-600 mt-1">Based on first 3 digits. Use Manual % for more accuracy.</p>
              </>
            ) : (
              <input type="number" step="0.1" min="0" max={CAPS.propertyTaxPercent} value={state.propertyTaxManual}
                onChange={(e) => updateState({ propertyTaxManual: e.target.value })}
                onBlur={(e) => { const v = parseFloat(e.target.value); if (e.target.value !== '' && !isNaN(v) && v > CAPS.propertyTaxPercent) updateState({ propertyTaxManual: String(CAPS.propertyTaxPercent) }) }}
                placeholder="1.2" className={INPUT} />
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm text-slate-400">Home insurance (%/year)</label>
              <input type="number" step="0.05" min="0" max={CAPS.homeInsurancePercent} value={state.homeInsuranceRate}
                onChange={(e) => updateState({ homeInsuranceRate: e.target.value })}
                onBlur={(e) => { const v = parseFloat(e.target.value); if (e.target.value !== '' && !isNaN(v) && v > CAPS.homeInsurancePercent) updateState({ homeInsuranceRate: String(CAPS.homeInsurancePercent) }) }}
                placeholder="0.35" className={INPUT} />
              <p className="text-xs text-slate-600 mt-1">Typical: 0.2-0.5%</p>
            </div>
            <div>
              <label className="mb-1.5 block text-sm text-slate-400">HOA dues ($/mo)</label>
              <input type="number" step="10" min="0" max={CAPS.hoaDues} value={state.hoaDues}
                onChange={(e) => updateState({ hoaDues: e.target.value })}
                onBlur={(e) => { const v = parseFloat(e.target.value); if (e.target.value !== '' && !isNaN(v) && v > CAPS.hoaDues) updateState({ hoaDues: String(CAPS.hoaDues) }) }}
                placeholder="0" className={INPUT} />
            </div>
          </div>
        </div>
      </Card>

      {/* Result */}
      {result && result.maxAffordablePrice > 0 && (
        <Card data-tour="home-result">
          <div className="flex items-start gap-3 mb-5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-500/10">
              <Building2 size={20} className="text-green-400" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-slate-200">Affordability Result</h2>
              <p className="text-xs text-slate-500 leading-relaxed">Based on 28% DTI front-end rule</p>
            </div>
          </div>

          {/* Max price */}
          <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-5 mb-5">
            <div className="flex items-center gap-2 mb-1.5">
              <DollarSign size={14} className="text-green-400" />
              <p className="text-xs text-slate-400">Max affordable home price</p>
            </div>
            <p className="text-3xl font-bold text-green-400">{formatCurrency(result.maxAffordablePrice)}</p>
            <div className="flex gap-4 mt-2 text-xs text-slate-500">
              <span>Down: {formatCurrency(result.downPaymentAmount)}</span>
              <span>Loan: {formatCurrency(result.loanAmount)}</span>
            </div>
          </div>

          {/* Monthly breakdown */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Percent size={14} className="text-slate-500" />
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Monthly Breakdown</p>
            </div>
            <div className="space-y-2">
              {[
                { label: 'Principal & Interest', value: result.monthlyPrincipalInterest, color: 'text-slate-300' },
                { label: 'Property Tax', value: result.monthlyPropertyTax, color: 'text-slate-300' },
                { label: 'Insurance', value: result.monthlyInsurance, color: 'text-slate-300' },
                { label: 'HOA', value: result.monthlyHOA, color: 'text-slate-300' },
              ].map(({ label, value, color }) => (
                <div key={label} className="flex items-center justify-between rounded-lg px-3 py-2 bg-slate-800/30">
                  <span className="text-xs text-slate-500">{label}</span>
                  <span className={`text-sm font-medium tabular-nums ${color}`}>{formatCurrency(value)}</span>
                </div>
              ))}
              <div className="flex items-center justify-between rounded-xl px-4 py-3 border border-slate-700/50 bg-slate-800/50">
                <span className="text-sm font-medium text-slate-300">Total Housing</span>
                <div className="text-right">
                  <span className="text-lg font-bold text-green-400 tabular-nums">{formatCurrency(result.totalMonthlyHousing)}</span>
                  <span className="text-xs text-slate-500 ml-1.5">/mo</span>
                  <p className="text-xs text-slate-500">{result.dtiPercent.toFixed(1)}% of gross income</p>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}
