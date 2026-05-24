import { z } from 'zod';

/**
 * SPEC-PQC-001 §3.4 / §3.14 (Domain Schema · 양자 위협 정량화).
 *
 * 정직성 원칙(2026-05-14): 모든 점수·분석·정책 매핑 항목은 `source` 필드로
 * 출처를 명시한다 (REQ-SCH-006). 발표·자소서 정직성 핵심.
 *
 * 4축 측정 모델(2026-05-14 갱신):
 *   1) tls          — automated
 *   2) hybridKem    — automated
 *   3) certOps      — automated (인증서 운영)
 *   4) quantumThreat — automated (Roetteler 2017 + Willsch 2023 기반 계산)
 * supplyChain 은 점수에서 강등되어 정성 디스크립터(`supplyChainNotes`)로 보존.
 */

/* ============================================================
 * Data Source (REQ-SCH-006)
 * ============================================================ */

export const DataSourceSchema = z.enum([
  'automated',
  'manual',
  'llm+verified',
  'llm-only',
]);
export type DataSource = z.infer<typeof DataSourceSchema>;

/* ============================================================
 * Enum (유니온 리터럴) — SPEC §7 Glossary 와 1:1 매핑
 * ============================================================ */

export const SectorSchema = z.enum([
  '반도체/전자',
  '자동차',
  '철강/소재',
  '화학/에너지',
  'IT/플랫폼',
  '바이오',
  '통신',
  '금융지주',
  '은행',
  '증권',
  '페이먼트',
  '공공/정부',
  '게임',
]);
export type Sector = z.infer<typeof SectorSchema>;

export const RenewalStatusSchema = z.enum([
  '자동 갱신',
  '수동 갱신',
  '분기 자동 갱신',
  '만료 임박',
  '미설정',
]);
export type RenewalStatus = z.infer<typeof RenewalStatusSchema>;

export const KeyExchangeStatusSchema = z.enum([
  '활성화',
  '미지원',
  '비활성화',
  '차단됨',
  '미설정',
]);
export type KeyExchangeStatus = z.infer<typeof KeyExchangeStatusSchema>;

export const HybridStatusSchema = z.enum(['기본 제공', '하이브리드', '미감지']);
export type HybridStatus = z.infer<typeof HybridStatusSchema>;

export const MaturityStatusSchema = z.enum([
  '운영 성숙',
  '베타 적용',
  '도입 검토 단계',
  '준비 미착수',
  '전환 미실시',
]);
export type MaturityStatus = z.infer<typeof MaturityStatusSchema>;

export const ComplianceRefNameSchema = z.enum([
  '전자금융감독규정',
  '개인정보보호법',
  '가이드라인',
]);
export type ComplianceRefName = z.infer<typeof ComplianceRefNameSchema>;

export const KeyAlgorithmSchema = z.enum([
  'RSA',
  'ECC',
  'ML-KEM',
  'Hybrid-ECC-ML-KEM',
  'Hybrid-RSA-ML-KEM',
  'Unknown',
]);
export type KeyAlgorithm = z.infer<typeof KeyAlgorithmSchema>;

export const CitationIdSchema = z.enum([
  'Kim-Ahn-2025',
  'Roetteler-2017',
  'Willsch-2023',
]);
export type CitationId = z.infer<typeof CitationIdSchema>;

/* ============================================================
 * Sourced primitives (REQ-SCH-006)
 * ============================================================ */

export const SourcedScoreSchema = z.object({
  value: z.number().min(0).max(100),
  source: DataSourceSchema,
});
export type SourcedScore = z.infer<typeof SourcedScoreSchema>;

export const SourcedTextSchema = z.object({
  text: z.string().min(1),
  source: DataSourceSchema,
});
export type SourcedText = z.infer<typeof SourcedTextSchema>;

/* ============================================================
 * Scores — 4축 측정 모델 (REQ-SCH-001 · 2026-05-14 갱신)
 * ============================================================ */

export const ScoresSchema = z.object({
  tls: SourcedScoreSchema,
  hybridKem: SourcedScoreSchema,
  certOps: SourcedScoreSchema,
  quantumThreat: SourcedScoreSchema,
});
export type Scores = z.infer<typeof ScoresSchema>;

/* ============================================================
 * 인증서 / PQC / 규제 갭
 * ============================================================ */

export const CertificateSchema = z.object({
  renewal: RenewalStatusSchema,
  ca: z.string().min(1),
  chain: z.string().optional(),
  keyAlgorithm: KeyAlgorithmSchema,
  keyBits: z.number().int().positive(),
});
export type Certificate = z.infer<typeof CertificateSchema>;

export const PqcSchema = z.object({
  keyExchange: KeyExchangeStatusSchema,
  hybrid: HybridStatusSchema,
  maturity: MaturityStatusSchema,
});
export type Pqc = z.infer<typeof PqcSchema>;

export const RegulatoryGapSchema = z.object({
  refName: ComplianceRefNameSchema,
  article: z.string().optional(),
  note: z.string().min(1),
  source: DataSourceSchema,
});
export type RegulatoryGap = z.infer<typeof RegulatoryGapSchema>;

/* ============================================================
 * QuantumThreatDetail — 양자 위협 정량 상세 (drill-down)
 *   Roetteler 2017 + Willsch 2023 기반 deterministic 계산 결과.
 * ============================================================ */

