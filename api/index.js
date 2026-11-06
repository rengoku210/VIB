let app = null;
let loadError = null;

export default async function handler(req, res) {
  if (!app && !loadError) {
    try {
      const mod = await import('./server-bundle.js');
      app = mod.default;
    } catch (err) {
      console.error('[Vercel Boot Error]:', err);
      loadError = {
        message: err.message,
        stack: err.stack,
        code: err.code
      };
    }
  }

  if (loadError) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({
      error: 'SERVER_BOOT_CRASH',
      details: loadError
    }));
  }

  if (req.url && !req.url.startsWith('/api')) {
    req.url = '/api' + (req.url.startsWith('/') ? req.url : '/' + req.url);
  }
  return app(req, res);
}
