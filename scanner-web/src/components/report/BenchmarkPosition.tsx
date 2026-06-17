import { useMemo } from 'react';
import type { ScanResponse } from '@/data/schema';
import { computeOverall } from '@/lib/grade';
import {
  computePosition,
  lookupSectorLabel,
  type BenchmarkFile,
} from '@/lib/benchmark';
import {
  sectorFromLabel,
  sectorDisplayName,
  sectorMatchLabels,
  type Sector,
} from '@/lib/sector';

/**
 * SPEC-PQC-003 ③ 비교군 위치 — 순위·백분위·섹터평균·앞선 동종사.
 *
 * 데이터: lib/benchmark.ts (fetch('/benchmark.json') 결과를 prop 으로 받음).
 * REQ-BENCH-001/002/003 + REQ-HON-005 (통계적 업계표준 아님 명시).
 *
 * 섹터 결정: 입력 도메인이 benchmark 에 있으면 그 라벨 자동 태그, 없으면 사용자 선택 섹터.
 * 섹터 매칭 라벨이 없으면(general) 섹터 평균/앞선 동종사 unmount, 전체 비교군 대비만.
 */

interface BenchmarkPositionProps {
  result: ScanResponse;
  benchmark: BenchmarkFile;
  /** ScanForm 에서 surface 된 사용자 선택 섹터 (자동 태그 우선). */
  selectedSector: Sector;
}

export function BenchmarkPosition({
  result,
  benchmark,
  selectedSector,
}: BenchmarkPositionProps): React.JSX.Element {
  const targetOverall = useMemo(
    () => computeOverall(result.scores),
    [result.scores],
  );

  // 섹터: benchmark 에 있으면 자동 태그, 없으면 사용자 선택.
  const { effectiveSector, autoTagged } = useMemo(() => {
    const label = lookupSectorLabel(benchmark, result.hostname);
    if (label !== null) {
      return { effectiveSector: sectorFromLabel(label), autoTagged: true };
    }
    return { effectiveSector: selectedSector, autoTagged: false };
  }, [benchmark, result.hostname, selectedSector]);

  const position = useMemo(
    () =>
      computePosition(
        benchmark,
        targetOverall,
        sectorMatchLabels(effectiveSector),
      ),
    [benchmark, targetOverall, effectiveSector],
  );

  const showSector = position.sectorAvg !== null;

  return (
    <section
      aria-labelledby="benchmark-title"
      className="rounded-lg border border-edge bg-surface p-6"
    >
      <h3 id="benchmark-title" className="mb-1 font-serif text-lg text-ink">
        비교군 위치
      </h3>
      <p className="mb-5 text-xs text-faint">
        대기업 {position.setSize}개 비교군 · 통계적 업계표준 아님
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Stat
          label="순위"
          value={`${position.rank}`}
          sub={`/ ${position.setSize}위`}
        />
        <Stat
          label="백분위"
          value={`상위 ${Math.max(0, 100 - position.percentile)}%`}
          sub={`하위 ${position.percentile}%`}
        />
        <Stat label="종합 점수" value={`${targetOverall}`} sub="/ 100" />
      </div>

      {showSector && (
        <div className="mt-5 border-t border-edge pt-5">
          <p className="text-sm text-muted">
            <span className="text-ink">
              {sectorDisplayName(effectiveSector)} 평균
            </span>{' '}
            <span className="font-mono text-ink tabular-nums">
              {position.sectorAvg}
            </span>{' '}
            vs 대상{' '}
            <span className="font-mono text-ink tabular-nums">
              {targetOverall}
            </span>
            <span className="ml-2 text-xs text-faint">
              (동일 섹터 {position.sectorSize}개)
            </span>
            {autoTagged && (
              <span className="ml-2 rounded border border-edge px-1.5 py-0.5 text-[10px] text-faint">
                자동 태그
              </span>
            )}
          </p>

          {position.aheadPeers.length > 0 && (
            <p className="mt-3 text-sm text-muted">
              <span className="text-ink">앞선 동종사</span>{' '}
              {position.aheadPeers.join(' · ')}
            </p>
          )}
        </div>
      )}

      {!showSector && (
        <p className="mt-5 border-t border-edge pt-5 text-xs text-faint">
          섹터 미지정 — 전체 비교군 대비 위치만 표시.
        </p>
      )}
    </section>
  );
}

function Stat({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub: string;
}): React.JSX.Element {
  return (
    <div className="flex flex-col rounded-lg border border-edge bg-surface-2 p-4">
      <span className="text-xs text-muted">{label}</span>
      <span className="mt-1 font-serif text-3xl text-ink tabular-nums">
        {value}
      </span>
      <span className="text-xs text-faint">{sub}</span>
    </div>
  );
}