export const QuantumEstimateSchema = z.object({
  logicalQubits: z.number().nonnegative(),
  toffoliGates: z.number().nonnegative(),
  score: z.number().min(0).max(100),
  successRate: z.number().min(0).max(1),
  basis: z.string().min(1),
  note: z.string().optional(),
});
export type QuantumEstimate = z.infer<typeof QuantumEstimateSchema>;

export const QuantumThreatDetailSchema = z.object({
  keyAlgorithm: z.string().min(1),
  keyBits: z.number().int().positive(),
  estimates: z.object({
    conservative: QuantumEstimateSchema,
    empirical: QuantumEstimateSchema,
  }),
  citations: z.array(CitationIdSchema).min(1),
  source: DataSourceSchema,
});
export type QuantumThreatDetail = z.infer<typeof QuantumThreatDetailSchema>;

/* ============================================================
 * Domain — 단일 도메인 레코드 (REQ-SCH-001)
 * ============================================================ */

export const DomainSchema = z.object({
  name: z.string().min(1),
  url: z.string().url(),
  sector: SectorSchema,
  scores: ScoresSchema,
  certificate: CertificateSchema,
  pqc: PqcSchema,
  regulatoryGaps: z.array(RegulatoryGapSchema),
  findings: z.array(SourcedTextSchema),
  recommendations: z.array(SourcedTextSchema),
  narrative: SourcedTextSchema,
  /**
   * supplyChain 은 점수에서 강등(2026-05-14)되어 정성 디스크립터로 남음.
   * 4축 점수에는 포함되지 않고, 도메인 상세 패널에 표시된다.
   */
  supplyChainNotes: SourcedTextSchema,
  /** Roetteler 2017 + Willsch 2023 기반 양자 위협 정량 상세. */
  quantumThreatDetail: QuantumThreatDetailSchema,
});
export type Domain = z.infer<typeof DomainSchema>;

/* ============================================================
 * Envelope — domains.json 루트 (SPEC §4.2)
 * ============================================================ */

export const DomainsEnvelopeSchema = z.object({
  lastUpdated: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'lastUpdated must be YYYY-MM-DD',
  }),
  version: z.string().min(1),
  domains: z.array(DomainSchema),
});
export type DomainsEnvelope = z.infer<typeof DomainsEnvelopeSchema>;

export interface DomainValidationResult {
  lastUpdated: string;
  version: string;
  domains: Domain[];
  invalidCount: number;
  invalidReasons: Array<{ index: number; reason: string }>;
}

/**
 * envelope 단위 파싱.
 * - 루트 envelope 자체가 부적합하면 throw (REQ-DAT-012).
 * - 개별 도메인은 safeParse 로 검증해 실패 항목을 skip 한다 (REQ-DAT-011).
 */
export function parseDomainsEnvelope(raw: unknown): DomainValidationResult {
  const shape = z.object({
    lastUpdated: z.string(),
    version: z.string(),
    domains: z.array(z.unknown()),
  });
  const root = shape.parse(raw);

  const meta = DomainsEnvelopeSchema.pick({
    lastUpdated: true,
    version: true,
  }).parse({ lastUpdated: root.lastUpdated, version: root.version });

  const valid: Domain[] = [];
  const invalidReasons: Array<{ index: number; reason: string }> = [];

  root.domains.forEach((record, index) => {
    const result = DomainSchema.safeParse(record);
    if (result.success) {
      valid.push(result.data);
    } else {
      invalidReasons.push({
        index,
        reason: result.error.issues
          .map((i) => `${i.path.join('.')}: ${i.message}`)
          .join('; '),
      });
    }
  });

  return {
    lastUpdated: meta.lastUpdated,
    version: meta.version,
    domains: valid,
    invalidCount: invalidReasons.length,
    invalidReasons,
  };
}

/* ============================================================
 * Placeholder 감지 — narrative / supplyChainNotes 등 TODO 텍스트
 *
 * scanner/measure.py:to_partial_domain 이 분석 텍스트를 채울 때 사용하는
 * placeholder 마커("TODO: ...")를 UI 단에서 감지하기 위한 헬퍼.
 *
 * 배경 (SPEC-PQC-001 §8-A 11):
 *   - 50개 합성 데이터는 폐기되고, scanner 가 자동 측정 + placeholder 로
 *     partial 레코드를 생성한다. narrative / supplyChainNotes 는 후속 작업으로
 *     사용자가 채우거나 LLM 보조로 작성하기 전까지 placeholder 상태로 남는다.
 *   - 정직성 컨셉상 placeholder 를 그대로 사용자에게 노출하는 것은 "TODO" 문자열
 *     자체가 자가당착(claims-vs-reality)을 보이므로, UI 는 placeholder 가 감지되면
 *     해당 섹션을 unmount 하여 빈 공간으로 처리한다 (REQ-DSH-007 보강).
 *   - 후속 작업으로 사용자가 실제 텍스트를 채우면 자동으로 다시 노출된다 — 별도
 *     플래그 토글 불필요.
 * ============================================================ */

const PLACEHOLDER_PREFIX = /^TODO:\s/;

/**
 * SourcedText 가 scanner 가 채운 placeholder 인지 판별.
 *
 * - `TODO:` 접두사로 시작하는 텍스트는 placeholder 로 간주한다.
 * - 출처 라벨(`source`)은 검사하지 않는다 — narrative 는 'llm-only',
 *   supplyChainNotes 는 'manual' 로 다르게 마킹되므로 텍스트 접두사가 더 robust.
 */
export function isPlaceholderText(t: SourcedText): boolean {
  return PLACEHOLDER_PREFIX.test(t.text);
}
