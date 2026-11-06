import { db } from '../server/db.ts';

export default function handler(req: any, res: any) {
  try {
    const row = db.prepare('SELECT 1 as val').get();
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ status: 'ok', node: process.version, row }));
  } catch (err: any) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ error: err.message, stack: err.stack }));
  }
}
