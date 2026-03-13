/**
 * LibreBudget Cloud Backup Worker
 *
 * Dumb pipe: stores only { id, payload } in KV.
 * Zero-knowledge: never sees seed phrase, keys, or plaintext.
 * Turnstile protects GET /backup/:id (restore) and POST /backup/init (first backup).
 * Write-token protects POST /backup (sync) and DELETE /backup/:id:
 *   - On init, SHA-256(writeToken) is stored as "{id}:wth" in KV.
 *   - Subsequent writes/deletes send the raw token in X-Write-Token; worker
 *     hashes it and does a constant-time compare against the stored hash.
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

/** Returns true when hostname is localhost, 127.0.0.1, or a private-network IP. */
function isLocalHost(hostname: string): boolean {
	if (hostname === 'localhost' || hostname === '127.0.0.1') return true;
	// Private IPv4 ranges: 10.x, 172.16-31.x, 192.168.x
	const parts = hostname.split('.').map(Number);
	if (parts.length === 4 && parts.every((n) => !isNaN(n))) {
		if (parts[0] === 10) return true;
		if (parts[0] === 172 && parts[1]! >= 16 && parts[1]! <= 31) return true;
		if (parts[0] === 192 && parts[1] === 168) return true;
	}
	return false;
}

async function verifyTurnstile(
	token: string | null,
	secret: string,
	origin: string | null,
): Promise<boolean> {
	if (!token || !secret) return false;
	if (secret === TURNSTILE_TEST_BYPASS_SECRET) {
		if (token.length === 0) return false;
		// Only allow bypass for local dev / tests
		if (origin) {
			try {
				const url = new URL(origin);
				if (isLocalHost(url.hostname)) return true;
			} catch {
				/* invalid origin */
			}
		}
		return false;
	}
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

/** Returns lowercase hex SHA-256 of the given string. */
async function sha256Hex(input: string): Promise<string> {
	const data = new TextEncoder().encode(input);
	const hash = await crypto.subtle.digest('SHA-256', data);
	return Array.from(new Uint8Array(hash))
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('');
}

/** Constant-time string comparison (both inputs must be equal-length hex). */
function constantTimeEqual(a: string, b: string): boolean {
	if (a.length !== b.length) return false;
	let diff = 0;
	for (let i = 0; i < a.length; i++) {
		diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
	}
	return diff === 0;
}

/**
 * Verifies that the X-Write-Token header matches the SHA-256 hash stored in KV
 * under "{id}:wth". If no hash exists (pre-migration backup), the write is
 * allowed without registering a token — preserving old behavior until the
 * user explicitly re-inits via POST /backup/init (which requires Turnstile).
 */
async function verifyWriteToken(
	kv: KVNamespace,
	id: string,
	token: string | null,
): Promise<boolean> {
	const storedHash = await kv.get(`${id}:wth`);
	if (!storedHash) {
		// Pre-migration backup: no write-token registered yet — allow write
		return true;
	}
	if (!token) return false;
	const incomingHash = await sha256Hex(token);
	return constantTimeEqual(incomingHash, storedHash);
}

function isOriginAllowed(origin: string | null, env: Env): boolean {
	if (!origin) return false;
	const o = origin.replace(/\/$/, '');
	try {
		const url = new URL(o);
		if (isLocalHost(url.hostname)) return true;
		return getAllowedOrigins(env).includes(o);
	} catch {
		return false;
	}
}

function corsHeaders(origin: string | null, env: Env): HeadersInit {
	const origins = getAllowedOrigins(env);
	const allowed: string = (origin && isOriginAllowed(origin, env) ? origin : origins[0]) ?? origins[0]!;
	return {
		'Access-Control-Allow-Origin': allowed,
		'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
		'Access-Control-Allow-Headers': 'Content-Type, X-Turnstile-Token, X-Write-Token',
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
				'Access-Control-Allow-Headers': 'Content-Type, X-Turnstile-Token, X-Write-Token',
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
					'Access-Control-Allow-Headers': 'Content-Type, X-Turnstile-Token, X-Write-Token',
				},
			});
		}

		// POST /backup/init — first backup, requires Turnstile; registers write-token hash
		if (request.method === 'POST' && url.pathname === '/backup/init') {
			const token = request.headers.get('X-Turnstile-Token');
			const valid = await verifyTurnstile(token, env.TURNSTILE_SECRET_KEY, origin);
			if (!valid) {
				return jsonResponse(
					{ error: 'Turnstile verification failed', hint: 'Token may have expired. Complete the challenge again.' },
					403,
					origin,
					env,
				);
			}
			try {
				const body = (await request.json()) as { id?: string; payload?: string; writeToken?: string };
				const { id: bodyId, payload, writeToken } = body;
				if (typeof bodyId !== 'string' || bodyId.trim() === '') {
					return jsonResponse({ error: 'Missing or invalid id' }, 400, origin, env);
				}
				if (typeof payload !== 'string') {
					return jsonResponse({ error: 'Missing or invalid payload' }, 400, origin, env);
				}
				if (typeof writeToken !== 'string' || writeToken.trim() === '') {
					return jsonResponse({ error: 'Missing or invalid writeToken' }, 400, origin, env);
				}
				// If a write-token hash already exists, the caller must prove ownership
				const trimmedId = bodyId.trim();
				const existingHash = await env.LIBRE_BACKUPS.get(`${trimmedId}:wth`);
				if (existingHash) {
					const incomingHash = await sha256Hex(writeToken);
					if (!constantTimeEqual(incomingHash, existingHash)) {
						return jsonResponse(
							{ error: 'Unauthorized', hint: 'A write token is already registered for this ID.' },
							403,
							origin,
							env,
						);
					}
				}
				// Register (or re-confirm) the write-token hash
				const writeTokenHash = await sha256Hex(writeToken);
				await env.LIBRE_BACKUPS.put(`${trimmedId}:wth`, writeTokenHash);
				return upsertBackup(env.LIBRE_BACKUPS, trimmedId, payload, origin, env);
			} catch {
				return jsonResponse({ error: 'Invalid JSON' }, 400, origin, env);
			}
		}

		const pathMatch = /^\/backup(?:\/(.+))?$/.exec(url.pathname);
		if (!pathMatch) {
			return jsonResponse({ error: 'Not found' }, 404, origin, env);
		}

		const id = pathMatch[1];

		// POST /backup — background sync, requires write-token proof-of-possession
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
				const writeToken = request.headers.get('X-Write-Token');
				const authorized = await verifyWriteToken(env.LIBRE_BACKUPS, bodyId.trim(), writeToken);
				if (!authorized) {
					return jsonResponse(
						{ error: 'Unauthorized', hint: 'Write token invalid or not registered. Use POST /backup/init first.' },
						403,
						origin,
						env,
					);
				}
				return upsertBackup(env.LIBRE_BACKUPS, bodyId, payload, origin, env);
			} catch {
				return jsonResponse({ error: 'Invalid JSON' }, 400, origin, env);
			}
		}

		// GET /backup/:id — restore, requires Turnstile
		if (request.method === 'GET' && id) {
			const token = request.headers.get('X-Turnstile-Token');
			const valid = await verifyTurnstile(token, env.TURNSTILE_SECRET_KEY, origin);
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

		// DELETE /backup/:id — requires write-token proof-of-possession
		if (request.method === 'DELETE' && id) {
			const writeToken = request.headers.get('X-Write-Token');
			const decodedId = decodeURIComponent(id);
			const authorized = await verifyWriteToken(env.LIBRE_BACKUPS, decodedId, writeToken);
			if (!authorized) {
				return jsonResponse(
					{ error: 'Unauthorized', hint: 'Write token invalid or not registered.' },
					403,
					origin,
					env,
				);
			}
			await env.LIBRE_BACKUPS.delete(decodedId);
			await env.LIBRE_BACKUPS.delete(`${decodedId}:wth`);
			return jsonResponse({ ok: true }, 200, origin, env);
		}

		return jsonResponse({ error: 'Method not allowed' }, 405, origin, env);
	},
} satisfies ExportedHandler<Env>;
