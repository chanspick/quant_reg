import { useEffect, useState } from 'react';
import { loadBenchmark, type BenchmarkFile } from './benchmark';

/**
 * SPEC-PQC-003 ③ — benchmark.json 비동기 로드 훅.
 *
 * fetch('/benchmark.json') (절대경로, INTEG-4) 결과를 상태로 보관.
 * 실패/빈 데이터면 null → ③ 섹션 unmount (INTEG-3).
 * 요청 경로(스캔)와 무관한 정적 자산 로드 — 요청 경로 성능 보존 (INTEG-4).
 */
export function useBenchmark(): BenchmarkFile | null {
  const [benchmark, setBenchmark] = useState<BenchmarkFile | null>(null);

  useEffect(() => {
    let active = true;
    void loadBenchmark().then((data) => {
      if (active) setBenchmark(data);
    });
    return () => {
      active = false;
    };
  }, []);

  return benchmark;
}
