let appPromise: Promise<any> | null = null;
let bootError: any = null;

async function getApp() {
  if (bootError) throw bootError;
  if (!appPromise) {
    appPromise = import('../server/index.js')
      .then((m) => m.default)
      .catch((err) => {
        bootError = err;
        throw err;
      });
  }
  return appPromise;
}

export default async function handler(req: any, res: any) {
  try {
    const app = await getApp();
    if (req.url && !req.url.startsWith('/api')) {
      req.url = '/api' + (req.url.startsWith('/') ? req.url : '/' + req.url);
    }
    return app(req, res);
  } catch (err: any) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    return res.end(
      JSON.stringify({
        error: 'BOOT_ERROR',
        message: err?.message || String(err),
        stack: err?.stack || null,
        nodeVersion: process.version,
      })
    );
  }
}
