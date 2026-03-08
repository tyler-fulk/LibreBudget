/** Shared sanitization for imported data. */

const MAX_STRING_LENGTH = 500
const MAX_AMOUNT = 999_999_999.99
const AMOUNT_DECIMALS = 2

/** Sanitize strings: strip HTML/scripts, control chars, enforce length. */
export function sanitizeString(value: string, maxLen = MAX_STRING_LENGTH): string {
  if (typeof value !== 'string') return ''
  let s = value
    .replace(/\0/g, '') // null bytes
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // control chars
    .replace(/<[^>]*>/g, '') // strip HTML tags
    .replace(/javascript:/gi, '')
    .replace(/data:/gi, '')
    .replace(/vbscript:/gi, '')
    .trim()
  return s.length > maxLen ? s.slice(0, maxLen) : s
}

/** Sanitize amount: finite, 2 decimals, non-negative, capped. */
export function sanitizeAmount(value: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return 0
  const rounded = Math.round(value * Math.pow(10, AMOUNT_DECIMALS)) / Math.pow(10, AMOUNT_DECIMALS)
  return Math.min(rounded, MAX_AMOUNT)
}
