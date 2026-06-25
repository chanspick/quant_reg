import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import type { ScanResponse } from '@/data/scannerSchema';
import { computeOverall } from '@/lib/grade';
import {
  computeRegulation,
  type FrameworkDeadline,
  type RegulationStatus,
} from '@/lib/regulation';
import { sectorDisplayName, type Sector } from '@/lib/sector';

/**
 * SPEC-PQC-003 ⑥ 규제 컴플라이언스 매핑 — framework 데드라인 + D-day + 상태 + 갭.
 *
 * 데이터: lib/regulation.ts (정적 sector→deadline 테이블 + min()).
 * 컴포넌트가 new Date() 를 생성해 currentYear/now 를 순수 lib 에 전달 (lib 는 Date 미호출).
 * REQ-REG-001/002/003 + REQ-HON-006 (추정 라벨).
 *
 * 항상 mount (정적 테이블이 항상 존재). sector='general' 시 "글로벌 최단 데드라인 기준" 안내.
 */

interface RegulationMapProps {
  result: ScanResponse;
  /** ScanForm 에서 surface 된 사용자 선택/태그 섹터. */
  sector: Sector;
}

const STATUS_META: Record<
  RegulationStatus,
  { label: string; atRisk: boolean }
> = {
  compliant: { label: '준수 가능', atRisk: false },
  'at-risk': { label: '위험', atRisk: true },
  fail: { label: '미달', atRisk: true },
};

export function RegulationMap({
  result,
  sector,
}: RegulationMapProps): React.JSX.Element {
  const overall = useMemo(() => computeOverall(result.scores), [result.scores]);

  const regulation = useMemo(() => {
    const now = new Date();
    return computeRegulation(sector, overall, now.getFullYear(), now);
  }, [sector, overall]);

  return (
    <section
      aria-labelledby="regulation-title"
      className="rounded-lg border border-edge bg-surface p-6"
    >
      <div className="mb-1 flex flex-wrap items-center gap-2">
        <h3 id="regulation-title" className="font-serif text-lg text-ink">
          규제 컴플라이언스 매핑
        </h3>
        <span className="rounded border border-edge px-1.5 py-0.5 text-[10px] text-faint">
          추정
        </span>
      </div>
      <p className="mb-5 text-xs text-faint">
        {regulation.isGeneral ? (
          <>섹터 미지정 — 글로벌 최단 데드라인 기준.</>
        ) : (
          <>
            <span className="text-muted">{sectorDisplayName(sector)}</span> 섹터 기준
          </>
        )}
      </p>

      {/* effectiveDeadline 강조 — 가장 이른 데드라인을 크게 */}
      <div className="mb-5 rounded-lg border border-edge bg-surface-2 p-4">
        <p className="text-[11px] font-medium text-faint">
          가장 이른 데드라인 (effectiveDeadline)
        </p>
        <p className="mt-1 flex flex-wrap items-baseline gap-2 font-serif text-ink">
          <span className="text-lg">
            {regulation.effectiveDeadline.displayName}
          </span>
          <span className="font-mono text-base">
            {regulation.effectiveDeadline.year}
          </span>
          <DDay daysLeft={regulation.effectiveDeadline.daysLeft} large />
        </p>
        <p className="mt-2 text-[11px] leading-relaxed text-faint">
          {regulation.migrationGap}
        </p>
      </div>

      {/* framework 목록 */}
      <ul className="flex flex-col gap-2">
        {regulation.frameworks.map((fw) => (
          <FrameworkRow
            key={fw.framework}
            framework={fw}
            isEffective={fw.framework === regulation.effectiveDeadline.framework}
          />
        ))}
      </ul>

      <p className="mt-5 text-[11px] leading-relaxed text-faint">
        출처: 한국 PQC 마스터플랜(2023.7) · NIST IR 8547 · CNSA 2.0(NSA) · EU PQC
        로드맵(2025.6) — research.md ⑥. 데드라인·상태 해석은 추정.
      </p>
    </section>
  );
}

function FrameworkRow({
  framework,
  isEffective,
}: {
  framework: FrameworkDeadline;
  isEffective: boolean;
}): React.JSX.Element {
  const status = STATUS_META[framework.status];
  return (
    <li
      className={cn(
        'flex flex-wrap items-center justify-between gap-3 rounded-lg border border-edge p-3',
        isEffective ? 'bg-surface-2' : 'bg-surface',
      )}
    >
      <div className="min-w-0">
        <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-ink">
          {framework.displayName}
          {isEffective && (
            <span className="rounded border border-edge px-1.5 py-0.5 text-[10px] font-semibold text-muted">
              최단
            </span>
          )}
        </p>
        <p className="mt-0.5 font-mono text-xs text-faint">
          데드라인 {framework.year}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <DDay daysLeft={framework.daysLeft} />
        <span
          className={cn(
            'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold',
            status.atRisk
              ? 'border-risk text-risk'
              : 'border-edge text-muted',
          )}
        >
          {status.label}
        </span>
      </div>
    </li>
  );
}

function DDay({
  daysLeft,
  large = false,
}: {
  daysLeft: number;
  large?: boolean;
}): React.JSX.Element {
  const overdue = daysLeft < 0;
  return (
    <span
      className={cn(
        'font-mono font-semibold tabular-nums',
        large ? 'text-base' : 'text-xs',
        overdue ? 'text-risk' : 'text-muted',
      )}
    >
      {overdue ? `D+${Math.abs(daysLeft)}` : `D-${daysLeft}`}
    </span>
  );
}
