import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

const tempDir = await mkdtemp(path.join(tmpdir(), 'vib-vercel-adapter-'));
const dbPath = path.join(tempDir, 'vib-test.db');
const originalFetch = globalThis.fetch;
let server: ReturnType<typeof createServer> | undefined;
let closeDatabase: (() => void) | undefined;

try {
  process.env.VERCEL = '1';
  process.env.VIB_DATABASE_PATH = dbPath;
  process.env.SESSION_SECRET = 'isolated-vercel-adapter-secret';
  process.env.RIOT_API_KEY = '';
  process.env.HENRIK_API_KEY = '';

  // Keep startup catalog sync offline; this test is about function routing.
  globalThis.fetch = (async () => new Response(JSON.stringify({ data: [] }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })) as typeof fetch;
  const { default: handler } = await import('../api/index.js');
  const { db, databaseDirectory } = await import('../server/db.js');
  assert.equal(databaseDirectory, tempDir, 'adapter test must use only its disposable database');
  closeDatabase = () => db.close();

  server = createServer((req, res) => {
    void handler(req as any, res as any);
  });
  await new Promise<void>((resolve) => server!.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  assert.ok(address && typeof address === 'object');

  const response = await originalFetch(`http://127.0.0.1:${address.port}/api/health`);
  assert.equal(response.status, 200, 'the adapter must preserve /api/health for Express routing');
  const health = await response.json() as any;
  assert.equal(health.status, 'ok');
  await new Promise((resolve) => setTimeout(resolve, 50));

  console.log('PASS: Vercel Express adapter preserves /api/health and returns the backend health response');
} finally {
  globalThis.fetch = originalFetch;
  if (server?.listening) {
    await new Promise<void>((resolve, reject) => server!.close((err) => err ? reject(err) : resolve()));
  }
  closeDatabase?.();
  await rm(tempDir, { recursive: true, force: true });
}
