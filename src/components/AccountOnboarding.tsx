import { useState, useEffect } from 'react'
import { Button } from './ui/Button'
import { Icon } from './ui/Icon'

const STORAGE_KEY = 'lb-account-onboarding-done'

const STEPS = [
  {
    icon: 'Wallet',
    title: 'Your Vault — the Key to Everything',
    description: 'Your vault is created from a 12-word recovery phrase. Those words are the only way to encrypt and decrypt your cloud backup. LibreBudget never sees them — write them down and store them somewhere safe. If you lose the phrase, your cloud backup cannot be recovered.',
    tip: null,
  },
  {
    icon: 'Cloud',
    title: 'Automatic Encrypted Backup',
    description: 'Once your vault is active, your data is encrypted in your browser and automatically backed up to the cloud after every change. The server only ever receives an encrypted blob — your recovery phrase and keys never leave your device.',
    tip: 'Use "Back Up Now" after major changes or before switching devices to push a fresh copy immediately.',
  },
  {
    icon: 'RefreshCw',
    title: 'Syncing — Pull Your Latest Data',
    description: 'The Sync button (cloud icon in the nav bar) pulls your latest backup from the cloud onto this device. Use it any time you want to bring in changes made on another device, or after restoring your vault on a new browser.',
    tip: 'Sync replaces local data with the cloud copy. Back up first if you have unsaved local changes.',
  },
  {
    icon: 'HardDrive',
    title: 'Restoring on a New Device',
    description: 'Moving to a new phone or browser? Go to Account → "Restore from Recovery Phrase", enter your 12 words, then tap Sync. Your full transaction history, budget goals, debts, and savings are back in seconds.',
    tip: 'Keep your recovery phrase in a password manager and a physical backup in a secure location.',
  },
  {
    icon: 'Shield',
    title: 'You\'re in Control',
    description: 'Your data is yours. Export a full JSON or CSV backup any time from Settings. Delete your cloud backup from Account at any time — we retain nothing. The app works completely offline without any vault or cloud.',
    tip: null,
  },
]

interface AccountOnboardingProps {
  /** When provided, controls visibility externally (replay mode). */
  open?: boolean
  onClose?: () => void
}

export function AccountOnboarding({ open, onClose }: AccountOnboardingProps = {}) {
  const [show, setShow] = useState(false)
  const [step, setStep] = useState(0)

  // Uncontrolled: show on first visit
  useEffect(() => {
    if (open === undefined) {
      const seen = localStorage.getItem(STORAGE_KEY)
      if (!seen) setShow(true)
    }
  }, [open])

  // Controlled: sync with prop
  useEffect(() => {
    if (open !== undefined) {
      setShow(open)
      if (open) setStep(0)
    }
  }, [open])

  const finish = () => {
    if (open === undefined) {
      localStorage.setItem(STORAGE_KEY, 'true')
    }
    setShow(false)
    onClose?.()
  }

  if (!show) return null

  const current = STEPS[step]
  const isLast = step === STEPS.length - 1

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center p-4 sm:items-center">
      <div className="fixed inset-0 bg-black/70" onClick={finish} />
      <div className="relative w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl overflow-hidden">

        {/* Progress bar */}
        <div className="flex h-1 bg-slate-800">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`flex-1 transition-colors duration-300 ${i <= step ? 'bg-green-500' : ''}`}
              style={{ marginRight: i < STEPS.length - 1 ? '2px' : 0 }}
            />
          ))}
        </div>

        <div className="p-6">
          {/* Step counter */}
          <div className="flex items-center justify-between mb-5">
            <span className="text-xs font-medium text-slate-500">
              Step {step + 1} of {STEPS.length}
            </span>
            <button onClick={finish} className="text-xs text-slate-500 hover:text-slate-300 transition-colors">
              Skip
            </button>
          </div>

          {/* Icon */}
          <div className="flex justify-center mb-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-green-600/15">
              <Icon name={current.icon} size={32} className="text-green-400" />
            </div>
          </div>

          {/* Content */}
          <h2 className="text-lg font-bold text-slate-100 text-center mb-3">{current.title}</h2>
          <p className="text-sm text-slate-400 text-center leading-relaxed mb-4">{current.description}</p>

          {/* Tip */}
          {current.tip && (
            <div className="flex items-start gap-2.5 rounded-xl bg-slate-800 px-3.5 py-3 mb-4">
              <Icon name="Lightbulb" size={14} className="mt-0.5 shrink-0 text-amber-400" />
              <p className="text-xs text-slate-400 leading-relaxed">{current.tip}</p>
            </div>
          )}

          {/* Dot indicators */}
          <div className="flex items-center justify-center gap-1.5 mb-5">
            {STEPS.map((_, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                className={`h-1.5 rounded-full transition-all ${i === step ? 'w-6 bg-green-500' : 'w-1.5 bg-slate-700 hover:bg-slate-600'}`}
              />
            ))}
          </div>

          {/* Navigation */}
          <div className="flex gap-2.5">
            {step > 0 && (
              <Button variant="secondary" onClick={() => setStep(step - 1)} className="flex-1">
                Back
              </Button>
            )}
            {isLast ? (
              <Button onClick={finish} className="flex-1">
                Got it
              </Button>
            ) : (
              <Button onClick={() => setStep(step + 1)} className="flex-1">
                Next
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
