/**
 * Augments Cloudflare Env.
 * TURNSTILE_SECRET_KEY: set via wrangler secret put.
 * ALLOWED_ORIGINS: optional, comma-separated (e.g. https://yoursite.com,https://www.yoursite.com).
 */
declare namespace Cloudflare {
  interface Env {
    TURNSTILE_SECRET_KEY: string;
    ALLOWED_ORIGINS?: string;
  }
}
