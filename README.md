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
- **PWA** — Installable as a standalone app, works offline

## Tech Stack

- React 19 + TypeScript
- Vite
- Tailwind CSS v4
- Dexie.js (IndexedDB)
- Recharts
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

## License

MIT — see [LICENSE](LICENSE) for details.
