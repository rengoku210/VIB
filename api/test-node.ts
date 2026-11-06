export default async function handler(req: any, res: any) {
  try {
    const dbModule = await import('../server/db.ts');
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ status: 'ok', keys: Object.keys(dbModule) }));
  } catch (err: any) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ error: err?.message || String(err), stack: err?.stack || null }));
  }
}
