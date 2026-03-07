import { useState } from 'react'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { Turnstile } from '@marsidev/react-turnstile'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { useAuth } from '../hooks/useAuth'
import {
  useCloudBackup,
  getStoredPassphrase,
  setStoredPassphrase,
  clearStoredPassphrase,
} from '../hooks/useCloudBackup'
import { Icon } from '../components/ui/Icon'
import { validatePassword, STRENGTH_CONFIG } from '../utils/password'

export default function Account() {
  const {
    user,
    loading,
    signUp,
    signIn,
    signOut,
    isCloudAvailable,
    mfaRequired,
    mfaEnrolled,
    mfaFactors,
    enrollMfa,
    verifyMfaEnrollment,
    challengeMfa,
    unenrollMfa,
  } = useAuth()
  const {
    backupNow,
    restoreFromCloud,
    lastBackupAt,
    isBacking,
    isRestoring,
    error: backupError,
    enabled: backupEnabled,
    isEncrypted,
    backupCooldown,
    isDeleting,
    deleteAccountData,
  } = useCloudBackup()

  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState<string | null>(null)
  const [authLoading, setAuthLoading] = useState(false)
  const [signupSuccess, setSignupSuccess] = useState(false)
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)

  // MFA states
  const [mfaCode, setMfaCode] = useState('')
  const [mfaError, setMfaError] = useState<string | null>(null)
  const [mfaLoading, setMfaLoading] = useState(false)
  const [enrollmentData, setEnrollmentData] = useState<{
    factorId: string
    qrCode: string
    secret: string
  } | null>(null)
  const [enrollCode, setEnrollCode] = useState('')
  const [enrollError, setEnrollError] = useState<string | null>(null)
  const [enrollLoading, setEnrollLoading] = useState(false)

  const [passphrase, setPassphrase] = useState('')
  const [passphraseConfirm, setPassphraseConfirm] = useState('')
  const [passphraseSet, setPassphraseSet] = useState(!!getStoredPassphrase())
  const [showPassphraseSetup, setShowPassphraseSetup] = useState(false)
  const [restorePassphrase, setRestorePassphrase] = useState('')
  const [showRestorePassphrase, setShowRestorePassphrase] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deleteCaptchaToken, setDeleteCaptchaToken] = useState<string | null>(null)

  const passwordValidation = validatePassword(password)
  const strengthCfg = STRENGTH_CONFIG[passwordValidation.strength]

  if (!isCloudAvailable) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Account</h1>
        <Card>
          <div className="space-y-3 py-4 text-center">
            <Icon name="Cloud" size={48} className="text-slate-400 mx-auto" />
            <h3 className="text-lg font-semibold text-slate-200">
              Cloud Backup Not Configured
            </h3>
            <p className="text-sm text-slate-400 max-w-sm mx-auto">
              To enable cloud backup and accounts, set up a Supabase project and
              add your credentials to the environment variables.
            </p>
            <div className="rounded-xl bg-slate-800 p-4 text-left text-xs font-mono text-slate-400">
              <p>VITE_SUPABASE_URL=https://your-project.supabase.co</p>
              <p>VITE_SUPABASE_ANON_KEY=your-anon-key</p>
            </div>
            <p className="text-xs text-slate-500">
              Your data is still safely stored locally in your browser.
            </p>
          </div>
        </Card>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-slate-400">Loading...</p>
      </div>
    )
  }

  // --- MFA Challenge screen (after password sign-in, before full access) ---
  if (user && mfaRequired) {
    const handleMfaChallenge = async (e: React.FormEvent) => {
      e.preventDefault()
      setMfaError(null)
      setMfaLoading(true)
      const { error } = await challengeMfa(mfaCode)
      if (error) setMfaError(error)
      setMfaCode('')
      setMfaLoading(false)
    }

    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Two-Factor Authentication</h1>
        <Card className="max-w-md mx-auto">
          <div className="mb-5 text-center">
            <Icon name="Lock" size={48} className="text-slate-300 mx-auto mb-2" />
            <h2 className="text-lg font-semibold text-slate-200">
              Enter Verification Code
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Open your authenticator app and enter the 6-digit code
            </p>
          </div>

          <form onSubmit={handleMfaChallenge} className="space-y-4">
            <div>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                autoFocus
                required
                className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-4 text-center text-2xl font-mono tracking-[0.5em] text-slate-100 placeholder-slate-600 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
              />
            </div>

            {mfaError && (
              <p className="text-sm text-red-400 text-center">{mfaError}</p>
            )}

            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={mfaCode.length !== 6 || mfaLoading}
            >
              {mfaLoading ? 'Verifying...' : 'Verify'}
            </Button>

            <button
              type="button"
              onClick={signOut}
              className="w-full text-center text-sm text-slate-500 hover:text-slate-300"
            >
              Use a different account
            </button>
            <p className="text-center">
              <Link to="/reset-password" className="text-sm text-slate-500 hover:text-green-400">
                Forgot password?
              </Link>
            </p>
          </form>
        </Card>
      </div>
    )
  }

  // --- Sign-in / Sign-up form ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setAuthError(null)
    setAuthLoading(true)
    setSignupSuccess(false)

    if (mode === 'signup' && !passwordValidation.allPassed) {
      setAuthError('Password does not meet all requirements')
      setAuthLoading(false)
      return
    }

    if (!captchaToken) {
      setAuthError('Please complete the CAPTCHA verification')
      setAuthLoading(false)
      return
    }

    if (mode === 'signup') {
      const { error } = await signUp(email, password, captchaToken)
      if (error) setAuthError(error)
      else setSignupSuccess(true)
    } else {
      const { error } = await signIn(email, password, captchaToken)
      if (error) setAuthError(error)
    }
    setCaptchaToken(null)
    setAuthLoading(false)
  }

  if (!user) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Account</h1>

        <Card className="max-w-md mx-auto">
          <div className="mb-5 text-center">
            <Icon name="Cloud" size={48} className="text-slate-400 mx-auto mb-2" />
            <h2 className="text-lg font-semibold text-slate-200">
              Cloud Backup
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Create an account to back up your budget data to the cloud
            </p>
          </div>

          <div className="flex gap-2 rounded-xl bg-slate-800 p-1 mb-5">
            <button
              onClick={() => { setMode('signin'); setAuthError(null); setSignupSuccess(false); setAgreedToTerms(false) }}
              className={`flex-1 rounded-lg py-2.5 text-sm font-medium transition-colors ${
                mode === 'signin'
                  ? 'bg-green-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => { setMode('signup'); setAuthError(null); setSignupSuccess(false); setAgreedToTerms(false) }}
              className={`flex-1 rounded-lg py-2.5 text-sm font-medium transition-colors ${
                mode === 'signup'
                  ? 'bg-green-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Sign Up
            </button>
          </div>

          {signupSuccess && (
            <div className="mb-4 rounded-xl bg-green-900/20 border border-green-800 p-3 text-sm text-green-300">
              Account created! Check your email to confirm, then sign in.
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
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
            <div>
              <label className="mb-1 block text-sm text-slate-400">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === 'signup' ? 'Strong password required' : 'Enter password'}
                required
                minLength={mode === 'signup' ? 8 : 1}
                className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
              />

              {/* Password strength indicator (sign-up only) */}
              {mode === 'signup' && password.length > 0 && (
                <div className="mt-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 flex-1 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: strengthCfg.width,
                          backgroundColor: strengthCfg.color,
                        }}
                      />
                    </div>
                    <span
                      className="text-xs font-medium"
                      style={{ color: strengthCfg.color }}
                    >
                      {strengthCfg.label}
                    </span>
                  </div>
                  <ul className="space-y-1">
                    {passwordValidation.checks.map((check) => (
                      <li
                        key={check.label}
                        className={`flex items-center gap-1.5 text-xs ${
                          check.met ? 'text-green-400' : 'text-slate-500'
                        }`}
                      >
                        {check.met ? <Icon name="Check" size={14} /> : <span className="text-slate-600">○</span>}
                        {check.label}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {mode === 'signup' && (
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-600 bg-slate-800 text-green-500 focus:ring-green-500 focus:ring-offset-0"
                />
                <span className="text-xs text-slate-400">
                  I agree to the{' '}
                  <Link to="/terms" className="text-green-400 hover:text-green-300 underline">Terms of Use</Link>
                  {' '}and{' '}
                  <Link to="/privacy" className="text-green-400 hover:text-green-300 underline">Privacy Policy</Link>
                </span>
              </label>
            )}

            {authError && (
              <p className="text-sm text-red-400">{authError}</p>
            )}

            <div className="flex justify-center">
              <Turnstile
                key={mode}
                siteKey="0x4AAAAAACnmc8kz4iaWQcS4"
                onSuccess={(token) => setCaptchaToken(token)}
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={authLoading || !captchaToken || (mode === 'signup' && (!passwordValidation.allPassed || !agreedToTerms))}
            >
              {authLoading
                ? 'Please wait...'
                : mode === 'signin'
                  ? 'Sign In'
                  : 'Create Account'}
            </Button>
            {mode === 'signin' && (
              <p className="text-center">
                <Link to="/reset-password" className="text-sm text-slate-500 hover:text-green-400">
                  Forgot password?
                </Link>
              </p>
            )}
          </form>

          <p className="mt-4 text-center text-xs text-slate-500">
            Your budget data stays local. Cloud backup is optional and encrypted
            in transit via HTTPS.
          </p>
          {mode === 'signup' && (
            <p className="mt-2 text-center text-xs text-slate-500">
              Need a password manager? We recommend{' '}
              <a
                href="https://bitwarden.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-green-400 hover:text-green-300 underline"
              >
                Bitwarden
              </a>
              .
            </p>
          )}
        </Card>
      </div>
    )
  }

  // --- Signed-in view ---
  const handleStartEnroll = async () => {
    setEnrollError(null)
    const { data, error } = await enrollMfa()
    if (error) {
      setEnrollError(error)
      return
    }
    setEnrollmentData(data)
  }

  const handleVerifyEnrollment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!enrollmentData) return
    setEnrollLoading(true)
    setEnrollError(null)
    const { error } = await verifyMfaEnrollment(enrollmentData.factorId, enrollCode)
    if (error) {
      setEnrollError(error)
    } else {
      setEnrollmentData(null)
      setEnrollCode('')
    }
    setEnrollLoading(false)
  }

  const handleUnenroll = async (factorId: string) => {
    if (!window.confirm('Disable two-factor authentication? You can re-enable it anytime.')) return
    const { error } = await unenrollMfa(factorId)
    if (error) alert(error)
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Account</h1>

      {/* User info */}
      <Card>
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-600/20 text-xl text-green-400">
            {user.email?.[0]?.toUpperCase() ?? '?'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-medium text-slate-200 truncate">{user.email}</p>
            <p className="text-xs text-slate-500">
              Signed in · Cloud backup {backupEnabled ? 'active' : 'inactive'}
              {mfaEnrolled && ' · MFA enabled'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/reset-password"
              className="inline-flex items-center justify-center rounded-lg px-3 py-1.5 text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
            >
              Change password
            </Link>
            <Button variant="ghost" onClick={signOut} size="sm">
              Sign Out
            </Button>
          </div>
        </div>
      </Card>

      {/* Two-Factor Authentication */}
      <Card>
        <h3 className="mb-3 text-sm font-medium text-slate-400">
          Two-Factor Authentication
        </h3>

        {mfaEnrolled ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-3 w-3 rounded-full bg-green-500" />
              <div>
                <p className="text-sm text-slate-200">MFA is enabled</p>
                <p className="text-xs text-slate-500">
                  Your account is protected with an authenticator app
                </p>
              </div>
            </div>
            {mfaFactors
              .filter((f) => f.status === 'verified')
              .map((factor) => (
                <div
                  key={factor.id}
                  className="flex items-center justify-between rounded-xl bg-slate-800/50 p-3"
                >
                  <div className="flex items-center gap-2">
                    <Icon name="Lock" size={20} />
                    <div>
                      <p className="text-sm text-slate-200">
                        {factor.friendly_name || 'Authenticator App'}
                      </p>
                      <p className="text-xs text-slate-500">
                        Added {format(new Date(factor.created_at), 'MMM d, yyyy')}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleUnenroll(factor.id)}
                  >
                    Remove
                  </Button>
                </div>
              ))}
          </div>
        ) : enrollmentData ? (
          /* Enrollment in progress */
          <div className="space-y-4">
            <p className="text-sm text-slate-300">
              Scan this QR code with your authenticator app (Google Authenticator,
              Authy, 1Password, etc.)
            </p>
            <div className="flex justify-center rounded-xl bg-white p-4">
              <img
                src={enrollmentData.qrCode}
                alt="MFA QR Code"
                className="h-48 w-48"
              />
            </div>
            <div className="rounded-xl bg-slate-800 p-3">
              <p className="mb-1 text-xs text-slate-500">
                Can't scan? Enter this key manually:
              </p>
              <p className="font-mono text-xs text-slate-300 break-all select-all">
                {enrollmentData.secret}
              </p>
            </div>
            <form onSubmit={handleVerifyEnrollment} className="space-y-3">
              <div>
                <label className="mb-1 block text-sm text-slate-400">
                  Enter the 6-digit code from your app to verify
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={enrollCode}
                  onChange={(e) => setEnrollCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  autoFocus
                  required
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-center text-xl font-mono tracking-[0.4em] text-slate-100 placeholder-slate-600 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                />
              </div>
              {enrollError && (
                <p className="text-sm text-red-400">{enrollError}</p>
              )}
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => { setEnrollmentData(null); setEnrollCode(''); setEnrollError(null) }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={enrollCode.length !== 6 || enrollLoading}
                >
                  {enrollLoading ? 'Verifying...' : 'Verify & Enable'}
                </Button>
              </div>
            </form>
          </div>
        ) : (
          /* Not enrolled */
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-3 w-3 rounded-full bg-slate-600" />
              <div>
                <p className="text-sm text-slate-200">MFA is not enabled</p>
                <p className="text-xs text-slate-500">
                  Add an extra layer of security with an authenticator app
                </p>
              </div>
            </div>
            {enrollError && (
              <p className="text-sm text-red-400">{enrollError}</p>
            )}
            <Button variant="secondary" onClick={handleStartEnroll}>
              Set Up Two-Factor Authentication
            </Button>
          </div>
        )}
      </Card>

      {/* Encryption passphrase */}
      <Card>
        <h3 className="mb-3 text-sm font-medium text-slate-400">
          Backup Encryption
        </h3>

        {passphraseSet ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-3 w-3 rounded-full bg-green-500" />
              <div>
                <p className="text-sm text-slate-200">End-to-end encryption active</p>
                <p className="text-xs text-slate-500">
                  Your backups are encrypted with AES-256-GCM before leaving this device
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (window.confirm('Remove encryption passphrase from this session? You will need to re-enter it to backup or restore.')) {
                  clearStoredPassphrase()
                  setPassphraseSet(false)
                }
              }}
            >
              Lock Passphrase
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-3 w-3 rounded-full bg-yellow-500" />
              <div>
                <p className="text-sm text-slate-200">
                  {isEncrypted ? 'Passphrase required' : 'No encryption passphrase set'}
                </p>
                <p className="text-xs text-slate-500">
                  {isEncrypted
                    ? 'Your cloud backup is encrypted. Enter your passphrase to enable auto-backup and restore.'
                    : 'Set a passphrase to encrypt your cloud backups end-to-end. Without this, data is stored as plaintext in the cloud.'}
                </p>
              </div>
            </div>

            {!showPassphraseSetup ? (
              <Button variant="secondary" size="sm" onClick={() => setShowPassphraseSetup(true)}>
                {isEncrypted ? 'Enter Passphrase' : 'Set Encryption Passphrase'}
              </Button>
            ) : (
              <div className="space-y-3">
                <input
                  type="password"
                  placeholder={isEncrypted ? 'Enter your passphrase' : 'Choose a passphrase (min 8 characters)'}
                  value={passphrase}
                  onChange={(e) => setPassphrase(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-slate-200 placeholder-slate-500 focus:border-green-500 focus:outline-none"
                />
                {!isEncrypted && (
                  <input
                    type="password"
                    placeholder="Confirm passphrase"
                    value={passphraseConfirm}
                    onChange={(e) => setPassphraseConfirm(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-slate-200 placeholder-slate-500 focus:border-green-500 focus:outline-none"
                  />
                )}
                <div className="flex gap-2">
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={isEncrypted ? passphrase.length < 8 : (passphrase.length < 8 || passphrase !== passphraseConfirm)}
                    onClick={() => {
                      setStoredPassphrase(passphrase)
                      setPassphraseSet(true)
                      setShowPassphraseSetup(false)
                      setPassphrase('')
                      setPassphraseConfirm('')
                    }}
                  >
                    {isEncrypted ? 'Unlock' : 'Enable Encryption'}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => { setShowPassphraseSetup(false); setPassphrase(''); setPassphraseConfirm('') }}>
                    Cancel
                  </Button>
                </div>
                {!isEncrypted && (
                  <p className="text-xs text-amber-400">
                    Save this passphrase somewhere safe. If you lose it, encrypted backups cannot be recovered.
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Backup status */}
      <Card>
        <h3 className="mb-3 text-sm font-medium text-slate-400">
          Cloud Backup
        </h3>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div
              className={`h-3 w-3 rounded-full ${
                lastBackupAt ? 'bg-green-500' : 'bg-slate-600'
              }`}
            />
            <div>
              <p className="text-sm text-slate-200">
                {lastBackupAt
                  ? `Last backed up: ${format(new Date(lastBackupAt), 'MMM d, yyyy h:mm a')}`
                  : 'No backup yet'}
              </p>
              <p className="text-xs text-slate-500">
                {passphraseSet
                  ? 'Encrypted changes are auto-backed up 5 seconds after each edit'
                  : 'Set an encryption passphrase above to enable auto-backup'}
              </p>
            </div>
          </div>

          {backupError && (
            <div className="rounded-xl bg-red-900/20 border border-red-800 p-3 text-sm text-red-300">
              {backupError}
            </div>
          )}

          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={async () => {
                await backupNow()
              }}
              disabled={isBacking || !passphraseSet || backupCooldown > 0}
              className="flex-1"
            >
              {isBacking ? 'Backing up...' : backupCooldown > 0 ? `Wait ${backupCooldown}s` : 'Backup Now'}
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                if (isEncrypted && !getStoredPassphrase()) {
                  setShowRestorePassphrase(true)
                  return
                }
                if (window.confirm(
                  'This will replace all local data with your cloud backup. Continue?',
                )) {
                  restoreFromCloud()
                }
              }}
              disabled={isRestoring}
              className="flex-1"
            >
              {isRestoring ? 'Restoring...' : 'Restore from Cloud'}
            </Button>
          </div>

          {showRestorePassphrase && (
            <div className="space-y-3 rounded-xl bg-slate-800/50 p-3">
              <p className="text-sm text-slate-300">Enter your backup passphrase to decrypt and restore:</p>
              <input
                type="password"
                placeholder="Backup passphrase"
                value={restorePassphrase}
                onChange={(e) => setRestorePassphrase(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-slate-200 placeholder-slate-500 focus:border-green-500 focus:outline-none"
              />
              <div className="flex gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  disabled={restorePassphrase.length < 8}
                  onClick={() => {
                    if (window.confirm('This will replace all local data with your cloud backup. Continue?')) {
                      setStoredPassphrase(restorePassphrase)
                      setPassphraseSet(true)
                      restoreFromCloud(restorePassphrase)
                      setShowRestorePassphrase(false)
                      setRestorePassphrase('')
                    }
                  }}
                >
                  Decrypt & Restore
                </Button>
                <Button variant="ghost" size="sm" onClick={() => { setShowRestorePassphrase(false); setRestorePassphrase('') }}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          <p className="text-xs text-slate-500">
            Restore pulls your latest cloud backup into this browser, replacing
            local data.
          </p>

          <div className="mt-6 pt-4 border-t border-slate-800">
            <p className="text-xs text-slate-500 mb-2">Delete all cloud backup data and local data for this account. This cannot be undone.</p>
            {!showDeleteConfirm ? (
              <Button
                variant="danger"
                size="sm"
                onClick={() => setShowDeleteConfirm(true)}
              >
                Delete account data
              </Button>
            ) : (
              <div className="space-y-3 rounded-xl bg-red-900/20 border border-red-800/50 p-3">
                <p className="text-sm text-slate-300">Type <span className="font-mono font-bold text-red-400">DELETE</span> to confirm:</p>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="DELETE"
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 font-mono"
                />
                <div className="flex justify-center">
                  <Turnstile
                    siteKey="0x4AAAAAACnmc8kz4iaWQcS4"
                    onSuccess={(token) => setDeleteCaptchaToken(token)}
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="danger"
                    size="sm"
                    disabled={deleteConfirmText !== 'DELETE' || !deleteCaptchaToken || isDeleting}
                    onClick={async () => {
                      const { error: err } = await deleteAccountData()
                      if (!err) {
                        setShowDeleteConfirm(false)
                        setDeleteConfirmText('')
                        setDeleteCaptchaToken(null)
                        await signOut()
                      }
                    }}
                  >
                    {isDeleting ? 'Deleting...' : 'Permanently delete all data'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={isDeleting}
                    onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText(''); setDeleteCaptchaToken(null) }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* How it works */}
      <Card>
        <h3 className="mb-2 text-sm font-medium text-slate-400">
          How Cloud Backup Works
        </h3>
        <ul className="space-y-2 text-sm text-slate-400">
          <li className="flex items-start gap-2">
            <span className="text-green-400 mt-0.5">1.</span>
            Your data is stored locally in this browser first
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-400 mt-0.5">2.</span>
            Set an encryption passphrase to protect your backups
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-400 mt-0.5">3.</span>
            Data is encrypted with AES-256 before leaving your device
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-400 mt-0.5">4.</span>
            On a new device, sign in and enter your passphrase to restore
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-400 mt-0.5">5.</span>
            The app works fully offline — cloud is optional
          </li>
        </ul>
        <div className="mt-4 rounded-xl bg-amber-900/20 border border-amber-800/40 p-3">
          <p className="text-xs font-medium text-amber-400 mb-1">What if I enter the wrong passphrase?</p>
          <p className="text-xs text-slate-400">
            If you enter an incorrect passphrase during restore, decryption will fail and your local data will remain untouched. No data is lost or overwritten. Simply re-enter the correct passphrase and try again. If you have permanently lost your passphrase, encrypted cloud backups cannot be recovered — but your local data is always available without one.
          </p>
        </div>
      </Card>
    </div>
  )
}
