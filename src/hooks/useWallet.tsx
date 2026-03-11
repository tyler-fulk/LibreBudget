import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react'
import { db } from '../db/database'
import {
  exportKeyForSession,
  importKeyFromSession,
  encryptVaultForPin,
  decryptVaultWithPin,
} from '../utils/crypto'
import { VaultLockScreen } from '../components/VaultLockScreen'

const SESSION_STORAGE_KEY = 'lb-vault-session'
const PERSIST_STORAGE_KEY = 'lb-vault-persist'
const FAIL_COUNT_KEY = 'lb-vault-fail-count'
const LOCKOUT_KEY = 'lb-vault-lockout-until'

/** Consecutive failures required to trigger each lockout tier */
const LOCKOUT_SCHEDULE: { attempts: number; durationMs: number }[] = [
  { attempts: 3, durationMs: 30_000 },           // 30 s after 3rd failure
  { attempts: 5, durationMs: 5 * 60_000 },       // 5 min after 5th
  { attempts: 7, durationMs: 30 * 60_000 },      // 30 min after 7th
]
/** After this many failures the lockout becomes permanent until recovery phrase is used */
export const PIN_MAX_ATTEMPTS = 10

export function getPinLockoutStatus(): {
  isLockedOut: boolean
  isPermanent: boolean
  secondsRemaining: number
  failCount: number
} {
  const failCount = parseInt(localStorage.getItem(FAIL_COUNT_KEY) ?? '0', 10)
  const lockoutUntil = parseInt(localStorage.getItem(LOCKOUT_KEY) ?? '0', 10)
  const isPermanent = failCount >= PIN_MAX_ATTEMPTS
  const secondsRemaining = Math.max(0, Math.ceil((lockoutUntil - Date.now()) / 1000))
  const isLockedOut = isPermanent || Date.now() < lockoutUntil
  return { isLockedOut, isPermanent, secondsRemaining, failCount }
}

function recordPinFailure(): void {
  const count = parseInt(localStorage.getItem(FAIL_COUNT_KEY) ?? '0', 10) + 1
  localStorage.setItem(FAIL_COUNT_KEY, String(count))
  const tier = [...LOCKOUT_SCHEDULE].reverse().find((s) => count >= s.attempts)
  if (tier) {
    localStorage.setItem(LOCKOUT_KEY, String(Date.now() + tier.durationMs))
  }
}

function clearPinFailures(): void {
  localStorage.removeItem(FAIL_COUNT_KEY)
  localStorage.removeItem(LOCKOUT_KEY)
}

export interface WalletKeys {
  anonymousId: string
  encryptionKey: CryptoKey
  writeToken: string
}

interface WalletState {
  wallet: WalletKeys | null
  setWallet: (keys: WalletKeys) => Promise<void>
  clearWallet: () => Promise<void>
  hasWallet: boolean
  isLocked: boolean
  unlockWithPin: (pin: string) => Promise<boolean>
  persistWithPin: (keys: WalletKeys, pin: string) => Promise<void>
  /** Clears persisted vault so user can restore with recovery phrase instead */
  forgetPersistedVault: () => void
}

const WalletContext = createContext<WalletState>({
  wallet: null,
  setWallet: async () => {},
  clearWallet: async () => {},
  hasWallet: false,
  isLocked: false,
  unlockWithPin: async () => false,
  persistWithPin: async () => {},
  forgetPersistedVault: () => {},
})

