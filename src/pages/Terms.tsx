import { Link } from 'react-router-dom'
import { Card } from '../components/ui/Card'

export default function Terms() {
  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">Terms of Use</h1>
        <p className="text-sm text-slate-400 mt-1">
          Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
        </p>
      </div>

      <Card>
        <div className="prose prose-invert prose-sm max-w-none space-y-6 text-slate-300 [&_h2]:text-slate-100 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:mt-6 [&_h2]:mb-2 [&_h3]:text-slate-200 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mt-4 [&_h3]:mb-1 [&_strong]:text-slate-200 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1">

          <p>
            Please read these Terms of Use ("Terms") carefully before using
            LibreBudget ("the Application", "the Service"). By accessing or
            using the Application, you agree to be bound by these Terms. If you
            do not agree, do not use the Application.
          </p>

          <h2>1. Acceptance of Terms</h2>
          <p>
            By creating an account or using any features of LibreBudget, you
            acknowledge that you have read, understood, and agree to be bound by
            these Terms and our{' '}
            <Link to="/privacy" className="text-green-400 hover:text-green-300">
              Privacy Policy
            </Link>
            , which is incorporated herein by reference.
          </p>

          <h2>2. Description of Service</h2>
          <p>
            LibreBudget is a free, open-source personal budget tracking
            application. It provides tools to track income, expenses, budget
            goals, and spending patterns. The Application is provided as a
            Progressive Web App (PWA) that stores data locally in your browser,
            with optional cloud backup functionality.
          </p>

          <h2>3. NOT Financial Advice</h2>
          <p>
            <strong>
              The Application is a record-keeping and visualization tool only.
              Nothing in LibreBudget constitutes financial advice, investment
              advice, tax advice, legal advice, or any other form of
              professional advice.
            </strong>{' '}
            The categories, labels, and organizational structures (including
            "needs", "wants", and "investments") are general-purpose
            classifications provided for convenience and do not represent
            professional financial guidance. You should consult a qualified
            financial advisor for decisions about your personal finances.
          </p>

          <h2>4. User Responsibilities</h2>
          <ul>
            <li>
              <strong>Data accuracy:</strong> You are solely responsible for the
              accuracy and completeness of the data you enter into the
              Application. We do not verify or validate your financial data.
            </li>
            <li>
              <strong>Account security:</strong> If you create an account, you
              are responsible for maintaining the confidentiality of your
              credentials and for all activity under your account. You agree to
              use a strong password and, where possible, enable two-factor
              authentication.
            </li>
            <li>
              <strong>Lawful use:</strong> You agree to use the Application only
              for lawful purposes and in compliance with all applicable laws and
              regulations.
            </li>
            <li>
              <strong>Backup responsibility:</strong> While we provide export
              and optional cloud backup features, you are ultimately responsible
              for maintaining backups of your own data.
            </li>
          </ul>

          <h2>5. Disclaimer of Warranties</h2>
          <p>
            <strong>
              THE APPLICATION IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT
              WARRANTIES OF ANY KIND, WHETHER EXPRESS, IMPLIED, STATUTORY, OR
              OTHERWISE, INCLUDING BUT NOT LIMITED TO WARRANTIES OF
              MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE,
              NON-INFRINGEMENT, ACCURACY, OR UNINTERRUPTED AVAILABILITY.
            </strong>
          </p>
          <p>We do not warrant that:</p>
          <ul>
            <li>The Application will meet your specific requirements or expectations.</li>
            <li>The Application will be available at all times, uninterrupted, timely, or error-free.</li>
            <li>Any calculations, summaries, or visualizations are free from error.</li>
            <li>Any defects in the Application will be corrected.</li>
            <li>The Application is free of viruses or other harmful components.</li>
          </ul>

          <h2>6. Limitation of Liability</h2>
          <p>
            <strong>
              TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT
              SHALL THE DEVELOPERS, CONTRIBUTORS, OR OPERATORS OF LIBREBUDGET
              BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL,
              PUNITIVE, OR EXEMPLARY DAMAGES, INCLUDING BUT NOT LIMITED TO
              DAMAGES FOR LOSS OF PROFITS, GOODWILL, DATA, OR OTHER INTANGIBLE
              LOSSES, REGARDLESS OF WHETHER SUCH DAMAGES WERE FORESEEABLE AND
              WHETHER OR NOT WE WERE ADVISED OF THE POSSIBILITY OF SUCH
              DAMAGES.
            </strong>
          </p>
          <p>
            <strong>
              OUR TOTAL AGGREGATE LIABILITY ARISING OUT OF OR RELATING TO YOUR
              USE OF THE APPLICATION SHALL NOT EXCEED THE AMOUNT YOU PAID US IN
              THE TWELVE (12) MONTHS PRECEDING THE CLAIM, OR ZERO DOLLARS
              ($0.00) IF YOU HAVE NOT PAID US ANYTHING (AS IS THE CASE FOR THIS
              FREE APPLICATION).
            </strong>
          </p>

          <h2>7. Data Loss Disclaimer</h2>
          <p>
            <strong>
              We are not responsible for any loss of data, regardless of cause.
            </strong>{' '}
            This includes, but is not limited to, data loss caused by:
          </p>
          <ul>
            <li>Clearing browser data, cache, cookies, or site storage.</li>
            <li>Browser updates, reinstallation, or changes.</li>
            <li>Device failure, theft, or loss.</li>
            <li>Cloud service outages, errors, or discontinuation.</li>
            <li>Bugs, defects, or errors in the Application.</li>
            <li>Unauthorized access to your account.</li>
          </ul>
          <p>
            You are encouraged to regularly export your data and maintain your
            own backups.
          </p>

          <h2>8. Indemnification</h2>
          <p>
            You agree to indemnify, defend, and hold harmless the developers,
            contributors, and operators of LibreBudget from and against any and
            all claims, liabilities, damages, losses, costs, and expenses
            (including reasonable attorneys' fees) arising out of or related to:
          </p>
          <ul>
            <li>Your use of or inability to use the Application.</li>
            <li>Your violation of these Terms.</li>
            <li>Your violation of any applicable law or regulation.</li>
            <li>Any financial decisions you make based on information displayed by the Application.</li>
          </ul>

          <h2>9. Open-Source License</h2>
          <p>
            LibreBudget's source code is released under the MIT License. The MIT
            License provides the software "as is" without warranty of any kind.
            These Terms of Use apply to your use of the hosted Application and
            its services (including cloud backup), and are in addition to (not a
            replacement for) the open-source license terms.
          </p>

          <h2>10. Account Termination</h2>
          <p>
            We reserve the right to suspend or terminate your account and access
            to cloud services at any time, with or without cause, with or
            without notice. You may delete your account at any time. Upon
            termination, your cloud backup data will be permanently deleted.
            Your locally-stored data is unaffected by account termination.
          </p>

          <h2>11. Service Availability</h2>
          <p>
            We make no guarantees regarding the availability, uptime, or
            continuity of cloud backup services. The locally-stored features of
            the Application function independently of any server and are not
            affected by service availability. We reserve the right to modify,
            suspend, or discontinue any part of the Service at any time without
            prior notice.
          </p>

          <h2>12. Modifications to Terms</h2>
          <p>
            We reserve the right to modify these Terms at any time. Changes
            will be posted on this page with an updated "Last updated" date.
            Your continued use of the Application after modifications
            constitutes acceptance of the revised Terms. It is your
            responsibility to review these Terms periodically.
          </p>

          <h2>13. Severability</h2>
          <p>
            If any provision of these Terms is held to be invalid or
            unenforceable, the remaining provisions shall continue in full force
            and effect. The invalid or unenforceable provision shall be modified
            to the minimum extent necessary to make it valid and enforceable.
          </p>

          <h2>14. Entire Agreement</h2>
          <p>
            These Terms, together with the Privacy Policy, constitute the entire
            agreement between you and LibreBudget regarding your use of the
            Application, superseding any prior agreements.
          </p>

          <h2>15. Governing Law</h2>
          <p>
            These Terms shall be governed by and construed in accordance with
            the laws of the jurisdiction in which the Application operator
            resides, without regard to conflict of law principles. Any disputes
            arising under these Terms shall be subject to the exclusive
            jurisdiction of the courts in that jurisdiction.
          </p>

          <h2>16. Contact</h2>
          <p>
            If you have questions about these Terms, please open an issue on the
            project's open-source repository or contact the project maintainer.
          </p>

        </div>
      </Card>

      <p className="text-center text-xs text-slate-500">
        <Link to="/privacy" className="hover:text-slate-300">Privacy Policy</Link>
        {' · '}
        <Link to="/settings" className="hover:text-slate-300">Back to Settings</Link>
      </p>
    </div>
  )
}
