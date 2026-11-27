import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import r2UploadHandler from './api/r2-upload.js'
import r2DeleteHandler from './api/r2-delete.js'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  Object.assign(process.env, env);

  return {
  plugins: [
    tailwindcss(),
    react(),
    {
      name: 'super-admin-and-r2-routes',
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          const rawUrl = req.url || '';
          const cleanPath = rawUrl.split('?')[0].toLowerCase();
          if (cleanPath === '/super-admin' || cleanPath === '/superadmin' || cleanPath === '/admin') {
            const query = rawUrl.includes('?') ? '?' + rawUrl.split('?')[1] : '';
            req.url = '/super-admin.html' + query;
            return next();
          }

          if (cleanPath === '/api/r2-upload' || cleanPath === '/api/r2-delete') {
            const chunks = [];
            req.on('data', chunk => chunks.push(chunk));
            req.on('end', async () => {
              try {
                const rawBody = Buffer.concat(chunks).toString('utf8');
                req.body = rawBody ? JSON.parse(rawBody) : {};
              } catch (_) {
                req.body = {};
              }
              res.status = (code) => { res.statusCode = code; return res; };
              res.json = (obj) => {
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify(obj));
              };
              const fn = cleanPath === '/api/r2-upload' ? r2UploadHandler : r2DeleteHandler;
              await fn(req, res);
            });
            return;
          }

          next();
        });
      }
    },
  ],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('lucide-react')) {
              return 'vendor-icons';
            }
            if (id.includes('react') || id.includes('scheduler')) {
              return 'vendor-react';
            }
            if (id.includes('@supabase')) {
              return 'vendor-supabase';
            }
            return 'vendor';
          }
        }
      }
    }
  },
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    watch: {
      ignored: [
        '**/android/**',
        '**/ios/**',
        '**/dist/**',
        '**/.git/**',
        '**/*.apk',
        '**/public/*.apk',
        '**/admin/**',
        '**/.venv/**',
        '**/.chrome*/**',
        '**/*.db*',
        '**/*.sqlite*',
        '**/*.log'
      ]
    },
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true
      },
      '/sandbox-api': {
        target: 'https://api.sandbox.co.in',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/sandbox-api/, '')
      },
      '/fast2sms-api': {
        target: 'https://www.fast2sms.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/fast2sms-api/, '')
      }
    }
  }
  };
})
