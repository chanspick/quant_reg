"""``POST /api/scan`` 라우터 — Phase A-1+A-2 코어.

플로우 (SPEC §4.2):
1. normalize_hostname: 클라이언트 입력 정규화·검증 (실패 시 400)
2. run_measure: Phase 1 sslyze 측정 (40s timeout)
3. run_pqc_probe: Phase 2 PQC probe — Phase 1 성공 시에만 실행 (15s timeout)
4. merge_scan_payload: partial + meta + probe → ScanResponse 합성
5. 60s 전체 timeout (asyncio.wait_for)

에러 정책 (REQ-API-004):
- 정규화 실패  → 400 Bad Request (한 번도 측정 시도 안 함)
- 측정 모두 실패 → 200 OK with status='error' 또는 'blocked', errors[] 채움
- 측정 일부 실패 → 200 OK with status='partial', errors[] 채움
- 전체 timeout  → 200 OK with status='partial', 가능한 부분만 채움
- 내부 예외     → 500 Internal Server Error (가능한 한 회피)
"""

from __future__ import annotations

import asyncio
import logging
import os
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, HTTPException, status
from fastapi.responses import JSONResponse

from models.scan_result import (
    CertOpsScoring,
    CertificateMeta,
    ErrorTrace,
    HybridKemScoring,
    Phase2Meta,
    QuantumThreatScoring,
    ResponseMeta,
    RuleTrace,
    ScanRequest,
    ScanResponse,
    ScoreItem,
    Scores,
    ScoringMeta,
    TlsScoring,
)
from services import demo_cache
from services.measure_wrapper import ErrorCode, run_measure
from services.narrative_llm import (
    NARRATIVE_TIMEOUT_SECONDS,
    generate_narrative,
)
from services.normalize import HostnameValidationError, normalize_hostname
from services.probe_wrapper import run_pqc_probe

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["scan"])

# 전체 요청 timeout (SPEC §5.1 REQ-API-001)
OVERALL_TIMEOUT_SECONDS = 75.0


# --- 헬퍼: scoring breakdown 변환 --------------------------------------------

def _make_tls_scoring(scoring_dict: dict[str, Any]) -> TlsScoring:
    """meta.scoring.tls dict → TlsScoring 모델."""
    tls = scoring_dict.get("tls") or {}
    rules = [RuleTrace.model_validate(r) for r in (tls.get("rules") or [])]
    return TlsScoring(
        rules=rules,
        cipher_deductions=dict(tls.get("cipher_deductions") or {}),
        final=int(tls.get("final", 0)),
    )


def _make_certops_scoring(scoring_dict: dict[str, Any]) -> CertOpsScoring:
    """meta.scoring.certOps dict → CertOpsScoring 모델."""
    co = scoring_dict.get("certOps") or {}
    rules = [RuleTrace.model_validate(r) for r in (co.get("rules") or [])]
    return CertOpsScoring(rules=rules, final=int(co.get("final", 0)))


def _make_hybridkem_scoring(scoring_dict: dict[str, Any]) -> HybridKemScoring:
    """meta.scoring.hybridKem dict → HybridKemScoring 모델."""
    hk = scoring_dict.get("hybridKem") or {}
    return HybridKemScoring(
        value=int(hk.get("value", 0)),
        basis=str(hk.get("basis", "")),
    )


def _make_quantum_threat_scoring(
    partial: dict[str, Any],
) -> QuantumThreatScoring | None:
    """partial.quantumThreatDetail → QuantumThreatScoring 합성.

    SPEC §3.2 와 scanner.scoring 의 실제 출력 차이를 흡수:
    scoring_breakdown() 는 quantumThreat 을 emit 하지 않으므로
    partial 의 quantumThreatDetail 에서 logicalQubits + estimates 를 끌어온다.

    PQC 알고리즘 (ML-KEM) 의 경우 logicalQubits 가 ``math.inf`` 인데
    JSON int 로 직렬화 불가하므로 0 (Shor 무력) 으로 정규화한다.
    """
    import math

    detail = partial.get("quantumThreatDetail") or {}
    if not detail:
        return None

    estimates = detail.get("estimates") or {}
    # 보수 시나리오의 logicalQubits 를 대표값으로 (실증값은 동일하거나 더 작음)
    conservative = estimates.get("conservative") or {}
    raw_qubits = conservative.get("logicalQubits", 0) or 0
    try:
        qubits_f = float(raw_qubits)
        if math.isfinite(qubits_f):
            qubits = int(qubits_f)
        else:
            # PQC: Shor 무력 → 0 qubits 필요 (의미: 양자 공격 불가)
            qubits = 0
    except (TypeError, ValueError):
        qubits = 0

    # estimates 도 직렬화 안전하게 정리 — math.inf → null
    safe_scenarios: dict[str, Any] = {}
    for name, est in estimates.items():
        if not isinstance(est, dict):
            continue
        safe_est: dict[str, Any] = {}
        for k, v in est.items():
            if isinstance(v, float) and not math.isfinite(v):
                safe_est[k] = None
            else:
                safe_est[k] = v
        safe_scenarios[name] = safe_est

    return QuantumThreatScoring(
        qubits=qubits,
        scenarios=safe_scenarios,
    )


