import { useState, useCallback } from 'react'
import type { ContributionFrequency } from '../utils/compoundInterest'

export type CalculatorMode = 'standard' | 'goalSeeker' | 'autoLoan' | 'houseAffordability'

export interface CalculatorState {
  mode: CalculatorMode
  initialBalance: string
  contribution: string
  contributionFrequency: ContributionFrequency
  years: string
  annualRate: string
  desiredAnnualIncome: string
  withdrawalRatePercent: number
  currentAge: string
  targetRetirementAge: number
}

const DEFAULT_STATE: CalculatorState = {
  mode: 'standard',
  initialBalance: '',
  contribution: '',
  contributionFrequency: 'monthly',
  years: '',
  annualRate: '',
  desiredAnnualIncome: '',
  withdrawalRatePercent: 4,
  currentAge: '',
  targetRetirementAge: 65,
}

export function useCalculatorState() {
  const [state, setState] = useState<CalculatorState>(() => DEFAULT_STATE)

  const updateState = useCallback((patch: Partial<CalculatorState>) => {
    setState((prev) => ({ ...prev, ...patch }))
  }, [])

  const reset = useCallback(() => {
    setState(DEFAULT_STATE)
  }, [])

  return { state, updateState, reset }
}