export function WalletProvider({ children }: { children: ReactNode }) {
  const [wallet, setWalletState] = useState<WalletKeys | null>(null)
  const [isLocked, setIsLocked] = useState(false)

  useEffect(() => {
    const sessionRaw = sessionStorage.getItem(SESSION_STORAGE_KEY)
    const persistRaw = localStorage.getItem(PERSIST_STORAGE_KEY)

    if (sessionRaw) {
      let data: { anonymousId: string; keyBase64: string; writeToken?: string }
      try {
        data = JSON.parse(sessionRaw)
      } catch {
        sessionStorage.removeItem(SESSION_STORAGE_KEY)
        if (persistRaw) setIsLocked(true)
        return
      }
      if (data?.anonymousId && data?.keyBase64) {
        importKeyFromSession(data.keyBase64)
          .then((encryptionKey) => {
            setWalletState({ anonymousId: data.anonymousId, encryptionKey, writeToken: data.writeToken ?? '' })
          })
          .catch(() => {
            sessionStorage.removeItem(SESSION_STORAGE_KEY)
            if (persistRaw) setIsLocked(true)
          })
        return
      }
      sessionStorage.removeItem(SESSION_STORAGE_KEY)
    }

    if (persistRaw) {
      setIsLocked(true)
    }
  }, [])

  const setWallet = useCallback(async (keys: WalletKeys) => {
    setWalletState(keys)
    try {
      const keyBase64 = await exportKeyForSession(keys.encryptionKey)
      sessionStorage.setItem(
        SESSION_STORAGE_KEY,
        JSON.stringify({ anonymousId: keys.anonymousId, keyBase64, writeToken: keys.writeToken })
      )
    } catch (e) {
      console.error('Failed to persist vault session', e)
    }
  }, [])

  const unlockWithPin = useCallback(async (pin: string): Promise<boolean> => {
    // Reject immediately if locked out — no crypto work performed
    const { isLockedOut } = getPinLockoutStatus()
    if (isLockedOut) return false

    const blob = localStorage.getItem(PERSIST_STORAGE_KEY)
    if (!blob) return false
    try {
      const keys = await decryptVaultWithPin(blob, pin)
      clearPinFailures()
      setWalletState(keys)
      setIsLocked(false)
      const keyBase64 = await exportKeyForSession(keys.encryptionKey)
      sessionStorage.setItem(
        SESSION_STORAGE_KEY,
        JSON.stringify({ anonymousId: keys.anonymousId, keyBase64, writeToken: keys.writeToken })
      )
      return true
    } catch {
      recordPinFailure()
      return false
    }
  }, [])

  const persistWithPin = useCallback(async (keys: WalletKeys, pin: string) => {
    const blob = await encryptVaultForPin(keys, pin)
    localStorage.setItem(PERSIST_STORAGE_KEY, blob)
  }, [])

  const forgetPersistedVault = useCallback(() => {
    localStorage.removeItem(PERSIST_STORAGE_KEY)
    clearPinFailures()
    setIsLocked(false)
  }, [])

  const clearWallet = useCallback(async () => {
    setWalletState(null)
    setIsLocked(false)
    sessionStorage.removeItem(SESSION_STORAGE_KEY)
    localStorage.removeItem(PERSIST_STORAGE_KEY)
    localStorage.removeItem('lb_last_backup_at')
    localStorage.removeItem('lb_last_manual_backup')
    clearPinFailures()
    try {
      await db.transaction(
        'rw',
        [
          db.categories,
          db.transactions,
          db.budgetGoals,
          db.monthlySnapshots,
          db.settings,
          db.recurringTransactions,
          db.savingsGoals,
          db.debts,
          db.creditScores,
        ],
        async () => {
          await db.categories.clear()
          await db.transactions.clear()
          await db.budgetGoals.clear()
          await db.monthlySnapshots.clear()
          await db.settings.clear()
          await db.recurringTransactions.clear()
          await db.savingsGoals.clear()
          await db.debts.clear()
          await db.creditScores.clear()
        }
      )
      window.location.reload()
    } catch (e) {
      console.error('Failed to clear local database on wallet lock', e)
    }
  }, [])

  return (
    <WalletContext.Provider
      value={{
        wallet,
        setWallet,
        clearWallet,
        hasWallet: !!wallet,
        isLocked,
        unlockWithPin,
        persistWithPin,
        forgetPersistedVault,
      }}
    >
      {isLocked ? (
        <VaultLockScreen />
      ) : (
        children
      )}
    </WalletContext.Provider>
  )
}

export function useWallet() {
  return useContext(WalletContext)
}
