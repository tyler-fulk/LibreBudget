import { useState } from 'react'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { Turnstile } from '@marsidev/react-turnstile'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { AccountOnboarding } from '../components/AccountOnboarding'
import { useWallet } from '../hooks/useWallet'
import { useCloudBackup } from '../hooks/useCloudBackup'
import { Icon } from '../components/ui/Icon'

const BACKUP_API_URL = import.meta.env.VITE_BACKUP_API_URL as string | undefined
const TURNSTILE_SITE_KEY =
  (import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined) ||
  (import.meta.env.DEV && BACKUP_API_URL ? '1x00000000000000000000AA' : undefined)

/** Production requires Turnstile when cloud backup is configured */
const TURNSTILE_REQUIRED = import.meta.env.PROD && !!BACKUP_API_URL

export default function Account() {
  const { wallet, hasWallet, clearWallet } = useWallet()
  const {
    backupNow,
    restoreFromCloud,
    lastBackupAt,
    isBacking,
    isRestoring,
    error: backupError,
    enabled: backupEnabled,
    backupCooldown,
    isDeleting,
    deleteAccountData,
  } = useCloudBackup()

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)

  if (!BACKUP_API_URL) {
    return (
      <>
        <AccountOnboarding />
        <div className="space-y-6">
        <h1 className="text-2xl font-bold">Account</h1>
        <Card>
          <div className="space-y-3 py-4 text-center">
            <Icon name="Cloud" size={48} className="text-slate-400 mx-auto" />
            <h3 className="text-lg font-semibold text-slate-200">
              Cloud Backup Not Configured
            </h3>
            <p className="text-sm text-slate-400 max-w-sm mx-auto">
              Set VITE_BACKUP_API_URL to your Cloudflare Worker URL to enable
              cloud backup.
            </p>
            <p className="text-xs text-slate-500">
              Your data is still safely stored locally in your browser.
            </p>
          </div>
        </Card>
        <Card>
          <h3 className="mb-3 text-sm font-medium text-slate-400">
            Vault (Local Only)
          </h3>
          <div className="space-y-3">
            <p className="text-sm text-slate-400">
              Create or restore a vault to prepare for cloud backup. Your
              recovery phrase gives you full control of your encrypted data.
            </p>
            <div className="flex gap-3">
              <Link to="/generate-wallet" className="flex-1">
                <Button variant="secondary" className="w-full">
                  Create Vault
                </Button>
              </Link>
              <Link to="/restore-wallet" className="flex-1">
                <Button variant="secondary" className="w-full">
                  Restore Vault
                </Button>
              </Link>
            </div>
          </div>
        </Card>
      </div>
      </>
    )
  }

  if (!hasWallet) {
    return (
      <>
        <AccountOnboarding />
        <div className="space-y-6">
        <h1 className="text-2xl font-bold">Account</h1>
        <Card className="max-w-md mx-auto">
          <div className="mb-5 text-center">
            <Icon name="Wallet" size={48} className="text-slate-400 mx-auto mb-2" />
            <h2 className="text-lg font-semibold text-slate-200">
              Cloud Backup
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Create a vault or restore from your recovery phrase to enable
              encrypted cloud backup.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <Link to="/generate-wallet">
              <Button variant="primary" className="w-full" size="lg">
                Create New Vault
              </Button>
            </Link>
            <Link to="/restore-wallet">
              <Button variant="secondary" className="w-full" size="lg">
                Restore from Recovery Phrase
              </Button>
            </Link>
          </div>

          <p className="mt-4 text-center text-xs text-slate-500">
            Your budget data stays local. Cloud backup is optional and encrypted
            before leaving your device.
          </p>
        </Card>
      </div>
      </>
    )
  }

  return (
    <>
      <AccountOnboarding />
      <div className="space-y-6">
      <h1 className="text-2xl font-bold">Account</h1>

      <Card>
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-600/20 text-xl text-green-400">
            <Icon name="Wallet" size={24} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-medium text-slate-200 truncate">
              Vault active · Cloud backup {backupEnabled ? 'enabled' : 'disabled'}
            </p>
            <p className="text-xs text-slate-500 font-mono truncate">
              ID: {wallet?.anonymousId?.slice(0, 16)}…
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={clearWallet}>
            Lock Vault
          </Button>
        </div>
      </Card>

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
                Encrypted changes are auto-backed up after edits
              </p>
            </div>
          </div>

          {backupError && (
            <div className="rounded-xl bg-red-900/20 border border-red-800 p-3 text-sm text-red-300">
              {backupError}
            </div>
          )}

          {TURNSTILE_REQUIRED && !TURNSTILE_SITE_KEY && (
            <div className="rounded-xl bg-amber-900/20 border border-amber-800/40 p-3 text-sm text-amber-200">
              Cloud backup requires VITE_TURNSTILE_SITE_KEY in production. See SETUP.md.
            </div>
          )}
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

          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={() => backupNow()}
              disabled={isBacking || backupCooldown > 0}
              className="flex-1"
            >
              {isBacking ? 'Backing up...' : backupCooldown > 0 ? `Wait ${backupCooldown}s` : 'Backup Now'}
            </Button>
            <Button
              variant="secondary"
              onClick={() =>
                window.confirm(
                  'This will replace all local data with your cloud backup. Continue?'
                ) && restoreFromCloud(turnstileToken ?? undefined)
              }
              disabled={isRestoring || (!!TURNSTILE_SITE_KEY && !turnstileToken)}
              className="flex-1"
            >
              {isRestoring ? 'Restoring...' : 'Restore from Cloud'}
            </Button>
          </div>

          <p className="text-xs text-slate-500">
            Restore pulls your latest cloud backup into this browser, replacing
            local data.
          </p>

          <div className="mt-6 pt-4 border-t border-slate-800">
            <p className="text-xs text-slate-500 mb-2">
              Delete all cloud backup data. Local data will remain until you lock
              your vault. This cannot be undone.
            </p>
            {!showDeleteConfirm ? (
              <Button variant="danger" size="sm" onClick={() => setShowDeleteConfirm(true)}>
                Delete cloud backup
              </Button>
            ) : (
              <div className="space-y-3 rounded-xl bg-red-900/20 border border-red-800/50 p-3">
                <p className="text-sm text-slate-300">
                  Type <span className="font-mono font-bold text-red-400">DELETE</span> to
                  confirm:
                </p>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="DELETE"
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 font-mono"
                />
                <div className="flex gap-2">
                  <Button
                    variant="danger"
                    size="sm"
                    disabled={deleteConfirmText !== 'DELETE' || isDeleting}
                    onClick={async () => {
                      const { error: err } = await deleteAccountData()
                      if (!err) {
                        setShowDeleteConfirm(false)
                        setDeleteConfirmText('')
                      }
                    }}
                  >
                    {isDeleting ? 'Deleting...' : 'Permanently delete cloud backup'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={isDeleting}
                    onClick={() => {
                      setShowDeleteConfirm(false)
                      setDeleteConfirmText('')
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>

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
            Your recovery phrase derives encryption keys — never shared
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-400 mt-0.5">3.</span>
            Data is encrypted with AES-256-GCM before leaving your device
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-400 mt-0.5">4.</span>
            On a new device, restore with your 24-word phrase
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-400 mt-0.5">5.</span>
            The app works fully offline — cloud is optional
          </li>
        </ul>
      </Card>
    </div>
    </>
  )
}
