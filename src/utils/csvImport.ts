import { db, type CategoryGroup, type TransactionType } from '../db/database'
import { sanitizeAmount, sanitizeString } from './sanitize'
import { inferCategory } from './categoryRules'

export interface ParsedRow {
  date: string
  type: TransactionType
  amount: number
  description: string
  categoryName: string
  categoryGroup: CategoryGroup | ''
  /** Confidence of the auto-assigned category: 'high' = merchant matched,
   *  'low' = keyword heuristic, 'none' = could not categorize */
  categoryConfidence: 'high' | 'low' | 'none'
}

const MAX_CSV_ROWS = 10_000
const MAX_CSV_ROWS_SIZE = 10 * 1024 * 1024

function detectDelimiter(line: string): string {
  const candidates: [string, RegExp][] = [
    ['\t', /\t/g],
    [',', /,/g],
    [';', /;/g],
    ['|', /\|/g],
  ]
  let best = ','
  let bestCount = 0
  for (const [delim, re] of candidates) {
    const count = (line.match(re) || []).length
    if (count > bestCount) {
      bestCount = count
      best = delim
    }
  }
  return best
}

function parseCSVLine(line: string, delimiter = ','): string[] {
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
    } else if (ch === delimiter && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += ch
    }
  }
  result.push(current.trim())
  return result
}

// Regex patterns for flexible column matching across many bank/app export formats
const COLUMN_PATTERNS: Record<string, RegExp[]> = {
  date: [
    /^(transaction\s+)?date$/i,
    /^posted\s+date$/i,
    /^trans(action)?\s*date$/i,
    /^date\s+of\s+transaction$/i,
    /^value\s+date$/i,
    /^booking\s+date$/i,
    /^settlement\s+date$/i,
  ],
  amount: [
    /^amount$/i,
    /^transaction\s+amount$/i,
    /^amt$/i,
    /^sum$/i,
    /^total$/i,
  ],
  debit: [
    /^debit$/i,
    /^debit\s+amount$/i,
    /^debit\(dr\)$/i,
    /^withdrawal(s)?$/i,
    /^withdrawl(s)?$/i,
    /^out$/i,
    /^payment(s)?$/i,
    /^dr$/i,
    /^money\s+out$/i,
  ],
  credit: [
    /^credit$/i,
    /^credit\s+amount$/i,
    /^credit\(cr\)$/i,
    /^deposit(s)?$/i,
    /^in$/i,
    /^cr$/i,
    /^money\s+in$/i,
    /^received$/i,
  ],
  description: [
    /^description$/i,
    /^(transaction\s+)?description$/i,
    /^memo$/i,
    /^payee$/i,
    /^(merchant\s+)?name$/i,
    /^merchant$/i,
    /^details$/i,
    /^narrative$/i,
    /^reference$/i,
    /^particulars$/i,
    /^note(s)?$/i,
    /^remarks?$/i,
    /^original\s+description$/i,
    /^transaction\s+detail(s)?$/i,
  ],
  type: [
    /^type$/i,
    /^transaction\s+type$/i,
    /^trans(action)?\s*type$/i,
    /^dr\/cr$/i,
    /^cr\/dr$/i,
    /^direction$/i,
  ],
}

function findColumnByRegex(headers: string[], patterns: RegExp[]): number {
  for (const pattern of patterns) {
    const idx = headers.findIndex((h) => pattern.test(h.trim()))
    if (idx !== -1) return idx
  }
  return -1
}

function findAmountColumn(cols: string[]): number {
  for (let i = 0; i < cols.length; i++) {
    if (/^-?[$£€¥]?[\d,]+\.?\d*$/.test(cols[i].trim())) return i
  }
  return 1
}

function findDescColumn(len: number, dateIdx: number, amountIdx: number): number {
  for (let i = 0; i < len; i++) {
    if (i !== dateIdx && i !== amountIdx) return i
  }
  return 2
}


const MIN_DATE = '1970-01-01'
const MAX_DATE = '2100-12-31'

