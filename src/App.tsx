import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { ThemeProvider } from '@/components/theme/ThemeProvider';
import { AppShell } from '@/components/layout/AppShell';
import { DashboardPage } from '@/pages/DashboardPage';
import { MethodologyPage } from '@/pages/MethodologyPage';
import { AboutPage } from '@/pages/AboutPage';
import { NotFoundPage } from '@/pages/NotFoundPage';

/**
 * SPEC-PQC-001:
 * - REQ-APP-001: 3개 top-level 페이지 + 404
 * - REQ-APP-005: 직접 진입 / 새로고침 시 URL 유지 (BrowserRouter)
 * - OQ-002: React Router 7 채택
 */
export function App(): React.JSX.Element {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<DashboardPage />} />
            <Route path="methodology" element={<MethodologyPage />} />
            <Route path="about" element={<AboutPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}
