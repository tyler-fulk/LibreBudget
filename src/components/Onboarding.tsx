import { useState, useEffect } from 'react'
import { Button } from './ui/Button'
import { Icon } from './ui/Icon'

const STEPS = [
  {
    title: 'Welcome to LibreBudget',
    description: 'A free, open-source budget tracker. Your data stays on your device — nothing is sent anywhere unless you enable optional encrypted cloud backup.',
    icon: 'Hand',
  },
  {
    title: 'Your Dashboard',
    description: 'See income, expenses, and savings at a glance. The budget health bar and % of income saved (goal: 25%+) keep you on track. Add transactions with the + button.',
    icon: 'LayoutDashboard',
  },
  {
    title: 'Budget & Spending',
    description: 'Set monthly limits in Budget. Track transactions, recurring items (rent, subscriptions, salary), and debts. Categorize as needs, wants, or savings.',
    icon: 'DollarSign',
  },
  {
    title: 'Wealth Tools',
    description: 'Savings goals, compound interest & retirement calculators, auto loan (20/3/8 rule), home affordability (own or rent). Plus credit score tracking.',
    icon: 'BarChart3',
  },
  {
    title: 'Financial Roadmap & Insights',
    description: 'Follow the step-by-step Financial Roadmap. Use Trends, Monthly Review, and Year Review to see how you\'re improving over time.',
    icon: 'Map',
  },
  {
    title: "You're All Set",
    description: 'Set your monthly budget in Settings, then add your first transaction. Need help? Check Settings for themes, accessibility options, and optional cloud backup.',
    icon: 'Trophy',
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
      <div className="relative w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-2xl text-center">
        <div className="flex justify-center mb-4">
          <Icon name={current.icon} size={56} className="text-green-400" />
        </div>
        <h2 className="text-xl font-bold text-slate-100 mb-2">{current.title}</h2>
        <p className="text-sm text-slate-400 mb-6 leading-relaxed">{current.description}</p>

        <div className="flex items-center justify-center gap-1.5 mb-6">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === step ? 'w-6 bg-green-500' : 'w-1.5 bg-slate-700'
              }`}
            />
          ))}
        </div>

        <div className="flex gap-3">
          {step > 0 && (
            <Button variant="secondary" onClick={() => setStep(step - 1)} className="flex-1">
              Back
            </Button>
          )}
          {step < STEPS.length - 1 ? (
            <Button onClick={() => setStep(step + 1)} className="flex-1">
              Next
            </Button>
          ) : (
            <Button onClick={finish} className="flex-1">
              Get Started
            </Button>
          )}
        </div>

        <button onClick={finish} className="mt-4 block w-full text-xs text-slate-500 hover:text-slate-300">
          Skip walkthrough
        </button>
      </div>
    </div>
  )
}