def _make_certificate_meta(
    partial: dict[str, Any],
    meta: dict[str, Any],
) -> CertificateMeta:
    """partial.certificate + meta.features.certificate → CertificateMeta.

    SPEC §3.2 의 ``{issuer, subject, keyAlgorithm, validUntil}`` 매핑:
    - issuer     ← partial.certificate.ca (CA 이름)
    - subject    ← partial.url 의 hostname 부분 (또는 partial.name)
    - keyAlgorithm ← partial.certificate.keyAlgorithm + keyBits
    - validUntil ← meta.features.certificate.not_valid_after
    """
    cert = partial.get("certificate") or {}
    meta_cert = (meta.get("features") or {}).get("certificate") or {}

    issuer = str(cert.get("ca") or "(unknown)")
    subject = str(partial.get("name") or partial.get("url") or "")
    key_alg = str(cert.get("keyAlgorithm") or "Unknown")
    key_bits = cert.get("keyBits") or 0
    if key_bits:
        key_alg_full = f"{key_alg}-{key_bits}"
    else:
        key_alg_full = key_alg
    valid_until = meta_cert.get("not_valid_after")

    return CertificateMeta(
        issuer=issuer,
        subject=subject,
        keyAlgorithm=key_alg_full,
        validUntil=str(valid_until) if valid_until else None,
    )


def _make_phase2_meta(probe_result: dict[str, Any] | None) -> Phase2Meta:
    """pqc_probe result → Phase2Meta.

    probe_result 의 status 가 ERROR_* 면 SPEC §3.2 의 ``ERROR`` 로 정규화.
    """
    if not probe_result:
        return Phase2Meta(status="ERROR", details={})

    raw_status = str(probe_result.get("status") or "ERROR")
    # SPEC §3.2 Phase2Status enum 으로 정규화
    if raw_status == "SUPPORTED":
        norm = "SUPPORTED"
    elif raw_status == "NOT_SUPPORTED":
        norm = "NOT_SUPPORTED"
    elif raw_status == "NOT_SUPPORTED_OTHER_GROUP":
        norm = "NOT_SUPPORTED_OTHER_GROUP"
    else:
        # ERROR_TIMEOUT / ERROR_NETWORK / ERROR_PARSE / ERROR_TCP_CLOSE → ERROR
        norm = "ERROR"

    details = {k: v for k, v in probe_result.items() if k != "status"}
    # 원본 status 코드도 details 에 보존
    details["raw_status"] = raw_status

    return Phase2Meta(status=norm, details=details)


def _make_scores(partial: dict[str, Any]) -> Scores:
    """partial.scores → Scores 모델."""
    raw = partial.get("scores") or {}

    def pick(key: str) -> ScoreItem:
        item = raw.get(key) or {}
        return ScoreItem(
            value=int(item.get("value", 0)),
            source="automated",
        )

    return Scores(
        tls=pick("tls"),
        hybridKem=pick("hybridKem"),
        certOps=pick("certOps"),
        quantumThreat=pick("quantumThreat"),
    )


# --- 핵심 합성 ---------------------------------------------------------------

def _make_empty_response(
    hostname: str,
    status_value: str,
    errors: list[ErrorTrace],
) -> ScanResponse:
    """측정이 아예 실패했을 때의 fallback 응답.

    SPEC §3.2 는 scores/meta 를 required 로 정의하므로 0점 + 빈 룰로 채워
    프론트가 errors[] 만 보고 차단 메시지를 렌더할 수 있게 한다.
    """
    zero = ScoreItem(value=0, source="automated")
    empty_scoring = ScoringMeta(
        tls=TlsScoring(rules=[], cipher_deductions={}, final=0),
        certOps=CertOpsScoring(rules=[], final=0),
        hybridKem=HybridKemScoring(value=0, basis="측정 실패"),
        quantumThreat=None,
    )
    return ScanResponse(
        hostname=hostname,
        measuredAt=datetime.now(timezone.utc).isoformat(),
        status=status_value,  # type: ignore[arg-type]
        scores=Scores(
            tls=zero,
            hybridKem=zero,
            certOps=zero,
            quantumThreat=zero,
        ),
        meta=ResponseMeta(
            scoring=empty_scoring,
            certificate=CertificateMeta(
                issuer="(unknown)",
                subject=hostname,
                keyAlgorithm="Unknown",
                validUntil=None,
            ),
            phase2=Phase2Meta(status="ERROR", details={}),
        ),
        errors=errors or None,
    )


