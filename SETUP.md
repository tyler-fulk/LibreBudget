# LibreBudget Cloud Backup Setup

Complete setup so the app syncs with your Cloudflare KV store.

## Prerequisites

- Node.js 18+
- Cloudflare account (free tier works)
- `wrangler` CLI (installed via `cloudflare-worker` deps)

## Step 1: Deploy the Worker

From the project root:

```bash
npm run deploy:worker
```

Or manually:

```bash
cd cloudflare-worker
npm install
npm run deploy
```

**Output:** Wrangler will print your Worker URL, e.g.:
```
Published cloudflare-worker (2.5 sec)
  https://cloudflare-worker.YOUR-SUBDOMAIN.workers.dev
```

Copy that URL.

**Production – set Turnstile secret:**

```bash
cd cloudflare-worker
npx wrangler secret put TURNSTILE_SECRET_KEY
```

Paste your Turnstile secret key from Cloudflare Dashboard > Turnstile. This overrides the test-bypass used for local dev.

**Production – if your site uses a different domain (e.g. cPanel subdomain):**

Add `ALLOWED_ORIGINS` to allow CORS. In `cloudflare-worker/wrangler.jsonc` vars:

```jsonc
"vars": {
  "TURNSTILE_SECRET_KEY": "test-bypass-secret",
  "ALLOWED_ORIGINS": "https://your-domain.com,https://www.your-domain.com"
}
```

Redeploy the Worker. The default allows `librebudget.app` and `www.librebudget.app`.

## Step 2: Create a KV Namespace (if needed)

If this is a fresh Cloudflare account or you see errors about the KV namespace:

```bash
cd cloudflare-worker
npx wrangler kv namespace create LIBRE_BACKUPS
```

Copy the **id** from the output and update `wrangler.jsonc`:

```jsonc
"kv_namespaces": [
  {
    "binding": "LIBRE_BACKUPS",
    "id": "YOUR_NEW_NAMESPACE_ID"
  }
]
```

Then run `npm run deploy` again.

## Step 3: Configure the App

### Local development

Create `.env.local` in the project root (same folder as `package.json`):

```
VITE_BACKUP_API_URL=https://cloudflare-worker.YOUR-SUBDOMAIN.workers.dev
VITE_TURNSTILE_SITE_KEY=1x00000000000000000000AA
```

- `VITE_BACKUP_API_URL` – your Worker URL from Step 1.
- `VITE_TURNSTILE_SITE_KEY` – optional locally; test key `1x00000000000000000000AA` is used when omitted.

### Production

Set these in your deployment platform (Cloudflare Pages, Vercel, etc.):

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_BACKUP_API_URL` | Yes | Your Worker URL |
| `VITE_TURNSTILE_SITE_KEY` | Yes | Turnstile site key from Cloudflare Dashboard (create a widget for librebudget.app) |

## Step 4: Run the App

```bash
npm install
npm run dev
```

Open http://localhost:5173 → **Account** → **Create New Wallet** or **Restore from Recovery Phrase**.

## Verifying Backup Works

1. Create a wallet (save the 24 words).
2. Add a transaction or category.
3. Switch tabs or wait 30 seconds → backup runs automatically.
4. Or click **Backup Now** in the sidebar.

## Local Worker Development

To test against a local Worker instead of production:

```bash
# Terminal 1: run the worker locally
cd cloudflare-worker && npm run dev

# Terminal 2: run the app with local Worker URL
# In .env.local:
VITE_BACKUP_API_URL=http://localhost:8787

npm run dev
```
