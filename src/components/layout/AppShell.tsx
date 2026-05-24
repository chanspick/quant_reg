import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { DemoBanner } from './DemoBanner';
import { OfflineNotice } from '@/components/pwa/OfflineNotice';
import { UpdateToast } from '@/components/pwa/UpdateToast';
import { ko } from '@/i18n/ko';

/**
 * SPEC-PQC-001:
 * - REQ-A11Y-005: header/main/footer semantic landmarks + lang="ko" (html level)
 * - REQ-APP-002~003: 영구 헤더 + 데모 배너
 * - REQ-PWA-007: 새 버전 감지 시 UpdateToast 노출 (fixed bottom — 레이아웃 무영향)
 * - REQ-PWA-008: 오프라인 시 OfflineNotice 배너 (DemoBanner 아래 / main 위)
 */
export function AppShell(): React.JSX.Element {
  return (
    <div className="flex min-h-screen flex-col bg-[hsl(var(--background))] text-[hsl(var(--foreground))]">
      <DemoBanner />
      <OfflineNotice />
      <Header />
      <main id="main" className="container mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:py-8">
        <Outlet />
      </main>
      <footer className="border-t border-[hsl(var(--border))] bg-[hsl(var(--background))] py-6">
        <div className="container mx-auto flex max-w-7xl flex-col gap-1 px-4 text-xs text-[hsl(var(--muted-foreground))] sm:flex-row sm:items-center sm:justify-between">
          <p>{ko.footer.disclaimer}</p>
          <p className="font-mono">{ko.footer.course}</p>
        </div>
      </footer>
      {/* REQ-PWA-007: 새 SW 버전 토스트 — portal-style fixed (레이아웃 무영향) */}
      <UpdateToast />
    </div>
  );
}
