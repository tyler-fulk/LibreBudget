export interface PasswordCheck {
  label: string
  met: boolean
}

export interface PasswordValidation {
  checks: PasswordCheck[]
  allPassed: boolean
  strength: 'weak' | 'fair' | 'good' | 'strong'
  score: number
}

export function validatePassword(password: string): PasswordValidation {
  const checks: PasswordCheck[] = [
    { label: 'At least 8 characters', met: password.length >= 8 },
    { label: 'Uppercase letter (A-Z)', met: /[A-Z]/.test(password) },
    { label: 'Lowercase letter (a-z)', met: /[a-z]/.test(password) },
    { label: 'Number (0-9)', met: /[0-9]/.test(password) },
    { label: 'Special character (!@#$...)', met: /[^A-Za-z0-9]/.test(password) },
  ]

  const score = checks.filter((c) => c.met).length
  const allPassed = score === checks.length

  const strength: PasswordValidation['strength'] =
    score <= 2 ? 'weak' : score <= 3 ? 'fair' : score <= 4 ? 'good' : 'strong'

  return { checks, allPassed, strength, score }
}

export const STRENGTH_CONFIG = {
  weak: { color: '#ef4444', label: 'Weak', width: '20%' },
  fair: { color: '#f97316', label: 'Fair', width: '40%' },
  good: { color: '#eab308', label: 'Good', width: '70%' },
  strong: { color: '#22c55e', label: 'Strong', width: '100%' },
} as const
