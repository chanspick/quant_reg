import { cn } from '@/lib/utils';
import { ko } from '@/i18n/ko';
import type { DataSource } from '@/data/schema';

/**
 * SPEC-PQC-001:
 * - REQ-APP-003 / REQ-SCH-006 / REQ-DSH-020:
 *   모든 SourcedScore · SourcedText · regulatoryGap 옆에 출처 칩을 노출한다.
 *   배너 레전드와 동일한 4모드 팔레트(sky / amber / violet / slate)를 재사용해
 *   UI 전반에서 1:1 매핑을 보장한다.
 *
 * 정직성 원칙의 시각적 표현이 본 컴포넌트의 역할이다.
 */

interface SourceChipProps {
  source: DataSource;
  /** 'sm' 기본(텍스트 10/12px) · 'md' 확장(텍스트 12/14px). */
  size?: 'sm' | 'md';
  /** false 면 점만 노출하고, 라벨은 aria-label 로 제공한다. */
  withLabel?: boolean;
  className?: string;
}

interface VariantToken {
  /** label 텍스트. */
  label: string;
  /** chip 전체 클래스 (배경 + 텍스트, light/dark). */
  chip: string;
  /** dot 모드의 단색 마커 클래스. */
  dot: string;
}

/**
 * 4 모드 ↔ 시각 토큰 매핑.
 * - dark 대비 4.5:1 충족: text-{color}-300 on slate-900 / -700 on slate-50.
 * - 배경은 -500/15 알파, 가독성 확보.
 */
const VARIANTS: Record<DataSource, VariantToken> = {
  automated: {
    label: ko.sourceLabel.automated,
    chip: 'bg-sky-500/15 text-sky-700 dark:text-sky-300',
    dot: 'bg-sky-500',
  },
  manual: {
    label: ko.sourceLabel.manual,
    chip: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
    dot: 'bg-amber-500',
  },
  'llm+verified': {
    label: ko.sourceLabel.llmVerified,
    chip: 'bg-violet-500/15 text-violet-700 dark:text-violet-300',
    dot: 'bg-violet-500',
  },
  'llm-only': {
    label: ko.sourceLabel.llmOnly,
    chip: 'bg-slate-500/20 text-slate-700 dark:text-slate-300',
    dot: 'bg-slate-400 dark:bg-slate-500',
  },
};

export function SourceChip({
  source,
  size = 'sm',
  withLabel = true,
  className,
}: SourceChipProps): React.JSX.Element {
  const variant = VARIANTS[source];
  const a11yLabel = `데이터 출처: ${variant.label}`;

  if (!withLabel) {
    // dot-only 모드 — 좁은 공간(점수바 옆) 용
    const dotSize = size === 'md' ? 'h-2.5 w-2.5' : 'h-2 w-2';
    return (
      <span
        role="img"
        aria-label={a11yLabel}
        title={variant.label}
        className={cn(
          'inline-block shrink-0 rounded-full',
          dotSize,
          variant.dot,
          className,
        )}
      />
    );
  }

  const padding = size === 'md' ? 'px-2 py-0.5' : 'px-1.5 py-0.5';
  const text = size === 'md' ? 'text-xs sm:text-sm' : 'text-[10px] sm:text-xs';

  return (
    <span
      aria-label={a11yLabel}
      className={cn(
        'inline-flex shrink-0 items-center rounded font-medium tracking-tight',
        padding,
        text,
        variant.chip,
        className,
      )}
    >
      {variant.label}
    </span>
  );
}

/**
 * (옵션) 외부에서 DataSource → 라벨/팔레트 토큰을 직접 참조해야 할 때 사용.
 * 신규 컴포넌트가 SourceChip 을 임포트하지 않고도 동일한 매핑을 재사용할 수 있게 한다.
 */
export function getSourceVariant(source: DataSource): VariantToken {
  return VARIANTS[source];
}
