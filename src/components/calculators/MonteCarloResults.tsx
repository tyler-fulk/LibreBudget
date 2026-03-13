import { useMemo } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, ReferenceLine,
} from 'recharts'
import { Card } from '../ui/Card'
import { formatCurrency } from '../../utils/calculations'
import type { MonteCarloResult, YearlyPercentile } from '../../utils/monteCarlo'
import { ShieldCheck, ShieldAlert, TrendingDown, TrendingUp, Minus, AlertTriangle } from 'lucide-react'
import { InfoTip } from '../ui/InfoTip'

interface Props {
  result: MonteCarloResult
  currentAge: number
  retirementAge: number
}

function successConfig(p: number) {
  if (p >= 80) return {
    color: 'text-green-400',
    bg: 'bg-green-500/5',
    border: 'border-green-500/20',
    ring: 'stroke-green-500',
    ringBg: 'stroke-green-500/10',
    icon: ShieldCheck,
    label: 'Strong',
  }
  if (p >= 50) return {
    color: 'text-yellow-400',
    bg: 'bg-yellow-500/5',
    border: 'border-yellow-500/20',
    ring: 'stroke-yellow-500',
    ringBg: 'stroke-yellow-500/10',
    icon: ShieldAlert,
    label: 'At Risk',
  }
  return {
    color: 'text-red-400',
    bg: 'bg-red-500/5',
    border: 'border-red-500/20',
    ring: 'stroke-red-500',
    ringBg: 'stroke-red-500/10',
    icon: AlertTriangle,
    label: 'Unlikely',
  }
}

