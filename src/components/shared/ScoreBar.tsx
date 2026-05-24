import { cn } from '@/lib/utils';
import type { DataSource } from '@/data/schema';
import { SourceChip } from './SourceChip';
import { clampScore, scoreBandClasses } from './scoreBand';

/**
 * SPEC-PQC-001:
 * - REQ-DSH-005: 4축 점수(0~100)를 일관된 시각화로 노출한다.
 * - REQ-DSH-020: 모든 점수에는 출처 칩(SourceChip)을 인접 표시한다.
 * - REQ-DSH-021: quantumThreat 축은 보수/실증 dual-scenario 마커를 함께 보여준다.
 * - REQ-A11Y-004: 모든 인터랙티브/정보성 요소는 접근 가능한 이름을 가진다.
 *
 * 레이아웃:
 *   [label 80~96px] [bar flex-1 h-1.5/2] [value 32~40px tabular] [SourceChip sm]
 */

interface ScoreBarProps {
  /** 0..100 (clamp + round 적용). */
  value: number;
  /** 라벨 텍스트 (e.g., ko.axisLabel.tls). */
  label: string;
  /** 있으면 trailing SourceChip 을 추가 렌더. */
  source?: DataSource;
  /** 0..100. dual-scenario(quantumThreat 보수/실증) 보조 마커. */
  secondaryValue?: number;
  /** 보조 마커 tooltip 텍스트 (예: '보수 34'). */
  secondaryLabel?: string;
  /** Screen reader 보조 설명. */
  ariaDescription?: string;
  className?: string;
}

export function ScoreBar({
  value,
  label,
  source,
  secondaryValue,
  secondaryLabel,
  ariaDescription,
  className,
}: ScoreBarProps): React.JSX.Element {
  const primary = clampScore(value);
  const bandClasses = scoreBandClasses(primary);
  const hasSecondary = typeof secondaryValue === 'number';
  const secondary = hasSecondary ? clampScore(secondaryValue) : null;

  // aria-label 은 label + 점수 + dual-scenario 정보 결합
  const ariaParts: string[] = [`${label} ${primary}점`];
  if (secondary !== null) {
    const tag = secondaryLabel?.trim() || `보조 ${secondary}`;
    ariaParts.push(tag);
  }
  if (ariaDescription) ariaParts.push(ariaDescription);
  const ariaLabel = ariaParts.join(', ');

  return (
    <div
      className={cn('flex items-center gap-2 sm:gap-3', className)}
      role="group"
      aria-label={ariaLabel}
    >
      {/* 라벨 — 80~96px 고정폭 */}
      <span
        className={cn(
          'shrink-0 truncate text-xs font-medium sm:text-sm',
          'w-20 sm:w-24',
          'text-[hsl(var(--foreground))]',
        )}
        title={label}
      >
        {label}
      </span>

      {/* 진행 바 */}
      <div
        className={cn(
          'relative flex-1 overflow-hidden rounded-full',
          'h-1.5 sm:h-2',
          'bg-[hsl(var(--muted))]',
        )}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={primary}
        aria-valuetext={ariaLabel}
      >
        {/* primary fill */}
        <div
          className={cn(
            'h-full rounded-full transition-[width] duration-300 ease-out',
            bandClasses.fill,
          )}
          style={{ width: `${primary}%` }}
        />

        {/* secondary 마커 — dual scenario (REQ-DSH-021) */}
        {secondary !== null && (
          <span
            className={cn(
              'absolute top-1/2 z-10 -translate-x-1/2 -translate-y-1/2',
              'block h-2.5 w-2.5 rounded-full border border-[hsl(var(--background))]',
              // 보조는 fill 톤보다 살짝 진하게: slate-700 in light, slate-200 in dark
              'bg-slate-700 dark:bg-slate-200',
              'shadow-[0_0_0_1px_hsl(var(--foreground)/0.15)]',
              'transition-[left] duration-300 ease-out',
            )}
            style={{ left: `${secondary}%` }}
            // 단순 title 기반 tooltip — shadcn Tooltip 도입은 추후 단계.
            title={secondaryLabel ?? `보조 ${secondary}`}
            aria-hidden="true"
          />
        )}
      </div>

      {/* 수치 — 고정폭 tabular */}
      <span
        className={cn(
          'shrink-0 text-right font-mono text-xs tabular-nums sm:text-sm',
          'w-8 sm:w-10',
          bandClasses.text,
        )}
      >
        {primary}
      </span>

      {/* 출처 칩 */}
      {source && <SourceChip source={source} size="sm" />}
    </div>
  );
}
