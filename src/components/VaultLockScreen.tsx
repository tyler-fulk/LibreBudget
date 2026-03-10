import { useState, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from './ui/Button'
import { Icon } from './ui/Icon'
import { useWallet } from '../hooks/useWallet'
import { getPinLockoutStatus, PIN_MAX_ATTEMPTS } from '../hooks/useWallet'

export function VaultLockScreen() {
  const navigate = useNavigate()
  const { unlockWithPin, forgetPersistedVault } = useWallet()
  const [pin, setPin] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [lockout, setLockout] = useState(getPinLockoutStatus)

  // Refresh lockout status every second while locked out
  useEffect(() => {
    if (!lockout.isLockedOut) return
    const id = setInterval(() => {
      const status = getPinLockoutStatus()
      setLockout(status)
      if (!status.isLockedOut) setError(null)
    }, 1000)
    return () => clearInterval(id)
  }, [lockout.isLockedOut])

  const handleUnlock = useCallback(async () => {
    const status = getPinLockoutStatus()
    if (status.isLockedOut) return
    if (!pin.trim()) return
    setError(null)
    setLoading(true)
    try {
      const ok = await unlockWithPin(pin)
      if (!ok) {
        setPin('')
        const next = getPinLockoutStatus()
        setLockout(next)
        if (next.isPermanent) {
          setError(null) // permanent banner handles messaging
        } else if (next.isLockedOut) {
          setError(null) // countdown banner handles messaging
        } else {
          const remaining = PIN_MAX_ATTEMPTS - next.failCount
          setError(
            remaining <= 3
              ? `Incorrect PIN — ${remaining} attempt${remaining === 1 ? '' : 's'} remaining before lockout`
              : 'Incorrect PIN'
          )
        }
      }
    } finally {
      setLoading(false)
    }
  }, [pin, unlockWithPin])

  const formatCountdown = (secs: number) => {
    if (secs >= 60) return `${Math.ceil(secs / 60)} minute${Math.ceil(secs / 60) === 1 ? '' : 's'}`
    return `${secs} second${secs === 1 ? '' : 's'}`
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/70" />
      <div className="relative w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-8 shadow-2xl">
        <div className="text-center mb-6">
          <div className={`flex h-16 w-16 items-center justify-center rounded-2xl mx-auto mb-3 ${lockout.isPermanent ? 'bg-red-600/15' : 'bg-green-600/15'}`}>
            <Icon
              name={lockout.isPermanent ? 'AlertTriangle' : 'Lock'}
              size={32}
              className={lockout.isPermanent ? 'text-red-400' : 'text-green-400'}
            />
          </div>
          <h2 className="text-xl font-bold text-slate-100 mb-1">Unlock Vault</h2>
          <p className="text-sm text-slate-400">
            Enter your PIN to enable cloud backup on this device
          </p>
        </div>

        {/* Permanent lockout */}
        {lockout.isPermanent ? (
          <div className="space-y-4">
            <div className="rounded-xl bg-red-900/20 border border-red-800/50 p-4 text-center">
              <p className="text-sm font-medium text-red-300 mb-1">Vault locked permanently</p>
              <p className="text-xs text-red-400/80">
                Too many failed PIN attempts ({PIN_MAX_ATTEMPTS}). Use your recovery phrase to restore access.
              </p>
            </div>
            <Button
              variant="primary"
              className="w-full"
              size="lg"
              onClick={() => { forgetPersistedVault(); navigate('/restore-wallet') }}
            >
              Restore with Recovery Phrase
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Timed lockout banner */}
            {lockout.isLockedOut && (
              <div className="rounded-xl bg-amber-900/20 border border-amber-800/40 p-3 text-center">
                <p className="text-sm font-medium text-amber-300">Too many failed attempts</p>
                <p className="text-xs text-amber-400/80 mt-0.5">
                  Try again in <span className="font-semibold tabular-nums">{formatCountdown(lockout.secondsRemaining)}</span>
                </p>
              </div>
            )}

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
                className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-slate-100 placeholder-slate-500 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500 disabled:opacity-50"
                disabled={loading || lockout.isLockedOut}
              />
            </div>

            {error && <p className="text-sm text-red-400">{error}</p>}

            <Button
              className="w-full"
              size="lg"
              onClick={handleUnlock}
              disabled={!pin.trim() || loading || lockout.isLockedOut}
            >
              {loading ? 'Unlocking…' : lockout.isLockedOut ? `Locked — ${formatCountdown(lockout.secondsRemaining)}` : 'Unlock'}
            </Button>
          </div>
        )}

        {!lockout.isPermanent && (
          <p className="mt-6 text-center text-sm text-slate-500">
            Forgot PIN?{' '}
            <button
              type="button"
              onClick={() => { forgetPersistedVault(); navigate('/restore-wallet') }}
              className="text-green-400 hover:text-green-300"
            >
              Use recovery phrase to restore
            </button>
          </p>
        )}
      </div>
    </div>
  )
}
