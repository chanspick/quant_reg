import { useEffect, useRef } from 'react';
import { RefreshCw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUpdateAvailable } from '@/lib/pwa';
import { ko } from '@/i18n/ko';
import { cn } from '@/lib/utils';

/**
 * SPEC-PQC-001 §3.8:
 * - REQ-PWA-007: 새 SW 버전 감지 시 사용자에게 알림 + "지금 적용" 액션 제공.
 *
 * UX:
 * - 데스크톱: 하단 우측 고정 카드.
 * - 모바일: 하단 중앙 풀폭(좌우 16px 거터).
 * - aria-live="polite" 로 보조 기술에 토스트 등장을 알림.
 * - 마운트 시 액션 버튼에 포커스 이동 (키보드 사용자 편의).
 * - 30초 무반응 시 자동 닫힘.
 * - 슬라이드업 + 페이드 전환.
 */
const AUTO_DISMISS_MS = 30_000;

export function UpdateToast(): React.JSX.Element | null {
  const { updateAvailable, applyUpdate, dismissUpdate } = useUpdateAvailable();
  const actionButtonRef = useRef<HTMLButtonElement | null>(null);

  // 토스트 등장 시 액션 버튼에 포커스 (접근성).
  useEffect(() => {
    if (updateAvailable && actionButtonRef.current) {
      actionButtonRef.current.focus();
    }
  }, [updateAvailable]);

  // 30초 자동 닫힘.
  useEffect(() => {
    if (!updateAvailable) return;
    const timerId = window.setTimeout(() => {
      dismissUpdate();
    }, AUTO_DISMISS_MS);
    return () => {
      window.clearTimeout(timerId);
    };
  }, [updateAvailable, dismissUpdate]);

  if (!updateAvailable) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={ko.pwa.update}
      data-testid="pwa-update-toast"
      className={cn(
        // 포지셔닝: 모바일 풀폭 / 데스크톱 우측 하단
        'fixed bottom-4 left-4 right-4 z-50 sm:left-auto sm:right-4 sm:max-w-sm',
        // 카드 스타일 (shadcn HSL 토큰)
        'rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] p-4 shadow-lg',
        // 슬라이드업 + 페이드인 (Tailwind v4 기본 animate)
        'animate-in slide-in-from-bottom-4 fade-in duration-300',
      )}
    >
      <div className="flex items-start gap-3">
        <RefreshCw
          aria-hidden="true"
          className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--primary))]"
        />
        <div className="flex-1 text-sm text-[hsl(var(--foreground))]">
          {ko.pwa.update}
        </div>
        <button
          type="button"
          onClick={dismissUpdate}
          aria-label={ko.pwa.updateDismiss}
          className={cn(
            'inline-flex h-6 w-6 shrink-0 items-center justify-center rounded',
            'text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--foreground))]',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]',
          )}
        >
          <X aria-hidden="true" className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="mt-3 flex justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={dismissUpdate}
        >
          {ko.pwa.updateDismiss}
        </Button>
        <Button
          ref={actionButtonRef}
          type="button"
          variant="default"
          size="sm"
          onClick={applyUpdate}
          data-testid="pwa-update-apply"
        >
          {ko.pwa.updateAction}
        </Button>
      </div>
    </div>
  );
}
