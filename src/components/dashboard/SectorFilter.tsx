import { SectorSchema, type Sector } from '@/data/schema';
import { cn } from '@/lib/utils';

/**
 * SPEC-PQC-001 §3.5:
 * - REQ-DSH-003: 다중 sector 필터 (intersection)
 * - REQ-DSH-010: 토글 후 100ms 내 재계산 (memoized 필터로 보장)
 * - REQ-A11Y-004 / REQ-A11Y-009: aria-pressed + 색 외 추가 시각 신호(border/font weight)
 */

interface SectorFilterProps {
  selected: Sector[];
  onToggle: (sector: Sector) => void;
  onClear: () => void;
  className?: string;
}

const ALL_SECTORS: readonly Sector[] = SectorSchema.options;

export function SectorFilter({
  selected,
  onToggle,
  onClear,
  className,
}: SectorFilterProps): React.JSX.Element {
  const selectedSet = new Set(selected);
  const hasSelection = selected.length > 0;

  return (
    <div
      role="group"
      aria-label="섹터 필터"
      className={cn('flex flex-wrap items-center gap-1.5', className)}
    >
      <button
        type="button"
        onClick={onClear}
        aria-pressed={!hasSelection}
        className={cn(
          'rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]',
          !hasSelection
            ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]'
            : 'border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--accent))]',
        )}
      >
        모두
      </button>
      {ALL_SECTORS.map((sector) => {
        const active = selectedSet.has(sector);
        return (
          <button
            key={sector}
            type="button"
            onClick={() => onToggle(sector)}
            aria-pressed={active}
            className={cn(
              'rounded-full border px-2.5 py-1 text-xs transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]',
              active
                ? // 색 외 추가 시각 신호: bold + 진한 보더 (REQ-A11Y-009)
                  'border-[hsl(var(--primary))] bg-[hsl(var(--primary))]/15 font-semibold text-[hsl(var(--foreground))]'
                : 'border-[hsl(var(--border))] font-normal text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--accent))]',
            )}
          >
            {sector}
          </button>
        );
      })}
    </div>
  );
}
