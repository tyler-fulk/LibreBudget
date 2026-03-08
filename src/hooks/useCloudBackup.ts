import { useState, useEffect, useCallback, useRef } from 'react'
import { useWallet } from './useWallet'
import { db } from '../db/database'
import { serializeDatabase, hydrateDatabase, validateBackupPayload, type BackupPayload } from '../db/backup'
import { encryptBackup, decryptBackup } from '../utils/crypto'

const BACKUP_API_URL = import.meta.env.VITE_BACKUP_API_URL as string | undefined

/** Debounce delay for auto-backup after edits (protects KV 1k writes/day limit) */
const AUTO_BACKUP_DEBOUNCE_MS = 30_000

/** Cooldown after manual backup */
const MANUAL_BACKUP_COOLDOWN_SEC = 30

export function useCloudBackup() {
  const { wallet, hasWallet } = useWallet()
  const [lastBackupAt, setLastBackupAt] = useState<string | null>(null)
  const [isBacking, setIsBacking] = useState(false)
  const [isRestoring, setIsRestoring] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isDirtyRef = useRef(false)
  const isBackingRef = useRef(false)
  const enabled = !!BACKUP_API_URL && hasWallet && !!wallet

  const [backupCooldown, setBackupCooldown] = useState(0)
  const cooldownInterval = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    const checkCooldown = () => {
      const lastManual = localStorage.getItem('lb_last_manual_backup')
      if (lastManual) {
        const diff = Math.floor((Date.now() - parseInt(lastManual, 10)) / 1000)
        if (diff < MANUAL_BACKUP_COOLDOWN_SEC) {
          setBackupCooldown(MANUAL_BACKUP_COOLDOWN_SEC - diff)
        } else {
          setBackupCooldown(0)
        }
      } else {
        setBackupCooldown(0)
      }
    }

    checkCooldown()
    cooldownInterval.current = setInterval(checkCooldown, 1000)

    return () => {
      if (cooldownInterval.current) clearInterval(cooldownInterval.current)
    }
  }, [])

  const backupNow = useCallback(
    async (_p?: string, isAuto = false) => {
      if (!enabled || !wallet) return
      isBackingRef.current = true
      setIsBacking(true)
      setError(null)
      isDirtyRef.current = false
      try {
        const payload = await serializeDatabase()
        const encrypted = await encryptBackup(JSON.stringify(payload), wallet.encryptionKey)

        const res = await fetch(`${BACKUP_API_URL}/backup`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: wallet.anonymousId, payload: encrypted }),
        })
        if (!res.ok) throw new Error('Backup failed')
        setLastBackupAt(payload.backedUpAt)

        if (!isAuto) {
          localStorage.setItem('lb_last_manual_backup', Date.now().toString())
          setBackupCooldown(MANUAL_BACKUP_COOLDOWN_SEC)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Backup failed')
        isDirtyRef.current = true
      } finally {
        isBackingRef.current = false
        setIsBacking(false)
      }
    },
    [enabled, wallet]
  )

  const scheduleBackup = useCallback(() => {
    if (!enabled) return
    isDirtyRef.current = true
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null
      backupNow(undefined, true)
    }, AUTO_BACKUP_DEBOUNCE_MS)
  }, [enabled, backupNow])

  const deleteAccountData = useCallback(async (): Promise<{ error: string | null }> => {
    if (!enabled || !wallet) return { error: 'Not configured' }
    setIsDeleting(true)
    setError(null)
    try {
      const res = await fetch(`${BACKUP_API_URL}/backup/${encodeURIComponent(wallet.anonymousId)}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Delete failed')
      return { error: null }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Delete failed'
      setError(msg)
      return { error: msg }
    } finally {
      setIsDeleting(false)
    }
  }, [enabled, wallet])

  const restoreFromCloud = useCallback(
    async (turnstileToken?: string | null) => {
      if (!enabled || !wallet) return
      setIsRestoring(true)
      setError(null)
      try {
        const headers: HeadersInit = {}
        if (turnstileToken) headers['X-Turnstile-Token'] = turnstileToken
        const res = await fetch(`${BACKUP_API_URL}/backup/${encodeURIComponent(wallet.anonymousId)}`, {
          headers,
        })
        if (res.status === 404) {
          setError('No cloud backup found. Back up your data first.')
          return
        }
        if (!res.ok) {
          const body = await res.json().catch(() => ({})) as { error?: string; hint?: string }
          const msg = body.error || 'Restore failed'
          throw new Error(body.hint ? `${msg}. ${body.hint}` : msg)
        }

        const payloadBase64 = await res.text()
        if (!payloadBase64) {
          setError('Empty backup')
          return
        }

        const decrypted = await decryptBackup(payloadBase64, wallet.encryptionKey)
        const payload = JSON.parse(decrypted) as BackupPayload
        const validation = validateBackupPayload(payload)
        if (!validation.valid) {
          setError(`Invalid backup: ${validation.reason}`)
          return
        }

        await hydrateDatabase(payload)
        setLastBackupAt(payload.backedUpAt)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Restore failed')
      } finally {
        setIsRestoring(false)
      }
    },
    [enabled, wallet]
  )

  useEffect(() => {
    if (!enabled || !wallet) {
      setLastBackupAt(null)
      return
    }
  }, [enabled, wallet])

  useEffect(() => {
    if (!enabled) return

    const tables = [
      db.transactions,
      db.categories,
      db.budgetGoals,
      db.settings,
      db.recurringTransactions,
      db.savingsGoals,
      db.debts,
      db.creditScores,
    ] as const

    const onEdit = () => scheduleBackup()

    for (const table of tables) {
      table.hook('creating', onEdit)
      table.hook('updating', onEdit)
      table.hook('deleting', onEdit)
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && isDirtyRef.current && !isBackingRef.current) {
        if (debounceRef.current) {
          clearTimeout(debounceRef.current)
          debounceRef.current = null
        }
        backupNow(undefined, true)
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      for (const table of tables) {
        table.hook('creating').unsubscribe(onEdit)
        table.hook('updating').unsubscribe(onEdit)
        table.hook('deleting').unsubscribe(onEdit)
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [enabled, scheduleBackup, backupNow])

  return {
    backupNow,
    restoreFromCloud,
    lastBackupAt,
    isBacking,
    isRestoring,
    isDeleting,
    deleteAccountData,
    error,
    enabled,
    isEncrypted: true,
    backupCooldown,
    passphraseSet: hasWallet,
  }
}
