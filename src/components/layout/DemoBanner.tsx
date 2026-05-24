import { useState } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ko } from '@/i18n/ko';
import { SourceChip } from '@/components/shared/SourceChip';

/**
 * SPEC-PQC-001:
 * - REQ-APP-003: 데이터 소스 안내 배너 (정직성 핵심)
 * - REQ-APP-008: dismiss 컨트롤
 * - OQ-001: 세션 한정 dismissal — in-memory state 만 사용 (localStorage 미사용)
 *
 * 데이터 소스 모드를 시각 레전드로 노출하여, UI 전반의 출처 배지(SourceChip)와
 * 1:1 매핑되도록 한다. 칩은 shared 모듈에서 단일 출처로 임포트한다.
 */
export function DemoBanner(): React.JSX.Element | null {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  return (
    <div
      role="region"
      aria-label="데이터 소스 안내"
      className={cn(
        'relative w-full border-b border-[hsl(var(--border))]',
        'bg-[hsl(var(--primary))]/5 text-[hsl(var(--foreground))]',
      )}
    >
      <div className="container mx-auto flex max-w-7xl items-start gap-3 px-4 py-2 text-xs leading-relaxed sm:text-sm">
        <p className="flex flex-1 flex-wrap items-center gap-x-1.5 gap-y-1">
          <SourceChip source="automated" />
          <span>TLS·KEM·인증서</span>
          <span className="text-[hsl(var(--muted-foreground))]" aria-hidden>
            ·
          </span>
          <SourceChip source="manual" />
          <span>공급망·정책</span>
          <span className="text-[hsl(var(--muted-foreground))]" aria-hidden>
            ·
          </span>
          <SourceChip source="llm+verified" />
          <span>규제 매핑</span>
          <span className="ml-1 text-[hsl(var(--muted-foreground))]">
            {ko.banner.legendSuffix}
          </span>
        </p>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label={ko.banner.dismiss}
          className={cn(
            'inline-flex h-6 w-6 shrink-0 items-center justify-center rounded',
            'text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--foreground))]',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]',
          )}
        >
          <X aria-hidden="true" className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
