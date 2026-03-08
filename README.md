# LibreBudget

[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](http://makeapullrequest.com)

Free, open-source budget tracker that runs entirely in your browser. All data is stored locally — nothing is sent to any server unless you opt in to cloud backup.

## Features

- **Budget Health Bar** — Visual HP-style bar that goes from green to red as expenses approach your budget
- **Needs / Wants / Investments** — Preset category groups with color-coded tracking (yellow, orange, green, blue)
- **Spending Breakdown** — Donut chart showing percentage allocation across groups
- **Top Expense Offenders** — Ranked view of your biggest spending categories
- **Budget Goals** — Set monthly limits per category or group with progress bars
- **Financial Roadmap** — Order-of-operations steps with confetti celebrations
- **Monthly Review** — Month-over-month comparison with improvement highlights
- **Daily Reminders** — Browser notifications to log expenses
- **Data Export/Import** — JSON and CSV backup, PDF reports
- **Zero-Knowledge Cloud Backup** — Optional encrypted backup via wallet (BIP39 + Cloudflare KV)
- **PWA** — Installable as a standalone app, works offline

## Tech Stack

- React 19 + TypeScript
- Vite
- Tailwind CSS v4
- Dexie.js (IndexedDB)
- Recharts
- bip39 (wallet/recovery phrase)
- vite-plugin-pwa

## Getting Started

```bash
npm install
npm run dev
```

Open http://localhost:5173 in your browser.

## Build

```bash
npm run build
npm run preview
```

## Cloud Backup (Optional)

Cloud backup uses a wallet-style flow: create or restore a 24-word recovery phrase, then sync encrypted data to a Cloudflare Worker.

1. Deploy the backup worker:
   ```bash
   cd cloudflare-worker && npm install && npm run deploy
   ```
2. Copy the Worker URL and add to `.env.local`:
   ```
   VITE_BACKUP_API_URL=https://your-worker.workers.dev
   ```
3. In the app: Account → Create Wallet or Restore from recovery phrase.

Backup is rate-limited (visibility change + 30s debounce) to respect Cloudflare KV free tier (1k writes/day).

## License

MIT — see [LICENSE](LICENSE) for details.
