import { useState, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Turnstile } from '@marsidev/react-turnstile'
import { validateMnemonic } from '@scure/bip39'
import { wordlist } from '@scure/bip39/wordlists/english'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Icon } from '../components/ui/Icon'
import { PinSetupModal } from '../components/PinSetupModal'
import { useWallet } from '../hooks/useWallet'
import type { WalletKeys } from '../hooks/useWallet'
import { deriveKeys, decryptBackup } from '../utils/crypto'
import { hydrateDatabase, validateBackupPayload, type BackupPayload } from '../db/backup'

const BACKUP_API_URL = import.meta.env.VITE_BACKUP_API_URL as string | undefined
const TURNSTILE_SITE_KEY =
  (import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined) ||
  (import.meta.env.DEV && BACKUP_API_URL ? '1x00000000000000000000AA' : undefined)

/** Production requires Turnstile when cloud backup is configured */
const TURNSTILE_REQUIRED = import.meta.env.PROD && !!BACKUP_API_URL

export default function RestoreWallet() {
  const navigate = useNavigate()
  const { setWallet, persistWithPin } = useWallet()
  const [mnemonicInput, setMnemonicInput] = useState('')
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showPinModal, setShowPinModal] = useState(false)
  const [keysForPin, setKeysForPin] = useState<WalletKeys | null>(null)

  const handleRestore = useCallback(async () => {
    const normalized = mnemonicInput.trim().replace(/\s+/g, ' ')
    if (!validateMnemonic(normalized, wordlist)) {
      setError('Invalid recovery phrase. Check that all words are correct and in order.')
      return
    }
    setError(null)
    setLoading(true)
    try {
      const { anonymousId, encryptionKey, writeToken } = await deriveKeys(normalized)
      const keys = { anonymousId, encryptionKey, writeToken }
      setWallet(keys)

      if (BACKUP_API_URL) {
        const headers: HeadersInit = {}
        if (turnstileToken) headers['X-Turnstile-Token'] = turnstileToken
        const res = await fetch(`${BACKUP_API_URL}/backup/${encodeURIComponent(anonymousId)}`, {
          headers,
        })
        if (res.ok) {
          const payloadBase64 = await res.text()
          if (payloadBase64) {
            const decrypted = await decryptBackup(payloadBase64, keys.encryptionKey)
            const payload = JSON.parse(decrypted) as BackupPayload
            const validation = validateBackupPayload(payload)
            if (validation.valid) {
              await hydrateDatabase(payload)
            } else {
              setError(`Invalid backup data: ${validation.reason}`)
              setLoading(false)
              return
            }
          }
        } else if (res.status !== 404) {
          const body = await res.json().catch(() => ({})) as { error?: string; hint?: string }
          const msg = body.error || 'Failed to fetch backup from cloud'
          setError(body.hint ? `${msg}. ${body.hint}` : msg)
          setLoading(false)
          return
        }
      }

      setKeysForPin(keys)
      setShowPinModal(true)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Restore failed'
      setError(msg === 'Failed to fetch'
        ? 'Failed to fetch. Check your connection. If using a custom domain, add it to the Worker\'s ALLOWED_ORIGINS (SETUP.md).'
        : msg)
    } finally {
      setLoading(false)
    }
  }, [mnemonicInput, turnstileToken, setWallet])

  const normalized = mnemonicInput.trim().replace(/\s+/g, ' ')
  const wordCount = normalized ? normalized.split(' ').length : 0
  const isValid = (wordCount === 12 || wordCount === 24) && validateMnemonic(normalized, wordlist)

  if (TURNSTILE_REQUIRED && !TURNSTILE_SITE_KEY) {
    return (
      <div className="space-y-6 max-w-lg mx-auto">
        <h1 className="text-2xl font-bold">Restore Vault</h1>
        <Card>
          <div className="py-6 text-center text-slate-400">
            <p className="font-medium text-amber-400">Cloud backup is not configured for production.</p>
            <p className="mt-2 text-sm">VITE_TURNSTILE_SITE_KEY must be set. See SETUP.md.</p>
            <Link to="/account" className="mt-4 inline-block text-sm text-green-400 hover:text-green-300">
              ← Back to Account
            </Link>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold">Restore Vault</h1>
      <Card>
        <div className="space-y-4">
          <div className="text-center mb-4">
            <Icon name="Wallet" size={48} className="text-green-400 mx-auto mb-2" />
            <h2 className="text-lg font-semibold text-slate-200">
              Enter Your Recovery Phrase
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Paste or type your recovery phrase to restore your vault
              and cloud backup.
            </p>
          </div>

          <div>
            <label className="mb-1 block text-sm text-slate-400">
              Recovery phrase (12 or 24 words)
            </label>
            <textarea
              value={mnemonicInput}
              onChange={(e) => setMnemonicInput(e.target.value)}
              placeholder="word1 word2 word3 ..."
              rows={4}
              className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm font-mono text-slate-200 placeholder-slate-500 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500 resize-none"
            />
            <p className="mt-1 text-xs text-slate-500">
              {wordCount > 0
                ? (wordCount === 12 || wordCount === 24)
                  ? isValid
                    ? 'Valid phrase'
                    : 'Invalid phrase — check words'
                  : `${wordCount} words (need 12 or 24)`
                : 'Enter your recovery phrase'}
            </p>
          </div>

          {TURNSTILE_SITE_KEY && (
            <div className="flex justify-center">
              <Turnstile
                siteKey={TURNSTILE_SITE_KEY}
                options={{ theme: 'dark' }}
                onSuccess={(token) => setTurnstileToken(token)}
                onExpire={() => setTurnstileToken(null)}
              />
            </div>
          )}

          {error && (
            <p className="text-sm text-red-400">{error}</p>
          )}

          <Button
            className="w-full"
            size="lg"
            disabled={!isValid || (!!TURNSTILE_SITE_KEY && !turnstileToken) || loading}
            onClick={handleRestore}
          >
            {loading ? 'Restoring...' : 'Restore Vault'}
          </Button>

          <PinSetupModal
            open={showPinModal}
            onSetPin={async (pin) => {
              if (keysForPin) {
                await persistWithPin(keysForPin, pin)
                setShowPinModal(false)
                setKeysForPin(null)
                navigate('/', { replace: true })
              }
            }}
            onSkip={() => {
              setShowPinModal(false)
              setKeysForPin(null)
              navigate('/', { replace: true })
            }}
          />

          {!BACKUP_API_URL && (
            <p className="text-xs text-amber-400 text-center">
              Backup API not configured. Vault will be restored but cloud data
              cannot be fetched until the backend is set up.
            </p>
          )}

          <p className="text-center">
            <Link to="/account" className="text-sm text-slate-500 hover:text-slate-300">
              ← Back to Account
            </Link>
          </p>
        </div>
      </Card>
    </div>
  )
}
