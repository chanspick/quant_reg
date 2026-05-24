import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useInstallPrompt } from '@/lib/pwa';
import { ko } from '@/i18n/ko';
import { cn } from '@/lib/utils';

/**
 * SPEC-PQC-001 §3.8:
 * - REQ-PWA-006: beforeinstallprompt 캡처 시 install 어포던스 노출.
 * - OQ-009: 헤더에 1회 노출 + About 페이지 재노출.
 *   본 컴포넌트는 헤더 슬롯용이며, About 페이지는 별도 hook 호출로 재노출한다.
 *
 * UX:
 * - 모바일(<sm): 아이콘 only + aria-label.
 * - 데스크톱(≥sm): 아이콘 + 라벨 텍스트.
 * - 설치 후 appinstalled 이벤트 시 useInstallPrompt 가 canInstall=false 로 갱신 → 자동 숨김.
 */
export function InstallButton(): React.JSX.Element | null {
  const { canInstall, promptInstall } = useInstallPrompt();

  if (!canInstall) return null;

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={() => void promptInstall()}
      aria-label={ko.pwa.install}
      data-testid="pwa-install-button"
    >
      <Download aria-hidden="true" />
      <span className={cn('hidden sm:inline')}>{ko.pwa.install}</span>
    </Button>
  );
}
