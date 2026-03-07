import { useLiveQuery } from 'dexie-react-hooks'
import { db, type CreditScoreEntry } from '../db/database'

export function useCreditScores() {
  const scores = useLiveQuery(
    () => db.creditScores.orderBy('date').toArray(),
  ) ?? []

  const addScore = async (entry: Omit<CreditScoreEntry, 'id' | 'createdAt'>) => {
    return db.creditScores.add({ ...entry, createdAt: new Date().toISOString() })
  }

  const deleteScore = async (id: number) => {
    return db.creditScores.delete(id)
  }

  const latest = scores.length > 0 ? scores[scores.length - 1] : null
  const previous = scores.length > 1 ? scores[scores.length - 2] : null
  const change = latest && previous ? latest.score - previous.score : null
  const highest = scores.length > 0 ? Math.max(...scores.map((s) => s.score)) : null
  const lowest = scores.length > 0 ? Math.min(...scores.map((s) => s.score)) : null

  return { scores, addScore, deleteScore, latest, previous, change, highest, lowest }
}
