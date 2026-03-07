import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Turnstile } from '@marsidev/react-turnstile'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { useAuth } from '../hooks/useAuth'
import { validatePassword, STRENGTH_CONFIG } from '../utils/password'
import { Icon } from '../components/ui/Icon'
import { supabase } from '../lib/supabase'

export default function ResetPassword() {
  const { user, resetPasswordForEmail, isCloudAvailable } = useAuth()
  const navigate = useNavigate()
  const [mode, setMode] = useState<'request' | 'set'>('request')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)

  useEffect(() => {
    const hash = window.location.hash
    const params = new URLSearchParams(hash.replace('#', '?'))
    if (params.get('type') === 'recovery') {
      setMode('set')
    } else if (user?.email) {
      setEmail(user.email)
      setMode('set')
    }
  }, [user?.email])

  const passwordValidation = validatePassword(password)
  const strengthCfg = STRENGTH_CONFIG[passwordValidation.strength]

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const { error: err } = await resetPasswordForEmail(email, captchaToken ?? undefined)
    if (err) setError(err)
    else setSuccess(true)
    setCaptchaToken(null)
    setLoading(false)
  }

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!passwordValidation.allPassed) {
      setError('Password does not meet all requirements')
      return
    }
    if (password !== passwordConfirm) {
      setError('Passwords do not match')
      return
    }
    setLoading(true)
    if (!supabase) {
      setError('Not configured')
      setLoading(false)
      return
    }
    const { error: err } = await supabase.auth.updateUser({ password })
    if (err) {
      if (err.message.includes('AAL2') || err.message.includes('MFA')) {
        setError(
          'Password update requires MFA verification. Use "Change password" from Account (while signed in) instead. If you cannot sign in, contact Supabase support for recovery.'
        )
      } else {
        setError(err.message)
      }
      setLoading(false)
      return
    }
    setSuccess(true)
    setLoading(false)
    window.history.replaceState(null, '', '/reset-password')
    setTimeout(() => navigate('/account'), 2000)
  }

  if (!isCloudAvailable) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Reset Password</h1>
        <Card>
          <p className="text-slate-400 py-4 text-center">Cloud backup is not configured. Password reset is not available.</p>
          <Link to="/account" className="block text-center text-green-400 hover:text-green-300 text-sm">Back to Account</Link>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Reset Password</h1>

      <Card className="max-w-md mx-auto">
        {mode === 'request' ? (
          <>
            <div className="mb-5 text-center">
              <div className="text-4xl mb-2">🔑</div>
              <h2 className="text-lg font-semibold text-slate-200">Forgot your password?</h2>
              <p className="text-sm text-slate-400 mt-1">Enter your email and we'll send you a reset link</p>
            </div>

            {success ? (
              <div className="space-y-4">
                <div className="rounded-xl bg-green-900/20 border border-green-800 p-3 text-sm text-green-300">
                  Check your email for a reset link. It may take a few minutes to arrive.
                </div>
                <Link to="/account" className="block text-center text-green-400 hover:text-green-300 text-sm">Back to Sign In</Link>
              </div>
            ) : (
              <form onSubmit={handleRequestReset} className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm text-slate-400">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                  />
                </div>
                <div className="flex justify-center">
                  <Turnstile
                    siteKey="0x4AAAAAACnmc8kz4iaWQcS4"
                    onSuccess={(token) => setCaptchaToken(token)}
                    onExpire={() => setCaptchaToken(null)}
                  />
                </div>
                {error && <p className="text-sm text-red-400">{error}</p>}
                <Button type="submit" className="w-full" size="lg" disabled={loading || !email || !captchaToken}>
                  {loading ? 'Sending...' : 'Send Reset Link'}
                </Button>
              </form>
            )}

            <p className="mt-4 text-center">
              <Link to="/account" className="text-sm text-slate-500 hover:text-slate-300">← Back to Account</Link>
            </p>
          </>
        ) : (
          <>
            <div className="mb-5 text-center">
              <Icon name="Lock" size={48} className="text-slate-300 mx-auto mb-2" />
              <h2 className="text-lg font-semibold text-slate-200">Set new password</h2>
              <p className="text-sm text-slate-400 mt-1">Enter and confirm your new password</p>
            </div>

            {success ? (
              <div className="space-y-4">
                <div className="rounded-xl bg-green-900/20 border border-green-800 p-3 text-sm text-green-300">
                  Password updated! Redirecting to account...
                </div>
              </div>
            ) : (
              <form onSubmit={handleSetPassword} className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm text-slate-400">New password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Strong password required"
                    required
                    minLength={8}
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                  />
                  {password.length > 0 && (
                    <div className="mt-2 space-y-1">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 flex-1 rounded-full bg-slate-800 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-300"
                            style={{ width: strengthCfg.width, backgroundColor: strengthCfg.color }}
                          />
                        </div>
                        <span className="text-xs font-medium" style={{ color: strengthCfg.color }}>{strengthCfg.label}</span>
                      </div>
                      <ul className="space-y-0.5">
                        {passwordValidation.checks.map((check) => (
                          <li key={check.label} className={`flex items-center gap-1.5 text-xs ${check.met ? 'text-green-400' : 'text-slate-500'}`}>
                            {check.met ? <Icon name="Check" size={14} /> : <span className="text-slate-600">○</span>}
                            {check.label}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
                <div>
                  <label className="mb-1 block text-sm text-slate-400">Confirm password</label>
                  <input
                    type="password"
                    value={passwordConfirm}
                    onChange={(e) => setPasswordConfirm(e.target.value)}
                    placeholder="Confirm new password"
                    required
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                  />
                </div>
                {error && <p className="text-sm text-red-400">{error}</p>}
                <Button
                  type="submit"
                  className="w-full"
                  size="lg"
                  disabled={loading || !passwordValidation.allPassed || password !== passwordConfirm}
                >
                  {loading ? 'Updating...' : 'Update Password'}
                </Button>
              </form>
            )}

            <p className="mt-4 text-center">
              <Link to="/account" className="text-sm text-slate-500 hover:text-slate-300">← Back to Account</Link>
            </p>
          </>
        )}
      </Card>
    </div>
  )
}