export function MonteCarloResults({ result, currentAge, retirementAge }: Props) {
  const { probabilityOfSuccess, percentiles, failureYear, trialCount, yearlyPercentiles } = result
  const cfg = successConfig(probabilityOfSuccess)
  const StatusIcon = cfg.icon

  // Map engine-computed yearly percentiles (from ALL trials) into age-indexed fan chart data
  const fanData = useMemo(() =>
    yearlyPercentiles.map((yp: YearlyPercentile) => ({
      age: currentAge + yp.year,
      p10: yp.p10, p25: yp.p25, p50: yp.p50, p75: yp.p75, p90: yp.p90,
    })),
    [yearlyPercentiles, currentAge],
  )

  const formatAxis = (v: number) => {
    if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`
    if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`
    return `$${v.toFixed(0)}`
  }

  const tooltipFormatter = (value: number | undefined) => value != null ? formatCurrency(value) : ''

  // SVG ring gauge
  const ringSize = 88
  const strokeW = 6
  const radius = (ringSize - strokeW) / 2
  const circumference = 2 * Math.PI * radius
  const dashOffset = circumference - (probabilityOfSuccess / 100) * circumference

  return (
    <div className="space-y-4">
      {/* Hero: Success probability + Percentiles */}
      <Card>
        <div className="flex flex-col sm:flex-row items-center gap-5">
          {/* Ring gauge */}
          <div className="relative shrink-0">
            <svg width={ringSize} height={ringSize} className="-rotate-90">
              <circle cx={ringSize / 2} cy={ringSize / 2} r={radius}
                fill="none" strokeWidth={strokeW} className={cfg.ringBg} />
              <circle cx={ringSize / 2} cy={ringSize / 2} r={radius}
                fill="none" strokeWidth={strokeW} className={cfg.ring}
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
                style={{ transition: 'stroke-dashoffset 0.6s ease' }} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-lg font-bold ${cfg.color}`}>{probabilityOfSuccess.toFixed(0)}%</span>
            </div>
          </div>

          {/* Labels */}
          <div className="text-center sm:text-left flex-1 min-w-0">
            <div className="flex items-center gap-2 justify-center sm:justify-start mb-1">
              <StatusIcon size={16} className={cfg.color} />
              <p className={`text-sm font-semibold ${cfg.color}`}>{cfg.label}</p>
              <InfoTip>
                <p className="text-xs text-slate-300 leading-relaxed">
                  The percentage of simulated scenarios where your portfolio balance stays above $0 through retirement.
                </p>
                <p className="text-xs text-slate-400 leading-relaxed mt-1.5">
                  80%+ is generally considered strong. 50-80% means your plan is at risk and may need adjustments (save more, spend less, or retire later). Below 50% suggests significant changes are needed.
                </p>
                <p className="text-xs text-slate-500 leading-relaxed mt-1.5">
                  Each scenario randomly varies market returns, inflation, and optionally lifespan using Geometric Brownian Motion. Early market crashes in retirement have an outsized impact (sequence-of-returns risk).
                </p>
              </InfoTip>
            </div>
            <p className="text-xs text-slate-500">
              {trialCount.toLocaleString()} simulations &mdash; your portfolio survives through retirement in {probabilityOfSuccess.toFixed(1)}% of scenarios
              {probabilityOfSuccess < 100 && (<>, depletes in {(100 - probabilityOfSuccess).toFixed(1)}%</>)}
            </p>
            {failureYear !== null && (
              <p className="text-xs text-red-400/80 mt-1 flex items-center gap-1 justify-center sm:justify-start">
                <AlertTriangle size={12} />
                Median fund depletion at age {failureYear} in failed scenarios
              </p>
            )}
          </div>
        </div>

        {/* Percentile cards */}
        <div className="flex items-center gap-2 mt-5 pt-5 border-t border-slate-800 mb-3">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Ending Balance Percentiles</p>
          <InfoTip>
            <p className="text-xs text-slate-300 leading-relaxed">
              Your projected portfolio balance at the end of the simulation, sorted across all trials.
            </p>
            <p className="text-xs text-slate-400 leading-relaxed mt-1.5">
              <span className="font-medium text-red-400">10th percentile:</span> Only 10% of scenarios ended worse than this. Your "bad luck" outcome.
            </p>
            <p className="text-xs text-slate-400 leading-relaxed mt-1">
              <span className="font-medium text-slate-300">50th percentile (median):</span> Half of scenarios ended above this, half below. Your most likely outcome. Should roughly align with a fixed-rate projection.
            </p>
            <p className="text-xs text-slate-400 leading-relaxed mt-1">
              <span className="font-medium text-green-400">90th percentile:</span> Only 10% of scenarios ended better than this. Your "good luck" outcome.
            </p>
          </InfoTip>
        </div>
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <div className="rounded-xl border border-red-500/15 bg-red-500/5 p-2 sm:p-3 text-center min-w-0">
            <div className="flex items-center justify-center gap-1 mb-1.5">
              <TrendingDown size={12} className="text-red-400 shrink-0" />
              <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">10th pctl</p>
            </div>
            <p className="text-xs sm:text-lg font-bold text-red-400 truncate">{formatCurrency(percentiles.p10)}</p>
            <p className="text-[10px] text-slate-600 mt-0.5 hidden sm:block">Pessimistic</p>
          </div>
          <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-2 sm:p-3 text-center min-w-0">
            <div className="flex items-center justify-center gap-1 mb-1.5">
              <Minus size={12} className="text-slate-400 shrink-0" />
              <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">Median</p>
            </div>
            <p className="text-xs sm:text-lg font-bold text-slate-200 truncate">{formatCurrency(percentiles.p50)}</p>
            <p className="text-[10px] text-slate-600 mt-0.5 hidden sm:block">Most likely</p>
          </div>
          <div className="rounded-xl border border-green-500/15 bg-green-500/5 p-2 sm:p-3 text-center min-w-0">
            <div className="flex items-center justify-center gap-1 mb-1.5">
              <TrendingUp size={12} className="text-green-400 shrink-0" />
              <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">90th pctl</p>
            </div>
            <p className="text-xs sm:text-lg font-bold text-green-400 truncate">{formatCurrency(percentiles.p90)}</p>
            <p className="text-[10px] text-slate-600 mt-0.5 hidden sm:block">Optimistic</p>
          </div>
        </div>
      </Card>

      {/* Fan chart */}
      {fanData.length > 0 && (
        <Card>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-slate-300">Portfolio Projection</h3>
                <InfoTip>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    A fan chart showing the range of portfolio balances across all simulations at each age. Wider bands mean more uncertainty.
                  </p>
                  <p className="text-xs text-slate-400 leading-relaxed mt-1.5">
                    The green line is the median (50th percentile). The inner band covers the 25th-75th percentile range (middle 50% of outcomes). The outer band covers the 10th-90th percentile range (middle 80%).
                  </p>
                  <p className="text-xs text-slate-500 leading-relaxed mt-1.5">
                    The purple dashed line marks your retirement age. Notice how the fan widens over time — this reflects compounding uncertainty, and how early retirement crashes can permanently deplete the portfolio (sequence-of-returns risk).
                  </p>
                </InfoTip>
              </div>
              <p className="text-xs text-slate-600">Outcome bands across all simulations</p>
            </div>
            <div className="flex items-center gap-3 text-[10px] text-slate-500">
              <span className="flex items-center gap-1">
                <span className="inline-block w-2.5 h-2.5 rounded-sm bg-green-500/20 border border-green-500/30" /> 25-75th
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block w-2.5 h-2.5 rounded-sm bg-green-500/8 border border-green-500/15" /> 10-90th
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block w-5 h-0.5 bg-green-500 rounded-full" /> Median
              </span>
            </div>
          </div>
          <div className="h-64 sm:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={fanData} margin={{ top: 10, right: 10, bottom: 5, left: 0 }}>
                <defs>
                  <linearGradient id="mc-outer" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#22c55e" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#22c55e" stopOpacity={0.05} />
                  </linearGradient>
                  <linearGradient id="mc-inner" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#22c55e" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#22c55e" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="age"
                  tick={{ fill: '#64748b', fontSize: 11 }}
                  axisLine={{ stroke: '#1e293b' }}
                  tickLine={{ stroke: '#1e293b' }} />
                <YAxis tickFormatter={formatAxis}
                  tick={{ fill: '#64748b', fontSize: 11 }}
                  axisLine={{ stroke: '#1e293b' }}
                  tickLine={{ stroke: '#1e293b' }}
                  width={55} />
                <Tooltip
                  formatter={tooltipFormatter}
                  labelFormatter={(v) => `Age ${v}`}
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    border: '1px solid #1e293b',
                    borderRadius: '0.75rem',
                    fontSize: '12px',
                    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.3)',
                  }}
                  itemStyle={{ color: '#e2e8f0' }}
                  labelStyle={{ color: '#64748b' }} />
                {retirementAge > currentAge && (
                  <ReferenceLine x={retirementAge} stroke="#8b5cf6" strokeDasharray="4 4" strokeWidth={1.5}
                    label={{ value: 'Retire', position: 'top', fill: '#8b5cf6', fontSize: 10 }} />
                )}
                {/* 10-90 band */}
                <Area type="monotone" dataKey="p90" stroke="#22c55e" strokeOpacity={0.15} strokeWidth={1} fill="url(#mc-outer)" name="90th Percentile" />
                <Area type="monotone" dataKey="p10" stroke="#22c55e" strokeOpacity={0.15} strokeWidth={1} fill="#0f172a" fillOpacity={1} name="10th Percentile" />
                {/* 25-75 band */}
                <Area type="monotone" dataKey="p75" stroke="#22c55e" strokeOpacity={0.25} strokeWidth={1} fill="url(#mc-inner)" name="75th Percentile" />
                <Area type="monotone" dataKey="p25" stroke="#22c55e" strokeOpacity={0.25} strokeWidth={1} fill="#0f172a" fillOpacity={1} name="25th Percentile" />
                {/* Median */}
                <Area type="monotone" dataKey="p50" stroke="#22c55e" strokeWidth={2} fill="none" name="Median"
                  dot={false} activeDot={{ r: 4, fill: '#22c55e', stroke: '#0f172a', strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}
    </div>
  )
}
