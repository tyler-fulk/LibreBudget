/**
 * LibreBudget Cloud Backup Worker
 *
 * Dumb pipe: stores only { id, payload } in KV.
 * Zero-knowledge: never sees seed phrase, keys, or plaintext.
 * Turnstile protects GET /backup/:id (restore) and POST /backup/init (first backup).
 */

const DEFAULT_ORIGINS = [
	'https://librebudget.app',
	'https://www.librebudget.app',
];

function getAllowedOrigins(env: Env): string[] {
	const extra = env.ALLOWED_ORIGINS;
	if (!extra || typeof extra !== 'string') return DEFAULT_ORIGINS;
	const list = extra.split(',').map((s) => s.trim()).filter(Boolean);
	return [...DEFAULT_ORIGINS, ...list];
}

const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

/** Test bypass: when secret is this value, accept any non-empty token (vitest only). */
const TURNSTILE_TEST_BYPASS_SECRET = 'test-bypass-secret';

async function verifyTurnstile(token: string | null, secret: string): Promise<boolean> {
	if (!token || !secret) return false;
	// Test bypass for vitest (no browser to generate real Turnstile token)
	if (secret === TURNSTILE_TEST_BYPASS_SECRET && token.length > 0) return true;
	try {
		const res = await fetch(TURNSTILE_VERIFY_URL, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ secret, response: token }),
		});
		const data = (await res.json()) as { success?: boolean };
		return data.success === true;
	} catch {
		return false;
	}
}

function isOriginAllowed(origin: string | null, env: Env): boolean {
	if (!origin) return false;
	const o = origin.replace(/\/$/, '');
	try {
		const url = new URL(o);
		if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') return true;
		return getAllowedOrigins(env).includes(o);
	} catch {
		return false;
	}
}

function corsHeaders(origin: string | null, env: Env): HeadersInit {
	const origins = getAllowedOrigins(env);
	const allowed = isOriginAllowed(origin, env) ? origin : origins[0];
	return {
		'Access-Control-Allow-Origin': allowed,
		'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
		'Access-Control-Allow-Headers': 'Content-Type, X-Turnstile-Token',
		'Access-Control-Max-Age': '86400',
	};
}

function jsonResponse(data: unknown, status: number, origin: string | null, env: Env): Response {
	return new Response(JSON.stringify(data), {
		status,
		headers: {
			'Content-Type': 'application/json',
			...corsHeaders(origin, env),
		},
	});
}

function textResponse(body: string, status: number, origin: string | null, env: Env): Response {
	return new Response(body, {
		status,
		headers: {
			'Content-Type': 'text/plain; charset=utf-8',
			...corsHeaders(origin, env),
		},
	});
}

function handleOptions(origin: string | null, env: Env): Response {
	// For preflight: allow any origin so the actual request is sent and we can return a readable 403
	const headers = isOriginAllowed(origin, env)
		? corsHeaders(origin, env)
		: {
				'Access-Control-Allow-Origin': '*',
				'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
				'Access-Control-Allow-Headers': 'Content-Type, X-Turnstile-Token',
				'Access-Control-Max-Age': '86400',
			};
	return new Response(null, { status: 204, headers });
}

async function upsertBackup(
	kv: KVNamespace,
	bodyId: string,
	payload: string,
	origin: string | null,
	env: Env,
): Promise<Response> {
	if (payload.length > 5 * 1024 * 1024) {
		return jsonResponse({ error: 'Payload too large' }, 413, origin, env);
	}
	await kv.put(bodyId.trim(), payload);
	return jsonResponse({ ok: true }, 200, origin, env);
}

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const url = new URL(request.url);
		const origin = request.headers.get('Origin');

		if (request.method === 'OPTIONS') {
			return handleOptions(origin, env);
		}

		if (!isOriginAllowed(origin, env)) {
			// Use * so client can read the error (otherwise CORS hides it → "Failed to fetch")
			return new Response(JSON.stringify({ error: 'CORS not allowed', hint: 'Add your domain to ALLOWED_ORIGINS in the Worker. See SETUP.md.' }), {
				status: 403,
				headers: {
					'Content-Type': 'application/json',
					'Access-Control-Allow-Origin': '*',
					'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
					'Access-Control-Allow-Headers': 'Content-Type, X-Turnstile-Token',
				},
			});
		}

		// POST /backup/init — first backup only, requires Turnstile
		if (request.method === 'POST' && url.pathname === '/backup/init') {
			const token = request.headers.get('X-Turnstile-Token');
			const valid = await verifyTurnstile(token, env.TURNSTILE_SECRET_KEY);
			if (!valid) {
				return jsonResponse(
					{ error: 'Turnstile verification failed', hint: 'Token may have expired. Complete the challenge again.' },
					403,
					origin,
					env,
				);
			}
			try {
				const body = (await request.json()) as { id?: string; payload?: string };
				const { id: bodyId, payload } = body;
				if (typeof bodyId !== 'string' || bodyId.trim() === '') {
					return jsonResponse({ error: 'Missing or invalid id' }, 400, origin, env);
				}
				if (typeof payload !== 'string') {
					return jsonResponse({ error: 'Missing or invalid payload' }, 400, origin, env);
				}
				return upsertBackup(env.LIBRE_BACKUPS, bodyId, payload, origin, env);
			} catch {
				return jsonResponse({ error: 'Invalid JSON' }, 400, origin, env);
			}
		}

		const pathMatch = /^\/backup(?:\/(.+))?$/.exec(url.pathname);
		if (!pathMatch) {
			return jsonResponse({ error: 'Not found' }, 404, origin, env);
		}

		const id = pathMatch[1];

		// POST /backup — background sync, no Turnstile (rate-limiting handles abuse)
		if (request.method === 'POST' && !id) {
			try {
				const body = (await request.json()) as { id?: string; payload?: string };
				const { id: bodyId, payload } = body;
				if (typeof bodyId !== 'string' || bodyId.trim() === '') {
					return jsonResponse({ error: 'Missing or invalid id' }, 400, origin, env);
				}
				if (typeof payload !== 'string') {
					return jsonResponse({ error: 'Missing or invalid payload' }, 400, origin, env);
				}
				return upsertBackup(env.LIBRE_BACKUPS, bodyId, payload, origin, env);
			} catch {
				return jsonResponse({ error: 'Invalid JSON' }, 400, origin, env);
			}
		}

		// GET /backup/:id — restore, requires Turnstile
		if (request.method === 'GET' && id) {
			const token = request.headers.get('X-Turnstile-Token');
			const valid = await verifyTurnstile(token, env.TURNSTILE_SECRET_KEY);
			if (!valid) {
				return jsonResponse(
					{ error: 'Turnstile verification failed', hint: 'Token may have expired. Complete the challenge again.' },
					403,
					origin,
					env,
				);
			}
			const value = await env.LIBRE_BACKUPS.get(decodeURIComponent(id));
			if (value === null) {
				return jsonResponse({ error: 'Not found' }, 404, origin, env);
			}
			return textResponse(value, 200, origin, env);
		}

		if (request.method === 'DELETE' && id) {
			await env.LIBRE_BACKUPS.delete(decodeURIComponent(id));
			return jsonResponse({ ok: true }, 200, origin, env);
		}

		return jsonResponse({ error: 'Method not allowed' }, 405, origin, env);
	},
} satisfies ExportedHandler<Env>;
