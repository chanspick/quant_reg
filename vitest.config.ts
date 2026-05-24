/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import path from 'node:path';

// SPEC-PQC-001 §3.13 (REQ-QG-003, REQ-QG-005)
// Vitest 가 자체 Vite 인스턴스를 사용하므로 alias 와 esbuild JSX 만 지정한다.
// Phase B: dashboard 컴포넌트 RTL 테스트를 위해 esbuild jsx automatic 활성화.
// (plugin-react-swc 는 vite v5/v6 type 충돌로 보류 — esbuild 만으로 React 19
// JSX 트랜스폼이 충분히 동작한다.)
export default defineConfig({
  esbuild: {
    jsx: 'automatic',
    jsxImportSource: 'react',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // vite-plugin-pwa 의 virtual 모듈을 vitest 에서는 mock 으로 대체
      'virtual:pwa-register': path.resolve(__dirname, './tests/__mocks__/pwa-register.ts'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      thresholds: {
        lines: 85,
        functions: 85,
        branches: 80,
        statements: 85,
      },
      exclude: [
        'node_modules/',
        'dist/',
        'dev-dist/',
        'coverage/',
        'tests/setup.ts',
        'tests/fixtures/**',
        'tests/__mocks__/**',
        '**/*.config.*',
        'src/main.tsx',
        'src/App.tsx',
        'src/vite-env.d.ts',
        // shadcn 표준 스톡 컴포넌트 — user code 아님
        'src/components/ui/**',
        // CLI 스크립트 — Node 환경 전용
        'scripts/**',
        // 단순 마크업 페이지 (smoke 테스트로 별도 검증)
        'src/pages/NotFoundPage.tsx',
        // PWA / 브라우저 API 종속 (Service Worker 환경 필요)
        'src/lib/pwa.ts',
        // PWA UI: SW 이벤트·beforeinstallprompt 등 브라우저 API 필요
        'src/components/pwa/**',
        // next-themes provider 자체는 라이브러리 기능에 위임
        'src/components/theme/ThemeProvider.tsx',
      ],
    },
  },
});
