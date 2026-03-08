import { db, type Category } from '../db/database'
import { formatCurrency } from './calculations'

function escapeHtml(s: string): string {
  if (!s) return ''
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

const FORMULA_TRIGGERS = /^[=+\-@\t\r]/
function escapeCsv(s: string): string {
  if (!s) return '""'
  const escaped = String(s).replace(/"/g, '""')
  const prefix = FORMULA_TRIGGERS.test(escaped) ? "'" : ''
  return `"${prefix}${escaped}"`
}

export async function exportTransactionsCSV(): Promise<string> {
  const transactions = await db.transactions.orderBy('date').reverse().toArray()
  const categories = await db.categories.toArray()
  const catMap = new Map(
    categories
      .filter((c): c is Category & { id: number } => c.id != null)
      .map((c) => [c.id, c] as [number, Category])
  )

  const header = 'Date,Type,Category,Group,Amount,Description,Note'
  const rows = transactions.map((t) => {
    const cat = catMap.get(Number(t.categoryId))
    return [
      t.date,
      t.type,
      escapeCsv(cat?.name || 'Unknown'),
      cat?.group || '',
      t.amount.toFixed(2),
      escapeCsv(t.description || ''),
      escapeCsv(t.note || ''),
    ].join(',')
  })

  return [header, ...rows].join('\n')
}

export function downloadCSV(csv: string, filename: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export async function exportTransactionsPDF(): Promise<void> {
  const transactions = await db.transactions.orderBy('date').reverse().toArray()
  const categories = await db.categories.toArray()
  const catMap = new Map(
    categories
      .filter((c): c is Category & { id: number } => c.id != null)
      .map((c) => [c.id, c] as [number, Category])
  )

  let html = `<html><head><title>LibreBudget Report</title>
  <style>
    body { font-family: system-ui, sans-serif; padding: 40px; color: #1e293b; }
    h1 { font-size: 24px; margin-bottom: 8px; }
    p.sub { color: #64748b; font-size: 14px; margin-bottom: 24px; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th { text-align: left; padding: 8px 12px; border-bottom: 2px solid #e2e8f0; color: #64748b; font-weight: 600; }
    td { padding: 8px 12px; border-bottom: 1px solid #f1f5f9; }
    .income { color: #16a34a; }
    .expense { color: #0f172a; }
    @media print { body { padding: 20px; } }
  </style></head><body>
  <h1>LibreBudget Transaction Report</h1>
  <p class="sub">Generated ${escapeHtml(new Date().toLocaleDateString())} · ${transactions.length} transactions</p>
  <table><thead><tr><th>Date</th><th>Type</th><th>Category</th><th>Description</th><th style="text-align:right">Amount</th></tr></thead><tbody>`

  for (const t of transactions) {
    const cat = catMap.get(Number(t.categoryId))
    const desc = escapeHtml(t.description || '—')
    const note = t.note ? `<br><small style="color:#94a3b8">${escapeHtml(t.note)}</small>` : ''
    html += `<tr>
      <td>${escapeHtml(t.date)}</td>
      <td>${escapeHtml(t.type)}</td>
      <td>${escapeHtml(cat?.name || 'Unknown')}</td>
      <td>${desc}${note}</td>
      <td style="text-align:right" class="${escapeHtml(t.type)}">${t.type === 'income' ? '+' : '-'}${formatCurrency(t.amount)}</td>
    </tr>`
  }

  html += '</tbody></table></body></html>'

  const win = window.open('', '_blank')
  if (win) {
    win.document.write(html)
    win.document.close()
    setTimeout(() => win.print(), 500)
  }
}
