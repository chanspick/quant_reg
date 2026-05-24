/**
 * SPEC-PQC-001 §3.14 (양자 위협 정량화).
 *
 * 본 모듈은 인증서 키 알고리즘·길이로부터:
 *   1) Roetteler 2017 공식으로 필요 logical qubit / Toffoli gate 추정
 *   2) 보수(Shor 1994) / 실증(Willsch 2023) 두 시나리오 점수 산출
 * 모든 수치는 결정적(deterministic) 이며, source 는 항상 'automated'.
 */

import type { DataSource } from './schema';
import type { CitationId } from './references';

export type KeyAlgorithm =
  | 'RSA'
  | 'ECC'
  | 'ML-KEM'
  | 'Hybrid-ECC-ML-KEM'
  | 'Hybrid-RSA-ML-KEM'
  | 'Unknown';

export type Scenario = 'conservative' | 'empirical';

export interface QuantumEstimate {
  logicalQubits: number;
  toffoliGates: number;
  score: number; // 0-100, 높을수록 양자 저항
  successRate: number;
  basis: string;
  note?: string;
}

export interface QuantumThreatDetail {
  keyAlgorithm: string; // 표시용 라벨 (예: "RSA-2048")
  keyBits: number;
  estimates: {
    conservative: QuantumEstimate;
    empirical: QuantumEstimate;
  };
  citations: CitationId[];
  source: DataSource;
}

/* ============================================================
 * Roetteler 2017 — logical qubit / Toffoli gate 추정 공식
 * ============================================================ */

/** Willow-class 2026 추정. 점수 gap 정규화 기준값 (illustrative). */
const QUANTUM_HARDWARE_2026_LOGICAL = 100;

/** Roetteler 2017 Table 1: RSA-n 인수분해 ≈ 2n + 3 logical qubit. */
export function rsaLogicalQubits(bits: number): number {
  return 2 * bits + 3;
}

/** Roetteler 2017 Table 1: ECC-n discrete log ≈ 9n + 2⌈log₂(n)⌉ + 10 logical qubit. */
export function eccLogicalQubits(bits: number): number {
  return 9 * bits + 2 * Math.ceil(Math.log2(bits)) + 10;
}

/** Roetteler 2017 §6 order-of-magnitude fit: RSA ≈ 64·n³ Toffoli. */
export function rsaToffoliGates(bits: number): number {
  return Math.round(64 * Math.pow(bits, 3));
}

/** Roetteler 2017 §6 order-of-magnitude fit: ECC ≈ 25·n³ Toffoli. */
export function eccToffoliGates(bits: number): number {
  return Math.round(25 * Math.pow(bits, 3));
}

/* ============================================================
 * Score 정규화 (0-100, 높을수록 양자 저항)
 * 점수 = log-gap(필요 qubit / 가용 qubit) × 22 × (1 - successRate × 0.7)
 * ============================================================ */

function classicalScore(qubits: number, scenario: Scenario): number {
  if (qubits <= 0 || !Number.isFinite(qubits)) return 0;
  const gap = Math.log10(qubits / QUANTUM_HARDWARE_2026_LOGICAL);
  if (gap <= 0) return 0;
  const successRate = scenario === 'conservative' ? 0.04 : 0.5;
  const score = gap * 22 * (1 - successRate * 0.7);
  return Math.max(0, Math.min(100, Math.round(score)));
}

const BASIS_CONSERVATIVE =
  'Shor 1994 (이론) + Roetteler 2017 (자원 추정). 성공률 3~4% 가정.';
const BASIS_EMPIRICAL =
  'Willsch 2023 (실증 시뮬레이션, 60,000회) + Ekerå post-processing. 성공률 50%+ 관측, Ekerå 적용 시 ~100% 근접.';
const PQC_NOTE = 'PQC 알고리즘은 Shor 공격으로 다항시간 내 깨지지 않는다 (NIST PQC 표준).';

/* ============================================================
 * 도메인 1개에 대한 양자 위협 정량화 요약
 * ============================================================ */

export function summarizeQuantumThreat(
  algo: KeyAlgorithm,
  bits: number,
): QuantumThreatDetail {
  const citations: CitationId[] = ['Roetteler-2017', 'Willsch-2023'];

  // PQC: Shor 공격 무효 → 양 시나리오 모두 100
  if (algo === 'ML-KEM') {
    const pqcEstimate = (sc: Scenario): QuantumEstimate => ({
      logicalQubits: Number.POSITIVE_INFINITY,
      toffoliGates: Number.POSITIVE_INFINITY,
      score: 100,
      successRate: 0,
      basis: PQC_NOTE,
      note: sc === 'empirical' ? 'Willsch 2023 도 다항시간 내 인수분해 대상 외.' : undefined,
    });
    return {
      keyAlgorithm: `${algo}-${bits}`,
      keyBits: bits,
      estimates: {
        conservative: pqcEstimate('conservative'),
        empirical: pqcEstimate('empirical'),
      },
      citations,
      source: 'automated',
    };
  }

  // Hybrid: 고전 알고리즘이 약점이지만 PQC 백업이 있어 가산
  if (algo === 'Hybrid-ECC-ML-KEM' || algo === 'Hybrid-RSA-ML-KEM') {
    const classicalQubits =
      algo === 'Hybrid-ECC-ML-KEM' ? eccLogicalQubits(bits) : rsaLogicalQubits(bits);
    const classicalToffoli =
      algo === 'Hybrid-ECC-ML-KEM' ? eccToffoliGates(bits) : rsaToffoliGates(bits);
    const conservativeBase = algo === 'Hybrid-ECC-ML-KEM' ? 92 : 82;
    const empiricalBase = conservativeBase - 5;
    return {
      keyAlgorithm: `${algo}-${bits}`,
      keyBits: bits,
      estimates: {
        conservative: {
          logicalQubits: classicalQubits,
          toffoliGates: classicalToffoli,
          score: conservativeBase,
          successRate: 0.04,
          basis: BASIS_CONSERVATIVE + ' Hybrid 의 ML-KEM 백업 가산.',
        },
        empirical: {
          logicalQubits: classicalQubits,
          toffoliGates: classicalToffoli,
          score: empiricalBase,
          successRate: 0.5,
          basis: BASIS_EMPIRICAL + ' Hybrid 의 ML-KEM 백업 가산.',
        },
      },
      citations,
      source: 'automated',
    };
  }

  // RSA / ECC pure-classical
  const qubits = algo === 'RSA' ? rsaLogicalQubits(bits) : eccLogicalQubits(bits);
  const gates = algo === 'RSA' ? rsaToffoliGates(bits) : eccToffoliGates(bits);

  return {
    keyAlgorithm: `${algo}-${bits}`,
    keyBits: bits,
    estimates: {
      conservative: {
        logicalQubits: qubits,
        toffoliGates: gates,
        score: classicalScore(qubits, 'conservative'),
        successRate: 0.04,
        basis: BASIS_CONSERVATIVE,
      },
      empirical: {
        logicalQubits: qubits,
        toffoliGates: gates,
        score: classicalScore(qubits, 'empirical'),
        successRate: 0.5,
        basis: BASIS_EMPIRICAL,
        note: 'Ekerå post-processing 적용 시 단일 실행 성공률이 ~100%에 근접 (Willsch 2023).',
      },
    },
    citations,
    source: 'automated',
  };
}

/** 4축 대시보드 셀에 노출되는 headline 점수 (default = empirical). */
export function headlineQuantumScore(detail: QuantumThreatDetail): number {
  return detail.estimates.empirical.score;
}
