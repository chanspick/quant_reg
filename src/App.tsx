import { lazy, Suspense } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { ThemeProvider } from '@/components/theme/ThemeProvider';
import { AppShell } from '@/components/layout/AppShell';
import { AboutPage } from '@/pages/AboutPage';

const DashboardPage = lazy(() =>
  import('@/pages/DashboardPage').then((m) => ({ default: m.DashboardPage })),
);
const MethodologyPage = lazy(() =>
  import('@/pages/MethodologyPage').then((m) => ({ default: m.MethodologyPage })),
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
            <Route index element={<AboutPage />} />
            <Route
              path="dashboard"
              element={
                <Suspense fallback={<RouteFallback />}>
                  <DashboardPage />
                </Suspense>
              }
            />
            <Route
              path="methodology"
              element={
                <Suspense fallback={<RouteFallback />}>
                  <MethodologyPage />
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
