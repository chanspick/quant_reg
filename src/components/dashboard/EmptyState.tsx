import { cn } from '@/lib/utils';

/**
 * SPEC-PQC-001 §3.5:
 * - REQ-DSH-014: 필터 적용 결과가 0건일 때 reset CTA 가 포함된 empty state
 * - REQ-DAT-009 (간접): 데이터셋 자체가 0건일 때 친절한 안내 (PQC-001 CLI 가이드 링크)
 */

export type EmptyStateVariant = 'no-data' | 'filtered';

interface EmptyStateProps {
  variant: EmptyStateVariant;
  onResetFilters?: () => void;
  className?: string;
}

export function EmptyState({
  variant,
  onResetFilters,
  className,
}: EmptyStateProps): React.JSX.Element {
  if (variant === 'no-data') {
    return (
      <div
        role="status"
        aria-live="polite"
        className={cn(
          'flex flex-col items-start gap-3 rounded-lg border border-dashed',
          'border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6',
          'text-sm text-[hsl(var(--card-foreground))]',
          className,
        )}
      >
        <p className="font-medium">아직 도메인이 추가되지 않았습니다.</p>
        <p className="text-xs text-[hsl(var(--muted-foreground))]">
          CLI 도우미로 합성 데이터를 추가하면 자동으로 대시보드에 반영됩니다.
        </p>
        <pre
          className={cn(
            'w-full overflow-x-auto rounded-md border border-[hsl(var(--border))]',
            'bg-[hsl(var(--muted))] px-3 py-2 font-mono text-xs',
          )}
        >
          <code>pnpm add-domain</code>
        </pre>
        <a
          href="/README.md#도메인-데이터-추가"
          className="text-xs underline underline-offset-2 hover:text-[hsl(var(--primary))]"
        >
          README — 도메인 데이터 추가 가이드
        </a>
      </div>
    );
  }

  // filtered
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'flex flex-col items-start gap-3 rounded-lg border border-dashed',
        'border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6',
        'text-sm text-[hsl(var(--card-foreground))]',
        className,
      )}
    >
      <p className="font-medium">조건에 맞는 도메인이 없습니다.</p>
      <p className="text-xs text-[hsl(var(--muted-foreground))]">
        검색어 또는 섹터 필터를 완화하거나 모두 초기화해 보세요.
      </p>
      {onResetFilters && (
        <button
          type="button"
          onClick={onResetFilters}
          className={cn(
            'rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--background))]',
            'px-3 py-1.5 text-xs font-medium transition-colors',
            'hover:bg-[hsl(var(--accent))]',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]',
          )}
        >
          필터 초기화
        </button>
      )}
    </div>
  );
}
