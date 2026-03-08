import { useState } from 'react'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { useSettings } from '../hooks/useSettings'
import { useCategories } from '../hooks/useCategories'
import { useTheme } from '../hooks/useTheme'
import { EncryptionBadge } from '../components/ui/EncryptionBadge'
import { useShowEncryptionIndicators } from '../hooks/useShowEncryptionIndicators'
import { db, ALL_GROUPS, type CategoryGroup } from '../db/database'
import { serializeDatabase, hydrateDatabase, type BackupPayload } from '../db/backup'
import { GROUP_COLORS, GROUP_LABELS, getCategoryIconClassName } from '../utils/colors'
import { useWallet } from '../hooks/useWallet'
import { useCloudBackup } from '../hooks/useCloudBackup'
import { exportTransactionsCSV, downloadCSV, exportTransactionsPDF } from '../utils/csvExport'
import { parseCSV, importCSVTransactions } from '../utils/csvImport'
import {
  requestNotificationPermission,
  getNotificationPermission,
} from '../utils/notifications'
import { Icon, CATEGORY_ICONS } from '../components/ui/Icon'

export default function Settings() {
  const {
    trackingPeriod,
    notificationsEnabled,
    getSetting,
    setSetting,
    monthlyBudget,
  } = useSettings()
  const {
    categories,
    categoriesByGroup,
    addCategory,
    deleteCategory,
  } = useCategories()

  const { theme, toggleTheme } = useTheme()
  const { show: showEncryptionIndicators, toggle: toggleEncryptionIndicators } = useShowEncryptionIndicators()
  const [exportStatus, setExportStatus] = useState('')
  const [importStatus, setImportStatus] = useState('')
  const [csvStatus, setCsvStatus] = useState('')
  const [permissionState, setPermissionState] = useState(
    getNotificationPermission(),
  )
  const { hasWallet } = useWallet()
  const { lastBackupAt, isBacking, enabled: backupEnabled } = useCloudBackup()
  const isCloudConfigured = !!import.meta.env.VITE_BACKUP_API_URL
  const [showCatModal, setShowCatModal] = useState(false)
  const [newCatName, setNewCatName] = useState('')
  const [newCatGroup, setNewCatGroup] = useState<CategoryGroup>('needs')
  const [newCatIcon, setNewCatIcon] = useState('Wallet')
  const [catError, setCatError] = useState('')

  const handleExport = async () => {
    try {
      const data = await serializeDatabase()
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json',
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `librebudget-backup-${new Date().toISOString().split('T')[0]}.json`
      a.click()
      URL.revokeObjectURL(url)
      setExportStatus('Export successful!')
      setTimeout(() => setExportStatus(''), 3000)
    } catch {
      setExportStatus('Export failed')
    }
  }

  const handleImport = async () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return

      try {
        const text = await file.text()
        const data = JSON.parse(text)

        if (!data.version) {
          setImportStatus('Invalid backup file')
          return
        }

        await hydrateDatabase(data as BackupPayload)

        setImportStatus('Import successful! Refreshing...')
        setTimeout(() => window.location.reload(), 1500)
      } catch {
        setImportStatus('Failed to import data')
      }
    }
    input.click()
  }

  const handleResetData = async () => {
    if (!window.confirm('Are you sure? This will delete ALL your data. This cannot be undone.')) return

    await db.transaction('rw', [db.categories, db.transactions, db.budgetGoals, db.monthlySnapshots, db.settings, db.recurringTransactions, db.savingsGoals, db.debts, db.creditScores], async () => {
      await db.categories.clear()
      await db.transactions.clear()
      await db.budgetGoals.clear()
      await db.monthlySnapshots.clear()
      await db.settings.clear()
      await db.recurringTransactions.clear()
      await db.savingsGoals.clear()
      await db.debts.clear()
      await db.creditScores.clear()
    })
    window.location.reload()
  }

  const handleRequestPermission = async () => {
    await requestNotificationPermission()
    setPermissionState(getNotificationPermission())
  }

  const handleAddCategory = async () => {
    const trimmed = newCatName.trim()
    if (!trimmed) return
    const exists = categories.some(
      (c) => c.name.toLowerCase() === trimmed.toLowerCase() && c.group === newCatGroup,
    )
    if (exists) {
      setCatError('A category with this name already exists in this group')
      return
    }
    await addCategory({
      name: trimmed,
      group: newCatGroup,
      color: GROUP_COLORS[newCatGroup],
      icon: newCatIcon,
      isPreset: false,
    })
    setNewCatName('')
    setNewCatIcon('Wallet')
    setCatError('')
    setShowCatModal(false)
  }

  const handleDeleteCategory = async (id: number) => {
    try {
      await deleteCategory(id)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Cannot delete category')
    }
  }

  const handleCSVExport = async () => {
    try {
      const csv = await exportTransactionsCSV()
      downloadCSV(csv, `librebudget-transactions-${new Date().toISOString().split('T')[0]}.csv`)
      setCsvStatus('CSV exported!')
      setTimeout(() => setCsvStatus(''), 3000)
    } catch { setCsvStatus('Export failed') }
  }

  const handlePDFExport = async () => {
    try {
      await exportTransactionsPDF()
    } catch { setCsvStatus('PDF export failed') }
  }

  const handleCSVImport = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.csv'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      try {
        const text = await file.text()
        const rows = parseCSV(text)
        if (rows.length === 0) { setCsvStatus('No valid rows found'); return }
        const defaultCat = categories.find((c) => c.group === 'needs') ?? categories[0]
        if (!defaultCat?.id) { setCsvStatus('No categories available'); return }
        const count = await importCSVTransactions(rows, defaultCat.id)
        setCsvStatus(`Imported ${count} transactions!`)
        setTimeout(() => setCsvStatus(''), 3000)
      } catch (err) { setCsvStatus(err instanceof Error ? err.message : 'Failed to import CSV') }
    }
    input.click()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-bold">Settings</h1>
        <EncryptionBadge />
      </div>

      {/* Cloud Backup status */}
      {isCloudConfigured && (
        <Card>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`h-3 w-3 rounded-full ${
                  backupEnabled
                    ? isBacking
                      ? 'bg-yellow-500 animate-pulse'
                      : 'bg-green-500'
                    : 'bg-slate-600'
                }`}
              />
              <div>
                <h3 className="text-sm font-medium text-slate-200">
                  Cloud Backup
                </h3>
                <p className="text-xs text-slate-500">
                  {!hasWallet
                    ? 'Create or restore vault to enable'
                    : isBacking
                      ? 'Syncing...'
                      : lastBackupAt
                        ? `Last backup: ${new Date(lastBackupAt).toLocaleDateString()}`
                        : 'No backup yet'}
                </p>
              </div>
            </div>
            <a
              href="/account"
              className="text-xs font-medium text-green-400 hover:text-green-300"
            >
              {hasWallet ? 'Manage' : 'Set up'}
            </a>
          </div>
        </Card>
      )}

      {/* Encryption indicators toggle */}
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-slate-200">Encryption indicators</h3>
            <p className="text-xs text-slate-500">
              Show a lock icon next to fields that are encrypted before cloud backup
            </p>
          </div>
          <button
            onClick={toggleEncryptionIndicators}
            className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${showEncryptionIndicators ? 'bg-green-600' : 'bg-slate-700'}`}
          >
            <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform ${showEncryptionIndicators ? 'translate-x-5' : 'translate-x-0'}`} />
          </button>
        </div>
      </Card>

      {/* Theme toggle */}
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-slate-200">Appearance</h3>
            <p className="text-xs text-slate-500">Currently: {theme === 'dark' ? 'Dark' : 'Light'} mode</p>
          </div>
          <button
            onClick={toggleTheme}
            className={`relative h-6 w-11 rounded-full transition-colors ${theme === 'dark' ? 'bg-slate-700' : 'bg-green-600'}`}
          >
            <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform ${theme === 'light' ? 'translate-x-5' : 'translate-x-0'}`} />
          </button>
        </div>
      </Card>

      {/* Tracking period */}
      <Card>
        <h3 className="mb-3 text-sm font-medium text-slate-400">
          Tracking Period
        </h3>
        <div className="flex gap-2 rounded-xl bg-slate-800 p-1">
          {(['monthly', 'weekly'] as const).map((period) => (
            <button
              key={period}
              onClick={() => setSetting('trackingPeriod', period)}
              className={`flex-1 rounded-lg py-2.5 text-sm font-medium capitalize transition-colors ${
                trackingPeriod === period
                  ? 'bg-green-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {period}
            </button>
          ))}
        </div>
      </Card>

      {/* Monthly budget */}
      <Card>
        <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-400">
          Monthly Budget Target
          <EncryptionBadge />
        </h3>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
              $
            </span>
            <input
              type="number"
              value={monthlyBudget}
              onChange={(e) => setSetting('monthlyBudget', e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-800 py-2.5 pl-8 pr-4 text-slate-100 focus:border-green-500 focus:outline-none"
            />
          </div>
        </div>
      </Card>

      {/* Manage Categories */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-slate-400">
            Manage Categories
          </h3>
          <Button size="sm" onClick={() => setShowCatModal(true)}>
            + New Category
          </Button>
        </div>
        <div className="space-y-4">
          {ALL_GROUPS.map((group) => {
            const cats = categoriesByGroup(group)
            if (cats.length === 0) return null
            return (
              <div key={group}>
                <p
                  className="mb-2 text-xs font-semibold uppercase tracking-wider"
                  style={{ color: GROUP_COLORS[group] }}
                >
                  {GROUP_LABELS[group]}
                </p>
                <div className="space-y-1">
                  {cats.map((cat) => (
                    <div
                      key={cat.id}
                      className="flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-slate-800/50"
                    >
                      <Icon name={cat.icon} size={18} className={getCategoryIconClassName(cat.group)} />
                      <span className="flex-1 text-sm text-slate-200">
                        {cat.name}
                      </span>
                      {cat.isPreset ? (
                        <span className="text-xs text-slate-600">Preset</span>
                      ) : (
                        <button
                          onClick={() => cat.id && handleDeleteCategory(cat.id)}
                          className="rounded p-1 text-slate-500 hover:bg-red-900/30 hover:text-red-400"
                          title="Delete custom category"
                        >
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </Card>

      {/* Add Category Modal */}
      <Modal
        open={showCatModal}
        onClose={() => { setShowCatModal(false); setCatError('') }}
        title="New Custom Category"
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1 flex items-center gap-2 text-sm text-slate-400">Group <EncryptionBadge /></label>
            <div className="grid grid-cols-2 gap-2">
              {ALL_GROUPS.map((g) => (
                <button
                  key={g}
                  onClick={() => setNewCatGroup(g)}
                  className={`rounded-xl border py-2 text-sm font-medium transition-colors ${
                    newCatGroup === g
                      ? 'border-transparent text-white'
                      : 'border-slate-700 text-slate-400'
                  }`}
                  style={
                    newCatGroup === g
                      ? { backgroundColor: GROUP_COLORS[g] }
                      : undefined
                  }
                >
                  {GROUP_LABELS[g]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1 flex items-center gap-2 text-sm text-slate-400">Name <EncryptionBadge /></label>
            <input
              type="text"
              value={newCatName}
              onChange={(e) => { setNewCatName(e.target.value); setCatError('') }}
              placeholder="e.g. Pet Care"
              className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:border-green-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 flex items-center gap-2 text-sm text-slate-400">Icon <EncryptionBadge /></label>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORY_ICONS.map((icon) => (
                <button
                  key={icon}
                  onClick={() => setNewCatIcon(icon)}
                  className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${
                    newCatIcon === icon
                      ? 'bg-slate-700 ring-2 ring-green-500'
                      : 'hover:bg-slate-800 text-slate-400'
                  }`}
                >
                  <Icon name={icon} size={18} className={newCatIcon === icon ? getCategoryIconClassName(newCatGroup) : ''} />
                </button>
              ))}
            </div>
          </div>

          {catError && (
            <p className="text-xs text-red-400">{catError}</p>
          )}

          <Button onClick={handleAddCategory} className="w-full" disabled={!newCatName.trim()}>
            Add Category
          </Button>
        </div>
      </Modal>

      {/* Notifications */}
      <Card>
        <h3 className="mb-3 text-sm font-medium text-slate-400">
          Notifications
        </h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-200">Daily Reminders</p>
              <p className="text-xs text-slate-500">
                Get reminded to log expenses
              </p>
            </div>
            <button
              onClick={() =>
                setSetting(
                  'notificationsEnabled',
                  notificationsEnabled ? 'false' : 'true',
                )
              }
              className={`relative h-6 w-11 rounded-full transition-colors ${
                notificationsEnabled ? 'bg-green-600' : 'bg-slate-700'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                  notificationsEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {notificationsEnabled && (
            <>
              <div>
                <label className="mb-1 flex items-center gap-2 text-sm text-slate-400">
                  Reminder Time
                  <EncryptionBadge />
                </label>
                <input
                  type="time"
                  value={getSetting('notificationTime', '20:00')}
                  onChange={(e) =>
                    setSetting('notificationTime', e.target.value)
                  }
                  className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-slate-100 focus:border-green-500 focus:outline-none"
                />
              </div>

              {permissionState !== 'granted' && (
                <Button
                  variant="secondary"
                  onClick={handleRequestPermission}
                  size="sm"
                >
                  {permissionState === 'denied'
                    ? 'Notifications blocked (check browser settings)'
                    : 'Enable Browser Notifications'}
                </Button>
              )}

              {permissionState === 'granted' && (
                <p className="text-xs text-green-400">
                  Notifications are enabled
                </p>
              )}
            </>
          )}
        </div>
      </Card>

      {/* Data management */}
      <Card>
        <h3 className="mb-3 text-sm font-medium text-slate-400">
          Data Management
        </h3>
        <div className="space-y-3">
          <div className="flex gap-3">
            <Button variant="secondary" onClick={handleExport} className="flex-1">
              Export JSON
            </Button>
            <Button variant="secondary" onClick={handleImport} className="flex-1">
              Import JSON
            </Button>
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={handleCSVExport} className="flex-1">
              Export CSV
            </Button>
            <Button variant="secondary" onClick={handleCSVImport} className="flex-1">
              Import CSV
            </Button>
          </div>
          <Button variant="secondary" onClick={handlePDFExport} className="w-full">
            Print / PDF Report
          </Button>
          {exportStatus && (
            <p className="text-xs text-green-400">{exportStatus}</p>
          )}
          {importStatus && (
            <p className="text-xs text-green-400">{importStatus}</p>
          )}
          {csvStatus && (
            <p className="text-xs text-green-400">{csvStatus}</p>
          )}
          <hr className="border-slate-800" />
          <Button variant="danger" onClick={handleResetData} className="w-full">
            Reset All Data
          </Button>
          <p className="text-xs text-slate-500">
            This will permanently delete all your transactions, goals, and settings.
          </p>
        </div>
      </Card>

      {/* About */}
      <Card>
        <h3 className="mb-2 text-sm font-medium text-slate-400">About</h3>
        <p className="text-sm text-slate-300">
          <strong>LibreBudget</strong> v1.0.0
        </p>
        <p className="mt-1 text-xs text-slate-500">
          Free, open-source budget tracker.
        </p>
      </Card>
    </div>
  )
}
