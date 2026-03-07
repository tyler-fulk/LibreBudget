import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react'
import type { User, Factor } from '@supabase/supabase-js'
import { supabase, isSupabaseConfigured } from '../lib/supabase'

import { db } from '../db/database'

interface MfaEnrollment {
  factorId: string
  qrCode: string
  secret: string
}

interface AuthState {
  user: User | null
  loading: boolean
  signUp: (email: string, password: string, captchaToken?: string) => Promise<{ error: string | null }>
  signIn: (email: string, password: string, captchaToken?: string) => Promise<{ error: string | null; mfaRequired?: boolean }>
  signOut: () => Promise<void>
  resetPasswordForEmail: (email: string, captchaToken?: string) => Promise<{ error: string | null }>
  isCloudAvailable: boolean
  mfaRequired: boolean
  mfaEnrolled: boolean
  mfaFactors: Factor[]
  enrollMfa: () => Promise<{ data: MfaEnrollment | null; error: string | null }>
  verifyMfaEnrollment: (factorId: string, code: string) => Promise<{ error: string | null }>
  challengeMfa: (code: string) => Promise<{ error: string | null }>
  unenrollMfa: (factorId: string) => Promise<{ error: string | null }>
  refreshMfaState: () => Promise<void>
}

const AuthContext = createContext<AuthState>({
  user: null,
  loading: true,
  signUp: async (_e, _p, _c?) => ({ error: 'Not configured' }),
  signIn: async (_e, _p, _c?) => ({ error: 'Not configured' }),
  signOut: async () => {},
  resetPasswordForEmail: async () => ({ error: 'Not configured' }),
  isCloudAvailable: false,
  mfaRequired: false,
  mfaEnrolled: false,
  mfaFactors: [],
  enrollMfa: async () => ({ data: null, error: 'Not configured' }),
  verifyMfaEnrollment: async () => ({ error: 'Not configured' }),
  challengeMfa: async () => ({ error: 'Not configured' }),
  unenrollMfa: async () => ({ error: 'Not configured' }),
  refreshMfaState: async () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [mfaRequired, setMfaRequired] = useState(false)
  const [mfaFactors, setMfaFactors] = useState<Factor[]>([])

  const mfaEnrolled = mfaFactors.some((f) => f.status === 'verified')

  const refreshMfaState = useCallback(async () => {
    if (!supabase) return

    const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
    if (aalData) {
      setMfaRequired(
        aalData.currentLevel === 'aal1' && aalData.nextLevel === 'aal2',
      )
    }

    const { data: factorsData } = await supabase.auth.mfa.listFactors()
    if (factorsData) {
      setMfaFactors(factorsData.totp)
    }
  }, [])

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
      if (session?.user) refreshMfaState()
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null)
        if (session?.user) refreshMfaState()
        else {
          setMfaRequired(false)
          setMfaFactors([])
        }
      },
    )

    return () => subscription.unsubscribe()
  }, [refreshMfaState])

  const signUp = async (email: string, password: string, captchaToken?: string) => {
    if (!supabase) return { error: 'Cloud backup is not configured' }
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        captchaToken: captchaToken ? captchaToken : undefined,
        emailRedirectTo: import.meta.env.VITE_APP_URL || window.location.origin,
      },
    })
    return { error: error?.message ?? null }
  }

  const signIn = async (email: string, password: string, captchaToken?: string) => {
    if (!supabase) return { error: 'Cloud backup is not configured' }
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
      options: captchaToken ? { captchaToken } : undefined,
    })
    if (error) return { error: error.message }

    const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
    const needsMfa = aalData?.currentLevel === 'aal1' && aalData?.nextLevel === 'aal2'
    setMfaRequired(needsMfa)

    return { error: null, mfaRequired: needsMfa }
  }

  const resetPasswordForEmail = async (email: string, captchaToken?: string) => {
    if (!supabase) return { error: 'Cloud backup is not configured' }
    const redirectTo = `${import.meta.env.VITE_APP_URL || window.location.origin}/reset-password`
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
      captchaToken: captchaToken || undefined,
    })
    return { error: error?.message ?? null }
  }

  const signOut = async () => {
    if (!supabase) return
    await supabase.auth.signOut()
    sessionStorage.removeItem('lb-backup-passphrase')
    setUser(null)
    setMfaRequired(false)
    setMfaFactors([])

    // Clear local database on sign out to prevent data leakage between users
    try {
      await db.transaction('rw', [db.categories, db.transactions, db.budgetGoals, db.monthlySnapshots, db.settings, db.recurringTransactions, db.savingsGoals, db.debts, db.creditScores], async () => {
        await db.categories.clear()
        await db.transactions.clear()
        await db.budgetGoals.clear()
        await db.monthlySnapshots.clear()
        await db.settings.clear()
        await db.recurringTransactions.clear()
        await db.savingsGoals.clear()
        await db.debts.clear()
        await db.creditScores.clear()
      })
      // Re-seed database with defaults
      // We can't easily call seedDatabase here without importing it, which might cause circular deps.
      // But clearing is enough for now. The app handles empty state or re-seeds on reload.
      window.location.reload()
    } catch (e) {
      console.error('Failed to clear local database on sign out', e)
    }
  }

  const enrollMfa = async () => {
    if (!supabase) return { data: null, error: 'Not configured' }
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName: 'LibreBudget Authenticator',
    })
    if (error) return { data: null, error: error.message }
    return {
      data: {
        factorId: data.id,
        qrCode: data.totp.qr_code,
        secret: data.totp.secret,
      },
      error: null,
    }
  }

  const verifyMfaEnrollment = async (factorId: string, code: string) => {
    if (!supabase) return { error: 'Not configured' }
    const { data: challengeData, error: challengeError } =
      await supabase.auth.mfa.challenge({ factorId })
    if (challengeError) return { error: challengeError.message }

    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challengeData.id,
      code,
    })
    if (verifyError) return { error: verifyError.message }

    await refreshMfaState()
    return { error: null }
  }

  const challengeMfa = async (code: string) => {
    if (!supabase) return { error: 'Not configured' }

    const { data: factorsData } = await supabase.auth.mfa.listFactors()
    const totpFactor = factorsData?.totp.find((f) => f.status === 'verified')
    if (!totpFactor) return { error: 'No MFA factor found' }

    const { data: challengeData, error: challengeError } =
      await supabase.auth.mfa.challenge({ factorId: totpFactor.id })
    if (challengeError) return { error: challengeError.message }

    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId: totpFactor.id,
      challengeId: challengeData.id,
      code,
    })
    if (verifyError) return { error: verifyError.message }

    setMfaRequired(false)
    await refreshMfaState()
    return { error: null }
  }

  const unenrollMfa = async (factorId: string) => {
    if (!supabase) return { error: 'Not configured' }
    const { error } = await supabase.auth.mfa.unenroll({ factorId })
    if (error) return { error: error.message }
    await refreshMfaState()
    return { error: null }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signUp,
        signIn,
        signOut,
        resetPasswordForEmail,
        isCloudAvailable: isSupabaseConfigured,
        mfaRequired,
        mfaEnrolled,
        mfaFactors,
        enrollMfa,
        verifyMfaEnrollment,
        challengeMfa,
        unenrollMfa,
        refreshMfaState,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
