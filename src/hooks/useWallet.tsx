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

export interface WalletKeys {
  anonymousId: string
  encryptionKey: CryptoKey
}

interface WalletState {
  wallet: WalletKeys | null
  setWallet: (keys: WalletKeys) => void
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
  setWallet: () => {},
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
      let data: { anonymousId: string; keyBase64: string }
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
            setWalletState({ anonymousId: data.anonymousId, encryptionKey })
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
        JSON.stringify({ anonymousId: keys.anonymousId, keyBase64 })
      )
    } catch (e) {
      console.error('Failed to persist vault session', e)
    }
  }, [])

  const unlockWithPin = useCallback(async (pin: string): Promise<boolean> => {
    const blob = localStorage.getItem(PERSIST_STORAGE_KEY)
    if (!blob) return false
    try {
      const keys = await decryptVaultWithPin(blob, pin)
      setWalletState(keys)
      setIsLocked(false)
      const keyBase64 = await exportKeyForSession(keys.encryptionKey)
      sessionStorage.setItem(
        SESSION_STORAGE_KEY,
        JSON.stringify({ anonymousId: keys.anonymousId, keyBase64 })
      )
      return true
    } catch {
      return false
    }
  }, [])

  const persistWithPin = useCallback(async (keys: WalletKeys, pin: string) => {
    const blob = await encryptVaultForPin(keys, pin)
    localStorage.setItem(PERSIST_STORAGE_KEY, blob)
  }, [])

  const forgetPersistedVault = useCallback(() => {
    localStorage.removeItem(PERSIST_STORAGE_KEY)
    setIsLocked(false)
  }, [])

  const clearWallet = useCallback(async () => {
    setWalletState(null)
    setIsLocked(false)
    sessionStorage.removeItem(SESSION_STORAGE_KEY)
    localStorage.removeItem(PERSIST_STORAGE_KEY)
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
