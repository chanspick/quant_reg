/**
 * SPEC-PQC-003 §3.6 / REQ-HNDL-001/002 (⑤ HNDL 양자위협 노출) — 클라이언트 파생.
 *
 * 키 소스: `meta.certificate.keyAlgorithm`("RSA-2048" 등) 파싱 → {algo, bits|null}.
 *   파싱 불가 시 null 반환 → ⑤ unmount (INTEG-3).
 *
 * Mosca 부등식 (research.md ⑤):
 *   X(데이터 보존 필요)  + Y(마이그 소요) > Z(Q-Day 잔여) ⟹ atRisk
 *   X/Y/Z 는 측정값이 아닌 정적 가정 상수 → 화면에 "추정·출처" 라벨 (REQ-HON-006).
 *
 * Q-Day 는 단일 시점 아닌 범위+출처 (REQ-HNDL-002).
 *
 * 전부 순수 함수 — 응답 스키마(schema.ts)와 분리된 view-model 변환 (INTEG-7).
 */

import type { ScanResponse } from '@/data/scannerSchema';

// --- 양자 취약 알고리즘 family ---------------------------------------------

/** Shor 알고리즘에 취약한 고전 공개키 알고리즘 family (대문자 정규화 기준). */
const QUANTUM_VULNERABLE = new Set<string>([
  'RSA',
  'ECC',
  'EC',
  'ECDSA',
  'ECDH',
  'DSA',
  'DH',
]);

/** PQC / 양자내성 알고리즘 family (취약하지 않음, atRisk=false). */
const QUANTUM_SAFE = new Set<string>([
  'ML-KEM',
  'MLKEM',
  'ML-DSA',
  'MLDSA',
  'KYBER',
  'DILITHIUM',
  'FALCON',
  'SPHINCS',
  'SLH-DSA',
]);

// --- Mosca 정적 상수 (research.md ⑤ — 측정값 아님, 가정) ------------------

/**
 * Mosca 부등식 입력 (단위: 년). research.md ⑤·⑦ 의 보수적 가정.
 *  - X: 데이터 기밀 유지(보존) 필요 기간. 기본 7년+ (의료/금융 보존 규정 수준).
 *  - Y: 마이그레이션 소요. 대기업 12~15년 → 보수적으로 12 사용.
 *  - Z: Q-Day 까지 잔여. 보수적으로 10년 사용.
 */
export const MOSCA_CONSTANTS = {
  /** X — 데이터 보존 필요 기간 (년). research.md ⑤ "데이터 보존 7년+". */
  dataRetentionYears: 7,
  /** Y — 마이그레이션 소요 기간 (년). research.md ⑦ "대기업 12~15년" 보수값. */
  migrationYears: 12,
  /** Z — Q-Day 까지 잔여 (년). research.md ⑤ 보수 10~15년 중 보수값. */
  yearsToQDay: 10,
} as const;

/** Mosca 상수 출처 인용 (REQ-HON-006). */
export const MOSCA_SOURCE =
  'research.md ⑤ — X(데이터 보존 7년+), Y(마이그 대기업 12~15년 [26][27]), Z(Q-Day 잔여 보수 10~15년)';

// --- Q-Day 범위+출처 (research.md ⑤ — REQ-HNDL-002) ----------------------

export interface QDayEstimate {
  /** 사람이 읽는 범위 표기 (예: "2028~2033 (보수 ~2030±3)"). */
  range: string;
  /** 1차 출처 인용. */
  primarySource: string;
  /** 보조 출처 인용. */
  secondarySource: string;
}

/** Q-Day 추정 — 범위 + 출처. 단일 시점 아님 (REQ-HNDL-002). */
export const Q_DAY: QDayEstimate = {
  range: '2028~2033 (보수 ~2030±3)',
  primarySource: 'Gidney 2025, arXiv:2505.15917 (~1M 물리큐비트/1주)',
  secondarySource: 'RAND 2023 (2028~2033 분포) · GRI 2024 (10년 내 19~34%)',
};

// --- 키 파싱 --------------------------------------------------------------

export interface ParsedKey {
  /** 정규화된 알고리즘 family (대문자, 예: "RSA", "ECDSA", "ML-KEM"). */
  algo: string;
  /** 키 길이 (비트). 추출 불가 시 null (예: "ECDSA P-256"). */
  bits: number | null;
  /** 원문 (예: "RSA-2048", "ECDSA P-256"). 화면 표기용. */
  raw: string;
}

/**
 * keyAlgorithm 문자열 → {algo, bits|null}. 파싱 불가 시 null.
 *
 * 허용 형태(대소문자/구분자 무관):
 *   "RSA-2048" "RSA 2048" "RSA"  "ECDSA P-256" "EC" "ECDSA secp256r1"
 *   "ML-KEM-768" "X25519MLKEM768" (하이브리드)
 */
