import { Link } from 'react-router-dom'
import { Card } from '../components/ui/Card'

export default function PrivacyManifesto() {
  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Privacy & Security Manifesto</h1>
        <p className="text-sm text-slate-400 mt-1">
          How LibreBudget protects your data, from device to cloud
        </p>
      </div>

      <Card>
        <div className="prose prose-invert prose-sm max-w-none space-y-6 text-slate-300 [&_h2]:text-slate-100 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:mt-6 [&_h2]:mb-2 [&_h3]:text-slate-200 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mt-4 [&_h3]:mb-1 [&_strong]:text-slate-200 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 [&_p]:leading-relaxed">

          <p className="text-slate-200">
            LibreBudget is built on a simple principle: <strong>your money data is yours</strong>.
            We don't want it. We don't analyze it. We don't sell it. This document spells out
            every step we take to keep your data private and secure.
          </p>

          <h2>1. Local-First: Your Device Is the Source of Truth</h2>
          <p>
            By default, <strong>nothing leaves your browser</strong>. Transactions, categories,
            goals, debts, credit scores, and settings live in IndexedDB on your device. The app
            works fully offline. Cloud backup is optional — you must explicitly sign up and
            enable it. No account, no cloud, no transmission.
          </p>

          <h2>2. End-to-End Encrypted Cloud Backup</h2>
          <p>
            When you enable cloud backup, your data is <strong>encrypted on your device</strong> before
            it ever touches the network. We use <strong>AES-256-GCM</strong> with keys derived from your
            backup passphrase via <strong>PBKDF2</strong> (100,000 iterations). The passphrase never
            leaves your device — we store it only in session storage during your session and clear it
            on sign-out.
          </p>
          <p>
            What Supabase (or any database admin) sees is <strong>only ciphertext</strong> — an opaque
            blob like <code className="text-slate-400 text-xs bg-slate-800 px-1 rounded">0x8f23...</code>.
            No one can read your transactions, amounts, descriptions, or credit scores without your
            passphrase. You can turn on encryption indicators in Settings to see which fields are
            protected.
          </p>

          <h2>3. Backup Validation & Limits</h2>
          <p>
            Before restoring a backup, we validate its structure and enforce row limits (50,000 per
            table, 10MB for imports). Malformed or malicious payloads are rejected. This reduces the
            risk of injection or runaway restores.
          </p>

          <h2>4. Authentication & Access Control</h2>
          <ul>
            <li><strong>Email + password</strong> — Stored hashed (bcrypt) by Supabase; we never see plaintext.</li>
            <li><strong>Password complexity</strong> — Minimum length, uppercase, lowercase, number, special character.</li>
            <li><strong>MFA (TOTP)</strong> — Optional 6-digit authenticator app support for sign-in.</li>
            <li><strong>CAPTCHA (Turnstile)</strong> — Cloudflare Turnstile on sign-up and sign-in to reduce bots and brute-force.</li>
          </ul>

          <h2>5. Database Security (Supabase)</h2>
          <ul>
            <li><strong>Row Level Security (RLS)</strong> — Every table policy enforces <code className="text-slate-400 text-xs bg-slate-800 px-1 rounded">auth.uid() = user_id</code>. Users can only read/write their own rows.</li>
            <li><strong>Rate limits</strong> — Sign-ups, sign-ins, and token refreshes are rate-limited per IP to slow abuse.</li>
            <li><strong>Anon key</strong> — Public by design; security comes from RLS and encryption, not key secrecy.</li>
          </ul>

          <h2>6. Client-Side Protections</h2>
          <ul>
            <li><strong>Content Security Policy (CSP)</strong> — Restricts script sources, connect targets, and frame origins to limit XSS and data exfiltration.</li>
            <li><strong>No analytics or tracking</strong> — No Google Analytics, Mixpanel, or ad networks. No fingerprinting.</li>
            <li><strong>Minimal PII</strong> — With cloud backup, we store only email (for auth). No name, address, or payment info.</li>
          </ul>

          <h2>7. Data You Control</h2>
          <ul>
            <li><strong>Export</strong> — JSON and CSV export of all your data from Settings.</li>
            <li><strong>Import</strong> — Bounded CSV import (10k rows, 10MB) with batch writes to avoid memory issues.</li>
            <li><strong>Reset</strong> — Clear all local data from Settings. Delete account to remove cloud backup.</li>
          </ul>

          <h2>8. What We Don’t Do</h2>
          <ul>
            <li>We don’t sell, rent, or share your data.</li>
            <li>We don’t use your data for advertising or profiling.</li>
            <li>We don’t require cloud backup — the app is useful fully offline.</li>
            <li>We don’t store your backup passphrase — lose it, and encrypted backups cannot be recovered (by design).</li>
          </ul>

          <p className="text-slate-400 text-sm pt-2">
            LibreBudget is open-source. You can read the code, run it yourself, and verify these
            claims. Privacy isn’t a feature — it’s the foundation.
          </p>

        </div>
      </Card>

      <p className="text-center text-xs text-slate-500">
        <Link to="/privacy" className="hover:text-slate-300">Privacy Policy</Link>
        {' · '}
        <Link to="/terms" className="hover:text-slate-300">Terms of Use</Link>
        {' · '}
        <Link to="/settings" className="hover:text-slate-300">Settings</Link>
      </p>
    </div>
  )
}
