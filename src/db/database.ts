import Dexie, { type EntityTable } from 'dexie'

export type CategoryGroup = 'needs' | 'wants' | 'investments' | 'income'

export const EXPENSE_GROUPS: CategoryGroup[] = ['needs', 'wants', 'investments']
export const ALL_GROUPS: CategoryGroup[] = ['needs', 'wants', 'investments', 'income']
export type TransactionType = 'income' | 'expense'
export type TrackingPeriod = 'weekly' | 'monthly'
export type RecurrenceInterval = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'yearly'

export interface Category {
  id?: number
  name: string
  group: CategoryGroup
  color: string
  icon: string
  isPreset: boolean
}

export interface Transaction {
  id?: number
  amount: number
  type: TransactionType
  categoryId: number
  description: string
  note: string
  date: string
  createdAt: string
}

export interface BudgetGoal {
  id?: number
  categoryId: number | null
  group: CategoryGroup | null
  monthlyLimit: number
  month: string
}

export interface MonthlySnapshot {
  id?: number
  month: string
  totalIncome: number
  totalExpenses: number
  categoryBreakdown: Record<string, number>
  groupBreakdown: Record<CategoryGroup, number>
  healthScore: number
}

export interface AppSettings {
  id?: number
  key: string
  value: string
}

export interface RecurringTransaction {
  id?: number
  amount: number
  type: TransactionType
  categoryId: number
  description: string
  note: string
  interval: RecurrenceInterval
  nextDue: string
  enabled: boolean
  createdAt: string
}

export type SavingsGoalType = 'goal' | 'savings_account' | 'emergency_fund'

export interface SavingsGoal {
  id?: number
  name: string
  icon: string
  type: SavingsGoalType
  targetAmount: number
  currentAmount: number
  deadline: string
  createdAt: string
}

export interface Debt {
  id?: number
  name: string
  icon: string
  balance: number
  /** Highest balance recorded (for progress bar). Set on create, updated if balance increases. */
  originalBalance?: number
  interestRate: number
  minimumPayment: number
  /** Target date to be debt-free (YYYY-MM or YYYY-MM-DD). Used to calc required payment. */
  targetPayoffDate?: string
  /** Target monthly payment. If set, overrides minimum for payoff schedule. */
  targetMonthlyPayment?: number
  /** Day of month payment is due (1–31). */
  dueDay?: number
  /** Optional notes. */
  notes?: string
  createdAt: string
}

export interface CreditScoreEntry {
  id?: number
  score: number
  source: string
  date: string
  createdAt: string
}

export class LibreBudgetDB extends Dexie {
  categories!: EntityTable<Category, 'id'>
  transactions!: EntityTable<Transaction, 'id'>
  budgetGoals!: EntityTable<BudgetGoal, 'id'>
  monthlySnapshots!: EntityTable<MonthlySnapshot, 'id'>
  settings!: EntityTable<AppSettings, 'id'>
  recurringTransactions!: EntityTable<RecurringTransaction, 'id'>
  savingsGoals!: EntityTable<SavingsGoal, 'id'>
  debts!: EntityTable<Debt, 'id'>
  creditScores!: EntityTable<CreditScoreEntry, 'id'>

  constructor() {
    super('LibreBudgetDB')
    this.version(1).stores({
      categories: '++id, name, group, isPreset',
      transactions: '++id, type, categoryId, date, createdAt',
      budgetGoals: '++id, categoryId, group, month',
      monthlySnapshots: '++id, &month',
      settings: '++id, &key',
    })

    this.version(2).stores({
      categories: '++id, name, group, isPreset',
      transactions: '++id, type, categoryId, date, createdAt',
      budgetGoals: '++id, categoryId, group, month',
      monthlySnapshots: '++id, &month',
      settings: '++id, &key',
      recurringTransactions: '++id, interval, nextDue, enabled',
      savingsGoals: '++id, deadline',
      debts: '++id',
    }).upgrade((tx) => {
      return tx.table('transactions').toCollection().modify((t) => {
        if (t.note === undefined) t.note = ''
      })
    })

    this.version(3).stores({
      categories: '++id, name, group, isPreset',
      transactions: '++id, type, categoryId, date, createdAt',
      budgetGoals: '++id, categoryId, group, month',
      monthlySnapshots: '++id, &month',
      settings: '++id, &key',
      recurringTransactions: '++id, interval, nextDue, enabled',
      savingsGoals: '++id, deadline',
      debts: '++id',
      creditScores: '++id, date',
    })

    this.version(4).stores({
      savingsGoals: '++id, type, deadline',
    }).upgrade((tx) => {
      return tx.table('savingsGoals').toCollection().modify((g: { type?: string }) => {
        if (g.type === undefined) g.type = 'goal'
      })
    })
  }
}

export const db = new LibreBudgetDB()
