export default async function handler(req: any, res: any) {
  try {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const sqlite = await import('node:sqlite');
    const { DatabaseSync } = sqlite;
    const db = new DatabaseSync(':memory:');
    const row = db.prepare('SELECT 1 as val').get();
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ status: 'ok', node: process.version, row, cwd: process.cwd() }));
  } catch (err: any) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ error: err.message, stack: err.stack }));
  }
}
