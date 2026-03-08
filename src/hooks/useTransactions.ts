import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Transaction } from '../db/database'
import { sanitizeString, sanitizeAmount } from '../utils/sanitize'

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
      description: sanitizeString(transaction.description ?? ''),
      note: sanitizeString(transaction.note ?? ''),
      amount: sanitizeAmount(transaction.amount),
      createdAt: new Date().toISOString(),
    })
  }

  const updateTransaction = async (id: number, changes: Partial<Transaction>) => {
    const sanitized: Partial<Transaction> = { ...changes }
    if (changes.description !== undefined) sanitized.description = sanitizeString(changes.description)
    if (changes.note !== undefined) sanitized.note = sanitizeString(changes.note)
    if (changes.amount !== undefined) sanitized.amount = sanitizeAmount(changes.amount)
    return db.transactions.update(id, sanitized)
  }

  const deleteTransaction = async (id: number) => {
    return db.transactions.delete(id)
  }

  return { transactions, addTransaction, updateTransaction, deleteTransaction }
}
