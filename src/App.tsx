import { lazy, Suspense } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { ThemeProvider } from '@/components/theme/ThemeProvider';
import { AppShell } from '@/components/layout/AppShell';
import { DashboardPage } from '@/pages/DashboardPage';

/**
 * SPEC-PQC-001:
 * - REQ-APP-001: 3개 top-level 페이지 + 404
 * - REQ-APP-005: 직접 진입 / 새로고침 시 URL 유지 (BrowserRouter)
 * - REQ-PRF-007: 번들 예산 보호를 위한 route-based code splitting
 * - OQ-002: React Router 7 채택
 *
 * Route splitting:
 *   - DashboardPage: 첫 로드 페이지이므로 즉시 import (lazy chunk 분리 시 도리어 손해)
 *   - Methodology / About / NotFound: React.lazy 로 분리 — 첫 로드 시 다운로드 안 됨
 */

const MethodologyPage = lazy(() =>
  import('@/pages/MethodologyPage').then((m) => ({ default: m.MethodologyPage })),
);
const AboutPage = lazy(() =>
  import('@/pages/AboutPage').then((m) => ({ default: m.AboutPage })),
);
const NotFoundPage = lazy(() =>
  import('@/pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage })),
);
const ScannerPage = lazy(() =>
  import('@/pages/ScannerPage').then((m) => ({ default: m.ScannerPage })),
);

function RouteFallback(): React.JSX.Element {
  return (
    <div
      role="status"
      aria-live="polite"
      className="mx-auto max-w-md py-12 text-center text-sm text-[hsl(var(--muted-foreground))]"
    >
      페이지를 불러오는 중...
    </div>
  );
}

export function App(): React.JSX.Element {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<DashboardPage />} />
            <Route
              path="methodology"
              element={
                <Suspense fallback={<RouteFallback />}>
                  <MethodologyPage />
                </Suspense>
              }
            />
            <Route
              path="about"
              element={
                <Suspense fallback={<RouteFallback />}>
                  <AboutPage />
                </Suspense>
              }
            />
            <Route
              path="scan"
              element={
                <Suspense fallback={<RouteFallback />}>
                  <ScannerPage />
                </Suspense>
              }
            />
            <Route
              path="*"
              element={
                <Suspense fallback={<RouteFallback />}>
                  <NotFoundPage />
                </Suspense>
              }
            />
          </Route>
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}
