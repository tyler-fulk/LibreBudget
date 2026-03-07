import { useLiveQuery } from 'dexie-react-hooks'
import { db, type SavingsGoal, type SavingsGoalType } from '../db/database'

export function useSavingsGoals() {
  const goals = useLiveQuery(() => db.savingsGoals.toArray()) ?? []

  const goalsOnly = goals.filter((g) => g.type === 'goal')
  const savingsAccounts = goals.filter((g) => g.type === 'savings_account')
  const emergencyFunds = goals.filter((g) => g.type === 'emergency_fund')

  const addGoal = async (goal: Omit<SavingsGoal, 'id' | 'createdAt'>) => {
    return db.savingsGoals.add({ ...goal, createdAt: new Date().toISOString() })
  }

  const addSavings = async (
    type: SavingsGoalType,
    data: { name: string; icon: string; currentAmount: number; targetAmount?: number; deadline?: string },
  ) => {
    const deadline = data.deadline ?? new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10)
    const targetAmount = data.targetAmount ?? (type === 'goal' ? 0 : data.currentAmount)
    return db.savingsGoals.add({
      name: data.name,
      icon: data.icon,
      type,
      targetAmount,
      currentAmount: data.currentAmount,
      deadline,
      createdAt: new Date().toISOString(),
    })
  }

  const updateGoal = async (id: number, changes: Partial<SavingsGoal>) => {
    return db.savingsGoals.update(id, changes)
  }

  const deleteGoal = async (id: number) => {
    return db.savingsGoals.delete(id)
  }

  const addFunds = async (id: number, amount: number) => {
    const goal = await db.savingsGoals.get(id)
    if (goal) {
      await db.savingsGoals.update(id, {
        currentAmount: goal.currentAmount + amount,
      })

      const catName = goal.type === 'emergency_fund' ? 'Emergency Fund' : 'Savings'
      const savingsCat = await db.categories.where('name').equals(catName).first()
        ?? (await db.categories.where('group').equals('investments').first())
      if (savingsCat?.id) {
        const today = new Date().toISOString().slice(0, 10)
        await db.transactions.add({
          amount,
          type: 'expense',
          categoryId: savingsCat.id,
          description: `Contribution: ${goal.name}`,
          note: '',
          date: today,
          createdAt: new Date().toISOString(),
        })
      }
    }
  }

  return {
    goals,
    goalsOnly,
    savingsAccounts,
    emergencyFunds,
    addGoal,
    addSavings,
    updateGoal,
    deleteGoal,
    addFunds,
  }
}
