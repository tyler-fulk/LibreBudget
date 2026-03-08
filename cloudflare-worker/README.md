# LibreBudget Backup Worker

Zero-knowledge backup API. Stores only `{ id, payload }` in Cloudflare KV. Never sees keys or plaintext.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | /backup | `{ id: string, payload: string }` — upsert encrypted backup |
| GET | /backup/:id | Fetch payload (404 if not found) |
| DELETE | /backup/:id | Remove backup |

## CORS

Allowed origins: `https://librebudget.app`, `https://www.librebudget.app`, and any `localhost` / `127.0.0.1` (all ports).

## Development

```bash
npm install
npm run dev
```

Worker runs at http://localhost:8787. Set `VITE_BACKUP_API_URL=http://localhost:8787` in the app's `.env.local` for local testing.

## Deploy

```bash
npm run deploy
```

After deploy, copy your Worker URL (e.g. `https://cloudflare-worker.<account>.workers.dev`) and set `VITE_BACKUP_API_URL` in the app.
