export default async function handler(req: any, res: any) {
  try {
    const { default: app } = await import('../server/index.js');
    if (req.url && !req.url.startsWith('/api')) {
      req.url = '/api' + (req.url.startsWith('/') ? req.url : '/' + req.url);
    }
    return app(req, res);
  } catch (err: any) {
    console.error('[Vercel API] Failed to initialize Express handler:', err);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({
      error: 'CRASH_ON_BOOT',
      message: 'The API service could not start. Check the deployment function logs.'
    }));
  }
}
