import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { format, subMonths, addMonths, startOfMonth } from 'date-fns'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { useBudgetGoals } from '../hooks/useBudgetGoals'
import { useCategories } from '../hooks/useCategories'
import { useSettings } from '../hooks/useSettings'
import { useTransactions } from '../hooks/useTransactions'
import {
  formatCurrency,
  groupByCategory,
} from '../utils/calculations'
import { GROUP_COLORS, GROUP_LABELS, getHealthBarColor, getCategoryIconClassName } from '../utils/colors'
import { BUDGET_GROUPS, type CategoryGroup } from '../db/database'
import { Icon } from '../components/ui/Icon'

const BUDGET_BLUEPRINTS = [
  { id: '50-25-25', name: '50/25/25', desc: 'Needs 50%, Wants 25%, Savings 25%', needs: 0.5, wants: 0.25, savings: 0.25 },
  { id: '50-30-20', name: '50/30/20', desc: 'Needs 50%, Wants 30%, Savings 20%', needs: 0.5, wants: 0.3, savings: 0.2 },
  { id: '60-20-20', name: '60/20/20', desc: 'Needs 60%, Wants 20%, Savings 20%', needs: 0.6, wants: 0.2, savings: 0.2 },
  { id: '60-30-10', name: '60/30/10', desc: 'Needs 60%, Wants 30%, Savings 10%', needs: 0.6, wants: 0.3, savings: 0.1 },
  { id: '70-20-10', name: '70/20/10', desc: 'Needs 70%, Wants 20%, Savings 10%', needs: 0.7, wants: 0.2, savings: 0.1 },
  { id: '80-10-10', name: '80/10/10', desc: 'Needs 80%, Wants 10%, Savings 10%', needs: 0.8, wants: 0.1, savings: 0.1 },
] as const

