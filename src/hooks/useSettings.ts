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

  const notificationsEnabled = settings['notificationsEnabled'] !== 'false'

  return {
    settings,
    getSetting,
    setSetting,
    trackingPeriod,
    monthlyBudget,
    notificationsEnabled,
  }
}
