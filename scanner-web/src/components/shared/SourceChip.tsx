import { cn } from '@/lib/utils';
import type { ScoreSource } from '@/data/schema';

/**
 * SourceChip — 정직성 라벨 4모드 (자동/수동/LLM검증/LLM미검증).
 * SPEC-PQC-001 src/components/shared/SourceChip.tsx 의 복제 + i18n inline 화.
 */

interface SourceChipProps {
  source: ScoreSource;
  size?: 'sm' | 'md';
  withLabel?: boolean;
  className?: string;
}

interface VariantToken {
  label: string;
  chip: string;
  dot: string;
}

const VARIANTS: Record<ScoreSource, VariantToken> = {
  automated: {
    label: '자동 측정',
    chip: 'bg-sky-500/15 text-sky-700 dark:text-sky-300',
    dot: 'bg-sky-500',
  },
  manual: {
    label: '수동 리서치',
    chip: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
    dot: 'bg-amber-500',
  },
  'llm+verified': {
    label: 'LLM + 샘플 검증',
    chip: 'bg-violet-500/15 text-violet-700 dark:text-violet-300',
    dot: 'bg-violet-500',
  },
  'llm-only': {
    label: 'LLM (미검증)',
    chip: 'bg-violet-500/15 text-violet-700 dark:text-violet-300',
    dot: 'bg-violet-400 dark:bg-violet-500',
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
