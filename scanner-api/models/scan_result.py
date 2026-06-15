"""SPEC-PQC-002 §3.2 ScanResponse Pydantic v2 모델.

프론트엔드(TypeScript)는 camelCase 를 쓰므로 alias 를 통해 직렬화하고,
Python 내부에서는 snake_case 로 다룬다. ``populate_by_name=True`` 로
양방향 허용.

SPEC 과의 의도적 차이 (모두 ``scanner.scoring.scoring_breakdown`` 의
실제 출력 형식에 맞춰 조정):
- ``ScoringMeta.quantum_threat`` 는 ``Optional`` — ``scoring_breakdown()`` 가
  quantumThreat 키를 emit 하지 않으므로 라우트 핸들러가 partial 의
  ``quantumThreatDetail`` 에서 합성해 채운다.
- ``CertificateMeta`` 필드는 partial 의 ``certificate`` + meta 의
  ``features.certificate`` 를 묶어 채운다.
"""

from __future__ import annotations

from typing import Any, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field


# --- 공통 베이스 -------------------------------------------------------------

class CamelModel(BaseModel):
    """camelCase alias 지원 베이스 모델."""

    model_config = ConfigDict(
        populate_by_name=True,
        extra="ignore",
        str_strip_whitespace=True,
    )


# --- 요청 -------------------------------------------------------------------

class ScanRequest(BaseModel):
    """``POST /api/scan`` 요청 본문.

    검증 자체는 ``services.normalize.normalize_hostname`` 가 수행한다.
    Pydantic 단계에서는 최소 길이/타입만 본다.
    """

    model_config = ConfigDict(str_strip_whitespace=True)

    hostname: str = Field(..., min_length=1, max_length=512)


# --- 응답 sub-모델 -----------------------------------------------------------

ScoreSource = Literal["automated", "manual", "llm+verified", "llm-only"]


class ScoreItem(CamelModel):
    """4축 점수 1개. ``source`` 는 정직성 라벨 enum."""

    value: int
    source: ScoreSource


class RuleTrace(CamelModel):
    """점수 산출 룰 1개 trace — SPEC §3.2 의 RuleTrace.

    ``scanner.scoring._TLS_RULES`` / ``_CERTOPS_RULES`` 의 항목 1개와 1:1.
    """

    id: str
    label: str
    fired: bool
    deduction: int
    source: str


class TlsScoring(CamelModel):
    """``meta.scoring.tls``."""

    rules: list[RuleTrace] = Field(default_factory=list)
    cipher_deductions: dict[str, int] = Field(
        default_factory=dict,
        alias="cipherDeductions",
    )
    final: int


class CertOpsScoring(CamelModel):
    """``meta.scoring.certOps``."""

    rules: list[RuleTrace] = Field(default_factory=list)
    final: int


class HybridKemScoring(CamelModel):
    """``meta.scoring.hybridKem``."""

    value: int
    basis: str


class QuantumThreatScoring(CamelModel):
    """``meta.scoring.quantumThreat`` — SPEC §3.2.

    ``scoring_breakdown()`` 가 emit 하지 않으므로 라우트 핸들러가 partial 의
    ``quantumThreatDetail`` 에서 합성한다.
    """

    qubits: int
    scenarios: dict[str, Any] = Field(default_factory=dict)


class ScoringMeta(CamelModel):
    """``meta.scoring`` — 4축 점수 산출 근거."""

    tls: TlsScoring
    cert_ops: CertOpsScoring = Field(..., alias="certOps")
    hybrid_kem: HybridKemScoring = Field(..., alias="hybridKem")
    quantum_threat: Optional[QuantumThreatScoring] = Field(
        default=None, alias="quantumThreat"
    )


class CertificateMeta(CamelModel):
    """``meta.certificate`` — SPEC §3.2.

    SPEC 은 ``{issuer, subject, keyAlgorithm, validUntil}`` 만 요구.
    """

    issuer: str
    subject: str
    key_algorithm: str = Field(..., alias="keyAlgorithm")
    valid_until: Optional[str] = Field(default=None, alias="validUntil")


Phase2Status = Literal[
    "SUPPORTED",
    "NOT_SUPPORTED",
    "NOT_SUPPORTED_OTHER_GROUP",
    "ERROR",
]


class Phase2Meta(CamelModel):
    """``meta.phase2`` — pqc_probe 결과 요약."""

    status: Phase2Status
    details: dict[str, Any] = Field(default_factory=dict)


class ResponseMeta(CamelModel):
    """``ScanResponse.meta``."""

    scoring: ScoringMeta
    certificate: CertificateMeta
    phase2: Phase2Meta


class Scores(CamelModel):
    """``ScanResponse.scores`` — 4축 점수."""

    tls: ScoreItem
    hybrid_kem: ScoreItem = Field(..., alias="hybridKem")
    cert_ops: ScoreItem = Field(..., alias="certOps")
    quantum_threat: ScoreItem = Field(..., alias="quantumThreat")


class NarrativeMeta(CamelModel):
    """``ScanResponse.narrative`` — Phase D 에서 채움. 현재 Phase A 는 None."""

    text: str
    recommendations: list[str] = Field(default_factory=list)
    source: Literal["llm-only"] = "llm-only"
    model: str


class ErrorTrace(CamelModel):
    """``errors[]`` 항목 — REQ-API-004."""

    stage: str
    code: str
    message: str


# --- 최상위 응답 -------------------------------------------------------------

ScanStatus = Literal["ok", "partial", "blocked", "error"]


class ScanResponse(CamelModel):
    """``POST /api/scan`` 응답 — SPEC §3.2."""

    hostname: str
    measured_at: str = Field(..., alias="measuredAt")
    status: ScanStatus
    scores: Scores
    meta: ResponseMeta
    narrative: Optional[NarrativeMeta] = None
    errors: Optional[list[ErrorTrace]] = None
    cached: Optional[bool] = None
