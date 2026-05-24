import { cn } from '@/lib/utils';

/**
 * SPEC-PQC-001 §3.5:
 * - REQ-DSH-015: 첫 viewport 분량의 카드 스켈레톤 placeholder
 * - REQ-APP-012: 500ms 내 placeholder 노출 (CSS animate-pulse 만으로 가벼움)
 *
 * 의도적으로 shadcn Skeleton 미사용:
 *   shadcn add 명령은 새 의존성을 추가하지 않지만, 단순 div + animate-pulse
 *   로 충분하며 컴포넌트 트리 깊이도 얕아진다.
 */

interface DashboardSkeletonProps {
  /** 렌더할 카드 개수. 기본 6. */
  count?: number;
  className?: string;
}

function SkeletonCard(): React.JSX.Element {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))]',
        'flex flex-col gap-3 p-5',
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="h-4 w-32 animate-pulse rounded bg-[hsl(var(--muted))]" />
        <div className="h-3 w-16 animate-pulse rounded bg-[hsl(var(--muted))]" />
      </div>
      <div className="h-3 w-48 animate-pulse rounded bg-[hsl(var(--muted))]" />
      <div className="mt-2 flex flex-col gap-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="h-3 w-20 animate-pulse rounded bg-[hsl(var(--muted))]" />
            <div className="h-2 flex-1 animate-pulse rounded-full bg-[hsl(var(--muted))]" />
            <div className="h-3 w-8 animate-pulse rounded bg-[hsl(var(--muted))]" />
          </div>
        ))}
      </div>
      <div className="mt-1 flex flex-wrap gap-1.5">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-5 w-16 animate-pulse rounded-full bg-[hsl(var(--muted))]"
          />
        ))}
      </div>
    </div>
  );
}

export function DashboardSkeleton({
  count = 6,
  className,
}: DashboardSkeletonProps): React.JSX.Element {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="데이터를 불러오는 중"
      className={cn(
        'grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3',
        className,
      )}
    >
      {Array.from({ length: count }, (_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}
