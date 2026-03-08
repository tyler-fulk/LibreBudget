import { useState } from 'react'
import { format } from 'date-fns'
import { Card } from '../components/ui/Card'
import { EncryptionBadge } from '../components/ui/EncryptionBadge'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { useDebts, calcRequiredPayment } from '../hooks/useDebts'
import { formatCurrency } from '../utils/calculations'
import { db } from '../db/database'
import type { Debt } from '../db/database'
import { Icon, DEBT_ICONS } from '../components/ui/Icon'

export default function DebtTracker() {
  const {
    debts, addDebt, deleteDebt, updateDebt,
    totalDebt, totalMinPayment,
    getPayoffSchedule, getSnowballOrder, getAvalancheOrder, getEffectivePayment,
  } = useDebts()

  const [showModal, setShowModal] = useState(false)
  const [editingDebt, setEditingDebt] = useState<Debt | null>(null)
  const [showPayment, setShowPayment] = useState<number | null>(null)
  const [strategy, setStrategy] = useState<'snowball' | 'avalanche'>('avalanche')

  const [name, setName] = useState('')
  const [icon, setIcon] = useState('CreditCard')
  const [balance, setBalance] = useState('')
  const [rate, setRate] = useState('')
  const [minPayment, setMinPayment] = useState('')
  const [targetPayoffDate, setTargetPayoffDate] = useState('')
  const [targetMonthlyPayment, setTargetMonthlyPayment] = useState('')
  const [dueDay, setDueDay] = useState('')
  const [notes, setNotes] = useState('')
  const [annualFee, setAnnualFee] = useState('')
  const [paymentAmount, setPaymentAmount] = useState('')

  const resetForm = () => {
    setName('')
    setIcon('CreditCard')
    setBalance('')
    setRate('')
    setMinPayment('')
    setTargetPayoffDate('')
    setTargetMonthlyPayment('')
    setDueDay('')
    setNotes('')
    setAnnualFee('')
    setEditingDebt(null)
  }

  const openEdit = (debt: Debt) => {
    setEditingDebt(debt)
    setName(debt.name)
    setIcon(debt.icon || 'TrendingDown')
    setBalance(String(debt.balance))
    setRate(String(debt.interestRate))
    setMinPayment(String(debt.minimumPayment))
    setTargetPayoffDate(debt.targetPayoffDate ?? '')
    setTargetMonthlyPayment(debt.targetMonthlyPayment != null ? String(debt.targetMonthlyPayment) : '')
    setDueDay(debt.dueDay != null ? String(debt.dueDay) : '')
    setNotes(debt.notes ?? '')
    setAnnualFee(debt.annualFee != null ? String(debt.annualFee) : '')
    setShowModal(true)
  }

  const handleAdd = async () => {
    if (!name.trim() || !balance || !minPayment) return
    await addDebt({
      name: name.trim(),
      icon,
      balance: parseFloat(balance),
      interestRate: parseFloat(rate || '0'),
      minimumPayment: parseFloat(minPayment),
      targetPayoffDate: targetPayoffDate || undefined,
      targetMonthlyPayment: targetMonthlyPayment ? parseFloat(targetMonthlyPayment) : undefined,
      dueDay: dueDay ? Math.min(31, Math.max(1, parseInt(dueDay, 10))) : undefined,
      notes: notes.trim() || undefined,
      annualFee: icon === 'CreditCard' && annualFee ? parseFloat(annualFee) : undefined,
    })
    setShowModal(false)
    resetForm()
  }

  const handleUpdate = async () => {
    if (!editingDebt?.id || !name.trim() || !balance || !minPayment) return
    await updateDebt(editingDebt.id, {
      name: name.trim(),
      icon,
      balance: parseFloat(balance),
      interestRate: parseFloat(rate || '0'),
      minimumPayment: parseFloat(minPayment),
      targetPayoffDate: targetPayoffDate || undefined,
      targetMonthlyPayment: targetMonthlyPayment ? parseFloat(targetMonthlyPayment) : undefined,
      dueDay: dueDay ? Math.min(31, Math.max(1, parseInt(dueDay, 10))) : undefined,
      notes: notes.trim() || undefined,
      annualFee: icon === 'CreditCard' && annualFee ? parseFloat(annualFee) : undefined,
    })
    setShowModal(false)
    resetForm()
  }

  const handlePayment = async () => {
    if (!paymentAmount || !showPayment) return
    const debt = debts.find((d) => d.id === showPayment)
    if (debt) {
      const amount = parseFloat(paymentAmount)
      const newBalance = Math.max(0, debt.balance - amount)
      await updateDebt(showPayment, { balance: newBalance })

      const debtPayoffCat = await db.categories.where('name').equals('Debt Payoff').first()
        ?? (await db.categories.where('group').equals('needs').first())
      if (debtPayoffCat?.id) {
        await db.transactions.add({
          amount,
          type: 'expense',
          categoryId: debtPayoffCat.id,
          description: `Payment: ${debt.name}`,
          note: '',
          date: format(new Date(), 'yyyy-MM-dd'),
          createdAt: new Date().toISOString(),
        })
      }
    }
    setShowPayment(null)
    setPaymentAmount('')
  }

  const orderedDebts = strategy === 'snowball' ? getSnowballOrder() : getAvalancheOrder()

  const totalInterest = debts.reduce((sum, d) => {
    const schedule = getPayoffSchedule(d)
    return sum + schedule.reduce((s, e) => s + e.interest, 0)
  }, 0)

  const maxMonths = debts.reduce((max, d) => {
    const schedule = getPayoffSchedule(d)
    return Math.max(max, schedule.length)
  }, 0)

  const modalTitle = editingDebt ? 'Edit Debt' : 'Add Debt'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">Debt Tracker</h1>
            <EncryptionBadge />
          </div>
          <p className="text-sm text-slate-400">Set payoff goals and track progress</p>
        </div>
        <Button onClick={() => { resetForm(); setShowModal(true) }}>+ Add Debt</Button>
      </div>

      {debts.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <p className="text-xs text-slate-500">Total Debt</p>
            <p className="text-2xl font-bold text-red-400">{formatCurrency(totalDebt)}</p>
          </Card>
          <Card>
            <p className="text-xs text-slate-500">Monthly Minimum</p>
            <p className="text-2xl font-bold text-slate-200">{formatCurrency(totalMinPayment)}</p>
          </Card>
          <Card>
            <p className="text-xs text-slate-500">Est. Total Interest</p>
            <p className="text-2xl font-bold text-orange-400">{formatCurrency(totalInterest)}</p>
            {maxMonths > 0 && (
              <p className="text-xs text-slate-500 mt-1">
                ~{Math.ceil(maxMonths / 12)} year{maxMonths > 12 ? 's' : ''} to payoff
              </p>
            )}
          </Card>
        </div>
      )}

      {debts.length > 0 && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-slate-400">Payoff Strategy</h3>
            <div className="flex gap-1 rounded-xl bg-slate-800 p-1">
              <button
                onClick={() => setStrategy('avalanche')}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${strategy === 'avalanche' ? 'bg-slate-700 text-slate-100' : 'text-slate-400'}`}
              >Avalanche (highest rate)</button>
              <button
                onClick={() => setStrategy('snowball')}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${strategy === 'snowball' ? 'bg-slate-700 text-slate-100' : 'text-slate-400'}`}
              >Snowball (lowest balance)</button>
            </div>
          </div>
          <div className="space-y-3">
            {orderedDebts.map((debt, i) => {
              const schedule = getPayoffSchedule(debt)
              const monthsLeft = schedule.length
              const interestCost = schedule.reduce((s, e) => s + e.interest, 0)
              const isPaidOff = debt.balance <= 0
              const startBalance = debt.originalBalance ?? debt.balance
              const paidPercent = startBalance > 0 ? Math.min(100, ((startBalance - debt.balance) / startBalance) * 100) : 100
              const effPayment = getEffectivePayment(debt)
              const reqForTarget = debt.targetPayoffDate && debt.balance > 0
                ? calcRequiredPayment(debt.balance, debt.interestRate, debt.targetPayoffDate)
                : null
              const targetDatePassed = debt.targetPayoffDate && reqForTarget === null && debt.balance > 0

              return (
                <div key={debt.id} className={`rounded-xl p-3 ${isPaidOff ? 'bg-green-900/20' : 'bg-slate-800/50'}`}>
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-xs font-bold text-slate-400">
                      {isPaidOff ? <Icon name="Check" size={16} className="text-green-400" /> : `#${i + 1}`}
                    </div>
                    <Icon name={debt.icon || 'TrendingDown'} size={24} className="shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className={`font-medium ${isPaidOff ? 'text-green-400 line-through' : 'text-slate-200'}`}>
                        {debt.name}
                      </p>
                      <p className="text-xs text-slate-500">
                        {debt.interestRate}% APR · {formatCurrency(debt.minimumPayment)}/mo min
                        {effPayment > debt.minimumPayment && (
                          <span className="text-green-400"> · Target: {formatCurrency(effPayment)}/mo</span>
                        )}
                        {debt.dueDay != null && ` · Due day ${debt.dueDay}`}
                        {debt.annualFee != null && debt.annualFee > 0 && (
                          <span className="text-slate-400"> · {formatCurrency(debt.annualFee)}/yr fee</span>
                        )}
                        {monthsLeft > 0 && !isPaidOff && (
                          <>
                            · {monthsLeft} mo left · {formatCurrency(interestCost)} interest
                            {effPayment < debt.balance * (debt.interestRate / 100 / 12) && (
                              <span className="text-amber-400 ml-0.5"> · Min payment may not cover interest</span>
                            )}
                          </>
                        )}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`font-semibold ${isPaidOff ? 'text-green-400' : 'text-slate-200'}`}>
                        {formatCurrency(debt.balance)}
                      </p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button
                        onClick={() => openEdit(debt)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                        title="Edit"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      {!isPaidOff && (
                        <button
                          onClick={() => { setShowPayment(debt.id!); setPaymentAmount('') }}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-green-400 text-xs"
                          title="Make payment"
                        >💸</button>
                      )}
                      <button
                        onClick={() => debt.id && deleteDebt(debt.id)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-red-900/30 hover:text-red-400"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  {!isPaidOff && (
                    <div className="mt-2 ml-11 space-y-1">
                      <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className="h-full bg-green-500 rounded-full transition-all duration-300"
                          style={{ width: `${paidPercent}%` }}
                        />
                      </div>
                      {debt.targetPayoffDate && (
                        <p className="text-[10px] text-slate-500">
                          {targetDatePassed ? (
                            <span className="text-amber-400">Goal date has passed — update target or pay in full</span>
                          ) : reqForTarget != null ? (
                            <>
                              Goal: paid off by {debt.targetPayoffDate} · Requires {formatCurrency(reqForTarget)}/mo
                              {effPayment < reqForTarget && (
                                <span className="text-amber-400 ml-1">(add {formatCurrency(reqForTarget - effPayment)}/mo)</span>
                              )}
                            </>
                          ) : null}
                        </p>
                      )}
                      {debt.notes && (
                        <p className="text-xs text-slate-500 italic">{debt.notes}</p>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {debts.length === 0 && (
        <Card className="text-center">
          <p className="text-slate-400 py-8">No debts tracked. Add your first debt to set payoff goals.</p>
        </Card>
      )}

      <Modal open={showModal} onClose={() => { setShowModal(false); resetForm() }} title={modalTitle}>
        <div className="space-y-4">
          <div>
            <label className="mb-1 flex items-center gap-2 text-sm text-slate-400">Icon <EncryptionBadge /></label>
            <div className="flex flex-wrap gap-1.5">
              {DEBT_ICONS.map((i) => (
                <button key={i} onClick={() => setIcon(i)}
                  className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${icon === i ? 'bg-slate-700 ring-2 ring-green-500 text-green-400' : 'hover:bg-slate-800 text-slate-400'}`}
                >
                  <Icon name={i} size={18} />
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="mb-1 flex items-center gap-2 text-sm text-slate-400">Name <EncryptionBadge /></label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Student Loan" className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:border-green-500 focus:outline-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 flex items-center gap-2 text-sm text-slate-400">Balance <EncryptionBadge /></label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                <input type="number" step="0.01" value={balance} onChange={(e) => setBalance(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 py-2.5 pl-7 pr-3 text-slate-100 focus:border-green-500 focus:outline-none" />
              </div>
            </div>
            <div>
              <label className="mb-1 flex items-center gap-2 text-sm text-slate-400">Interest Rate (%) <EncryptionBadge /></label>
              <input type="number" step="0.01" value={rate} onChange={(e) => setRate(e.target.value)}
                placeholder="0" className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:border-green-500 focus:outline-none" />
            </div>
          </div>
          <div>
            <label className="mb-1 flex items-center gap-2 text-sm text-slate-400">Minimum Monthly Payment <EncryptionBadge /></label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">$</span>
              <input type="number" step="0.01" value={minPayment} onChange={(e) => setMinPayment(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-800 py-2.5 pl-8 pr-4 text-slate-100 focus:border-green-500 focus:outline-none" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 flex items-center gap-2 text-sm text-slate-400">Target Payoff Date</label>
              <input type="month" value={targetPayoffDate} onChange={(e) => setTargetPayoffDate(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-slate-100 focus:border-green-500 focus:outline-none" />
            </div>
            <div>
              <label className="mb-1 flex items-center gap-2 text-sm text-slate-400">Target Monthly Payment</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                <input type="number" step="0.01" value={targetMonthlyPayment} onChange={(e) => setTargetMonthlyPayment(e.target.value)}
                  placeholder="Optional extra" className="w-full rounded-xl border border-slate-700 bg-slate-800 py-2.5 pl-7 pr-3 text-slate-100 placeholder-slate-500 focus:border-green-500 focus:outline-none" />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 flex items-center gap-2 text-sm text-slate-400">Payment Due Day (1–31)</label>
              <input type="number" min={1} max={31} value={dueDay} onChange={(e) => setDueDay(e.target.value)}
                placeholder="e.g. 15" className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:border-green-500 focus:outline-none" />
            </div>
            {icon === 'CreditCard' && (
              <div>
                <label className="mb-1 flex items-center gap-2 text-sm text-slate-400">Annual Fee <EncryptionBadge /></label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                  <input type="number" step="0.01" value={annualFee} onChange={(e) => setAnnualFee(e.target.value)}
                    placeholder="0.00" className="w-full rounded-xl border border-slate-700 bg-slate-800 py-2.5 pl-7 pr-3 text-slate-100 placeholder-slate-500 focus:border-green-500 focus:outline-none" />
                </div>
              </div>
            )}
            {icon !== 'CreditCard' && <div />}
          </div>
          <div>
            <label className="mb-1 flex items-center gap-2 text-sm text-slate-400">Notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
              placeholder="Optional notes" className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:border-green-500 focus:outline-none resize-none" />
          </div>
          {editingDebt ? (
            <Button onClick={handleUpdate} className="w-full" disabled={!name.trim() || !balance || !minPayment}>Save Changes</Button>
          ) : (
            <Button onClick={handleAdd} className="w-full" disabled={!name.trim() || !balance || !minPayment}>Add Debt</Button>
          )}
        </div>
      </Modal>

      <Modal open={!!showPayment} onClose={() => setShowPayment(null)} title="Make Payment">
        <div className="space-y-4">
          <div>
            <label className="mb-1 flex items-center gap-2 text-sm text-slate-400">Amount <EncryptionBadge /></label>
          </div>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">$</span>
            <input type="number" step="0.01" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)}
              placeholder="0.00" autoFocus className="w-full rounded-xl border border-slate-700 bg-slate-800 py-2.5 pl-8 pr-4 text-slate-100 placeholder-slate-500 focus:border-green-500 focus:outline-none" />
          </div>
          <Button onClick={handlePayment} className="w-full" disabled={!paymentAmount}>Apply Payment</Button>
        </div>
      </Modal>
    </div>
  )
}
