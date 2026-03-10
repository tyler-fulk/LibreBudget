import { Link } from 'react-router-dom'
import { Card } from '../components/ui/Card'

export default function PrivacyManifesto() {
  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Privacy & Security Manifesto</h1>
        <p className="text-sm text-slate-400 mt-1">
          Zero-knowledge architecture: we cannot see your data
        </p>
      </div>

      <Card>
        <div className="prose-content">

          <p>
            LibreBudget is built on one principle: <strong>your money data is yours</strong>.
            We use a <strong>zero-knowledge architecture</strong> — we cannot read,
            analyze, or recover your financial data, even when you use cloud backup.
            This manifesto explains how we achieve that.
          </p>

          <h2>1. Zero-Knowledge Architecture</h2>
          <p>
            When you enable cloud backup, your data is <strong>encrypted in your
            browser</strong> before it ever leaves. We use <strong>AES-256-GCM</strong> with
            keys derived from your <strong>recovery phrase</strong> (BIP39
            seed + HKDF-SHA256). Your recovery phrase never leaves your device.
            We store only ciphertext — an opaque blob. Without your recovery
            phrase, no one (including us, Cloudflare, or an attacker with KV
            access) can read your transactions, amounts, descriptions, debts,
            credit scores, or goals.
          </p>
          <p>
            Encryption indicators in Settings show which fields are protected.
            You can verify the implementation; the source code is open.
          </p>

          <h2>2. Local-First: Your Device Is the Source of Truth</h2>
          <p>
            By default, <strong>nothing leaves your browser</strong>. Transactions,
            categories, budget goals, debts, savings goals, credit scores,
            recurring transactions, and settings live in IndexedDB on your
            device. The app works fully offline. Cloud backup is optional — you
            must explicitly create a vault and enable it. No vault, no cloud,
            no transmission.
          </p>

          <h2>3. What We Never See</h2>
          <ul>
            <li>Your recovery phrase</li>
            <li>Your encryption keys</li>
            <li>Decrypted transactions, amounts, or descriptions</li>
            <li>Budget goals, debt balances, or savings targets</li>
            <li>Credit scores or financial risk assessments</li>
            <li>Any data that could identify your spending or income</li>
          </ul>

          <h2>4. Vault-Based Access</h2>
          <ul>
            <li><strong>Recovery phrase (BIP39)</strong> — Your 12-word mnemonic derives an anonymous storage ID and an encryption key. It never leaves your device.</li>
            <li><strong>Anonymous storage</strong> — Cloud storage uses a derived 64-character hex ID; no email, no password, no personal identifiers.</li>
            <li><strong>In-memory only</strong> — Vault keys live in browser memory while the tab is open. Lock the vault or close the tab to clear them.</li>
          </ul>

          <h2>5. Cloudflare Worker & KV</h2>
          <ul>
            <li><strong>Dumb pipe</strong> — The backend stores only id + encrypted payload. No decryption logic. No key storage.</li>
            <li><strong>Payload limit</strong> — 5MB max per backup to prevent abuse.</li>
            <li><strong>Ciphertext only</strong> — Even with KV access, values are encrypted blobs.</li>
          </ul>

          <h2>6. Client-Side Protections</h2>
          <ul>
            <li><strong>Content Security Policy (CSP)</strong> — Restricts script sources and connect targets.</li>
            <li><strong>No analytics or tracking</strong> — No Google Analytics, Mixpanel, or ad networks.</li>
            <li><strong>No PII</strong> — With cloud backup, we store only an anonymous derived ID.</li>
          </ul>

          <h2>7. Data You Control</h2>
          <ul>
            <li><strong>Export</strong> — JSON and CSV export from Settings.</li>
            <li><strong>Import</strong> — Bounded CSV import with validation.</li>
            <li><strong>Reset</strong> — Lock your vault or delete cloud backup to remove cloud data.</li>
            <li><strong>Audit</strong> — Read the source code; run your own build.</li>
          </ul>

          <h2>8. What We Don&apos;t Do</h2>
          <ul>
            <li>We don&apos;t sell, rent, or share your data.</li>
            <li>We don&apos;t use your data for advertising or profiling.</li>
            <li>We don&apos;t require cloud backup — the app is useful fully offline.</li>
            <li>We don&apos;t store your recovery phrase — lose it, and encrypted backups cannot be recovered (by design).</li>
            <li>We don&apos;t have the ability to decrypt your data — zero-knowledge by architecture.</li>
          </ul>

          <p className="pt-2" style={{ opacity: 0.7 }}>
            LibreBudget is open-source. You can read the code, run it yourself,
            and verify these claims. Privacy isn&apos;t a feature — it&apos;s the
            foundation. Zero-knowledge isn&apos;t a promise; it&apos;s how the system
            is built.
          </p>

        </div>
      </Card>

      <p className="text-center text-xs text-slate-500">
        <Link to="/privacy" className="text-green-400 hover:text-green-300">Privacy Policy</Link>
        {' · '}
        <Link to="/terms" className="text-green-400 hover:text-green-300">Terms of Use</Link>
        {' · '}
        <Link to="/settings" className="text-green-400 hover:text-green-300">Settings</Link>
      </p>
    </div>
  )
}
