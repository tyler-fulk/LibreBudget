import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Transaction } from '../db/database'

export function useTransactions(startDate?: string, endDate?: string) {
  const transactions = useLiveQuery(() => {
    if (startDate && endDate) {
      return db.transactions
        .where('date')
        .between(startDate, endDate, true, true)
        .reverse()
        .sortBy('date')
    }
    return db.transactions.orderBy('date').reverse().toArray()
  }, [startDate, endDate]) ?? []

  const addTransaction = async (transaction: Omit<Transaction, 'id' | 'createdAt'>) => {
    return db.transactions.add({
      ...transaction,
      note: transaction.note ?? '',
      createdAt: new Date().toISOString(),
    })
  }

  const updateTransaction = async (id: number, changes: Partial<Transaction>) => {
    return db.transactions.update(id, changes)
  }

  const deleteTransaction = async (id: number) => {
    return db.transactions.delete(id)
  }

  return { transactions, addTransaction, updateTransaction, deleteTransaction }
}
