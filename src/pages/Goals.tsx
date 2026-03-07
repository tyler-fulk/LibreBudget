import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { Card } from '../components/ui/Card'
import { EncryptionBadge } from '../components/ui/EncryptionBadge'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { useBudgetGoals } from '../hooks/useBudgetGoals'
import { useCategories } from '../hooks/useCategories'
import { useSettings } from '../hooks/useSettings'
import { useTransactions } from '../hooks/useTransactions'
import {
  getCurrentMonth,
  getCurrentPeriodRange,
  formatCurrency,
  groupByCategory,
} from '../utils/calculations'
import { GROUP_COLORS, GROUP_LABELS, getHealthBarColor, getCategoryIconClassName } from '../utils/colors'
import { EXPENSE_GROUPS, type CategoryGroup } from '../db/database'
import { Icon } from '../components/ui/Icon'

export default function Goals() {
  const month = getCurrentMonth()
  const { goals, addGoal, deleteGoal } = useBudgetGoals(month)
  const { categories, categoriesByGroup } = useCategories()
  const { trackingPeriod, monthlyBudget, setSetting } = useSettings()
  const { start, end } = getCurrentPeriodRange(trackingPeriod)
  const { transactions } = useTransactions(start, end)

  const [showModal, setShowModal] = useState(false)
  const [goalType, setGoalType] = useState<'group' | 'category'>('group')
  const [selectedGroup, setSelectedGroup] = useState<CategoryGroup>('needs')
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null)
  const [limitAmount, setLimitAmount] = useState('')
  const [editBudget, setEditBudget] = useState(false)
  const [budgetInput, setBudgetInput] = useState(monthlyBudget.toString())

  const spending = groupByCategory(transactions)

  useEffect(() => {
    setBudgetInput(monthlyBudget.toString())
  }, [monthlyBudget])

  const handleAddGoal = async () => {
    if (!limitAmount) return
    await addGoal({
      categoryId: goalType === 'category' ? selectedCategoryId : null,
      group: goalType === 'group' ? selectedGroup : null,
      monthlyLimit: parseFloat(limitAmount),
      month,
    })
    setShowModal(false)
    setLimitAmount('')
  }

  const handleSaveBudget = async () => {
    await setSetting('monthlyBudget', budgetInput)
    setEditBudget(false)
  }

  const groups = EXPENSE_GROUPS

  const groupSpending = (group: CategoryGroup): number => {
    return categoriesByGroup(group).reduce(
      (sum, cat) => sum + (spending[cat.id!] || 0),
      0,
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">Budget Goals</h1>
            <EncryptionBadge />
          </div>
          <p className="text-sm text-slate-400">{format(new Date(), 'MMMM yyyy')}</p>
        </div>
        <Button onClick={() => setShowModal(true)}>+ Add Goal</Button>
      </div>

      {/* Overall Budget */}
      <Card>
        <div className="flex items-center justify-between mb-3">
          <h3 className="flex items-center gap-2 text-sm font-medium text-slate-400">
            Monthly Budget
            <EncryptionBadge />
          </h3>
          <button
            onClick={() => setEditBudget(!editBudget)}
            className="text-xs text-green-400 hover:text-green-300"
          >
            {editBudget ? 'Cancel' : 'Edit'}
          </button>
        </div>
        {editBudget ? (
          <div className="flex gap-2">
            <input
              type="number"
              value={budgetInput}
              onChange={(e) => setBudgetInput(e.target.value)}
              className="flex-1 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-slate-100 focus:border-green-500 focus:outline-none"
            />
            <Button onClick={handleSaveBudget}>Save</Button>
          </div>
        ) : (
          <p className="text-3xl font-bold text-slate-100">
            {formatCurrency(monthlyBudget)}
          </p>
        )}
      </Card>

      {/* Group-level goals */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">By Category Group</h2>
        {groups.map((group) => {
          const goal = goals.find((g) => g.group === group)
          const spent = groupSpending(group)
          const limit = goal?.monthlyLimit ?? 0
          const ratio = limit > 0 ? spent / limit : 0
          const color = GROUP_COLORS[group]

          return (
            <Card key={group}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                  <h3 className="font-medium text-slate-200">
                    {GROUP_LABELS[group]}
                  </h3>
                </div>
                <div className="text-right text-sm">
                  <span className="text-slate-300">
                    {formatCurrency(spent)}
                  </span>
                  {limit > 0 && (
                    <span className="text-slate-500">
                      {' '}/ {formatCurrency(limit)}
                    </span>
                  )}
                </div>
              </div>
              {limit > 0 ? (
                <div className="h-3 overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(ratio * 100, 100)}%`,
                      backgroundColor: getHealthBarColor(ratio),
                    }}
                  />
                </div>
              ) : (
                <p className="text-xs text-slate-500">
                  No limit set — add a goal to track this group
                </p>
              )}
              {goal?.id && (
                <button
                  onClick={() => deleteGoal(goal.id!)}
                  className="mt-2 text-xs text-red-400 hover:text-red-300"
                >
                  Remove goal
                </button>
              )}
            </Card>
          )
        })}
      </div>

      {/* Per-category goals */}
      {goals.filter((g) => g.categoryId).length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Category Goals</h2>
          {goals
            .filter((g) => g.categoryId)
            .map((goal) => {
              const cat = categories.find((c) => c.id === goal.categoryId)
              if (!cat) return null
              const spent = spending[cat.id!] || 0
              const ratio = goal.monthlyLimit > 0 ? spent / goal.monthlyLimit : 0
              return (
                <Card key={goal.id}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="flex items-center gap-2 text-sm font-medium text-slate-200">
                      <Icon name={cat.icon} size={18} className={getCategoryIconClassName(cat.group)} />
                      {cat.name}
                    </span>
                    <div className="text-sm">
                      <span className="text-slate-300">{formatCurrency(spent)}</span>
                      <span className="text-slate-500"> / {formatCurrency(goal.monthlyLimit)}</span>
                    </div>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-slate-800">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(ratio * 100, 100)}%`,
                        backgroundColor: getHealthBarColor(ratio),
                      }}
                    />
                  </div>
                  <button
                    onClick={() => goal.id && deleteGoal(goal.id)}
                    className="mt-2 text-xs text-red-400 hover:text-red-300"
                  >
                    Remove goal
                  </button>
                </Card>
              )
            })}
        </div>
      )}

      {/* Add Goal Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title="Add Budget Goal">
        <div className="space-y-4">
          <div className="flex gap-2 rounded-xl bg-slate-800 p-1">
            <button
              onClick={() => setGoalType('group')}
              className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
                goalType === 'group'
                  ? 'bg-slate-700 text-slate-100'
                  : 'text-slate-400'
              }`}
            >
              By Group
            </button>
            <button
              onClick={() => setGoalType('category')}
              className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
                goalType === 'category'
                  ? 'bg-slate-700 text-slate-100'
                  : 'text-slate-400'
              }`}
            >
              By Category
            </button>
          </div>

          {goalType === 'group' ? (
            <div className="flex gap-2">
              {groups.map((g) => (
                <button
                  key={g}
                  onClick={() => setSelectedGroup(g)}
                  className={`flex-1 rounded-xl border py-2 text-sm font-medium transition-colors ${
                    selectedGroup === g
                      ? 'border-transparent text-white'
                      : 'border-slate-700 text-slate-400'
                  }`}
                  style={
                    selectedGroup === g
                      ? { backgroundColor: GROUP_COLORS[g] }
                      : undefined
                  }
                >
                  {GROUP_LABELS[g]}
                </button>
              ))}
            </div>
          ) : (
            <select
              value={selectedCategoryId ?? ''}
              onChange={(e) => setSelectedCategoryId(Number(e.target.value))}
              className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-slate-100 focus:border-green-500 focus:outline-none"
            >
              <option value="">Select category...</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          )}

          <div>
            <label className="mb-1 flex items-center gap-2 text-sm text-slate-400">Monthly Limit <EncryptionBadge /></label>
            <input
              type="number"
              step="0.01"
              value={limitAmount}
              onChange={(e) => setLimitAmount(e.target.value)}
              placeholder="0.00"
              className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-slate-100 focus:border-green-500 focus:outline-none"
            />
          </div>

          <Button onClick={handleAddGoal} className="w-full" disabled={!limitAmount}>
            Add Goal
          </Button>
        </div>
      </Modal>
    </div>
  )
}
