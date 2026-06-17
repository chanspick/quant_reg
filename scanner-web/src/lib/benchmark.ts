/**
 * SPEC-PQC-003 §3.4 / REQ-BENCH-001/002/003 (③ 비교군 위치) — 클라이언트 파생.
 *
 *  - loadBenchmark(): fetch('/benchmark.json') (절대경로, INTEG-4) + zod 검증
 *  - computePosition(): target overall + sector → 순위/백분위/섹터평균/앞선 동종사
 *
 * 비교군 데이터는 ROOT domains.json 에서 추출한 정적 JSON (gen-benchmark.ts).
 * 새 API/네트워크 의존 없음 (INTEG-2).
 */

import { z } from 'zod';

// --- benchmark.json 스키마 (응답 스키마와 분리된 내부 타입) ---------------

const BenchmarkAxesSchema = z.object({
  tls: z.number(),
  hybridKem: z.number(),
  certOps: z.number(),
  quantumThreat: z.number(),
});

const BenchmarkDomainSchema = z.object({
  hostname: z.string(),
  name: z.string(),
  sector: z.string(), // domains.json 원 라벨 (예: "반도체/전자")
  axes: BenchmarkAxesSchema,
  overall: z.number(),
});
export type BenchmarkDomain = z.infer<typeof BenchmarkDomainSchema>;

const BenchmarkFileSchema = z.object({
  version: z.string(),
  generatedFrom: z.string(),
  domains: z.array(BenchmarkDomainSchema).default([]),
});
export type BenchmarkFile = z.infer<typeof BenchmarkFileSchema>;

// --- 비교군 위치 결과 -----------------------------------------------------

export interface BenchmarkPosition {
  /** 비교군 전체 도메인 수. */
  setSize: number;
  /** 내림차순 순위 (1 = 최상위). */
  rank: number;
  /** 하위 백분위 (target 보다 낮은 비율, 0~100 정수). */
  percentile: number;
  /** 동일 섹터 평균 overall (섹터 미결정/매칭 없음 → null). */
  sectorAvg: number | null;
  /** 동일 섹터에서 target 보다 앞선 도메인 이름 (상위 3). */
  aheadPeers: string[];
  /** sectorAvg/aheadPeers 계산에 쓰인 섹터 부분집합 크기. */
  sectorSize: number;
}

/**
 * benchmark.json 로드 (same-origin 절대경로). 실패 시 null 반환 → ③ unmount.
 * REQ-BENCH-001 / INTEG-4.
 */
export async function loadBenchmark(): Promise<BenchmarkFile | null> {
  try {
    const res = await fetch('/benchmark.json');
    if (!res.ok) return null;
    const json: unknown = await res.json();
    const parsed = BenchmarkFileSchema.safeParse(json);
    if (!parsed.success) return null;
    if (parsed.data.domains.length === 0) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

/**
 * target overall + 선택 섹터 → 비교군 위치 (순수 함수, fetch 와 분리).
 *
 * @param targetOverall  대상 도메인의 종합 점수
 * @param matchSectorLabels  섹터 평균/앞선동종사 계산에 포함할 benchmark sector 라벨 집합.
 *                           null 이면 섹터 항목 unmount (전체 비교군 대비만).
 */
export function computePosition(
  benchmark: BenchmarkFile,
  targetOverall: number,
  matchSectorLabels: ReadonlySet<string> | null,
): BenchmarkPosition {
  const domains = benchmark.domains;
  const setSize = domains.length;

  // 순위: target 보다 높은(>) 도메인 수 + 1.
  const higher = domains.filter((d) => d.overall > targetOverall).length;
  const rank = higher + 1;

  // 백분위: target 보다 낮은(<) 도메인 비율.
  const lower = domains.filter((d) => d.overall < targetOverall).length;
  const percentile =
    setSize > 0 ? Math.round((lower / setSize) * 100) : 0;

  // 섹터 부분집합.
  let sectorAvg: number | null = null;
  let aheadPeers: string[] = [];
  let sectorSize = 0;

  if (matchSectorLabels !== null && matchSectorLabels.size > 0) {
    const subset = domains.filter((d) => matchSectorLabels.has(d.sector));
    sectorSize = subset.length;
    if (subset.length > 0) {
      const sum = subset.reduce((acc, d) => acc + d.overall, 0);
      sectorAvg = Math.round(sum / subset.length);
      aheadPeers = subset
        .filter((d) => d.overall > targetOverall)
        .sort((a, b) => b.overall - a.overall)
        .slice(0, 3)
        .map((d) => d.name);
    }
  }

  return { setSize, rank, percentile, sectorAvg, aheadPeers, sectorSize };
}

/**
 * 편의: 대상 hostname 이 benchmark 에 있으면 그 sector 라벨을 반환 (섹터 자동 태그).
 * 없으면 null. (§3.1 — benchmark 에 있으면 태그, 없으면 사용자 선택.)
 */
export function lookupSectorLabel(
  benchmark: BenchmarkFile,
  hostname: string,
): string | null {
  const hit = benchmark.domains.find(
    (d) => d.hostname.toLowerCase() === hostname.toLowerCase(),
  );
  return hit ? hit.sector : null;
}
