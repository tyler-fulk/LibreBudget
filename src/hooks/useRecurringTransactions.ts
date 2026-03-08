import { useLiveQuery } from 'dexie-react-hooks'
import { useCallback, useEffect } from 'react'
import { format, addDays, addWeeks, addMonths, addYears } from 'date-fns'
import { db, type RecurringTransaction, type RecurrenceInterval } from '../db/database'
import { sanitizeString, sanitizeAmount } from '../utils/sanitize'

function advanceDate(date: string, interval: RecurrenceInterval): string {
  const d = new Date(date)
  switch (interval) {
    case 'daily': return format(addDays(d, 1), 'yyyy-MM-dd')
    case 'weekly': return format(addWeeks(d, 1), 'yyyy-MM-dd')
    case 'biweekly': return format(addWeeks(d, 2), 'yyyy-MM-dd')
    case 'monthly': return format(addMonths(d, 1), 'yyyy-MM-dd')
    case 'yearly': return format(addYears(d, 1), 'yyyy-MM-dd')
  }
}

export function useRecurringTransactions() {
  const recurring = useLiveQuery(() => db.recurringTransactions.toArray()) ?? []

  const addRecurring = async (r: Omit<RecurringTransaction, 'id' | 'createdAt'>) => {
    return db.recurringTransactions.add({
      ...r,
      description: sanitizeString(r.description ?? ''),
      note: sanitizeString(r.note ?? ''),
      amount: sanitizeAmount(r.amount),
      createdAt: new Date().toISOString(),
    })
  }

  const updateRecurring = async (id: number, changes: Partial<RecurringTransaction>) => {
    const sanitized: Partial<RecurringTransaction> = { ...changes }
    if (changes.description !== undefined) sanitized.description = sanitizeString(changes.description)
    if (changes.note !== undefined) sanitized.note = sanitizeString(changes.note)
    if (changes.amount !== undefined) sanitized.amount = sanitizeAmount(changes.amount)
    return db.recurringTransactions.update(id, sanitized)
  }

  const deleteRecurring = async (id: number) => {
    return db.recurringTransactions.delete(id)
  }

  const processDue = useCallback(async () => {
    const today = format(new Date(), 'yyyy-MM-dd')
    const due = await db.recurringTransactions
      .where('enabled')
      .equals(1)
      .filter((r) => r.nextDue <= today)
      .toArray()

    for (const r of due) {
      await db.transactions.add({
        amount: r.amount,
        type: r.type,
        categoryId: r.categoryId,
        description: r.description,
        note: r.note || '',
        date: r.nextDue,
        createdAt: new Date().toISOString(),
      })
      await db.recurringTransactions.update(r.id!, {
        nextDue: advanceDate(r.nextDue, r.interval),
      })
    }
    return due.length
  }, [])

  useEffect(() => {
    processDue()
  }, [processDue])

  return { recurring, addRecurring, updateRecurring, deleteRecurring, processDue }
}
