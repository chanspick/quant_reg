import { ArrowDown, ArrowUp } from 'lucide-react';
import { ko } from '@/i18n/ko';
import { cn } from '@/lib/utils';
import type { SortDir, SortKey } from '@/lib/dashboardState';

/**
 * SPEC-PQC-001 §3.5:
 * - REQ-DSH-004: 6개 정렬 축 + asc/desc 방향
 * - REQ-DSH-011: 안정 정렬 (dashboardState.applySort 에서 보장)
 *
 * shadcn Select 를 도입하지 않는 이유:
 *   기본 <select> 만으로 6개 옵션을 충분히 렌더할 수 있고, Radix Select 는
 *   bundle ~12KB 추가 → REQ-PRF-001 (≤200KB gzip) 여유 확보 우선.
 */

interface SortControlProps {
  sortKey: SortKey;
  sortDir: SortDir;
  onChange: (key: SortKey, dir: SortDir) => void;
  className?: string;
}

interface SortOption {
  key: SortKey;
  label: string;
}

const SORT_OPTIONS: readonly SortOption[] = [
  { key: 'quantumThreat', label: `${ko.axisLabel.quantumThreat} 점수` },
  { key: 'tls', label: `${ko.axisLabel.tls} 점수` },
  { key: 'hybridKem', label: `${ko.axisLabel.hybridKem} 점수` },
  { key: 'certOps', label: `${ko.axisLabel.certOps} 점수` },
  { key: 'name', label: '도메인 이름 (가나다)' },
  { key: 'sector', label: '섹터' },
];

export function SortControl({
  sortKey,
  sortDir,
  onChange,
  className,
}: SortControlProps): React.JSX.Element {
  const handleKey = (e: React.ChangeEvent<HTMLSelectElement>): void => {
    onChange(e.target.value as SortKey, sortDir);
  };
  const handleDir = (): void => {
    onChange(sortKey, sortDir === 'asc' ? 'desc' : 'asc');
  };

  const dirLabel = sortDir === 'asc' ? '오름차순' : '내림차순';
  const nextDirLabel = sortDir === 'asc' ? '내림차순으로 정렬' : '오름차순으로 정렬';

  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      <label htmlFor="dashboard-sort-key" className="sr-only">
        정렬 기준
      </label>
      <select
        id="dashboard-sort-key"
        value={sortKey}
        onChange={handleKey}
        className={cn(
          'rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--background))]',
          'px-2.5 py-1.5 text-xs sm:text-sm',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]',
        )}
      >
        {SORT_OPTIONS.map((opt) => (
          <option key={opt.key} value={opt.key}>
            {opt.label}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={handleDir}
        aria-label={`현재 ${dirLabel}. 클릭하여 ${nextDirLabel}`}
        title={dirLabel}
        className={cn(
          'grid size-8 place-items-center rounded-md border border-[hsl(var(--border))]',
          'bg-[hsl(var(--background))] text-[hsl(var(--foreground))]',
          'transition-colors hover:bg-[hsl(var(--accent))]',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]',
        )}
      >
        {sortDir === 'asc' ? (
          <ArrowUp aria-hidden="true" className="size-3.5" />
        ) : (
          <ArrowDown aria-hidden="true" className="size-3.5" />
        )}
      </button>
    </div>
  );
}
