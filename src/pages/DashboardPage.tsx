import { useMemo, useState } from 'react';
import { AlertCircle, Filter, RotateCw } from 'lucide-react';
import { useDomains } from '@/data/useDomains';
import { ko } from '@/i18n/ko';
import { cn } from '@/lib/utils';
import { applyFilters, applySort, useDashboardState } from '@/lib/dashboardState';
import { DashboardSkeleton } from '@/components/dashboard/DashboardSkeleton';
import { DomainCard } from '@/components/dashboard/DomainCard';
import { EmptyState } from '@/components/dashboard/EmptyState';
import { SearchInput } from '@/components/dashboard/SearchInput';
import { SectorFilter } from '@/components/dashboard/SectorFilter';
import { SectorSummary } from '@/components/dashboard/SectorSummary';
import { SortControl } from '@/components/dashboard/SortControl';

/**
 * SPEC-PQC-001 §3.5 (Dashboard):
 * - REQ-DSH-001~021: 4축 시각화 + 인라인 expand + 다중 필터/정렬
 * - REQ-DSH-015 / REQ-APP-012: 스켈레톤 + 500ms 내 가시화
 * - REQ-DAT-007: 에러 + 재시도
 * - REQ-A11Y-005/008: semantic landmarks, aria-live 카운트
 * - REQ-PRF-001: 200KB gzip 예산 — Recharts 미사용, shadcn Select 미사용
 */

export function DashboardPage(): React.JSX.Element {
  const { domains, isLoading, error, retry, data } = useDomains();
  const { search, sectors, sortKey, sortDir, setSearch, toggleSector, setSort, reset } =
    useDashboardState();

  const [expandedDomain, setExpandedDomain] = useState<string | null>(null);

  // Filter + sort 는 메모이즈하여 키스트로크당 비용을 낮춤 (REQ-DSH-009/010/011)
  const filtered = useMemo(
    () => applyFilters(domains, { search, sectors }),
    [domains, search, sectors],
  );
  const sorted = useMemo(
    () => applySort(filtered, sortKey, sortDir),
    [filtered, sortKey, sortDir],
  );

  const totalDomains = domains.length;
  const visibleCount = sorted.length;
  const hasActiveFilter = search.length > 0 || sectors.length > 0;

  const handleToggle = (name: string): void => {
    setExpandedDomain((prev) => (prev === name ? null : name));
  };

  return (
    <section aria-labelledby="dashboard-title" className="flex flex-col gap-5">
      {/* Header */}
      <header className="flex flex-col gap-1.5">
        <h1 id="dashboard-title" className="text-2xl font-semibold sm:text-3xl">
          {ko.pages.dashboard.title}
        </h1>
        <p className="text-sm text-[hsl(var(--muted-foreground))]">
          {ko.pages.dashboard.subtitle}
        </p>
        {data && (
          <p className="font-mono text-[10px] text-[hsl(var(--muted-foreground))]">
            {ko.meta.lastUpdatedPrefix} {data.lastUpdated} · v{data.version}
            {totalDomains > 0 && ` · ${totalDomains}개 도메인`}
            {data.invalidCount > 0 &&
              ` · 검증 실패 ${data.invalidCount}건 제외`}
          </p>
        )}
      </header>

      {/* Loading state */}
      {isLoading && <DashboardSkeleton />}

      {/* Error state (REQ-DAT-007) */}
      {error && (
        <div
          role="alert"
          className={cn(
            'flex flex-col items-start gap-3 rounded-lg border',
            'border-[hsl(var(--destructive))]/40 bg-[hsl(var(--destructive))]/5 p-4 text-sm',
          )}
        >
          <div className="flex items-center gap-2 font-medium text-[hsl(var(--destructive))]">
            <AlertCircle aria-hidden="true" className="size-4" />
            <span>{ko.data.error}</span>
          </div>
          <p className="font-mono text-xs text-[hsl(var(--muted-foreground))]">
            {error}
          </p>
          <button
            type="button"
            onClick={retry}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md border border-[hsl(var(--border))]',
              'bg-[hsl(var(--background))] px-3 py-1.5 text-xs font-medium',
              'hover:bg-[hsl(var(--accent))] focus-visible:outline-none',
              'focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]',
            )}
          >
            <RotateCw aria-hidden="true" className="size-3.5" />
            {ko.data.retry}
          </button>
        </div>
      )}

      {/* Success states */}
      {!isLoading && !error && data && (
        <>
          {totalDomains === 0 ? (
            <EmptyState variant="no-data" />
          ) : (
            <>
              <SectorSummary domains={domains} />

              {/* Controls bar */}
              <div
                className={cn(
                  'flex flex-col gap-3 rounded-lg border border-[hsl(var(--border))]',
                  'bg-[hsl(var(--card))] p-3',
                )}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <SearchInput value={search} onChange={setSearch} />
                  <SortControl
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onChange={setSort}
                  />
                </div>
                <div className="flex items-start gap-2">
                  <Filter
                    aria-hidden="true"
                    className="mt-1 size-3.5 shrink-0 text-[hsl(var(--muted-foreground))]"
                  />
                  <SectorFilter
                    selected={sectors}
                    onToggle={toggleSector}
                    onClear={() => reset()}
                  />
                </div>
              </div>

              {/* Live count announcement (REQ-A11Y-008) */}
              <p
                role="status"
                aria-live="polite"
                className="text-xs text-[hsl(var(--muted-foreground))]"
              >
                {visibleCount}개 도메인이 표시됩니다
                {hasActiveFilter && ` (전체 ${totalDomains}개 중)`}
                <span className="sr-only">
                  . 정렬:{' '}
                  {sortKey === 'name'
                    ? '도메인 이름'
                    : sortKey === 'sector'
                      ? '섹터'
                      : `${ko.axisLabel[sortKey]} 점수`}{' '}
                  {sortDir === 'asc' ? '오름차순' : '내림차순'}
                </span>
              </p>

              {/* Result list */}
              {visibleCount === 0 ? (
                <EmptyState variant="filtered" onResetFilters={reset} />
              ) : (
                <div
                  role="list"
                  aria-label="도메인 목록"
                  className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
                >
                  {sorted.map((domain) => (
                    <div role="listitem" key={domain.name}>
                      <DomainCard
                        domain={domain}
                        isExpanded={expandedDomain === domain.name}
                        onToggle={() => handleToggle(domain.name)}
                      />
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </>
      )}
    </section>
  );
}
