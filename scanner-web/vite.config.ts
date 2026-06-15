import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';

// SPEC-PQC-002 §4 — 발표 시연용 단일 페이지 SPA. PWA·라우터 없음 (의도적 단순화).
// port 5174 — 기존 정적 대시보드 dev(5173)와 충돌 회피.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5174,
    strictPort: false,
  },
  preview: {
    port: 5174,
  },
});