function normalizeDate(raw: string): string | null {
  const cleaned = raw.trim()

  // ISO: YYYY-MM-DD or YYYY/MM/DD or YYYY.MM.DD
  const isoMatch = cleaned.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})/)
  if (isoMatch) {
    const iso = `${isoMatch[1]}-${isoMatch[2].padStart(2, '0')}-${isoMatch[3].padStart(2, '0')}`
    return iso >= MIN_DATE && iso <= MAX_DATE ? iso : null
  }

  // MM/DD/YYYY or MM-DD-YYYY or MM.DD.YYYY (US format)
  const mdyMatch = cleaned.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})$/)
  if (mdyMatch) {
    const [, m, d, y] = mdyMatch
    const year = y.length === 2 ? 2000 + parseInt(y) : parseInt(y)
    const iso = `${year}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
    return iso >= MIN_DATE && iso <= MAX_DATE ? iso : null
  }

  // "Jan 15, 2024" or "January 15 2024"
  const monthNameMatch = cleaned.match(
    /^(\w+)\s+(\d{1,2})[,\s]+(\d{4})$/
  )
  if (monthNameMatch) {
    const d = new Date(`${monthNameMatch[1]} ${monthNameMatch[2]}, ${monthNameMatch[3]}`)
    if (!isNaN(d.getTime())) {
      const iso = d.toISOString().split('T')[0]
      return iso >= MIN_DATE && iso <= MAX_DATE ? iso : null
    }
  }

  // Fallback: native Date parse
  const d = new Date(cleaned)
  if (!isNaN(d.getTime())) {
    const iso = d.toISOString().split('T')[0]
    return iso >= MIN_DATE && iso <= MAX_DATE ? iso : null
  }

  return null
}

function parseAmount(raw: string): number | null {
  let cleaned = raw.trim()
  if (!cleaned) return null

  // Parentheses = negative: (45.00) → -45.00
  if (/^\(.*\)$/.test(cleaned)) {
    cleaned = '-' + cleaned.slice(1, -1)
  }

  // Remove currency symbols, spaces, commas (but keep minus and decimal)
  cleaned = cleaned.replace(/[$£€¥,\s]/g, '')

  const val = parseFloat(cleaned)
  return isNaN(val) ? null : val
}

export function parseCSV(text: string): ParsedRow[] {
  if (text.length > MAX_CSV_ROWS_SIZE) {
    throw new Error(`CSV file too large (max ${MAX_CSV_ROWS_SIZE / 1024 / 1024}MB)`)
  }

  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim()
  const lines = normalized.split('\n')
  if (lines.length < 2) return []

  if (lines.length - 1 > MAX_CSV_ROWS) {
    throw new Error(`CSV has ${lines.length - 1} data rows (max ${MAX_CSV_ROWS})`)
  }

  const delimiter = detectDelimiter(lines[0])
  const headerCols = parseCSVLine(lines[0], delimiter)

  const dateIdx = findColumnByRegex(headerCols, COLUMN_PATTERNS.date)
  const amountIdx = findColumnByRegex(headerCols, COLUMN_PATTERNS.amount)
  const debitIdx = findColumnByRegex(headerCols, COLUMN_PATTERNS.debit)
  const creditIdx = findColumnByRegex(headerCols, COLUMN_PATTERNS.credit)
  const descIdx = findColumnByRegex(headerCols, COLUMN_PATTERNS.description)
  const typeIdx = findColumnByRegex(headerCols, COLUMN_PATTERNS.type)

  const separateDebitCredit = debitIdx !== -1 || creditIdx !== -1

  const rows: ParsedRow[] = []

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    const cols = parseCSVLine(line, delimiter)
    if (cols.length < 2) continue

    // Resolve date
    const resolvedDateIdx = dateIdx !== -1 ? dateIdx : 0
    const rawDate = cols[resolvedDateIdx]?.trim()
    if (!rawDate) continue
    const parsedDate = normalizeDate(rawDate)
    if (!parsedDate) continue

    // Resolve amount
    let amount: number
    let type: TransactionType = 'expense'

    if (separateDebitCredit) {
      const debitVal = debitIdx !== -1 ? parseAmount(cols[debitIdx]?.trim() ?? '') : null
      const creditVal = creditIdx !== -1 ? parseAmount(cols[creditIdx]?.trim() ?? '') : null

      const hasDebit = debitVal !== null && Math.abs(debitVal) > 0
      const hasCredit = creditVal !== null && Math.abs(creditVal) > 0

      if (hasDebit && !hasCredit) {
        amount = Math.abs(debitVal!)
        type = 'expense'
      } else if (hasCredit && !hasDebit) {
        amount = Math.abs(creditVal!)
        type = 'income'
      } else if (hasDebit && hasCredit) {
        // Both present (rare) — treat net: credit - debit
        const net = Math.abs(creditVal!) - Math.abs(debitVal!)
        amount = Math.abs(net)
        type = net >= 0 ? 'income' : 'expense'
      } else {
        continue
      }
    } else {
      const resolvedAmountIdx =
        amountIdx !== -1 ? amountIdx : findAmountColumn(cols)
      const rawAmount = cols[resolvedAmountIdx]?.trim()
      if (!rawAmount) continue

      const parsed = parseAmount(rawAmount)
      if (parsed === null) continue

      amount = parsed

      if (typeIdx !== -1) {
        const t = cols[typeIdx]?.trim().toLowerCase() ?? ''
        type = /^(income|credit|deposit|cr|in)$/.test(t) ? 'income' : 'expense'
      } else if (amount > 0) {
        type = 'income'
      } else {
        type = 'expense'
        amount = Math.abs(amount)
      }
    }

    const resolvedDescIdx =
      descIdx !== -1
        ? descIdx
        : findDescColumn(
            headerCols.length,
            resolvedDateIdx,
            amountIdx !== -1 ? amountIdx : debitIdx !== -1 ? debitIdx : 1,
          )

    const rawDesc = cols[resolvedDescIdx]?.trim() || ''
    const sanitizedDesc = sanitizeString(rawDesc)

    // CSV category columns are parsed but not used for confidence or pre-filling —
    // bank naming conventions ("Food & Drink" etc.) don't map to our presets.

    // Confidence is determined solely by the inference engine against the description.
    // CSV-provided category columns (common in bank exports like Chase/Mint) use
    // naming conventions that don't match our presets, so we deliberately ignore
    // them for confidence — otherwise every row gets flagged as 'low' and nothing
    // ever lands in the Unmatched bucket.
    const inferred = inferCategory(sanitizedDesc)

    let categoryName = ''
    let categoryGroup: CategoryGroup | '' = ''
    let categoryConfidence: ParsedRow['categoryConfidence'] = 'none'

    if (inferred?.confidence === 'high') {
      // Named merchant match — pre-fill with our preset-aligned category name.
      categoryName = inferred.categoryName
      categoryGroup = inferred.categoryGroup
      categoryConfidence = 'high'
    } else if (inferred?.confidence === 'low') {
      // Keyword heuristic — pre-fill the guess so the user can see it,
      // but keep confidence 'low' so it stays in the Uncertain tab for review.
      categoryName = inferred.categoryName
      categoryGroup = inferred.categoryGroup
      categoryConfidence = 'low'
    }
    // else 'none': no signal at all → blank, goes to Unmatched

    rows.push({
      date: parsedDate,
      type,
      amount: sanitizeAmount(Math.abs(amount)),
      description: sanitizedDesc,
      categoryName,
      categoryGroup,
      categoryConfidence,
    })
  }

  return rows
}

/** Returns the indices of rows that appear to be duplicates of existing transactions
 *  or of earlier rows in the same import batch. */
export async function detectDuplicates(rows: ParsedRow[]): Promise<Set<number>> {
  const existing = await db.transactions.toArray()

  const existingKeys = new Set(
    existing.map(
      (t) => `${t.date}|${t.amount.toFixed(2)}|${t.description.trim().toLowerCase()}`,
    ),
  )

  const duplicateIndices = new Set<number>()
  const seenInBatch = new Set<string>()

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const key = `${row.date}|${row.amount.toFixed(2)}|${row.description.trim().toLowerCase()}`
    if (existingKeys.has(key) || seenInBatch.has(key)) {
      duplicateIndices.add(i)
    }
    seenInBatch.add(key)
  }

  return duplicateIndices
}

const BATCH_SIZE = 100

export async function importCSVTransactions(
  rows: ParsedRow[],
  defaultCategoryId: number,
): Promise<number> {
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

  const validCategoryIds = new Set(
    categories.map((c) => c.id).filter((id): id is number => id != null),
  )

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
    return validCategoryIds.has(defaultCategoryId)
      ? defaultCategoryId
      : (categories.find((c) => c.id != null)?.id ?? 0)
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
