import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'node:path';

// PQC 준비도 스캐너 — Vite + React 19 + Tailwind v4 + PWA
// SPEC-PQC-001 §1.2, §3.8 (PWA), §4.5~4.6 (manifest, SW 캐싱 전략)
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'PQC 준비도 스캐너',
        short_name: '준비도 스캐너',
        description:
          '한국 주요 50개 도메인의 양자내성암호(PQC) 전환 준비도 데모 대시보드. 합성 데이터 기반 강의 프로젝트.',
        lang: 'ko',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#f5f7fa',
        theme_color: '#1e3a8a',
        icons: [
          { src: '/pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/pwa-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: '/pwa-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // 앱 셸 precache (REQ-PWA-002)
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff,woff2}'],
        // 런타임 캐싱 (REQ-PWA-003)
        runtimeCaching: [
          {
            urlPattern: /\/data\/domains\.json$/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'domains-data',
              expiration: { maxAgeSeconds: 60 * 60 * 24 },
            },
          },
          {
            urlPattern: /\.(?:woff2?|ttf|otf)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'fonts',
              expiration: { maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],
        cleanupOutdatedCaches: true,
      },
      devOptions: { enabled: false },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