def _build_success_response(
    hostname: str,
    partial: dict[str, Any],
    meta: dict[str, Any],
    probe_result: dict[str, Any] | None,
    errors: list[ErrorTrace],
) -> ScanResponse:
    """측정 성공(부분 성공 포함) 시 ScanResponse 합성."""
    scoring_dict = meta.get("scoring") or {}

    scoring = ScoringMeta(
        tls=_make_tls_scoring(scoring_dict),
        certOps=_make_certops_scoring(scoring_dict),
        hybridKem=_make_hybridkem_scoring(scoring_dict),
        quantumThreat=_make_quantum_threat_scoring(partial),
    )

    measured_at = (
        meta.get("measured_at")
        or datetime.now(timezone.utc).isoformat()
    )

    # 상태 판정: Phase 2 만 실패면 partial, 둘 다 성공이면 ok
    has_phase2_error = bool(errors)
    state = "partial" if has_phase2_error else "ok"

    return ScanResponse(
        hostname=hostname,
        measuredAt=str(measured_at),
        status=state,  # type: ignore[arg-type]
        scores=_make_scores(partial),
        meta=ResponseMeta(
            scoring=scoring,
            certificate=_make_certificate_meta(partial, meta),
            phase2=_make_phase2_meta(probe_result),
        ),
        narrative=None,  # Phase D 에서 채움
        errors=errors or None,
    )


def _measure_error_to_status(code: ErrorCode) -> str:
    """measure 실패 에러 코드 → SPEC §3.2 ScanStatus.

    DNS_FAIL 은 클라이언트 잘못이므로 400 으로 변환되지만, 여기서는
    서버 측 분류만 결정한다. (정규화 단계에서 잡지 못한 DNS 실패는
    sslyze 가 측정 도중 발견할 수 있음 → 'error' 로 표기.)
    """
    if code == ErrorCode.DNS_FAIL:
        return "error"
    if code in (ErrorCode.TCP_BLOCKED, ErrorCode.SSLYZE_REJECTED):
        return "blocked"
    if code == ErrorCode.TIMEOUT:
        return "partial"
    return "error"


# --- 메인 핸들러 (timeout 안에서 실행) ---------------------------------------

async def _do_scan(hostname: str) -> ScanResponse:
    """정규화된 hostname 으로 실제 측정 수행."""
    errors: list[ErrorTrace] = []

    # 발표 안전망 — DEMO_CACHE_FALLBACK=1 일 때만 사전 캐시 즉시 반환
    cached = demo_cache.lookup(hostname)
    if cached is not None:
        response = _build_success_response(
            hostname=hostname,
            partial=cached["partial"],
            meta=cached["meta"],
            probe_result=cached.get("probe"),
            errors=errors,
        )
        # 왜: 시연 캐시도 cached=True 로 표시 — 정직성 (REQ-API-005 와 동일 시그널)
        response.cached = True
        await _attach_narrative(response, errors)
        return response

    # Phase 1: sslyze 측정
    measure = await run_measure(hostname)
    if not measure.get("ok"):
        code: ErrorCode = measure.get("error_code", ErrorCode.INTERNAL)
        message: str = measure.get("message", "measure 실패")
        errors.append(
            ErrorTrace(
                stage="phase1_measure",
                code=code.value,
                message=message,
            )
        )
        # Phase 1 실패 → Phase 2 skip, fallback 응답
        return _make_empty_response(
            hostname=hostname,
            status_value=_measure_error_to_status(code),
            errors=errors,
        )

    partial = measure["partial"]
    meta = measure["meta"]

    # Phase 2: PQC probe (Phase 1 성공 시에만)
    probe_result: dict[str, Any] | None = None
    probe = await run_pqc_probe(hostname)
    if probe.get("ok"):
        probe_result = probe["result"]
    else:
        code = probe.get("error_code", ErrorCode.INTERNAL)
        message = probe.get("message", "pqc_probe 실패")
        errors.append(
            ErrorTrace(
                stage="phase2_probe",
                code=code.value,
                message=message,
            )
        )

    response = _build_success_response(
        hostname=hostname,
        partial=partial,
        meta=meta,
        probe_result=probe_result,
        errors=errors,
    )

    # Phase D: LLM narrative — 측정 결과가 산출된 직후, 60s budget 내에서 호출.
    # 실패/timeout/no-key 는 모두 None 반환 → narrative 섹션 omit 으로 자가당착 차단.
    await _attach_narrative(response, errors)

    return response


