import { useState, useCallback } from 'react'
import type { DownPaymentMode } from '../utils/autoLoan'

export type PropertyTaxSource = 'zip' | 'manual'

export interface HouseCalculatorState {
  agi: string
  downPaymentMode: DownPaymentMode
  downPaymentDollars: string
  downPaymentPercent: string
  interestRate: string
  loanTermYears: string
  propertyTaxSource: PropertyTaxSource
  zipCode: string
  propertyTaxManual: string
  homeInsuranceRate: string
  hoaDues: string
}

const DEFAULT_STATE: HouseCalculatorState = {
  agi: '',
  downPaymentMode: 'percent',
  downPaymentDollars: '',
  downPaymentPercent: '20',
  interestRate: '',
  loanTermYears: '30',
  propertyTaxSource: 'zip',
  zipCode: '',
  propertyTaxManual: '',
  homeInsuranceRate: '0.35',
  hoaDues: '',
}

export function useHouseCalculatorState() {
  const [state, setState] = useState<HouseCalculatorState>(() => DEFAULT_STATE)

  const updateState = useCallback((patch: Partial<HouseCalculatorState>) => {
    setState((prev) => ({ ...prev, ...patch }))
  }, [])

  const reset = useCallback(() => {
    setState(DEFAULT_STATE)
  }, [])

  return { state, updateState, reset }
}
