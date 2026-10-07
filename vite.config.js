import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
    {
      name: 'super-admin-rewrites',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          const rawUrl = req.url || '';
          const cleanPath = rawUrl.split('?')[0].toLowerCase();
          if (cleanPath === '/super-admin' || cleanPath === '/superadmin' || cleanPath === '/admin') {
            const query = rawUrl.includes('?') ? '?' + rawUrl.split('?')[1] : '';
            req.url = '/super-admin.html' + query;
          }
          next();
        });
      }
    },
  ],
  build: {
    outDir: 'dist',
    emptyOutDir: true
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
})
