import { useState } from 'react'
import { format, differenceInDays } from 'date-fns'
import { Card } from '../components/ui/Card'
import { EncryptionBadge } from '../components/ui/EncryptionBadge'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { useSavingsGoals } from '../hooks/useSavingsGoals'
import { formatCurrency } from '../utils/calculations'
import type { SavingsGoal } from '../db/database'
import { Icon, GOAL_ICONS, ACCOUNT_ICONS } from '../components/ui/Icon'

function SavingsCard({
  item,
  showProgress,
  onAddFunds,
  onDelete,
}: {
  item: SavingsGoal
  showProgress: boolean
  onAddFunds: () => void
  onDelete: () => void
}) {
  return (
    <Card>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icon name={item.icon || 'Wallet'} size={28} />
          <div>
            <h3 className="font-medium text-slate-200">{item.name}</h3>
            <p className="text-xs text-slate-500">Balance: {formatCurrency(item.currentAmount)}</p>
          </div>
        </div>
      </div>
      {showProgress && item.targetAmount > 0 && (
        <div className="mb-2">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-slate-300">{formatCurrency(item.currentAmount)}</span>
            <span className="text-slate-500">{formatCurrency(item.targetAmount)}</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.min((item.currentAmount / item.targetAmount) * 100, 100)}%`,
                backgroundColor: item.currentAmount >= item.targetAmount ? '#22c55e' : '#3b82f6',
              }}
            />
          </div>
        </div>
      )}
      <div className="flex gap-2">
        <Button size="sm" onClick={onAddFunds} className="flex-1">+ Add Funds</Button>
        <Button size="sm" variant="danger" onClick={onDelete}>Delete</Button>
      </div>
    </Card>
  )
}

export default function SavingsGoals() {
  const {
    goalsOnly,
    savingsAccounts,
    emergencyFunds,
    addGoal,
    addSavings,
    deleteGoal,
    addFunds,
  } = useSavingsGoals()
  const [showModal, setShowModal] = useState<'goal' | 'savings_account' | 'emergency_fund' | null>(null)
  const [showFundModal, setShowFundModal] = useState<number | null>(null)
  const [name, setName] = useState('')
  const [icon, setIcon] = useState('Target')
  const [target, setTarget] = useState('')
  const [currentAmount, setCurrentAmount] = useState('')
  const [deadline, setDeadline] = useState('')
  const [fundAmount, setFundAmount] = useState('')

  const handleAddGoal = async () => {
    if (!name.trim() || !target) return
    await addGoal({
      name: name.trim(),
      icon,
      type: 'goal',
      targetAmount: parseFloat(target),
      currentAmount: 0,
      deadline: deadline || format(new Date(Date.now() + 365 * 86400000), 'yyyy-MM-dd'),
    })
    setShowModal(null)
    resetForm()
  }

  const handleAddSavings = async () => {
    if (!name.trim() || !currentAmount) return
    await addSavings('savings_account', {
      name: name.trim(),
      icon,
      currentAmount: parseFloat(currentAmount),
    })
    setShowModal(null)
    resetForm()
  }

  const handleAddEmergencyFund = async () => {
    if (!name.trim() || !currentAmount) return
    await addSavings('emergency_fund', {
      name: name.trim(),
      icon,
      currentAmount: parseFloat(currentAmount),
    })
    setShowModal(null)
    resetForm()
  }

  const resetForm = () => {
    setName('')
    setIcon('Target')
    setTarget('')
    setCurrentAmount('')
    setDeadline('')
  }

  const handleFund = async () => {
    if (!fundAmount || !showFundModal) return
    await addFunds(showFundModal, parseFloat(fundAmount))
    setShowFundModal(null)
    setFundAmount('')
  }

  const hasAny = goalsOnly.length > 0 || savingsAccounts.length > 0 || emergencyFunds.length > 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">Savings</h1>
            <EncryptionBadge />
          </div>
          <p className="text-sm text-slate-400">Goals, savings accounts, and emergency funds</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => { setShowModal('emergency_fund'); setIcon('Shield'); setCurrentAmount('') }}>
            + Emergency Fund
          </Button>
          <Button size="sm" variant="secondary" onClick={() => { setShowModal('savings_account'); setIcon('Building2'); setCurrentAmount('') }}>
            + Savings Account
          </Button>
          <Button onClick={() => { setShowModal('goal'); setIcon('Target'); setTarget(''); setCurrentAmount('') }}>
            + New Goal
          </Button>
        </div>
      </div>

      {!hasAny && (
        <Card className="text-center">
          <p className="text-slate-400 py-8">
            Add goals, savings accounts, or an emergency fund to get started.
          </p>
        </Card>
      )}

      {emergencyFunds.length > 0 && (
        <div>
          <h2 className="text-sm font-medium text-slate-400 mb-2">Emergency Funds</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {emergencyFunds.map((item) => (
              <SavingsCard
                key={item.id}
                item={item}
                showProgress={false}
                onAddFunds={() => { setShowFundModal(item.id!); setFundAmount('') }}
                onDelete={() => item.id && deleteGoal(item.id)}
              />
            ))}
          </div>
        </div>
      )}

      {savingsAccounts.length > 0 && (
        <div>
          <h2 className="text-sm font-medium text-slate-400 mb-2">Savings Accounts</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {savingsAccounts.map((item) => (
              <SavingsCard
                key={item.id}
                item={item}
                showProgress={false}
                onAddFunds={() => { setShowFundModal(item.id!); setFundAmount('') }}
                onDelete={() => item.id && deleteGoal(item.id)}
              />
            ))}
          </div>
        </div>
      )}

      {goalsOnly.length > 0 && (
        <div>
          <h2 className="text-sm font-medium text-slate-400 mb-2">Savings Goals</h2>
          <div className="grid gap-4 sm:grid-cols-2">
        {goalsOnly.map((goal) => {
          const progress = goal.targetAmount > 0 ? goal.currentAmount / goal.targetAmount : 0
          const pct = Math.min(progress * 100, 100)
          const daysLeft = differenceInDays(new Date(goal.deadline), new Date())
          const completed = goal.currentAmount >= goal.targetAmount

          return (
            <Card key={goal.id}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Icon name={goal.icon || 'Target'} size={28} />
                  <div>
                    <h3 className="font-medium text-slate-200">{goal.name}</h3>
                    <p className="text-xs text-slate-500">
                      {completed
                        ? 'Goal reached!'
                        : daysLeft > 0
                          ? `${daysLeft} days left`
                          : 'Past deadline'}
                    </p>
                  </div>
                </div>
                {completed && <Icon name="Check" size={20} className="text-green-400" />}
              </div>

              <div className="mb-2">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-300">{formatCurrency(goal.currentAmount)}</span>
                  <span className="text-slate-500">{formatCurrency(goal.targetAmount)}</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: completed ? '#22c55e' : '#3b82f6',
                    }}
                  />
                </div>
                <p className="text-right text-xs text-slate-500 mt-1">{pct.toFixed(0)}%</p>
              </div>

              <div className="flex gap-2">
                {!completed && (
                  <Button size="sm" onClick={() => { setShowFundModal(goal.id!); setFundAmount('') }} className="flex-1">
                    + Add Funds
                  </Button>
                )}
                <Button size="sm" variant="danger" onClick={() => goal.id && deleteGoal(goal.id)}>
                  Delete
                </Button>
              </div>
            </Card>
          )
        })}
          </div>
        </div>
      )}

      <Modal open={showModal === 'goal'} onClose={() => setShowModal(null)} title="New Savings Goal">
        <div className="space-y-4">
          <div>
            <label className="mb-1 flex items-center gap-2 text-sm text-slate-400">Icon <EncryptionBadge /></label>
            <div className="flex flex-wrap gap-1.5">
              {GOAL_ICONS.map((i) => (
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
              placeholder="e.g. Vacation Fund" className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:border-green-500 focus:outline-none" />
          </div>
          <div>
            <label className="mb-1 flex items-center gap-2 text-sm text-slate-400">Target Amount <EncryptionBadge /></label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">$</span>
              <input type="number" step="0.01" value={target} onChange={(e) => setTarget(e.target.value)}
                placeholder="5000" className="w-full rounded-xl border border-slate-700 bg-slate-800 py-2.5 pl-8 pr-4 text-slate-100 placeholder-slate-500 focus:border-green-500 focus:outline-none" />
            </div>
          </div>
          <div>
            <label className="mb-1 flex items-center gap-2 text-sm text-slate-400">Target Date <EncryptionBadge /></label>
            <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-slate-100 focus:border-green-500 focus:outline-none" />
          </div>
          <Button onClick={handleAddGoal} className="w-full" disabled={!name.trim() || !target}>Create Goal</Button>
        </div>
      </Modal>

      <Modal open={showModal === 'savings_account'} onClose={() => setShowModal(null)} title="Add Savings Account">
        <div className="space-y-4">
          <div>
            <label className="mb-1 flex items-center gap-2 text-sm text-slate-400">Icon <EncryptionBadge /></label>
            <div className="flex flex-wrap gap-1.5">
              {ACCOUNT_ICONS.map((i) => (
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
              placeholder="e.g. Chase Savings" className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:border-green-500 focus:outline-none" />
          </div>
          <div>
            <label className="mb-1 flex items-center gap-2 text-sm text-slate-400">Current Balance <EncryptionBadge /></label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">$</span>
              <input type="number" step="0.01" value={currentAmount} onChange={(e) => setCurrentAmount(e.target.value)}
                placeholder="0.00" className="w-full rounded-xl border border-slate-700 bg-slate-800 py-2.5 pl-8 pr-4 text-slate-100 placeholder-slate-500 focus:border-green-500 focus:outline-none" />
            </div>
          </div>
          <Button onClick={handleAddSavings} className="w-full" disabled={!name.trim() || !currentAmount}>Add Account</Button>
        </div>
      </Modal>

      <Modal open={showModal === 'emergency_fund'} onClose={() => setShowModal(null)} title="Add Emergency Fund">
        <div className="space-y-4">
          <div>
            <label className="mb-1 flex items-center gap-2 text-sm text-slate-400">Icon <EncryptionBadge /></label>
            <div className="flex flex-wrap gap-1.5">
              {ACCOUNT_ICONS.map((i) => (
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
              placeholder="e.g. Emergency Fund" className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:border-green-500 focus:outline-none" />
          </div>
          <div>
            <label className="mb-1 flex items-center gap-2 text-sm text-slate-400">Current Balance <EncryptionBadge /></label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">$</span>
              <input type="number" step="0.01" value={currentAmount} onChange={(e) => setCurrentAmount(e.target.value)}
                placeholder="0.00" className="w-full rounded-xl border border-slate-700 bg-slate-800 py-2.5 pl-8 pr-4 text-slate-100 placeholder-slate-500 focus:border-green-500 focus:outline-none" />
            </div>
          </div>
          <Button onClick={handleAddEmergencyFund} className="w-full" disabled={!name.trim() || !currentAmount}>Add Emergency Fund</Button>
        </div>
      </Modal>

      <Modal open={!!showFundModal} onClose={() => setShowFundModal(null)} title="Add Funds">
        <div className="space-y-4">
          <div>
            <label className="mb-1 flex items-center gap-2 text-sm text-slate-400">Amount <EncryptionBadge /></label>
          </div>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">$</span>
            <input type="number" step="0.01" value={fundAmount} onChange={(e) => setFundAmount(e.target.value)}
              placeholder="0.00" autoFocus className="w-full rounded-xl border border-slate-700 bg-slate-800 py-2.5 pl-8 pr-4 text-slate-100 placeholder-slate-500 focus:border-green-500 focus:outline-none" />
          </div>
          <Button onClick={handleFund} className="w-full" disabled={!fundAmount}>Add</Button>
        </div>
      </Modal>
    </div>
  )
}
