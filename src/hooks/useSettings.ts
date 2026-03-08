import { useLiveQuery } from 'dexie-react-hooks'
import { db, type TrackingPeriod } from '../db/database'

export function useSettings() {
  const settingsRaw = useLiveQuery(() => db.settings.toArray()) ?? []

  const settings = Object.fromEntries(
    settingsRaw.map((s) => [s.key, s.value]),
  ) as Record<string, string>

  const getSetting = (key: string, defaultValue = ''): string => {
    return settings[key] ?? defaultValue
  }

  const setSetting = async (key: string, value: string) => {
    const existing = await db.settings.where('key').equals(key).first()
    if (existing?.id) {
      return db.settings.update(existing.id, { value })
    }
    return db.settings.add({ key, value })
  }

  const trackingPeriod: TrackingPeriod =
    (settings['trackingPeriod'] as TrackingPeriod) ?? 'monthly'

  const monthlyBudget = parseFloat(settings['monthlyBudget'] ?? '3000')

  /** Returns the budget for a specific month (YYYY-MM), falling back to the global default. */
  const getMonthlyBudget = (month: string): number =>
    parseFloat(settings[`monthlyBudget-${month}`] ?? settings['monthlyBudget'] ?? '3000')

  /** Persists a budget for a specific month without touching the global default. */
  const setMonthlyBudget = (month: string, amount: number) =>
    setSetting(`monthlyBudget-${month}`, amount.toString())

  const notificationsEnabled = settings['notificationsEnabled'] !== 'false'

  return {
    settings,
    getSetting,
    setSetting,
    trackingPeriod,
    monthlyBudget,
    getMonthlyBudget,
    setMonthlyBudget,
    notificationsEnabled,
  }
}
