import { cn } from '@/lib/utils';
import { ko } from '@/i18n/ko';
import type { DataSource } from '@/data/schema';

/**
 * SPEC-PQC-001:
 * - REQ-APP-003 / REQ-SCH-006 / REQ-DSH-020:
 *   모든 SourcedScore · SourcedText · regulatoryGap 옆에 출처 칩을 노출한다.
 *   워밍 모노크롬 리스타일: 4모드를 유채(sky/amber/violet/slate) 대신
 *   무채 농담(foreground 농담)으로 구분한다. 출처는 위험/경고가 아니므로 강조색을
 *   쓰지 않고, 텍스트/도트 명도 차이만으로 1:1 매핑을 유지한다.
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
 * 4 모드 ↔ 시각 토큰 매핑 (워밍 모노크롬).
 * - 유채 제거 → 무채 농담으로 4모드 구분. 신뢰도 높은 순으로 명도/불투명도 ↑.
 *   automated(가장 진함) > llm+verified > manual > llm-only(가장 옅음).
 * - 시맨틱 토큰(foreground/muted-foreground) 사용으로 라이트/다크 대비 자동 확보.
 */
const VARIANTS: Record<DataSource, VariantToken> = {
  automated: {
    label: ko.sourceLabel.automated,
    chip: 'bg-foreground/[0.08] text-foreground',
    dot: 'bg-foreground',
  },
  manual: {
    label: ko.sourceLabel.manual,
    chip: 'bg-foreground/[0.06] text-foreground/80',
    dot: 'bg-foreground/70',
  },
  'llm+verified': {
    label: ko.sourceLabel.llmVerified,
    chip: 'bg-foreground/[0.07] text-foreground/90',
    dot: 'bg-foreground/85',
  },
  'llm-only': {
    label: ko.sourceLabel.llmOnly,
    chip: 'bg-muted text-muted-foreground',
    dot: 'bg-muted-foreground',
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
