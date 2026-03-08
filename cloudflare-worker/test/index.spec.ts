import { env, createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import { describe, it, expect } from 'vitest';
import worker from '../src/index';

const IncomingRequest = Request<unknown, IncomingRequestCfProperties>;

/** Token required for GET /backup/:id and POST /backup/init (test bypass accepts any non-empty token). */
const TURNSTILE_TOKEN = 'test-token';

async function fetchWorker(
	url: string,
	init?: RequestInit<RequestInitCfProperties>,
): Promise<Response> {
	const ctx = createExecutionContext();
	const response = await worker.fetch(new IncomingRequest(url, init), env, ctx);
	await waitOnExecutionContext(ctx);
	return response;
}

describe('LibreBudget Backup Worker', () => {
	it('OPTIONS returns 204 with CORS headers including X-Turnstile-Token', async () => {
		const res = await fetchWorker('https://example.com/backup', {
			method: 'OPTIONS',
			headers: { Origin: 'https://librebudget.app' },
		});
		expect(res.status).toBe(204);
		expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://librebudget.app');
		expect(res.headers.get('Access-Control-Allow-Headers')).toContain('X-Turnstile-Token');
	});

	it('POST /backup stores payload and returns 200 (background sync, no Turnstile)', async () => {
		const id = `test-${Date.now()}`;
		const payload = 'encrypted-base64-blob';
		const res = await fetchWorker('https://example.com/backup', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json', Origin: 'https://librebudget.app' },
			body: JSON.stringify({ id, payload }),
		});
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body).toEqual({ ok: true });

		const getRes = await fetchWorker(`https://example.com/backup/${id}`, {
			method: 'GET',
			headers: { Origin: 'https://librebudget.app', 'X-Turnstile-Token': TURNSTILE_TOKEN },
		});
		expect(getRes.status).toBe(200);
		expect(await getRes.text()).toBe(payload);
	});

	it('GET /backup/:id returns 403 without Turnstile token', async () => {
		const res = await fetchWorker('https://example.com/backup/some-id', {
			method: 'GET',
			headers: { Origin: 'https://librebudget.app' },
		});
		expect(res.status).toBe(403);
	});

	it('GET /backup/:id returns 404 for missing key', async () => {
		const res = await fetchWorker('https://example.com/backup/nonexistent-key-12345', {
			method: 'GET',
			headers: { Origin: 'http://localhost:5173', 'X-Turnstile-Token': TURNSTILE_TOKEN },
		});
		expect(res.status).toBe(404);
	});

	it('POST /backup rejects missing id', async () => {
		const res = await fetchWorker('https://example.com/backup', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json', Origin: 'https://librebudget.app' },
			body: JSON.stringify({ payload: 'data' }),
		});
		expect(res.status).toBe(400);
	});

	it('POST /backup rejects missing payload', async () => {
		const res = await fetchWorker('https://example.com/backup', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json', Origin: 'https://librebudget.app' },
			body: JSON.stringify({ id: 'some-id' }),
		});
		expect(res.status).toBe(400);
	});

	it('DELETE /backup/:id removes key', async () => {
		const id = `test-delete-${Date.now()}`;
		await env.LIBRE_BACKUPS.put(id, 'payload');

		const res = await fetchWorker(`https://example.com/backup/${id}`, {
			method: 'DELETE',
			headers: { Origin: 'https://librebudget.app' },
		});
		expect(res.status).toBe(200);

		const getRes = await fetchWorker(`https://example.com/backup/${id}`, {
			method: 'GET',
			headers: { Origin: 'https://librebudget.app', 'X-Turnstile-Token': TURNSTILE_TOKEN },
		});
		expect(getRes.status).toBe(404);
	});

	it('POST /backup/init requires Turnstile and upserts payload', async () => {
		const id = `test-init-${Date.now()}`;
		const payload = 'encrypted-init-blob';
		const res = await fetchWorker('https://example.com/backup/init', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Origin: 'https://librebudget.app',
				'X-Turnstile-Token': TURNSTILE_TOKEN,
			},
			body: JSON.stringify({ id, payload }),
		});
		expect(res.status).toBe(200);
		expect(await res.json()).toEqual({ ok: true });

		const getRes = await fetchWorker(`https://example.com/backup/${id}`, {
			method: 'GET',
			headers: { Origin: 'https://librebudget.app', 'X-Turnstile-Token': TURNSTILE_TOKEN },
		});
		expect(getRes.status).toBe(200);
		expect(await getRes.text()).toBe(payload);
	});

	it('POST /backup/init returns 403 without Turnstile token', async () => {
		const res = await fetchWorker('https://example.com/backup/init', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Origin: 'https://librebudget.app',
			},
			body: JSON.stringify({ id: 'test-id', payload: 'data' }),
		});
		expect(res.status).toBe(403);
	});

	it('returns 405 for unsupported path', async () => {
		const res = await fetchWorker('https://example.com/other', {
			headers: { Origin: 'https://librebudget.app' },
		});
		expect(res.status).toBe(404);
	});
});
