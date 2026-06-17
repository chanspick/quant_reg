/**
 * SPEC-PQC-003 §3.2 / REQ-CP (④ 핵심 발견) — fired 룰 필터.
 *
 * `meta.scoring.tls.rules` + `meta.scoring.certOps.rules` 중 fired=true 만 추출.
 * hybridKem / quantumThreat 는 rules 가 없으므로(value+basis / qubits+scenarios) 접근하지 않는다.
 *
 * 순수 함수 — 응답 스키마 무변경, 클라이언트 결정적 파생 (INTEG-2/7).
 */

import type { ScanResponse } from '@/data/schema';

export type FindingAxis = 'tls' | 'certOps';

export interface Finding {
  id: string;
  label: string;
  deduction: number;
  source: string;
  axis: FindingAxis;
}

/**
 * 응답 → fired 룰 배열. 감점(deduction) 내림차순 정렬 (영향 큰 순).
 * 빈 배열이면 호출부에서 ④ 섹션 unmount (INTEG-3).
 */
export function collectFindings(result: ScanResponse): Finding[] {
  const tls = result.meta.scoring.tls.rules
    .filter((r) => r.fired)
    .map((r): Finding => ({
      id: r.id,
      label: r.label,
      deduction: r.deduction,
      source: r.source,
      axis: 'tls',
    }));

  const certOps = result.meta.scoring.certOps.rules
    .filter((r) => r.fired)
    .map((r): Finding => ({
      id: r.id,
      label: r.label,
      deduction: r.deduction,
      source: r.source,
      axis: 'certOps',
    }));

  return [...tls, ...certOps].sort((a, b) => b.deduction - a.deduction);
}
