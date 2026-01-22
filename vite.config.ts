import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 5173,
      host: '0.0.0.0',
      proxy: {
        '/api/comfy-ws': {
          target: (env.VITE_COMFY_API_HOST || 'http://127.0.0.1:8188').replace('http', 'ws'),
          ws: true,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/comfy-ws/, '/ws'),
          configure: (proxy) => {
            proxy.on('proxyReqWs', (proxyReq, req, socket, options, head) => {
              proxyReq.setHeader('Origin', env.VITE_COMFY_API_HOST || 'http://127.0.0.1:8188');
            });
          }
        },
        '/api/comfy': {
          target: env.VITE_COMFY_API_HOST || 'http://127.0.0.1:8188',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/comfy/, ''),
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq, req, res) => {
              proxyReq.setHeader('Origin', env.VITE_COMFY_API_HOST || 'http://127.0.0.1:8188');
            });
          }
        },
        '/api/ollama': {
          target: env.VITE_OLLAMA_API_HOST || 'http://127.0.0.1:11434',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/ollama/, '/api')
        },
        '/api/db': {
          target: 'http://127.0.0.1:3001',
          changeOrigin: true
        },
        '/api/ai': {
          target: 'http://127.0.0.1:3001',
          changeOrigin: true
        },
        '/api/auth': {
          target: 'http://127.0.0.1:3001',
          changeOrigin: true
        },
        '/api/workflows': {
          target: 'http://127.0.0.1:3001',
          changeOrigin: true
        },
        '/api/engines': {
          target: 'http://127.0.0.1:3001',
          changeOrigin: true
        },
        '/storage': {
          target: 'http://127.0.0.1:3001',
          changeOrigin: true
        }
      }
    },
    plugins: [react()],
    define: {
      // 'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY), // REMOVED: Moved to backend
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
