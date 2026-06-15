import { z } from 'zod';

/**
 * SPEC-PQC-002 §3.2 ScanResponse 의 TypeScript/zod 미러.
 *
 * scanner-api/models/scan_result.py 와 1:1 매칭. 정합성 보증 방법:
 *  - 백엔드: pydantic CamelModel (populate_by_name + alias) → camelCase JSON 직렬화
 *  - 프론트: 본 파일은 camelCase 만 본다. snake_case 변환 없음
 *  - enum (ScoreSource / Phase2Status / ScanStatus) 은 백엔드 Literal 그대로 복사
 *  - 백엔드 변경 시: scan_result.py 의 alias 와 본 파일의 키를 동시에 갱신해야 함
 *  - 런타임 검증 단계에서 zod가 실패하면 UI 가 즉시 에러 패널 노출 → 즉시 발견됨
 */

// --- enum 미러 (scanner-api models/scan_result.py) -----------------------

// SPEC §3.2 정직성 라벨. 4종 모두 백엔드 ScoreSource Literal 과 동일.
export const ScoreSourceSchema = z.enum([
  'automated',
  'manual',
  'llm+verified',
  'llm-only',
]);
export type ScoreSource = z.infer<typeof ScoreSourceSchema>;

export const Phase2StatusSchema = z.enum([
  'SUPPORTED',
  'NOT_SUPPORTED',
  'NOT_SUPPORTED_OTHER_GROUP',
  'ERROR',
]);
export type Phase2Status = z.infer<typeof Phase2StatusSchema>;

export const ScanStatusSchema = z.enum(['ok', 'partial', 'blocked', 'error']);
export type ScanStatus = z.infer<typeof ScanStatusSchema>;

// --- sub-스키마 ----------------------------------------------------------

export const ScoreItemSchema = z.object({
  value: z.number().int(),
  source: ScoreSourceSchema,
});
export type ScoreItem = z.infer<typeof ScoreItemSchema>;

export const RuleTraceSchema = z.object({
  id: z.string(),
  label: z.string(),
  fired: z.boolean(),
  deduction: z.number().int(),
  source: z.string(),
});
export type RuleTrace = z.infer<typeof RuleTraceSchema>;

export const TlsScoringSchema = z.object({
  rules: z.array(RuleTraceSchema).default([]),
  cipherDeductions: z.record(z.string(), z.number().int()).default({}),
  final: z.number().int(),
});
export type TlsScoring = z.infer<typeof TlsScoringSchema>;

export const CertOpsScoringSchema = z.object({
  rules: z.array(RuleTraceSchema).default([]),
  final: z.number().int(),
});
export type CertOpsScoring = z.infer<typeof CertOpsScoringSchema>;

export const HybridKemScoringSchema = z.object({
  value: z.number().int(),
  basis: z.string(),
});
export type HybridKemScoring = z.infer<typeof HybridKemScoringSchema>;

export const QuantumThreatScoringSchema = z.object({
  qubits: z.number().int(),
  scenarios: z.record(z.string(), z.unknown()).default({}),
});
export type QuantumThreatScoring = z.infer<typeof QuantumThreatScoringSchema>;

export const ScoringMetaSchema = z.object({
  tls: TlsScoringSchema,
  certOps: CertOpsScoringSchema,
  hybridKem: HybridKemScoringSchema,
  quantumThreat: QuantumThreatScoringSchema.nullable().optional(),
});
export type ScoringMeta = z.infer<typeof ScoringMetaSchema>;

export const CertificateMetaSchema = z.object({
  issuer: z.string(),
  subject: z.string(),
  keyAlgorithm: z.string(),
  validUntil: z.string().nullable().optional(),
});
export type CertificateMeta = z.infer<typeof CertificateMetaSchema>;

export const Phase2MetaSchema = z.object({
  status: Phase2StatusSchema,
  details: z.record(z.string(), z.unknown()).default({}),
});
export type Phase2Meta = z.infer<typeof Phase2MetaSchema>;

export const ResponseMetaSchema = z.object({
  scoring: ScoringMetaSchema,
  certificate: CertificateMetaSchema,
  phase2: Phase2MetaSchema,
});
export type ResponseMeta = z.infer<typeof ResponseMetaSchema>;

export const ScoresSchema = z.object({
  tls: ScoreItemSchema,
  hybridKem: ScoreItemSchema,
  certOps: ScoreItemSchema,
  quantumThreat: ScoreItemSchema,
});
export type Scores = z.infer<typeof ScoresSchema>;

export const NarrativeMetaSchema = z.object({
  text: z.string(),
  recommendations: z.array(z.string()).default([]),
  // 백엔드는 'llm-only' 고정이지만, source 누락 / 변형에 대비해 enum 으로 허용
  source: z.literal('llm-only'),
  model: z.string(),
});
export type NarrativeMeta = z.infer<typeof NarrativeMetaSchema>;

export const ErrorTraceSchema = z.object({
  stage: z.string(),
  code: z.string(),
  message: z.string(),
});
export type ErrorTrace = z.infer<typeof ErrorTraceSchema>;

// --- 최상위 응답 ---------------------------------------------------------

export const ScanResponseSchema = z.object({
  hostname: z.string(),
  measuredAt: z.string(),
  status: ScanStatusSchema,
  scores: ScoresSchema,
  meta: ResponseMetaSchema,
  narrative: NarrativeMetaSchema.nullable().optional(),
  errors: z.array(ErrorTraceSchema).nullable().optional(),
  cached: z.boolean().nullable().optional(),
});
export type ScanResponse = z.infer<typeof ScanResponseSchema>;

// --- 400 에러 (HostnameValidationError) ----------------------------------

/** 백엔드 services/normalize.py HostnameValidationError code 와 동일. */
export const HostnameValidationCodeSchema = z.enum([
  'DNS_INVALID_FORMAT',
  'IS_IP_ADDRESS',
  'TOO_SHORT',
  'TOO_LONG',
  'BAD_CHARS',
  'NO_DOT',
  'EMPTY',
]);
export type HostnameValidationCode = z.infer<typeof HostnameValidationCodeSchema>;

export const ScanErrorResponseSchema = z.object({
  detail: z.object({
    code: z.string(),
    message: z.string(),
  }),
});
export type ScanErrorResponse = z.infer<typeof ScanErrorResponseSchema>;
