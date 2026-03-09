import { useState, useCallback } from 'react'

export interface RentCalculatorState {
  agi: string
}

const DEFAULT_STATE: RentCalculatorState = {
  agi: '',
}

export function useRentCalculatorState() {
  const [state, setState] = useState<RentCalculatorState>(() => DEFAULT_STATE)

  const updateState = useCallback((patch: Partial<RentCalculatorState>) => {
    setState((prev) => ({ ...prev, ...patch }))
  }, [])

  const reset = useCallback(() => {
    setState(DEFAULT_STATE)
  }, [])

  return { state, updateState, reset }
}
