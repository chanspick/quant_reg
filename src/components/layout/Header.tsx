import { NavLink } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ko } from '@/i18n/ko';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { InstallButton } from '@/components/pwa/InstallButton';
import { useDomains } from '@/data/useDomains';

/**
 * SPEC-PQC-001 §3.1:
 * - REQ-APP-002: 브랜드 + 3개 nav 링크 + lastUpdated + 테마 토글
 * - REQ-APP-006/007: SPA 라우팅 + 키보드 활성화 (NavLink 가 처리)
 * - REQ-APP-009: 활성 라우트 시각 표시 (NavLink isActive)
 * - REQ-PWA-006 / OQ-009: install 버튼은 헤더에 1회 노출 (InstallButton 컴포넌트)
 * - REQ-A11Y-005: <header><nav> semantic landmark
 *
 * 액션 영역 순서 (RTL): [lastUpdated] [InstallButton?] [ThemeToggle]
 */

const NAV_ITEMS = [
  { to: '/', label: ko.nav.dashboard, end: true },
  { to: '/methodology', label: ko.nav.methodology, end: false },
  { to: '/about', label: ko.nav.about, end: false },
] as const;

export function Header(): React.JSX.Element {
  const { lastUpdated } = useDomains();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[hsl(var(--border))] bg-[hsl(var(--background))]/90 backdrop-blur-sm">
      <div className="container mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:gap-6">
        {/* 브랜드 */}
        <NavLink
          to="/"
          className="inline-flex items-center gap-2 text-sm font-semibold text-[hsl(var(--foreground))] sm:text-base"
        >
          <ShieldCheck
            aria-hidden="true"
            className="h-5 w-5 text-[hsl(var(--primary))]"
          />
          <span>[{ko.brand.short}]</span>
        </NavLink>

        {/* 내비게이션 */}
        <nav aria-label="주 내비게이션" className="flex flex-1 items-center gap-1 sm:gap-2">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors sm:text-sm',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]',
                  isActive
                    ? 'bg-[hsl(var(--secondary))] text-[hsl(var(--foreground))]'
                    : 'text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))] hover:text-[hsl(var(--foreground))]',
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* 최종 갱신 (REQ-APP-002, OQ-007) */}
        {lastUpdated && (
          <span className="hidden font-mono text-xs text-[hsl(var(--muted-foreground))] sm:inline">
            {ko.meta.lastUpdatedPrefix} {lastUpdated}
          </span>
        )}

        {/* 설치 버튼 (REQ-PWA-006) — canInstall=true 일 때만 자체 렌더 */}
        <InstallButton />

        <ThemeToggle />
      </div>
    </header>
  );
}
