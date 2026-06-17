"""Phase D LLM narrative wrapper — Claude Sonnet 4.6 via Anthropic SDK.

SPEC-PQC-002 §3.3 / §5.3 REQ-LLM-001~004:
- 모델: ``claude-sonnet-4-6`` (1M 변형 아님, 일반 sonnet 4.6)
- prompt cache: 4축 모델 + 정직성 + 출력 포맷 규약을 system message 에 박고
  ``cache_control: {"type": "ephemeral"}`` 적용 → 도메인당 cache-read 비용으로 회수
- ``source`` 라벨 ``llm-only`` 박제 (정직성 시스템 일관)
- 실패/timeout/no-key → ``None`` 반환, 호출자가 ``errors[]`` 에 ErrorTrace 추가

호출 측 패턴(``routes/scan.py``):
    result = await asyncio.wait_for(
        generate_narrative(scan_data), timeout=8.0
    )

설계 결정:
- 환경변수 ``ANTHROPIC_API_KEY`` 미설정 시 SDK 초기화도 안 한다 (NO_API_KEY 즉시 반환).
- ``AsyncAnthropic`` 사용 — FastAPI async 컨텍스트와 정합.
- system message 는 ``list[dict]`` 형식으로 보내야 ``cache_control`` 이 작동한다
  (string 단축 형식은 cache 미적용).
- 출력 파싱은 strict JSON — SDK 의 ``response.content[0].text`` 에서 json.loads.
  실패해도 ``None`` 반환해 narrative 섹션을 응답에서 제외 (REQ-LLM-004 자가당착 차단).
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
from typing import Any

from models.scan_result import NarrativeMeta

logger = logging.getLogger("scanner_api.narrative")

# REQ-LLM-001 — 모델 ID 박제 (1M 변형 아님)
MODEL_ID = "claude-sonnet-4-6"

# narrative timeout — Railway 컨테이너 → Anthropic API 라우팅 지연 + prompt cache
# write + 한국어 300-500자 생성 합쳐 15s 도 부족. 60s 로 상향 (발표 시연 안정성 우선).
# cache hit 후엔 3-5s 회복하므로 평소엔 거의 도달 안 함.
NARRATIVE_TIMEOUT_SECONDS = 60.0

# 출력 토큰 상한 — 300-500자 한국어 + recommendations 3개면 충분
MAX_OUTPUT_TOKENS = 1024


# --- system message: 4축 모델 + 정직성 + 출력 포맷 (prompt cache 대상) ----------

# prompt cache 최소 prefix 가 sonnet 4.6 에서 2048 tokens 이므로
# 4축 설명·정직성 규약·출력 포맷 명세를 충분히 길게 박아 cache 발동시킨다.
_SYSTEM_PROMPT = """\
당신은 양자컴퓨팅 강의 발표 시연용 PQC(Post-Quantum Cryptography) 분석 보조자입니다.
TLS 측정 결과를 입력받아 한국어 narrative + 권고 3개를 반환합니다.

[4축 점수 모델]
1) tls : TLS 프로토콜 버전·cipher suite·HSTS 등 기본 TLS 위생 (0-100, 높을수록 양호).
   - Mozilla SSL Config v6.0 + RFC 8996 (TLS 1.0/1.1 폐기) + NIST 800-52 Rev.2 기반.
2) hybridKem : (post-quantum + classical) hybrid KEM 채택 여부 (0 또는 100).
   - TLS 1.3 client hello 의 supported_groups 에 X25519MLKEM768(0x11ec) 등
     hybrid group 이 있는지로 판정.
3) certOps : 인증서 운영 위생 — CA, 키 알고리즘/길이, 만료, OCSP stapling.
   - CA/Browser Forum Baseline Requirements + RFC 5280 기반.
4) quantumThreat : ordering-preserving 양자 위협 지표 — 동일 알고리즘 비교 시
   상대적 위협 크기만 의미. 절대값 매핑 없음 (Calibration Disclosure 의무).
   - 보수 시나리오의 logical qubits 필요량 기반.
     · RSA: Beauregard 2003 (2n+3 큐비트 회로) + Gidney-Ekerå 2019/Gidney 2025 (자원 추정).
     · ECC: Roetteler 2017 (이산로그 자원 추정).
     · 실증(empirical): Willsch 2023 (Shor 인수분해 시뮬레이션).
   - PQC (ML-KEM 등) 채택 시 Shor 무력 → quantumThreat 점수는 0 또는 매우 낮음.

[정직성 원칙 — 엄수]
- 당신의 분석은 출력 schema 의 source 필드가 "llm-only" 로 박제되어 표시됩니다.
  자동 측정(automated) 과는 시각·라벨 색이 구분됩니다 (sky-500 vs violet-500).