export default function Goals() {
  const [viewDate, setViewDate] = useState(new Date())
  const isCurrentMonth = format(viewDate, 'yyyy-MM') === format(new Date(), 'yyyy-MM')
  const viewMonth = format(viewDate, 'yyyy-MM')

  const start = format(startOfMonth(viewDate), 'yyyy-MM-dd')
  const end = format(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0), 'yyyy-MM-dd')

  const { goals, addGoal, deleteGoal } = useBudgetGoals(viewMonth)
  const { categories, categoriesByGroup } = useCategories()
  const { getMonthlyBudget, setMonthlyBudget, clearMonthlyBudgetOverride, customBlueprints, addCustomBlueprint, deleteCustomBlueprint, monthlyBudget: defaultBudget, setSetting, settings } = useSettings()
  const { transactions } = useTransactions(start, end)

  const monthlyBudget = getMonthlyBudget(viewMonth)

  const [showModal, setShowModal] = useState(false)
  const [goalType, setGoalType] = useState<'group' | 'category'>('group')
  const [selectedGroup, setSelectedGroup] = useState<CategoryGroup>('needs')
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null)
  const [limitAmount, setLimitAmount] = useState('')
  const [editBudget, setEditBudget] = useState(false)
  const [budgetInput, setBudgetInput] = useState(monthlyBudget.toString())
  const [editDefault, setEditDefault] = useState(false)
  const [defaultInput, setDefaultInput] = useState(defaultBudget.toString())
  const [editingGroup, setEditingGroup] = useState<CategoryGroup | null>(null)
  const [groupLimitInput, setGroupLimitInput] = useState('')
  const [showBlueprintModal, setShowBlueprintModal] = useState(false)
  const [customName, setCustomName] = useState('')
  const [customNeeds, setCustomNeeds] = useState('50')
  const [customWants, setCustomWants] = useState('30')
  const [customSavings, setCustomSavings] = useState('20')

  const spending = groupByCategory(transactions)
  const hasMonthOverride = settings[`monthlyBudget-${viewMonth}`] != null

  useEffect(() => {
    setBudgetInput(monthlyBudget.toString())
    setEditBudget(false)
  }, [viewMonth, monthlyBudget])

  useEffect(() => {
    setDefaultInput(defaultBudget.toString())
    setEditDefault(false)
  }, [defaultBudget])

  const handleAddGoal = async () => {
    if (!limitAmount) return
    await addGoal({
      categoryId: goalType === 'category' ? selectedCategoryId : null,
      group: goalType === 'group' ? selectedGroup : null,
      monthlyLimit: parseFloat(limitAmount),
      month: viewMonth,
    })
    setShowModal(false)
    setLimitAmount('')
  }

  const handleSaveBudget = async () => {
    await setMonthlyBudget(viewMonth, parseFloat(budgetInput))
    setEditBudget(false)
  }

  const handleSaveDefault = async () => {
    await setSetting('monthlyBudget', defaultInput)
    setEditDefault(false)
  }

  const startEditGroup = (group: CategoryGroup, currentLimit: number) => {
    setEditingGroup(group)
    setGroupLimitInput(currentLimit > 0 ? currentLimit.toString() : '')
  }

  const cancelEditGroup = () => {
    setEditingGroup(null)
    setGroupLimitInput('')
  }

  const saveGroupGoal = async (group: CategoryGroup) => {
    const amount = parseFloat(groupLimitInput)
    if (!Number.isFinite(amount) || amount < 0) return
    await addGoal({ categoryId: null, group, monthlyLimit: amount, month: viewMonth })
    setEditingGroup(null)
    setGroupLimitInput('')
  }

  type BlueprintLike = { needs: number; wants: number; savings: number }
  const applyBlueprint = async (bp: BlueprintLike) => {
    const base = monthlyBudget
    if (base <= 0) return
    await addGoal({ categoryId: null, group: 'needs', monthlyLimit: Math.round(base * bp.needs * 100) / 100, month: viewMonth })
    await addGoal({ categoryId: null, group: 'wants', monthlyLimit: Math.round(base * bp.wants * 100) / 100, month: viewMonth })
    await addGoal({ categoryId: null, group: 'savings', monthlyLimit: Math.round(base * bp.savings * 100) / 100, month: viewMonth })
    setEditingGroup(null)
  }

  const handleSaveCustomBlueprint = async () => {
    const needs = parseFloat(customNeeds) / 100
    const wants = parseFloat(customWants) / 100
    const savings = parseFloat(customSavings) / 100
    const sum = needs + wants + savings
    if (!customName.trim() || !Number.isFinite(needs) || !Number.isFinite(wants) || !Number.isFinite(savings)) return
    if (Math.abs(sum - 1) > 0.01) return
    const name = customName.trim()
    await addCustomBlueprint({
      id: `custom-${Date.now()}`,
      name,
      needs,
      wants,
      savings,
    })
    setShowBlueprintModal(false)
    setCustomName('')
    setCustomNeeds('50')
    setCustomWants('30')
    setCustomSavings('20')
  }

  const customBlueprintTotal = () => {
    const n = parseFloat(customNeeds) || 0
    const w = parseFloat(customWants) || 0
    const s = parseFloat(customSavings) || 0
    return n + w + s
  }

  const groupSpending = (group: CategoryGroup): number =>
    categoriesByGroup(group).reduce((sum, cat) => sum + (spending[cat.id!] || 0), 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">Budget</h1>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <button
              onClick={() => setViewDate((d) => subMonths(d, 1))}
              className="text-slate-500 hover:text-slate-300 text-sm"
            >←</button>
            <p className="text-sm text-slate-400">{format(viewDate, 'MMMM yyyy')}</p>
            <button
              onClick={() => setViewDate((d) => addMonths(d, 1))}
              className="text-slate-500 hover:text-slate-300 text-sm"
              disabled={isCurrentMonth}
            >→</button>
            {!isCurrentMonth && (
              <button
                onClick={() => setViewDate(new Date())}
                className="text-xs text-green-400 hover:text-green-300 ml-1"
              >Today</button>
            )}
          </div>
        </div>
        <Button onClick={() => setShowModal(true)}>+ Add Goal</Button>
      </div>

      {/* Monthly Budget Target */}
      <Card>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-slate-400">
            {format(viewDate, 'MMMM yyyy')} Budget
          </h3>
          <button
            onClick={() => setEditBudget(!editBudget)}
            className="text-xs text-green-400 hover:text-green-300"
          >
            {editBudget ? 'Cancel' : 'Edit'}
          </button>
        </div>
        <p className="text-xs text-slate-500 mb-3">
          Your total spending target for needs + wants this month. Powers the Dashboard health bar, remaining
          balance, and over-budget alerts. Savings are tracked separately.
        </p>
        {editBudget ? (
          <div className="flex gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
              <input
                type="number"
                value={budgetInput}
                onChange={(e) => setBudgetInput(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-800 py-2 pl-7 pr-4 text-slate-100 focus:border-green-500 focus:outline-none"
              />
            </div>
            <Button onClick={handleSaveBudget}>Save</Button>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-bold text-slate-100">{formatCurrency(monthlyBudget)}</p>
              {hasMonthOverride && (
                <span className="text-xs text-slate-500">(custom for this month)</span>
              )}
            </div>
            {hasMonthOverride && (
              <button
                onClick={() => clearMonthlyBudgetOverride(viewMonth)}
                className="text-xs text-slate-500 hover:text-slate-300 shrink-0"
              >
                Reset to default
              </button>
            )}
          </div>
        )}
      </Card>

      {/* Default Monthly Budget */}
      <Card>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-slate-400">Default Budget</h3>
          <button
            onClick={() => setEditDefault(!editDefault)}
            className="text-xs text-green-400 hover:text-green-300"
          >
            {editDefault ? 'Cancel' : 'Edit'}
          </button>
        </div>
        <p className="text-xs text-slate-500 mb-3">
          Used for months without a custom amount. Edit a month above to override it for that period.{' '}
          <Link to="/settings" className="text-green-400 hover:text-green-300">Also in Settings</Link>.
        </p>
        {editDefault ? (
          <div className="flex gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
              <input
                type="number"
                value={defaultInput}
                onChange={(e) => setDefaultInput(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-800 py-2 pl-7 pr-4 text-slate-100 focus:border-green-500 focus:outline-none"
              />
            </div>
            <Button onClick={handleSaveDefault}>Save</Button>
          </div>
        ) : (
          <p className="text-2xl font-bold text-slate-100">{formatCurrency(defaultBudget)}</p>
        )}
      </Card>

      {/* Budget Blueprint */}
      <Card>
        <h3 className="mb-2 text-sm font-medium text-slate-400">Budget Blueprint</h3>
        <p className="text-xs text-slate-500 mb-4">
          Apply preset percentages to {format(viewDate, 'MMMM')} using your{' '}
          {hasMonthOverride ? 'custom' : 'default'} budget ({formatCurrency(monthlyBudget)}).
        </p>
        <div className="flex flex-wrap gap-2">
          {BUDGET_BLUEPRINTS.map((bp) => (
            <button
              key={bp.id}
              onClick={() => applyBlueprint(bp)}
              title={bp.desc}
              className="flex flex-col items-start rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-2.5 text-left hover:border-slate-600 hover:bg-slate-800 transition-colors min-w-[150px]"
            >
              <span className="text-sm font-semibold text-slate-200">{bp.name}</span>
              <span className="text-xs text-slate-500">{bp.desc}</span>
            </button>
          ))}
          {customBlueprints.map((bp) => {
            const desc = `Needs ${Math.round(bp.needs * 100)}%, Wants ${Math.round(bp.wants * 100)}%, Savings ${Math.round(bp.savings * 100)}%`
            return (
              <div key={bp.id} className="relative group">
                <button
                  onClick={() => applyBlueprint(bp)}
                  title={desc}
                  className="flex flex-col items-start rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-2.5 text-left hover:border-slate-600 hover:bg-slate-800 transition-colors min-w-[150px]"
                >
                  <span className="text-sm font-semibold text-slate-200">{bp.name}</span>
                  <span className="text-xs text-slate-500">{desc}</span>
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteCustomBlueprint(bp.id) }}
                  className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-slate-700 text-slate-400 hover:bg-red-900/50 hover:text-red-400 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Remove"
                >
                  ×
                </button>
              </div>
            )
          })}
          <button
            onClick={() => setShowBlueprintModal(true)}
            className="flex flex-col items-start rounded-xl border border-green-500/50 bg-green-500/10 px-4 py-2.5 text-left text-green-400 hover:border-green-500 hover:bg-green-500/20 transition-colors min-w-[150px]"
          >
            <span className="text-sm font-semibold">+ Add custom</span>
            <span className="text-xs text-slate-500">Create your own split</span>
          </button>
        </div>
      </Card>

      {/* Add Custom Blueprint Modal */}
      <Modal open={showBlueprintModal} onClose={() => setShowBlueprintModal(false)} title="Add Custom Blueprint">
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm text-slate-400">Name</label>
            <input
              type="text"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder="e.g. Aggressive savings"
              className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:border-green-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-400">Percentages (must total 100%)</label>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={customNeeds}
                  onChange={(e) => setCustomNeeds(e.target.value)}
                  placeholder="Needs"
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100 focus:border-green-500 focus:outline-none"
                />
                <p className="text-xs text-slate-500 mt-0.5">Needs %</p>
              </div>
              <div>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={customWants}
                  onChange={(e) => setCustomWants(e.target.value)}
                  placeholder="Wants"
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100 focus:border-green-500 focus:outline-none"
                />
                <p className="text-xs text-slate-500 mt-0.5">Wants %</p>
              </div>
              <div>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={customSavings}
                  onChange={(e) => setCustomSavings(e.target.value)}
                  placeholder="Savings"
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100 focus:border-green-500 focus:outline-none"
                />
                <p className="text-xs text-slate-500 mt-0.5">Savings %</p>
              </div>
            </div>
            <p className={`text-xs mt-1 ${Math.abs(customBlueprintTotal() - 100) < 0.5 ? 'text-green-400' : 'text-slate-500'}`}>
              Total: {customBlueprintTotal().toFixed(0)}%
            </p>
          </div>
          <Button
            onClick={handleSaveCustomBlueprint}
            className="w-full"
            disabled={!customName.trim() || Math.abs(customBlueprintTotal() - 100) > 0.5}
          >
            Add Blueprint
          </Button>
        </div>
      </Modal>

      {/* Group-level goals */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">By Category Group</h2>
        {BUDGET_GROUPS.map((group) => {
          const goal = goals.find((g) => g.group === group)
          const spent = groupSpending(group)
          const limit = goal?.monthlyLimit ?? 0
          const ratio = limit > 0 ? spent / limit : 0
          const color = GROUP_COLORS[group]
          const isEditing = editingGroup === group

          return (
            <Card
              key={group}
              className={limit === 0 && !isEditing ? 'opacity-75 border-slate-700/70 border-dashed hover:opacity-100 hover:border-slate-600 transition-all cursor-pointer' : ''}
            >
              <div
                className={limit === 0 && !isEditing ? 'cursor-pointer' : ''}
                onClick={limit === 0 && !isEditing ? () => startEditGroup(group, limit) : undefined}
                onKeyDown={limit === 0 && !isEditing ? (e) => e.key === 'Enter' && startEditGroup(group, limit) : undefined}
                role={limit === 0 && !isEditing ? 'button' : undefined}
                tabIndex={limit === 0 && !isEditing ? 0 : undefined}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: color }} />
                    <h3 className="font-medium text-slate-200">{GROUP_LABELS[group]}</h3>
                  </div>
                  {!isEditing ? (
                    <div className="flex items-center gap-2">
                      <div className="text-right text-sm">
                        <span className="text-slate-300">{formatCurrency(spent)}</span>
                        {limit > 0 && (
                          <span className="text-slate-500"> / {formatCurrency(limit)}</span>
                        )}
                      </div>
                      {limit > 0 && (
                        <button
                          onClick={(e) => { e.stopPropagation(); startEditGroup(group, limit) }}
                          className="text-xs text-green-400 hover:text-green-300 shrink-0"
                          title="Edit limit"
                        >
                          Edit
                        </button>
                      )}
                    </div>
                  ) : null}
                </div>
                {isEditing ? (
                  <div className="flex gap-2 mt-2" onClick={(e) => e.stopPropagation()}>
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">$</span>
                      <input
                        type="number"
                        step="0.01"
                        value={groupLimitInput}
                        onChange={(e) => setGroupLimitInput(e.target.value)}
                        placeholder="0"
                        autoFocus
                        className="w-full rounded-lg border border-slate-700 bg-slate-800 py-1.5 pl-7 pr-3 text-sm text-slate-100 focus:border-green-500 focus:outline-none"
                      />
                    </div>
                    <Button size="sm" onClick={() => saveGroupGoal(group)} disabled={!groupLimitInput}>
                      Save
                    </Button>
                    <Button size="sm" variant="ghost" onClick={cancelEditGroup}>
                      Cancel
                    </Button>
                  </div>
                ) : limit > 0 ? (
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
                  <div className="flex flex-col items-center justify-center py-6 gap-2 text-slate-500">
                    <Icon name="Pencil" size={28} className="text-slate-500" />
                    <span className="text-xs font-medium">Set limit</span>
                  </div>
                )}
              </div>
              {goal?.id && !isEditing && (
                <button
                  onClick={(e) => { e.stopPropagation(); goal.id && deleteGoal(goal.id) }}
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
                goalType === 'group' ? 'bg-slate-700 text-slate-100' : 'text-slate-400'
              }`}
            >
              By Group
            </button>
            <button
              onClick={() => setGoalType('category')}
              className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
                goalType === 'category' ? 'bg-slate-700 text-slate-100' : 'text-slate-400'
              }`}
            >
              By Category
            </button>
          </div>

          {goalType === 'group' ? (
            <div className="flex gap-2">
              {BUDGET_GROUPS.map((g) => (
                <button
                  key={g}
                  onClick={() => setSelectedGroup(g)}
                  className={`flex-1 rounded-xl border py-2 text-sm font-medium transition-colors ${
                    selectedGroup === g ? 'border-transparent text-white' : 'border-slate-700 text-slate-400'
                  }`}
                  style={selectedGroup === g ? { backgroundColor: GROUP_COLORS[g] } : undefined}
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
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          )}

          <div>
            <label className="mb-1 block text-sm text-slate-400">
              Monthly Limit
            </label>
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
