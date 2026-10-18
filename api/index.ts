export default async function handler(req: any, res: any) {
  try {
    const { default: app } = await import('../server/index.js');
    if (req.url && !req.url.startsWith('/api')) {
      req.url = '/api' + (req.url.startsWith('/') ? req.url : '/' + req.url);
    }
    return app(req, res);
  } catch (err: any) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({
      error: 'CRASH_ON_BOOT',
      message: err?.message || String(err),
      stack: err?.stack,
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      env: {
        VERCEL: process.env.VERCEL,
        NODE_ENV: process.env.NODE_ENV
      }
    }, null, 2));
  }
}
