import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from 'react'
import { db } from '../db/database'

export interface WalletKeys {
  anonymousId: string
  encryptionKey: CryptoKey
}

interface WalletState {
  wallet: WalletKeys | null
  setWallet: (keys: WalletKeys) => void
  clearWallet: () => Promise<void>
  hasWallet: boolean
}

const WalletContext = createContext<WalletState>({
  wallet: null,
  setWallet: () => {},
  clearWallet: async () => {},
  hasWallet: false,
})

export function WalletProvider({ children }: { children: ReactNode }) {
  const [wallet, setWalletState] = useState<WalletKeys | null>(null)

  const setWallet = useCallback((keys: WalletKeys) => {
    setWalletState(keys)
  }, [])

  const clearWallet = useCallback(async () => {
    setWalletState(null)
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
      }}
    >
      {children}
    </WalletContext.Provider>
  )
}

export function useWallet() {
  return useContext(WalletContext)
}