export function parseKeyAlgorithm(keyAlgorithm: string): ParsedKey | null {
  const raw = keyAlgorithm.trim();
  if (raw.length === 0) return null;

  const upper = raw.toUpperCase();

  // 하이브리드/PQC family 우선 탐지 (부분 문자열 포함).
  for (const safe of QUANTUM_SAFE) {
    if (upper.includes(safe)) {
      const bits = extractBits(raw);
      return { algo: safe, bits, raw };
    }
  }

  // 고전 family: 첫 토큰(영문 family) 추출.
  const familyMatch = upper.match(/^[A-Z][A-Z0-9]*/);
  const family = familyMatch?.[0];
  if (family === undefined) return null;

  // 알려진 고전 취약 family 또는 그 외 → family 가 알파벳이면 수용.
  // bits 는 추출 시도, 없으면 null.
  const bits = extractBits(raw);

  // family 가 취약/안전 어느 집합에도 없고 bits 도 없으면 의미 없는 토큰 → 파싱 실패 처리.
  const known =
    QUANTUM_VULNERABLE.has(family) || family === 'RSA' || family === 'ECDSA';
  if (!known && bits === null && !isPlausibleFamily(family)) {
    return null;
  }

  return { algo: family, bits, raw };
}

/** 문자열에서 키 길이로 보이는 숫자(>=256, 일반적 키 비트) 추출. */
function extractBits(raw: string): number | null {
  // "RSA-2048" / "RSA 2048" → 2048. "ML-KEM-768" → 768.
  // "P-256" 의 256 은 곡선 식별자(비트 아님)이므로 P- 접두 숫자는 제외.
  const cleaned = raw.replace(/P-\d+/gi, '').replace(/SECP\d+\w*/gi, '');
  const matches = cleaned.match(/\d{3,5}/g);
  if (!matches || matches.length === 0) return null;
  // 가장 큰 숫자를 비트로 간주 (RSA-2048 등).
  const nums = matches.map((m) => Number.parseInt(m, 10)).filter((n) => n >= 256);
  if (nums.length === 0) return null;
  return Math.max(...nums);
}

/** family 토큰이 그럴듯한 암호 알고리즘 이름인지(2자 이상 알파벳 시작). */
function isPlausibleFamily(family: string): boolean {
  return /^[A-Z]{2,}$/.test(family);
}

// --- HNDL 노출 결과 -------------------------------------------------------

export interface MoscaInequality {
  /** X — 데이터 보존 필요 (년). */
  x: number;
  /** Y — 마이그레이션 소요 (년). */
  y: number;
  /** Z — Q-Day 까지 잔여 (년). */
  z: number;
  /** X + Y. */
  sum: number;
  /** (X + Y) > Z. */
  atRisk: boolean;
  /** 상수 출처 인용 (REQ-HON-006). */
  source: string;
}

export interface HndlExposure {
  /** 파싱된 키. */
  key: ParsedKey;
  /** 양자(Shor) 취약 여부. RSA/ECC 계열=true, PQC=false. */
  quantumVulnerable: boolean;
  /** Mosca 부등식 (취약 키일 때 의미, PQC 키여도 참고용으로 계산). */
  mosca: MoscaInequality;
  /** Q-Day 추정 범위 + 출처. */
  qDay: QDayEstimate;
  /** PQC(양자내성) 키일 때 긍정 노트, 취약 키이면 null. */
  positiveNote: string | null;
}

/** Mosca 부등식 계산 (정적 상수 기반). */
export function computeMosca(): MoscaInequality {
  const x = MOSCA_CONSTANTS.dataRetentionYears;
  const y = MOSCA_CONSTANTS.migrationYears;
  const z = MOSCA_CONSTANTS.yearsToQDay;
  const sum = x + y;
  return { x, y, z, sum, atRisk: sum > z, source: MOSCA_SOURCE };
}

/** algo family 가 양자(Shor) 취약인지. */
function isQuantumVulnerable(algo: string): boolean {
  const upper = algo.toUpperCase();
  if (QUANTUM_SAFE.has(upper)) return false;
  return QUANTUM_VULNERABLE.has(upper);
}

/**
 * 응답 → HNDL 노출. REQ-HNDL-001/002.
 * keyAlgorithm 파싱 불가 시 null → 호출부에서 ⑤ unmount (INTEG-3).
 */
export function computeHndl(result: ScanResponse): HndlExposure | null {
  const key = parseKeyAlgorithm(result.meta.certificate.keyAlgorithm);
  if (key === null) return null;

  const quantumVulnerable = isQuantumVulnerable(key.algo);
  const mosca = computeMosca();
  const positiveNote = quantumVulnerable
    ? null
    : '양자내성 키 — HNDL 위험 낮음. 현재 수집되어도 Q-Day 이후 복호화 위협이 낮습니다.';

  return {
    key,
    quantumVulnerable,
    mosca,
    qDay: Q_DAY,
    positiveNote,
  };
}