- 절대 진단·감사·구매 의사결정 권고로 표현하지 마십시오.
  발표 시연용 임시 데모임을 인지하고 학술적 톤으로 작성하십시오.
- quantumThreat 점수는 ordering-preserving 만 의미하며 절대값이 아닙니다.
  "X qubits 가 필요하다" 식의 단정적 표현은 금지 — "보수 시나리오 기준 약 X qubits 추정"
  처럼 추정·근거 출처를 명시하십시오.
- 측정값이 없는 항목(예: Phase 2 차단으로 hybridKem 미측정)은 추정하지 말고
  "측정 불가" 로 명시하십시오.

[출력 포맷 — 엄수]
반드시 다음 JSON 객체만 출력하십시오. 마크다운 코드 펜스 금지, 주석 금지, 설명 금지.
{
  "text": "<300-500자 한국어 narrative. 4축 결과 요약 + 강점 1-2개 + 약점 1-2개 + 양자 내성 평가 1개 문장>",
  "recommendations": [
    "<권고 1: 50-100자, TLS 측 개선안>",
    "<권고 2: 50-100자, 인증서/키 운영 개선안>",
    "<권고 3: 50-100자, PQC 마이그레이션 관련>"
  ]
}

text 길이 가이드: 300자 이상 500자 이하 (공백 포함). 짧으면 정보 부족, 길면 청중 집중 저하.
recommendations 는 정확히 3개. 각 50-100자.

