import { useLiveQuery } from 'dexie-react-hooks'
import { getFinancialRiskScore, type FinancialRiskResult } from '../utils/financialRiskScore'

export function useFinancialRiskScore(): FinancialRiskResult & { loading: boolean } {
  const result = useLiveQuery(() => getFinancialRiskScore())

  if (!result) {
    return {
      score: 10,
      grade: 'Minimal',
      findings: [],
      loading: true,
    }
  }

  return {
    ...result,
    loading: false,
  }
}
