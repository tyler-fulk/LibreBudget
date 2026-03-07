import { useState } from 'react'
import { format } from 'date-fns'
import {
  XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, ReferenceLine, Area, AreaChart,
} from 'recharts'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { EncryptionBadge } from '../components/ui/EncryptionBadge'
import { Modal } from '../components/ui/Modal'
import { useCreditScores } from '../hooks/useCreditScores'

const SCORE_RANGES = [
  { label: 'Exceptional', min: 800, max: 850, color: '#22c55e' },
  { label: 'Very Good', min: 740, max: 799, color: '#84cc16' },
  { label: 'Good', min: 670, max: 739, color: '#eab308' },
  { label: 'Fair', min: 580, max: 669, color: '#f97316' },
  { label: 'Poor', min: 300, max: 579, color: '#ef4444' },
]

const SOURCE_OPTIONS = [
  'Credit Karma',
  'Experian',
  'Equifax',
  'TransUnion',
  'Bank / Credit Card',
  'Annual Credit Report',
  'Other',
]

function getScoreRating(score: number) {
  return SCORE_RANGES.find((r) => score >= r.min && score <= r.max) ?? SCORE_RANGES[4]
}

export default function CreditScore() {
  const { scores, addScore, deleteScore, latest, change, highest, lowest } = useCreditScores()
  const [showModal, setShowModal] = useState(false)
  const [score, setScore] = useState('')
  const [source, setSource] = useState(SOURCE_OPTIONS[0])
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'))

  const handleAdd = async () => {
    const val = parseInt(score)
    if (isNaN(val) || val < 300 || val > 850) return
    await addScore({ score: val, source, date })
    setShowModal(false)
    setScore('')
  }

  const chartData = scores.map((s) => ({
    date: format(new Date(s.date), 'MMM yy'),
    score: s.score,
    fullDate: s.date,
  }))

  const rating = latest ? getScoreRating(latest.score) : null

  const tooltipStyle = {
    backgroundColor: '#1e293b',
    border: '1px solid #334155',
    borderRadius: '12px',
    fontSize: '13px',
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">Credit Score</h1>
            <EncryptionBadge />
          </div>
          <p className="text-sm text-slate-400">Track your credit over time</p>
        </div>
        <Button onClick={() => setShowModal(true)}>+ Add Score</Button>
      </div>

      {/* Current score display */}
      {latest ? (
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 mb-1">Current Score</p>
              <div className="flex items-baseline gap-3">
                <p className="text-5xl font-bold" style={{ color: rating?.color }}>
                  {latest.score}
                </p>
                {change !== null && change !== 0 && (
                  <span className={`text-sm font-medium ${change > 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {change > 0 ? '↑' : '↓'} {Math.abs(change)} pts
                  </span>
                )}
              </div>
              <p className="text-sm mt-1" style={{ color: rating?.color }}>
                {rating?.label}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {latest.source} · {format(new Date(latest.date), 'MMM d, yyyy')}
              </p>
            </div>

            {/* Score gauge */}
            <div className="hidden sm:block w-36">
              <div className="flex gap-0.5 h-3 rounded-full overflow-hidden">
                {SCORE_RANGES.slice().reverse().map((r) => (
                  <div key={r.label} className="flex-1" style={{ backgroundColor: r.color, opacity: latest.score >= r.min ? 1 : 0.2 }} />
                ))}
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-[10px] text-slate-600">300</span>
                <span className="text-[10px] text-slate-600">850</span>
              </div>
            </div>
          </div>
        </Card>
      ) : (
        <Card className="text-center">
          <p className="text-slate-400 py-8">
            No credit scores logged yet. Add your first score to start tracking!
          </p>
        </Card>
      )}

      {/* Stats */}
      {scores.length > 1 && (
        <div className="grid gap-4 grid-cols-3">
          <Card>
            <p className="text-xs text-slate-500">Highest</p>
            <p className="text-2xl font-bold text-green-400">{highest}</p>
          </Card>
          <Card>
            <p className="text-xs text-slate-500">Lowest</p>
            <p className="text-2xl font-bold text-orange-400">{lowest}</p>
          </Card>
          <Card>
            <p className="text-xs text-slate-500">Entries</p>
            <p className="text-2xl font-bold text-slate-200">{scores.length}</p>
          </Card>
        </div>
      )}

      {/* Chart */}
      {scores.length >= 2 && (
        <Card>
          <h3 className="mb-4 text-sm font-medium text-slate-400">Score History</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={{ stroke: '#334155' }} />
                <YAxis
                  domain={[
                    Math.max(300, (lowest ?? 300) - 30),
                    Math.min(850, (highest ?? 850) + 30),
                  ]}
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                  axisLine={{ stroke: '#334155' }}
                />
                <Tooltip contentStyle={tooltipStyle} />
                <ReferenceLine y={800} stroke="#22c55e" strokeDasharray="3 3" label={{ value: 'Exceptional', fill: '#22c55e40', fontSize: 10 }} />
                <ReferenceLine y={740} stroke="#84cc1640" strokeDasharray="3 3" />
                <Area type="monotone" dataKey="score" stroke="#22c55e" strokeWidth={2.5}
                  fill="url(#scoreGradient)" dot={{ r: 4, fill: '#22c55e', stroke: '#0f172a', strokeWidth: 2 }}
                  activeDot={{ r: 6 }} name="Score" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {/* Score range guide */}
      <Card>
        <h3 className="mb-3 text-sm font-medium text-slate-400">Score Ranges</h3>
        <div className="space-y-2">
          {SCORE_RANGES.map((r) => (
            <div key={r.label} className="flex items-center gap-3">
              <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: r.color }} />
              <span className="text-sm text-slate-300 w-24">{r.label}</span>
              <span className="text-xs text-slate-500">{r.min}–{r.max}</span>
              {latest && latest.score >= r.min && latest.score <= r.max && (
                <span className="text-xs font-medium" style={{ color: r.color }}>← You</span>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* History list */}
      {scores.length > 0 && (
        <Card>
          <h3 className="mb-3 text-sm font-medium text-slate-400">All Entries</h3>
          <div className="space-y-2">
            {[...scores].reverse().map((s, i, arr) => {
              const prev = arr[i + 1]
              const diff = prev ? s.score - prev.score : null
              const r = getScoreRating(s.score)
              return (
                <div key={s.id} className="flex items-center gap-3 rounded-xl bg-slate-800/50 p-3 group">
                  <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: r.color }} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-200">{s.score}</span>
                      {diff !== null && diff !== 0 && (
                        <span className={`text-xs ${diff > 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {diff > 0 ? '+' : ''}{diff}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500">
                      {s.source} · {format(new Date(s.date), 'MMM d, yyyy')}
                    </p>
                  </div>
                  <button onClick={() => s.id && deleteScore(s.id)}
                    className="rounded-lg p-1.5 text-slate-500 hover:bg-red-900/30 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {/* Add score modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title="Add Credit Score">
        <div className="space-y-4">
          <div>
            <label className="mb-1 flex items-center gap-2 text-sm text-slate-400">
              Score (300–850)
              <EncryptionBadge />
            </label>
            <input
              type="number" min="300" max="850" value={score}
              onChange={(e) => setScore(e.target.value)}
              placeholder="740"
              className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-xl font-bold text-slate-100 placeholder-slate-600 focus:border-green-500 focus:outline-none text-center"
              autoFocus
            />
            {score && (parseInt(score) < 300 || parseInt(score) > 850) && (
              <p className="text-xs text-red-400 mt-1">Score must be between 300 and 850</p>
            )}
          </div>
          <div>
            <label className="mb-1 flex items-center gap-2 text-sm text-slate-400">
              Source
              <EncryptionBadge />
            </label>
            <select value={source} onChange={(e) => setSource(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-slate-100 focus:border-green-500 focus:outline-none">
              {SOURCE_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 flex items-center gap-2 text-sm text-slate-400">
              Date
              <EncryptionBadge />
            </label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-slate-100 focus:border-green-500 focus:outline-none" />
          </div>
          <Button onClick={handleAdd} className="w-full"
            disabled={!score || parseInt(score) < 300 || parseInt(score) > 850}>
            Save Score
          </Button>
        </div>
      </Modal>
    </div>
  )
}