async def _attach_narrative(
    response: ScanResponse,
    errors: list[ErrorTrace],
) -> None:
    """측정 결과로 LLM narrative 생성을 시도하고 응답에 부착.

    SPEC §3.3 / REQ-LLM-001~004:
    - 성공: response.narrative = NarrativeMeta
    - 실패: response.narrative = None + errors[] 에 ErrorTrace 추가
    - NO_API_KEY 와 그 외 실패는 errors[] 의 code 로만 구분 (메시지로는 노출 안 함)
    """
    # 환경변수 미설정이면 호출 자체를 안 한다 — NO_API_KEY 로 표기
    if not os.environ.get("ANTHROPIC_API_KEY"):
        errors.append(
            ErrorTrace(
                stage="narrative",
                code="NO_API_KEY",
                message="ANTHROPIC_API_KEY 미설정으로 LLM 분석 건너뜀.",
            )
        )
        response.errors = errors or None
        return

    # camelCase 직렬화된 dict 를 LLM 입력으로 — 프론트와 동일한 view
    scan_dict = response.model_dump(by_alias=True, exclude_none=True)

    try:
        narrative = await asyncio.wait_for(
            generate_narrative(scan_dict),
            timeout=NARRATIVE_TIMEOUT_SECONDS,
        )
    except asyncio.TimeoutError:
        logger.warning("narrative 외곽 timeout: %s", response.hostname)
        errors.append(
            ErrorTrace(
                stage="narrative",
                code="TIMEOUT",
                message=(
                    f"LLM 분석이 {NARRATIVE_TIMEOUT_SECONDS:.0f}초 내에 "
                    "완료되지 않았습니다."
                ),
            )
        )
        response.errors = errors or None
        return
    except Exception as exc:  # noqa: BLE001 — 어떤 실패든 응답 자체는 보존
        logger.warning("narrative 호출 예외: %s", exc)
        errors.append(
            ErrorTrace(
                stage="narrative",
                code="LLM_ERROR",
                message="LLM 분석 호출이 실패했습니다.",
            )
        )
        response.errors = errors or None
        return

    if narrative is None:
        # SDK 응답 파싱 실패 또는 API 에러 — generate_narrative 내부 로그 참조
        errors.append(
            ErrorTrace(
                stage="narrative",
                code="LLM_ERROR",
                message="LLM 분석 응답을 처리할 수 없습니다.",
            )
        )
        response.errors = errors or None
        return

    response.narrative = narrative
    # 측정은 성공했는데 narrative 만 실패한 경우 status 는 그대로 유지 (REQ-API-004)


# --- 라우트 ------------------------------------------------------------------

@router.post(
    "/scan",
    response_model=ScanResponse,
    response_model_by_alias=True,
    summary="동적 PQC 스캔 (SPEC-PQC-002)",
)
async def scan_endpoint(payload: ScanRequest) -> Any:
    """``POST /api/scan`` — SPEC §3.1 / §3.2 / REQ-API-001~004.

    응답은 항상 camelCase JSON. 검증 실패는 400, 그 외는 200 with
    errors[] 패턴 (REQ-API-004).
    """
    # 1) 정규화·검증
    try:
        hostname = normalize_hostname(payload.hostname)
    except HostnameValidationError as exc:
        # SPEC §2.2: DNS 실패는 입력 검증 단계 즉시 메시지, 백엔드 호출 없음
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": exc.code,
                "message": exc.message,
            },
        ) from exc

    # 2) 측정 (60초 전체 timeout)
    try:
        response = await asyncio.wait_for(
            _do_scan(hostname),
            timeout=OVERALL_TIMEOUT_SECONDS,
        )
    except asyncio.TimeoutError:
        # SPEC §2.2: 60초 timeout → 가능한 부분 결과 + 안내 (이 경로는
        # _do_scan 내부에서 이미 처리하지 못한 외곽 timeout). 부분 결과 없으면
        # fallback 빈 응답으로.
        logger.warning("scan_endpoint overall timeout: %s", hostname)
        response = _make_empty_response(
            hostname=hostname,
            status_value="partial",
            errors=[
                ErrorTrace(
                    stage="overall",
                    code=ErrorCode.TIMEOUT.value,
                    message=(
                        f"전체 측정이 {OVERALL_TIMEOUT_SECONDS:.0f}초 내에 "
                        "완료되지 않았습니다."
                    ),
                )
            ],
        )
    except Exception as exc:  # noqa: BLE001
        # 진짜 내부 예외만 500 으로 — 가능한 한 회피해야 함
        logger.exception("scan_endpoint unexpected error: %s", hostname)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "code": "INTERNAL",
                "message": f"내부 오류: {exc}",
            },
        ) from exc

    # 3) camelCase 직렬화 (Pydantic alias 활용)
    return JSONResponse(
        content=response.model_dump(by_alias=True, exclude_none=True),
        status_code=status.HTTP_200_OK,
    )
