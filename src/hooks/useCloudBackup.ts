import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from './useAuth'
import { supabase } from '../lib/supabase'
import { db } from '../db/database'
import { serializeDatabase, hydrateDatabase, validateBackupPayload, type BackupPayload } from '../db/backup'
import { encryptData, decryptData, isEncryptedPayload } from '../utils/encryption'

const PASSPHRASE_KEY = 'lb-backup-passphrase'

export function getStoredPassphrase(): string | null {
  return sessionStorage.getItem(PASSPHRASE_KEY)
}

export function setStoredPassphrase(passphrase: string) {
  sessionStorage.setItem(PASSPHRASE_KEY, passphrase)
}

export function clearStoredPassphrase() {
  sessionStorage.removeItem(PASSPHRASE_KEY)
}

export function useCloudBackup() {
  const { user, isCloudAvailable } = useAuth()
  const [lastBackupAt, setLastBackupAt] = useState<string | null>(null)
  const [isBacking, setIsBacking] = useState(false)
  const [isRestoring, setIsRestoring] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isEncrypted, setIsEncrypted] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const enabled = isCloudAvailable && !!user && !!supabase

  const BACKUP_COOLDOWN = 30
  const [backupCooldown, setBackupCooldown] = useState(0)
  const cooldownInterval = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    const checkCooldown = () => {
      const lastManual = localStorage.getItem('lb_last_manual_backup')
      if (lastManual) {
        const diff = Math.floor((Date.now() - parseInt(lastManual, 10)) / 1000)
        if (diff < BACKUP_COOLDOWN) {
          setBackupCooldown(BACKUP_COOLDOWN - diff)
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

  const backupNow = useCallback(async (passphrase?: string, isAuto: boolean = false) => {
    if (!enabled || !supabase || !user) return
    const pp = passphrase || getStoredPassphrase()
    if (!pp) {
      setError('Encryption passphrase required. Set one in Account before backing up.')
      return
    }
    setIsBacking(true)
    setError(null)
    try {
      const payload = await serializeDatabase()
      const backupData = await encryptData(JSON.stringify(payload), pp)
      setIsEncrypted(true)

      const { error: upsertError } = await supabase
        .from('user_backups')
        .upsert(
          {
            user_id: user.id,
            backup_data: backupData,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' },
        )
      if (upsertError) throw upsertError
      setLastBackupAt(payload.backedUpAt)
      
      if (!isAuto) {
        localStorage.setItem('lb_last_manual_backup', Date.now().toString())
        setBackupCooldown(BACKUP_COOLDOWN)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Backup failed')
    } finally {
      setIsBacking(false)
    }
  }, [enabled, user])

  const scheduleBackup = useCallback(() => {
    if (!enabled) return
    if (!getStoredPassphrase()) return
    
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      backupNow(undefined, true)
    }, 5000)
  }, [enabled, backupNow])

  const deleteAccountData = useCallback(async (): Promise<{ error: string | null }> => {
    if (!enabled || !supabase || !user) return { error: 'Not configured' }
    setIsDeleting(true)
    setError(null)
    try {
      const { error: deleteError } = await supabase
        .from('user_backups')
        .delete()
        .eq('user_id', user.id)
      if (deleteError) throw deleteError
      return { error: null }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Delete failed'
      setError(msg)
      return { error: msg }
    } finally {
      setIsDeleting(false)
    }
  }, [enabled, user])

  const restoreFromCloud = useCallback(async (passphrase?: string) => {
    if (!enabled || !supabase || !user) return
    setIsRestoring(true)
    setError(null)
    try {
      const { data, error: fetchError } = await supabase
        .from('user_backups')
        .select('backup_data, updated_at')
        .eq('user_id', user.id)
        .single()

      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          setError('No cloud backup found. Back up your data first.')
          return
        }
        throw fetchError
      }

      let payload: BackupPayload

      if (isEncryptedPayload(data.backup_data)) {
        const pp = passphrase || getStoredPassphrase()
        if (!pp) {
          setError('Backup is encrypted. Please enter your backup passphrase.')
          return
        }
        try {
          const decrypted = await decryptData(data.backup_data as string, pp)
          payload = JSON.parse(decrypted) as BackupPayload
        } catch {
          setError('Decryption failed. Incorrect passphrase or corrupted backup.')
          return
        }
      } else {
        payload = data.backup_data as BackupPayload
      }

      const validation = validateBackupPayload(payload)
      if (!validation.valid) {
        setError(`Invalid backup: ${validation.reason}`)
        return
      }

      await hydrateDatabase(payload)
      
      const existingOwner = await db.settings.where('key').equals('owner_user_id').first()
      await db.settings.put({
        id: existingOwner?.id,
        key: 'owner_user_id',
        value: user.id
      })

      setLastBackupAt(data.updated_at)
      window.location.reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Restore failed')
    } finally {
      setIsRestoring(false)
    }
  }, [enabled, user])

  useEffect(() => {
    if (!enabled || !supabase || !user) {
      setLastBackupAt(null)
      return
    }
    supabase
      .from('user_backups')
      .select('backup_data, updated_at')
      .eq('user_id', user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setLastBackupAt(data.updated_at)
          setIsEncrypted(isEncryptedPayload(data.backup_data))
        }
      })
  }, [enabled, user])

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

    const unsubscribers: (() => void)[] = []

    for (const table of tables) {
      const creating = () => { scheduleBackup() }
      const updating = () => { scheduleBackup() }
      const deleting = () => { scheduleBackup() }

      table.hook('creating', creating)
      table.hook('updating', updating)
      table.hook('deleting', deleting)

      unsubscribers.push(
        () => table.hook('creating').unsubscribe(creating),
        () => table.hook('updating').unsubscribe(updating),
        () => table.hook('deleting').unsubscribe(deleting),
      )
    }

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      unsubscribers.forEach((unsub) => unsub())
    }
  }, [enabled, scheduleBackup])

  const passphraseSet = !!getStoredPassphrase()

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
    isEncrypted,
    backupCooldown,
    passphraseSet,
  }
}
