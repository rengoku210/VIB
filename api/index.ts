import app from '../server/index.js';

export default function handler(req: any, res: any) {
  try {
    if (req.url && !req.url.startsWith('/api')) {
      req.url = '/api' + (req.url.startsWith('/') ? req.url : '/' + req.url);
    }
    return app(req, res);
  } catch (err: any) {
    console.error('[Vercel API] Request error in Express handler:', err);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({
      error: 'SERVER_ERROR',
      message: err?.message || 'Internal server error'
    }));
  }
}