자, 이제 측정 결과를 받아 위 schema 대로만 응답하십시오.
"""


def _build_user_message(scan_data: dict[str, Any]) -> str:
    """측정 결과 → user message 본문. 매 호출마다 변하는 부분.

    SPEC §3.3: scores + scoring breakdown + cert + phase2 를 압축해 전달.
    너무 길면 토큰 낭비이므로 핵심 필드만 골라 직렬화.
    """
    # 안전한 필드 추출 — 빈 dict 도 허용
    hostname = scan_data.get("hostname") or "(unknown)"
    scores = scan_data.get("scores") or {}
    meta = scan_data.get("meta") or {}
    scoring = meta.get("scoring") or {}
    certificate = meta.get("certificate") or {}
    phase2 = meta.get("phase2") or {}

    # cipher 감점 dict 가 너무 크면 상위 5개만
    tls_block = dict(scoring.get("tls") or {})
    cd = tls_block.get("cipher_deductions") or tls_block.get("cipherDeductions") or {}
    if isinstance(cd, dict) and len(cd) > 5:
        top = sorted(cd.items(), key=lambda kv: -int(kv[1] or 0))[:5]
        tls_block["cipher_deductions"] = dict(top)
        tls_block["cipher_deductions_truncated"] = True

    payload = {
        "hostname": hostname,
        "scores": scores,
        "scoring": {
            "tls": tls_block,
            "certOps": scoring.get("certOps") or scoring.get("cert_ops"),
            "hybridKem": scoring.get("hybridKem") or scoring.get("hybrid_kem"),
            "quantumThreat": scoring.get("quantumThreat") or scoring.get("quantum_threat"),
        },
        "certificate": certificate,
        "phase2": phase2,
    }

    return (
        "다음은 한 도메인의 4축 PQC 측정 결과입니다. "
        "system 규약대로 JSON 만 반환하십시오.\n\n"
        f"{json.dumps(payload, ensure_ascii=False, indent=2)}"
    )


def _parse_response(text: str) -> NarrativeMeta | None:
    """LLM 응답 텍스트 → NarrativeMeta. 실패 시 None.

    엄격 JSON 파싱 + 필드 검증. 자가당착 차단을 위해 스키마 불일치는 모두 None.
    """
    if not text or not text.strip():
        return None

    # 모델이 코드 펜스를 붙였을 경우 한 번만 떼어낸다 (system 에서 금지했지만 방어적)
    s = text.strip()
    if s.startswith("```"):
        # ```json ... ``` 또는 ``` ... ```
        lines = s.splitlines()
        if len(lines) >= 2:
            lines = lines[1:]
            if lines and lines[-1].strip().startswith("```"):
                lines = lines[:-1]
            s = "\n".join(lines).strip()

    try:
        data = json.loads(s)
    except json.JSONDecodeError as exc:
        logger.warning("narrative JSON parse 실패: %s", exc)
        return None

    if not isinstance(data, dict):
        return None

    narrative_text = data.get("text")
    recs = data.get("recommendations")

    if not isinstance(narrative_text, str) or not narrative_text.strip():
        return None
    if not isinstance(recs, list) or not all(isinstance(r, str) for r in recs):
        return None

    # NarrativeMeta 의 source 는 Literal["llm-only"] — 박제
    try:
        return NarrativeMeta(
            text=narrative_text.strip(),
            recommendations=[r.strip() for r in recs],
            source="llm-only",
            model=MODEL_ID,
        )
    except Exception as exc:  # noqa: BLE001
        # Pydantic ValidationError 등 — None 으로 폴백
        logger.warning("NarrativeMeta 생성 실패: %s", exc)
        return None


async def generate_narrative(
    scan_data: dict[str, Any],
    *,
    api_key: str | None = None,
    timeout: float = NARRATIVE_TIMEOUT_SECONDS,
) -> NarrativeMeta | None:
    """측정 결과로 Claude Sonnet 4.6 narrative 생성.

    Args:
        scan_data: ScanResponse 의 dict 표현. hostname/scores/meta 키 사용.
        api_key: 명시 키. None 이면 환경변수 ``ANTHROPIC_API_KEY``.
        timeout: 호출 timeout (초). 기본 8.0 (SPEC §5.1).

    Returns:
        성공: NarrativeMeta. 실패/timeout/no-key/parse-fail: ``None``.

    Notes:
        호출자는 ``None`` 반환 시 ``errors[]`` 에 stage='narrative' 의
        ErrorTrace 를 추가해야 한다 (REQ-API-004). 자세한 실패 분류는
        로그에만 남고 응답 envelope 에는 자가당착 차단을 위해 노출하지 않는다.
    """
    key = api_key or os.environ.get("ANTHROPIC_API_KEY")
    if not key:
        # 로컬 개발 친화 — 즉시 None, 호출자가 NO_API_KEY ErrorTrace 추가
        logger.info("ANTHROPIC_API_KEY 미설정 → narrative 생성 건너뜀")
        return None

    # 지연 import — anthropic 미설치 환경에서도 모듈 로드 가능
    try:
        from anthropic import AsyncAnthropic
        from anthropic import (
            APIConnectionError,
            APIStatusError,
            APITimeoutError,
        )
    except ImportError as exc:
        logger.warning("anthropic SDK import 실패: %s", exc)
        return None

    client = AsyncAnthropic(api_key=key)
    user_text = _build_user_message(scan_data)

    try:
        # asyncio.wait_for 로 SDK 내부 timeout 과 별개의 외곽 timeout 적용
        response = await asyncio.wait_for(
            client.messages.create(
                model=MODEL_ID,
                max_tokens=MAX_OUTPUT_TOKENS,
                # system 은 list[dict] 형식이어야 cache_control 작동 (string 단축 X)
                system=[
                    {
                        "type": "text",
                        "text": _SYSTEM_PROMPT,
                        "cache_control": {"type": "ephemeral"},
                    }
                ],
                messages=[{"role": "user", "content": user_text}],
            ),
            timeout=timeout,
        )
    except asyncio.TimeoutError:
        logger.warning("narrative 호출 timeout (%.1fs 초과)", timeout)
        return None
    except APITimeoutError as exc:
        logger.warning("anthropic APITimeoutError: %s", exc)
        return None
    except APIConnectionError as exc:
        logger.warning("anthropic APIConnectionError: %s", exc)
        return None
    except APIStatusError as exc:
        logger.warning(
            "anthropic APIStatusError: status=%s type=%s",
            getattr(exc, "status_code", "?"),
            getattr(exc, "type", "?"),
        )
        return None
    except Exception as exc:  # noqa: BLE001 — SDK 외 예외 광범위 방어
        logger.warning("narrative 알 수 없는 예외: %s", exc)
        return None
    finally:
        # AsyncAnthropic 의 내부 httpx 클라이언트 정리
        try:
            await client.close()
        except Exception:  # noqa: BLE001
            pass

    # 응답 파싱 — content[0] 이 text block 이라 가정 (system 에서 JSON only 강제)
    try:
        blocks = response.content
        if not blocks:
            return None
        first = blocks[0]
        text = getattr(first, "text", None)
        if not text:
            return None
    except Exception as exc:  # noqa: BLE001
        logger.warning("narrative 응답 구조 파싱 실패: %s", exc)
        return None

    # cache hit 가시화 — 발표 시연용으로 도움됨
    try:
        usage = response.usage
        cache_read = getattr(usage, "cache_read_input_tokens", 0) or 0
        cache_write = getattr(usage, "cache_creation_input_tokens", 0) or 0
        logger.info(
            "narrative usage: in=%s out=%s cache_read=%s cache_write=%s",
            getattr(usage, "input_tokens", "?"),
            getattr(usage, "output_tokens", "?"),
            cache_read,
            cache_write,
        )
    except Exception:  # noqa: BLE001
        pass

    return _parse_response(text)
