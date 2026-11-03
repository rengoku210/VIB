import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import { defineConfig, Plugin } from 'vite';

function serveLocalUploads(): Plugin {
  return {
    name: 'serve-local-uploads',
    configureServer(server) {
      server.middlewares.use('/uploads', (req, res, next) => {
        try {
          const rawUrl = req.url || '';
          const cleanName = path.basename(rawUrl.split('?')[0]);
          if (!cleanName) return next();

          const candidates = [
            path.resolve(__dirname, 'data/uploads', cleanName),
            path.resolve(__dirname, 'data', cleanName),
            path.resolve(__dirname, 'public/uploads', cleanName),
          ];

          for (const filePath of candidates) {
            if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
              const ext = path.extname(filePath).toLowerCase();
              const mimeMap: Record<string, string> = {
                '.jpg': 'image/jpeg',
                '.jpeg': 'image/jpeg',
                '.png': 'image/png',
                '.webp': 'image/webp',
                '.gif': 'image/gif',
                '.svg': 'image/svg+xml',
              };
              res.setHeader('Content-Type', mimeMap[ext] || 'application/octet-stream');
              res.setHeader('Access-Control-Allow-Origin', '*');
              res.setHeader('Cache-Control', 'public, max-age=3600');
              fs.createReadStream(filePath).pipe(res);
              return;
            }
          }
        } catch {
          // Fall through to next middleware / proxy
        }
        next();
      });
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), serveLocalUploads()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      proxy: {
        '/api': {
          target: 'http://localhost:5000',
          changeOrigin: true,
          secure: false,
        },
        '/uploads': {
          target: 'http://localhost:5000',
          changeOrigin: true,
          secure: false,
        },
      },
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
