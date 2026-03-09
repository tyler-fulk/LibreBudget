import { useLiveQuery } from 'dexie-react-hooks'
import { db, type BudgetGoal } from '../db/database'
import { getCurrentMonth } from '../utils/calculations'
import { sanitizeAmount } from '../utils/sanitize'

export function useBudgetGoals(month?: string) {
  const targetMonth = month ?? getCurrentMonth()

  const goals = useLiveQuery(
    () => db.budgetGoals.where('month').equals(targetMonth).toArray(),
    [targetMonth],
  ) ?? []

  const addGoal = async (goal: Omit<BudgetGoal, 'id'>) => {
    const existing = await db.budgetGoals
      .where('month')
      .equals(goal.month)
      .filter((g) =>
        goal.categoryId
          ? g.categoryId === goal.categoryId
          : g.group === goal.group,
      )
      .first()

    if (existing?.id) {
      return db.budgetGoals.update(existing.id, { monthlyLimit: sanitizeAmount(goal.monthlyLimit) })
    }
    return db.budgetGoals.add({ ...goal, monthlyLimit: sanitizeAmount(goal.monthlyLimit) })
  }

  const deleteGoal = async (id: number) => {
    return db.budgetGoals.delete(id)
  }

  const copyFromMonth = async (sourceMonth: string) => {
    const sourceGoals = await db.budgetGoals
      .where('month')
      .equals(sourceMonth)
      .toArray()
    for (const g of sourceGoals) {
      await addGoal({
        categoryId: g.categoryId,
        group: g.group,
        monthlyLimit: g.monthlyLimit,
        month: targetMonth,
      })
    }
  }

  return { goals, addGoal, deleteGoal, copyFromMonth }
}
