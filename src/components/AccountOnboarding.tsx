import { useState, useEffect } from 'react'
import { Button } from './ui/Button'
import { Icon } from './ui/Icon'

const STORAGE_KEY = 'lb-account-onboarding-done'

const STEPS = [
  {
    title: 'The Account System',
    description: 'Your budget data is stored locally in this browser. The Account page adds optional cloud backup — your data is encrypted before it ever leaves your device.',
    icon: 'Shield',
  },
  {
    title: 'Your Vault',
    description: 'A vault is created from a 12-word recovery phrase. Those words derive encryption keys that only you control. Never share your phrase — it\'s the key to your data.',
    icon: 'Wallet',
  },
  {
    title: 'Cloud Backup (Optional)',
    description: 'With cloud backup enabled, encrypted copies of your data sync to the server after each change. The server never sees your plain data — it\'s encrypted with keys from your phrase.',
    icon: 'Cloud',
  },
  {
    title: 'Restore Anywhere',
    description: 'On a new device or browser? Enter your recovery phrase to restore your vault, then pull the latest backup. Your data follows you when you need it.',
    icon: 'Lock',
  },
]

export function AccountOnboarding() {
  const [show, setShow] = useState(false)
  const [step, setStep] = useState(0)

  useEffect(() => {
    const seen = localStorage.getItem(STORAGE_KEY)
    if (!seen) setShow(true)
  }, [])

  const finish = () => {
    localStorage.setItem(STORAGE_KEY, 'true')
    setShow(false)
  }

  if (!show) return null

  const current = STEPS[step]

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/70" />
      <div className="relative w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-8 shadow-2xl text-center">
        <div className="flex justify-center mb-4">
          <Icon name={current.icon} size={56} className="text-green-400" />
        </div>
        <h2 className="text-xl font-bold text-slate-100 mb-2">{current.title}</h2>
        <p className="text-sm text-slate-400 mb-6 leading-relaxed">{current.description}</p>

        <div className="flex items-center justify-center gap-1.5 mb-6">
          {STEPS.map((_, i) => (
            <div key={i} className={`h-1.5 rounded-full transition-all ${i === step ? 'w-6 bg-green-500' : 'w-1.5 bg-slate-700'}`} />
          ))}
        </div>

        <div className="flex gap-3">
          {step > 0 && (
            <Button variant="secondary" onClick={() => setStep(step - 1)} className="flex-1">Back</Button>
          )}
          {step < STEPS.length - 1 ? (
            <Button onClick={() => setStep(step + 1)} className="flex-1">Next</Button>
          ) : (
            <Button onClick={finish} className="flex-1">Got it</Button>
          )}
        </div>

        <button onClick={finish} className="mt-4 text-xs text-slate-500 hover:text-slate-300">
          Skip
        </button>
      </div>
    </div>
  )
}
