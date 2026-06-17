import { cn } from '@/lib/utils';

/**
 * SPEC-PQC-001:
 * - REQ-DSH-006: pqc.keyExchange, pqc.hybrid, pqc.maturity, certificate.renewal
 *   에 대해 enum 값별 시각 톤이 일관된 배지를 노출한다.
 *
 * shadcn Badge 와 형태/접근성은 유사하되, enum 값 → 톤 매핑이 본 컴포넌트의 책임.
 * 알 수 없는 값은 slate(중립/미확정)로 graceful fallback 한다.
 */

type Tone = 'positive' | 'neutral-good' | 'warning' | 'unknown' | 'negative';

interface StatusBadgeProps {
  value: string;
  className?: string;
}

/**
 * Enum 값 → tone 매핑 (tone 분류 자체는 불변, 색만 워밍 모노크롬화).
 *
 * positive: 활성화, 자동 갱신, 운영 성숙, 기본 제공, 하이브리드
 * neutral-good: 베타 적용, 분기 자동 갱신
 * warning: 도입 검토 단계, 수동 갱신
 * unknown: 미지원, 미감지, 미설정
 * negative: 비활성화, 차단됨, 준비 미착수, 전환 미실시, 만료 임박
 *
 * 위험(negative)만 강조 1색(destructive). 나머지 4 tone 은 무채 농담으로 위계 표현.
 */
const TONE_MAP: Record<string, Tone> = {
  // positive
  '활성화': 'positive',
  '자동 갱신': 'positive',
  '운영 성숙': 'positive',
  '기본 제공': 'positive',
  '하이브리드': 'positive',
  // neutral-good
  '베타 적용': 'neutral-good',
  '분기 자동 갱신': 'neutral-good',
  // warning
  '도입 검토 단계': 'warning',
  '수동 갱신': 'warning',
  // unknown
  '미지원': 'unknown',
  '미감지': 'unknown',
  '미설정': 'unknown',
  // negative
  '비활성화': 'negative',
  '차단됨': 'negative',
  '준비 미착수': 'negative',
  '전환 미실시': 'negative',
  '만료 임박': 'negative',
};

const TONE_CLASSES: Record<Tone, string> = {
  // 무채 농담 — 긍정일수록 진하게(foreground), 중립/미확정일수록 옅게(muted).
  positive:
    'bg-foreground/[0.08] text-foreground border border-foreground/20',
  'neutral-good':
    'bg-foreground/[0.06] text-foreground/85 border border-foreground/15',
  warning:
    'bg-muted text-foreground/70 border border-foreground/15',
  unknown:
    'bg-muted text-muted-foreground border border-border',
  // 위험만 강조 1색 (destructive=라이트 머티드레드/다크 risk).
  negative:
    'bg-destructive/15 text-destructive border border-destructive/30',
};

function resolveTone(value: string): Tone {
  return TONE_MAP[value] ?? 'unknown';
}

export function StatusBadge({
  value,
  className,
}: StatusBadgeProps): React.JSX.Element {
  const tone = resolveTone(value);

  return (
    <span
      data-status-tone={tone}
      className={cn(
        'inline-flex w-fit shrink-0 items-center rounded-full px-2 py-0.5',
        'text-[10px] font-medium whitespace-nowrap tracking-tight sm:text-xs',
        TONE_CLASSES[tone],
        className,
      )}
    >
      {value}
    </span>
  );
}

/** 외부에서 톤만 필요할 때 (예: 정렬/그룹핑 등) 재사용. */
export function statusBadgeTone(value: string): Tone {
  return resolveTone(value);
}
