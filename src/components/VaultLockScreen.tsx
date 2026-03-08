import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from './ui/Button'
import { Icon } from './ui/Icon'
import { useWallet } from '../hooks/useWallet'

export function VaultLockScreen() {
  const navigate = useNavigate()
  const { unlockWithPin, forgetPersistedVault } = useWallet()
  const [pin, setPin] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleUnlock = useCallback(async () => {
    if (!pin.trim()) return
    setError(null)
    setLoading(true)
    try {
      const ok = await unlockWithPin(pin)
      if (!ok) {
        setError('Incorrect PIN')
      }
    } finally {
      setLoading(false)
    }
  }, [pin, unlockWithPin])

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/70" />
      <div className="relative w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-8 shadow-2xl">
        <div className="text-center mb-6">
          <Icon name="Lock" size={56} className="text-green-400 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-slate-100 mb-1">Unlock Vault</h2>
          <p className="text-sm text-slate-400">
            Enter your PIN to enable cloud backup on this device
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm text-slate-400">PIN</label>
            <input
              type="password"
              inputMode="numeric"
              autoComplete="off"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleUnlock()}
              placeholder="Enter your PIN"
              className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-slate-100 placeholder-slate-500 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
              disabled={loading}
            />
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <Button
            className="w-full"
            size="lg"
            onClick={handleUnlock}
            disabled={!pin.trim() || loading}
          >
            {loading ? 'Unlocking...' : 'Unlock'}
          </Button>
        </div>

        <p className="mt-6 text-center text-sm text-slate-500">
          Forgot PIN?{' '}
          <button
            type="button"
            onClick={() => {
              forgetPersistedVault()
              navigate('/restore-wallet')
            }}
            className="text-green-400 hover:text-green-300"
          >
            Use recovery phrase to restore
          </button>
        </p>
      </div>
    </div>
  )
}
