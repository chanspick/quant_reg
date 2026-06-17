/**
 * SPEC-PQC-003 §3.3 / REQ-CP-001/002 — 등급(A~F) 클라이언트 파생.
 *
 * scoreBand.ts (밴드 색) 는 무수정. 이 모듈은 별개의 "종합 등급" 로직이다.
 *
 *   overall = round(mean(tls, hybridKem, certOps, quantumThreat))
 *   grade   = A(≥85) / B(70-84) / C(55-69) / D(40-54) / F(<40)
 *   cap     = meta.scoring.tls.rules 중 TLS 1.0/1.1 룰이 fired → grade 최대 'B'
 *
 * 전부 순수 함수 — 응답 스키마(schema.ts)와 분리된 view-model 변환 (INTEG-7).
 */

import type { ScanResponse } from '@/data/schema';

export type Grade = 'A' | 'B' | 'C' | 'D' | 'F';

/**
 * scoring.py `_TLS_RULES` 의 TLS 1.0/1.1 rule id (정확히 일치).
 * meta.scoring.tls.rules[].id 가 이 집합에 속하고 fired=true 이면 등급 캡 적용.
 */
const TLS_LEGACY_RULE_IDS = new Set<string>(['tls_1_0_active', 'tls_1_1_active']);

const GRADE_ORDER: readonly Grade[] = ['F', 'D', 'C', 'B', 'A'] as const;

export interface GradeResult {
  grade: Grade;
  overall: number;
  verdict: string;
  /** TLS 1.0/1.1 fired 로 등급이 'B' 로 강등되었는지 여부 (UI 설명용). */
  capped: boolean;
}

/** 4축 균등 가중 평균을 반올림 (gen-benchmark.ts 와 동일 공식). */
export function computeOverall(scores: ScanResponse['scores']): number {
  const mean =
    (scores.tls.value +
      scores.hybridKem.value +
      scores.certOps.value +
      scores.quantumThreat.value) /
    4;
  return Math.round(mean);
}

/** overall 점수 → A~F (캡 적용 전 원시 등급). */
export function gradeFromScore(overall: number): Grade {
  if (overall >= 85) return 'A';
  if (overall >= 70) return 'B';
  if (overall >= 55) return 'C';
  if (overall >= 40) return 'D';
  return 'F';
}

/** 등급별 한 줄 평 (verdict). */
export function verdictForGrade(grade: Grade): string {
  switch (grade) {
    case 'A':
      return '양자 전환 준비가 가장 앞선 수준 — TLS 위생·인증서 운영이 견고합니다.';
    case 'B':
      return '기본 위생은 양호하나 PQC 하이브리드 전환이 아직 시작되지 않았습니다.';
    case 'C':
      return '개선이 시급한 항목이 있습니다 — TLS·인증서 운영부터 보강이 필요합니다.';
    case 'D':
      return '구식 프로토콜·취약점이 다수 관측되어 노출 위험이 높습니다.';
    case 'F':
      return '심각한 보안 위생 결함 — 즉시 조치가 필요합니다.';
  }
}

/** meta.scoring.tls.rules 에서 TLS 1.0/1.1 룰이 fired 인지 검사. */
export function hasLegacyTlsFired(result: ScanResponse): boolean {
  const rules = result.meta.scoring.tls.rules;
  return rules.some((r) => r.fired && TLS_LEGACY_RULE_IDS.has(r.id));
}

/** B 보다 높은 등급을 B 로 강등 (캡). 같거나 낮으면 그대로. */
function capToB(grade: Grade): Grade {
  // GRADE_ORDER index: F=0,D=1,C=2,B=3,A=4
  const bIndex = GRADE_ORDER.indexOf('B');
  const gIndex = GRADE_ORDER.indexOf(grade);
  return gIndex > bIndex ? 'B' : grade;
}

/**
 * 응답 → 종합 등급 결과. REQ-CP-001 (산출) + REQ-CP-002 (캡).
 */
export function computeGrade(result: ScanResponse): GradeResult {
  const overall = computeOverall(result.scores);
  const rawGrade = gradeFromScore(overall);
  const legacyFired = hasLegacyTlsFired(result);
  const grade = legacyFired ? capToB(rawGrade) : rawGrade;
  const capped = legacyFired && grade !== rawGrade;
  return {
    grade,
    overall,
    verdict: verdictForGrade(grade),
    capped,
  };
}
