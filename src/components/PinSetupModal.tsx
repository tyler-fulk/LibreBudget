import { useState, useCallback } from 'react'
import { Modal } from './ui/Modal'
import { Button } from './ui/Button'

const MIN_PIN_LENGTH = 6

interface PinSetupModalProps {
  open: boolean
  onSetPin: (pin: string) => Promise<void>
  onSkip: () => void
}

export function PinSetupModal({ open, onSetPin, onSkip }: PinSetupModalProps) {
  const [pin, setPin] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSetPin = useCallback(async () => {
    setError(null)
    if (pin.length < MIN_PIN_LENGTH) {
      setError(`PIN must be at least ${MIN_PIN_LENGTH} characters`)
      return
    }
    if (pin !== confirm) {
      setError('PINs do not match')
      return
    }
    setLoading(true)
    try {
      await onSetPin(pin)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to set PIN')
    } finally {
      setLoading(false)
    }
  }, [pin, confirm, onSetPin])

  const handleSkip = useCallback(() => {
    setPin('')
    setConfirm('')
    setError(null)
    onSkip()
  }, [onSkip])

  return (
    <Modal open={open} onClose={handleSkip} title="Stay signed in on this device?">
      <div className="space-y-4">
        <p className="text-sm text-slate-400">
          Set a PIN to unlock without your recovery phrase. You&apos;ll need your
          recovery phrase if you forget the PIN.
        </p>

        <div>
          <label className="mb-1 block text-sm text-slate-400">PIN (min 6 characters)</label>
          <input
            type="password"
            inputMode="numeric"
            autoComplete="off"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="Enter PIN"
            className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-slate-100 placeholder-slate-500 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
            disabled={loading}
          />
        </div>

        <div>
          <label className="mb-1 block text-sm text-slate-400">Confirm PIN</label>
          <input
            type="password"
            inputMode="numeric"
            autoComplete="off"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Confirm PIN"
            className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-slate-100 placeholder-slate-500 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
            disabled={loading}
          />
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <div className="flex gap-3 pt-2">
          <Button
            variant="secondary"
            className="flex-1"
            onClick={handleSkip}
            disabled={loading}
          >
            Skip
          </Button>
          <Button
            className="flex-1"
            onClick={handleSetPin}
            disabled={pin.length < MIN_PIN_LENGTH || confirm !== pin || loading}
          >
            {loading ? 'Setting...' : 'Set PIN'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
