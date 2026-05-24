import { useMemo } from 'react';
import { ko } from '@/i18n/ko';
import { cn } from '@/lib/utils';
import { scoreBandClasses } from '@/components/shared/scoreBand';
import type { Domain, Sector } from '@/data/schema';

/**
 * SPEC-PQC-001 §3.5:
 * - REQ-DSH-008: 섹터 breakdown (count + axis avg)
 * - REQ-PRF-001: Recharts 의 BarChart 는 ~30-50KB gzip 추가. 본 카드는 도메인 합산
 *   이 ≤ 50개 수준이므로 순수 div + 진행 바로 충분.
 *
 * 표시 구성:
 *   - 좌: 섹터 이름 + 도메인 개수 (e.g. 금융지주 5)
 *   - 우: 4축 평균(TLS/KEM/CertOps/Quantum) 미니바
 */

interface SectorSummaryProps {
  domains: readonly Domain[];
  className?: string;
}

interface AxisAvg {
  tls: number;
  hybridKem: number;
  certOps: number;
  quantumThreat: number;
}

interface SectorRow {
  sector: Sector;
  count: number;
  avg: AxisAvg;
}

function buildRows(domains: readonly Domain[]): SectorRow[] {
  const groups = new Map<Sector, Domain[]>();
  for (const d of domains) {
    const list = groups.get(d.sector) ?? [];
    list.push(d);
    groups.set(d.sector, list);
  }
  const rows: SectorRow[] = [];
  for (const [sector, list] of groups) {
    const sum = list.reduce<AxisAvg>(
      (acc, d) => ({
        tls: acc.tls + d.scores.tls.value,
        hybridKem: acc.hybridKem + d.scores.hybridKem.value,
        certOps: acc.certOps + d.scores.certOps.value,
        quantumThreat: acc.quantumThreat + d.scores.quantumThreat.value,
      }),
      { tls: 0, hybridKem: 0, certOps: 0, quantumThreat: 0 },
    );
    const n = list.length;
    rows.push({
      sector,
      count: n,
      avg: {
        tls: Math.round(sum.tls / n),
        hybridKem: Math.round(sum.hybridKem / n),
        certOps: Math.round(sum.certOps / n),
        quantumThreat: Math.round(sum.quantumThreat / n),
      },
    });
  }
  rows.sort((a, b) => b.count - a.count);
  return rows;
}

function MiniBar({
  value,
  label,
}: {
  value: number;
  label: string;
}): React.JSX.Element {
  const bands = scoreBandClasses(value);
  return (
    <div className="flex flex-col gap-0.5" aria-label={`${label} 평균 ${value}`}>
      <div className="flex items-center justify-between text-[10px] text-[hsl(var(--muted-foreground))]">
        <span>{label}</span>
        <span className={cn('font-mono tabular-nums', bands.text)}>{value}</span>
      </div>
      <div className="h-1 overflow-hidden rounded-full bg-[hsl(var(--muted))]">
        <div className={cn('h-full rounded-full', bands.fill)} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

export function SectorSummary({
  domains,
  className,
}: SectorSummaryProps): React.JSX.Element | null {
  const rows = useMemo(() => buildRows(domains), [domains]);

  if (rows.length === 0) return null;

  return (
    <section
      aria-labelledby="sector-summary-title"
      className={cn(
        'rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4',
        className,
      )}
    >
      <div className="mb-3 flex items-baseline justify-between">
        <h2 id="sector-summary-title" className="text-sm font-semibold">
          섹터별 요약
        </h2>
        <span className="text-xs text-[hsl(var(--muted-foreground))]">
          총 {domains.length}개 도메인 · {rows.length}개 섹터
        </span>
      </div>
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((row) => (
          <li
            key={row.sector}
            className={cn(
              'flex flex-col gap-2 rounded-lg border border-[hsl(var(--border))]',
              'bg-[hsl(var(--background))] px-3 py-2.5',
            )}
          >
            <div className="flex items-baseline justify-between gap-2">
              <span className="truncate text-sm font-medium">{row.sector}</span>
              <span className="font-mono text-xs tabular-nums text-[hsl(var(--muted-foreground))]">
                {row.count}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
              <MiniBar value={row.avg.tls} label={ko.axisShort.tls} />
              <MiniBar value={row.avg.hybridKem} label={ko.axisShort.hybridKem} />
              <MiniBar value={row.avg.certOps} label={ko.axisShort.certOps} />
              <MiniBar value={row.avg.quantumThreat} label={ko.axisShort.quantumThreat} />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
