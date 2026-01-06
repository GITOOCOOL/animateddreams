import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
        proxy: {
            '/api/comfy-ws': {
                 target: (env.VITE_COMFY_API_HOST || 'http://127.0.0.1:8188').replace('http', 'ws'),
                 ws: true,
                 changeOrigin: true,
                 rewrite: (path) => path.replace(/^\/api\/comfy-ws/, '/ws')
            },
            '/api/comfy': {
                target: env.VITE_COMFY_API_HOST || 'http://127.0.0.1:8188',
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/api\/comfy/, '')
            },
            '/api/ollama': {
                target: env.VITE_OLLAMA_API_HOST || 'http://127.0.0.1:11434',
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/api\/ollama/, '/api')
            }
        }
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
