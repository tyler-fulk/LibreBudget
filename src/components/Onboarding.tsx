import { useState, useEffect } from 'react'
import { Button } from './ui/Button'
import { Icon } from './ui/Icon'

const STEPS = [
  {
    title: 'Welcome to LibreBudget!',
    description: 'A free, open-source budget tracker. Your data stays on your device by default — nothing is sent to any server unless you opt in.',
    icon: 'Hand',
  },
  {
    title: 'Track Income & Expenses',
    description: 'Add transactions as they happen. Categorize them as needs, wants, or investments to see where your money goes.',
    icon: 'Wallet',
  },
  {
    title: 'Watch Your Health Bar',
    description: 'The health bar turns from green to red as you approach your budget limit. Stay green to stay on track!',
    icon: 'Leaf',
  },
  {
    title: 'Set Budget Goals',
    description: 'Set monthly limits for each category group. Track your progress with visual progress bars.',
    icon: 'Target',
  },
  {
    title: 'Recurring Transactions',
    description: 'Set up rent, subscriptions, and salary to be auto-logged. Never forget a recurring expense.',
    icon: 'Repeat',
  },
  {
    title: 'Review & Improve',
    description: 'Check the Monthly Review and Trends pages to see how you\'re improving over time. You\'ve got this!',
    icon: 'TrendingUp',
  },
]

export function Onboarding() {
  const [show, setShow] = useState(false)
  const [step, setStep] = useState(0)

  useEffect(() => {
    const seen = localStorage.getItem('lb-onboarding-done')
    if (!seen) setShow(true)
  }, [])

  const finish = () => {
    localStorage.setItem('lb-onboarding-done', 'true')
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
            <Button onClick={finish} className="flex-1">Get Started</Button>
          )}
        </div>

        <button onClick={finish} className="mt-4 text-xs text-slate-500 hover:text-slate-300">
          Skip walkthrough
        </button>
      </div>
    </div>
  )
}
