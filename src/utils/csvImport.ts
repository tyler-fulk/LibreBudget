import { db, type CategoryGroup, type TransactionType } from '../db/database'
import { sanitizeAmount, sanitizeString } from './sanitize'

interface ParsedRow {
  date: string
  type: TransactionType
  amount: number
  description: string
  categoryName: string
  categoryGroup: CategoryGroup | ''
}

const MAX_CSV_ROWS = 10_000
const MAX_CSV_SIZE = 10 * 1024 * 1024

export function parseCSV(text: string): ParsedRow[] {
  if (text.length > MAX_CSV_SIZE) {
    throw new Error(`CSV file too large (max ${MAX_CSV_SIZE / 1024 / 1024}MB)`)
  }

  const lines = text.trim().split('\n')
  if (lines.length < 2) return []

  if (lines.length - 1 > MAX_CSV_ROWS) {
    throw new Error(`CSV has ${lines.length - 1} data rows (max ${MAX_CSV_ROWS})`)
  }

  const header = lines[0].toLowerCase()
  const rows: ParsedRow[] = []

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i])
    if (cols.length < 3) continue

    const dateCol = findColumn(header, ['date', 'transaction date', 'posted date'])
    const amountCol = findColumn(header, ['amount', 'debit', 'credit'])
    const descCol = findColumn(header, ['description', 'memo', 'payee', 'name', 'merchant'])
    const typeCol = findColumn(header, ['type', 'transaction type'])
    const categoryCol = findColumn(header, ['category', 'category name'])
    const groupCol = findColumn(header, ['group', 'category group'])

    const headerCols = parseCSVLine(lines[0])
    const dateIdx = dateCol !== -1 ? dateCol : 0
    const amountIdx = amountCol !== -1 ? amountCol : findAmountColumn(cols)
    const descIdx = descCol !== -1 ? descCol : findDescColumn(headerCols.length, dateIdx, amountIdx)
    const categoryIdx = categoryCol !== -1 ? categoryCol : -1
    const groupIdx = groupCol !== -1 ? groupCol : -1

    const rawDate = cols[dateIdx]?.trim()
    const rawAmount = cols[amountIdx]?.trim()
    const rawDesc = cols[descIdx]?.trim() || ''

    if (!rawDate || !rawAmount) continue

    const parsedDate = normalizeDate(rawDate)
    if (!parsedDate) continue

    let amount = parseFloat(rawAmount.replace(/[$,]/g, ''))
    if (isNaN(amount)) continue

    let type: TransactionType = 'expense'
    if (typeCol !== -1) {
      const t = cols[typeCol]?.trim().toLowerCase()
      type = t === 'income' || t === 'credit' || t === 'deposit' ? 'income' : 'expense'
    } else if (amount > 0) {
      type = 'income'
    } else {
      type = 'expense'
      amount = Math.abs(amount)
    }

    const rawCategory = categoryIdx !== -1 ? cols[categoryIdx]?.trim() || '' : ''
    const rawGroup = groupIdx !== -1 ? cols[groupIdx]?.trim().toLowerCase() || '' : ''
    const categoryGroup = normalizeGroup(rawGroup) as CategoryGroup | ''

    rows.push({
      date: parsedDate,
      type,
      amount: sanitizeAmount(Math.abs(amount)),
      description: sanitizeString(rawDesc),
      categoryName: sanitizeString(rawCategory, 100),
      categoryGroup,
    })
  }

  return rows
}

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += ch
    }
  }
  result.push(current)
  return result
}

function findColumn(header: string, names: string[]): number {
  const cols = parseCSVLine(header)
  for (const name of names) {
    const idx = cols.findIndex((c) => c.trim().toLowerCase() === name)
    if (idx !== -1) return idx
  }
  return -1
}

function findAmountColumn(cols: string[]): number {
  for (let i = 0; i < cols.length; i++) {
    if (/^-?[$]?[\d,]+\.?\d*$/.test(cols[i].trim())) return i
  }
  return 1
}

function findDescColumn(len: number, dateIdx: number, amountIdx: number): number {
  for (let i = 0; i < len; i++) {
    if (i !== dateIdx && i !== amountIdx) return i
  }
  return 2
}

const VALID_GROUPS = ['needs', 'wants', 'investments', 'income'] as const

function normalizeGroup(raw: string): string {
  const lower = raw.trim().toLowerCase()
  return VALID_GROUPS.includes(lower as (typeof VALID_GROUPS)[number]) ? lower : ''
}

const MIN_DATE = '1970-01-01'
const MAX_DATE = '2100-12-31'

function normalizeDate(raw: string): string | null {
  const d = new Date(raw)
  if (!isNaN(d.getTime())) {
    const iso = d.toISOString().split('T')[0]
    return iso >= MIN_DATE && iso <= MAX_DATE ? iso : null
  }
  const parts = raw.split(/[/\-.]/)
  if (parts.length === 3) {
    const [a, b, c] = parts.map(Number)
    const iso =
      a > 31 ? `${a}-${String(b).padStart(2, '0')}-${String(c).padStart(2, '0')}` : `${c > 99 ? c : c + 2000}-${String(a).padStart(2, '0')}-${String(b).padStart(2, '0')}`
    return iso >= MIN_DATE && iso <= MAX_DATE ? iso : null
  }
  return null
}

const BATCH_SIZE = 100

export async function importCSVTransactions(rows: ParsedRow[], defaultCategoryId: number): Promise<number> {
  const categories = await db.categories.toArray()
  const catByKey = new Map<string, number>()
  for (const c of categories) {
    if (c.id == null) continue
    const key = `${c.name.trim().toLowerCase()}|${c.group}`
    catByKey.set(key, c.id)
  }
  const catByNameOnly = new Map<string, number>()
  for (const c of categories) {
    if (c.id == null) continue
    const key = c.name.trim().toLowerCase()
    if (!catByNameOnly.has(key)) catByNameOnly.set(key, c.id)
  }

  const validCategoryIds = new Set(categories.map((c) => c.id).filter((id): id is number => id != null))

  const resolveCategoryId = (row: ParsedRow): number => {
    const name = sanitizeString(row.categoryName ?? '', 100).trim().toLowerCase()
    if (!name) return defaultCategoryId
    if (row.categoryGroup) {
      const key = `${name}|${row.categoryGroup}`
      const id = catByKey.get(key)
      if (id != null && validCategoryIds.has(id)) return id
    }
    const byName = catByNameOnly.get(name)
    if (byName != null && validCategoryIds.has(byName)) return byName
    return validCategoryIds.has(defaultCategoryId) ? defaultCategoryId : categories.find((c) => c.id != null)?.id ?? 0
  }

  let count = 0
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE).map((row) => ({
      amount: sanitizeAmount(row.amount),
      type: row.type,
      categoryId: resolveCategoryId(row),
      description: sanitizeString(row.description),
      note: 'Imported from CSV',
      date: row.date,
      createdAt: new Date().toISOString(),
    }))
    await db.transactions.bulkAdd(batch)
    count += batch.length
  }
  return count
}
