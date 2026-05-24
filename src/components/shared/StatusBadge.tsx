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
 * Enum 값 → tone 매핑.
 *
 * positive (emerald):
 *   - 활성화, 자동 갱신, 운영 성숙, 기본 제공, 하이브리드
 * neutral-good (sky):
 *   - 베타 적용, 분기 자동 갱신
 * warning (amber):
 *   - 도입 검토 단계, 수동 갱신
 * unknown (slate):
 *   - 미지원, 미감지, 미설정
 * negative (red):
 *   - 비활성화, 차단됨, 준비 미착수, 전환 미실시, 만료 임박
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
  positive:
    'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30',
  'neutral-good':
    'bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-500/30',
  warning:
    'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30',
  unknown:
    'bg-slate-500/15 text-slate-700 dark:text-slate-300 border border-slate-500/30',
  negative:
    'bg-red-500/15 text-red-700 dark:text-red-300 border border-red-500/30',
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
