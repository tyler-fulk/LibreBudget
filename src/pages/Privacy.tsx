import { Link } from 'react-router-dom'
import { Card } from '../components/ui/Card'

export default function Privacy() {
  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">Privacy Policy</h1>
        <p className="text-sm text-slate-400 mt-1">
          Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
        </p>
      </div>

      <Card>
        <div className="prose prose-invert prose-sm max-w-none space-y-6 text-slate-300 [&_h2]:text-slate-100 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:mt-6 [&_h2]:mb-2 [&_h3]:text-slate-200 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mt-4 [&_h3]:mb-1 [&_strong]:text-slate-200 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1">

          <p>
            LibreBudget ("we", "us", "our", or "the Application") is a free,
            open-source personal budget tracking application. We are committed
            to protecting your privacy. This Privacy Policy explains how your
            information is collected, used, and disclosed when you use
            LibreBudget.
          </p>

          <h2>1. Local-First Architecture</h2>
          <p>
            LibreBudget is designed as a <strong>local-first</strong> application.
            By default, all of your financial data -- including transactions,
            categories, budget goals, and settings -- is stored exclusively in
            your web browser's IndexedDB storage on your own device. <strong>No
            data is transmitted to any server unless you explicitly opt in to
            cloud backup by creating an account.</strong>
          </p>

          <h2>2. Data We Collect</h2>

          <h3>2.1 Data Stored Locally (No Account)</h3>
          <p>
            When you use LibreBudget without an account, we collect and store
            <strong> no data whatsoever</strong> on any server. All information
            you enter remains on your device in your browser's local storage.
            We have no access to it.
          </p>

          <h3>2.2 Data Collected With an Account (Optional Cloud Backup)</h3>
          <p>If you choose to create an account, we collect:</p>
          <ul>
            <li>
              <strong>Email address</strong> -- used solely for authentication
              (sign-in, password reset). We do not send marketing emails.
            </li>
            <li>
              <strong>Hashed password</strong> -- your password is hashed using
              bcrypt by our authentication provider (Supabase) before storage.
              We never store or have access to your plaintext password.
            </li>
            <li>
              <strong>Backup data</strong> -- if you enable cloud backup, a
              serialized copy of your local database (transactions, categories,
              goals, settings) is stored on our cloud infrastructure so you can
              restore it on another device.
            </li>
          </ul>

          <h3>2.3 Data We Do NOT Collect</h3>
          <ul>
            <li>We do not use analytics, tracking pixels, or cookies for advertising.</li>
            <li>We do not collect your IP address for profiling purposes.</li>
            <li>We do not collect device fingerprints.</li>
            <li>We do not use any third-party advertising services.</li>
            <li>We do not sell, rent, or trade any user data to third parties.</li>
          </ul>

          <h2>3. Third-Party Services</h2>
          <p>
            If you opt in to cloud backup, the Application uses
            <strong> Supabase</strong> (supabase.com) as its backend
            infrastructure provider for authentication and data storage.
            Supabase processes your data in accordance with their own privacy
            policy. Your backup data is stored in a PostgreSQL database
            protected by Row Level Security, meaning only you can access your
            own data through authenticated API calls.
          </p>

          <h2>4. Data Security</h2>
          <ul>
            <li>All data transmitted between your browser and cloud services is encrypted via <strong>TLS/HTTPS</strong>.</li>
            <li>Passwords are hashed with <strong>bcrypt</strong> and are never stored in plaintext.</li>
            <li>Optional <strong>two-factor authentication (TOTP)</strong> is available for additional account security.</li>
            <li>Cloud data is protected by <strong>Row Level Security</strong> at the database level -- each user can only access their own backup.</li>
            <li>The application's source code is open-source and available for public audit.</li>
          </ul>

          <h2>5. Data Retention and Deletion</h2>
          <ul>
            <li>
              <strong>Local data:</strong> You can delete all local data at any
              time from the Settings page, or by clearing your browser's site
              data. We have no ability to access or recover locally-stored data.
            </li>
            <li>
              <strong>Cloud data:</strong> You can delete your cloud backup at
              any time. If you delete your account, all associated backup data
              is permanently deleted from our servers.
            </li>
            <li>
              We do not retain any user data after account deletion.
            </li>
          </ul>

          <h2>6. Your Rights</h2>
          <p>You have the right to:</p>
          <ul>
            <li><strong>Access</strong> all data stored about you (via the export feature in Settings).</li>
            <li><strong>Delete</strong> all your data at any time (local and/or cloud).</li>
            <li><strong>Portability</strong> -- export your data as a JSON file from Settings.</li>
            <li><strong>Withdraw consent</strong> -- stop using cloud backup at any time by signing out; your data remains local.</li>
            <li><strong>Use the app without an account</strong> -- cloud features are entirely optional.</li>
          </ul>

          <h2>7. Children's Privacy</h2>
          <p>
            LibreBudget is not directed at children under the age of 13. We do
            not knowingly collect personal information from children under 13.
            If we learn that we have collected data from a child under 13, we
            will delete that information promptly.
          </p>

          <h2>8. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. Changes will be
            reflected on this page with an updated "Last updated" date. Your
            continued use of the Application after changes constitutes
            acceptance of the updated policy.
          </p>

          <h2>9. Contact</h2>
          <p>
            If you have questions or concerns about this Privacy Policy or your
            data, please open an issue on the project's open-source repository
            or contact the project maintainer.
          </p>

        </div>
      </Card>

      <p className="text-center text-xs text-slate-500">
        <Link to="/privacy-manifesto" className="hover:text-slate-300">Privacy & Security Manifesto</Link>
        {' · '}
        <Link to="/terms" className="hover:text-slate-300">Terms of Use</Link>
        {' · '}
        <Link to="/settings" className="hover:text-slate-300">Back to Settings</Link>
      </p>
    </div>
  )
}
