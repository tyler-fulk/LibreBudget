import { useLiveQuery } from 'dexie-react-hooks'
import { db, type BudgetGoal } from '../db/database'
import { getCurrentMonth } from '../utils/calculations'

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
      return db.budgetGoals.update(existing.id, { monthlyLimit: goal.monthlyLimit })
    }
    return db.budgetGoals.add(goal)
  }

  const deleteGoal = async (id: number) => {
    return db.budgetGoals.delete(id)
  }

  return { goals, addGoal, deleteGoal }
}
