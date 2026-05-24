import { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';
import { ko } from '@/i18n/ko';
import { cn } from '@/lib/utils';

/**
 * SPEC-PQC-001 §3.8:
 * - REQ-PWA-008: 오프라인 시 비차단형(non-blocking) 인디케이터 노출.
 *   "데이터가 stale 일 수 있다" 는 점을 사용자에게 알린다.
 *
 * - window online/offline 이벤트 + 초기 navigator.onLine 으로 상태 관리.
 * - 온라인 복귀 시 자동 숨김.
 * - aria-live="polite" 로 SR 에 상태 변경 알림.
 * - AppShell 의 DemoBanner 아래, main 위에 sticky-like 배너로 배치.
 */
export function OfflineNotice(): React.JSX.Element | null {
  const [isOffline, setIsOffline] = useState<boolean>(() => {
    if (typeof navigator === 'undefined') return false;
    return navigator.onLine === false;
  });

  useEffect(() => {
    const handleOnline = (): void => setIsOffline(false);
    const handleOffline = (): void => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="pwa-offline-notice"
      className={cn(
        'w-full border-b border-[hsl(var(--border))]',
        'bg-amber-500/10 text-[hsl(var(--foreground))]',
      )}
    >
      <div className="container mx-auto flex max-w-7xl items-center gap-2 px-4 py-1.5 text-xs sm:text-sm">
        <WifiOff
          aria-hidden="true"
          className="h-3.5 w-3.5 shrink-0 text-amber-700 dark:text-amber-300"
        />
        <span className="font-medium">{ko.pwa.offline}</span>
        <span className="text-[hsl(var(--muted-foreground))]" aria-hidden>
          ·
        </span>
        <span className="text-[hsl(var(--muted-foreground))]">
          {ko.pwa.offlineHint}
        </span>
      </div>
    </div>
  );
}
