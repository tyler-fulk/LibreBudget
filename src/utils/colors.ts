import type { CategoryGroup } from '../db/database'

export const GROUP_COLORS: Record<CategoryGroup, string> = {
  needs: '#eab308',
  wants: '#f97316',
  investments: '#3b82f6',
  income: '#22c55e',
}

/** Darker variants for light mode (better contrast on light backgrounds) */
export const GROUP_COLORS_LIGHT: Record<CategoryGroup, string> = {
  needs: '#ca8a04',
  wants: '#ea580c',
  investments: '#2563eb',
  income: '#15803d',
}

/** CSS class for category icons - use group color (dark theme default, light overrides in CSS) */
export function getCategoryIconClassName(group: CategoryGroup): string {
  return `category-icon-${group}`
}

export const GROUP_LABELS: Record<CategoryGroup, string> = {
  needs: 'Needs',
  wants: 'Wants',
  investments: 'Investments',
  income: 'Income',
}

export function getHealthBarColor(ratio: number): string {
  if (ratio <= 0.5) return '#22c55e'
  if (ratio <= 0.75) return '#eab308'
  if (ratio <= 0.9) return '#f97316'
  return '#ef4444'
}

export function getHealthBarGradient(ratio: number): string {
  if (ratio <= 0.5) return 'from-green-500 to-green-400'
  if (ratio <= 0.75) return 'from-green-500 via-yellow-500 to-yellow-400'
  if (ratio <= 0.9) return 'from-yellow-500 via-orange-500 to-orange-400'
  return 'from-orange-500 via-red-500 to-red-400'
}
