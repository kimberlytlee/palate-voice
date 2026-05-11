import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import basicSsl from '@vitejs/plugin-basic-ssl';
import fs from 'node:fs';
import path from 'node:path';

// Vite tries to transform .mjs files as ES modules before the /public static
// server can serve them. This plugin intercepts those requests first and
// streams the files directly, bypassing the transform pipeline entirely.
const serveOrtWasmAsStatic = {
  name: 'serve-ort-wasm-as-static',
  configureServer(server: import('vite').ViteDevServer) {
    // Middleware to set COOP/COEP headers on ALL responses
    server.middlewares.use((req, res, next) => {
      res.setHeader('cross-origin-opener-policy', 'same-origin');
      res.setHeader('cross-origin-embedder-policy', 'require-corp');
      next();
    });

    // Handle .mjs file serving
    server.middlewares.use((req, res, next) => {
      const url = req.url?.split('?')[0] ?? '';
      if (
        url === '/ort-wasm-simd-threaded.mjs' ||
        url === '/ort-wasm-simd-threaded.jsep.mjs'
      ) {
        const filename = url.slice(1);
        res.setHeader('Content-Type', 'application/javascript');
        fs.createReadStream(path.resolve(`public/${filename}`)).pipe(res);
        return;
      }
      next();
    });
  },
};

export default defineConfig({
  plugins: [
    serveOrtWasmAsStatic,
    basicSsl(),
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        maximumFileSizeToCacheInBytes: 15 * 1024 * 1024,
      },
      manifest: {
        name: 'Palate',
        short_name: 'Palate',
        description: 'Voice-first restaurant recommendations',
        theme_color: '#0f0f0f',
        background_color: '#0f0f0f',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
  ],
  // SharedArrayBuffer required by ONNX/AudioWorklet
  server: {
    port: 3000,
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  optimizeDeps: {
    include: ['@ricky0123/vad-web', '@ricky0123/vad-react'],
  },
});
