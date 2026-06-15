import { cn } from '@/lib/utils';
import type { ScoreSource } from '@/data/schema';
import { SourceChip } from './SourceChip';
import { clampScore, scoreBandClasses } from './scoreBand';

/**
 * ScoreBar — 4축 점수 진행 바. SPEC-PQC-001 src/components/shared/ScoreBar.tsx 의 복제.
 * 발표 시연 강조를 위해 약간 큰 사이즈로 sm 기본 적용.
 */

interface ScoreBarProps {
  value: number;
  label: string;
  source?: ScoreSource;
  ariaDescription?: string;
  className?: string;
}

export function ScoreBar({
  value,
  label,
  source,
  ariaDescription,
  className,
}: ScoreBarProps): React.JSX.Element {
  const primary = clampScore(value);
  const bandClasses = scoreBandClasses(primary);

  const ariaParts: string[] = [`${label} ${primary}점`];
  if (ariaDescription) ariaParts.push(ariaDescription);
  const ariaLabel = ariaParts.join(', ');

  return (
    <div
      className={cn('flex items-center gap-2 sm:gap-3', className)}
      role="group"
      aria-label={ariaLabel}
    >
      <span
        className={cn(
          'shrink-0 truncate text-sm font-semibold sm:text-base',
          'w-28 sm:w-32',
          'text-slate-900 dark:text-slate-100',
        )}
        title={label}
      >
        {label}
      </span>

      <div
        className={cn(
          'relative flex-1 overflow-hidden rounded-full',
          'h-2.5 sm:h-3',
          'bg-slate-200 dark:bg-slate-800',
        )}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={primary}
        aria-valuetext={ariaLabel}
      >
        <div
          className={cn(
            'h-full rounded-full transition-[width] duration-500 ease-out',
            bandClasses.fill,
          )}
          style={{ width: `${primary}%` }}
        />
      </div>

      <span
        className={cn(
          'shrink-0 text-right font-mono text-sm tabular-nums sm:text-base',
          'w-10 sm:w-12',
          bandClasses.text,
        )}
      >
        {primary}
      </span>

      {source && <SourceChip source={source} size="sm" />}
    </div>
  );
}
