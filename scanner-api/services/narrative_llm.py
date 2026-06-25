"""Phase D LLM narrative wrapper — Gemini 2.0 Flash via google-genai SDK.

환경변수 (둘 중 하나):
  GOOGLE_API_KEY                 → Google AI Studio 모드 (API key 직접 지정)
  GOOGLE_APPLICATION_CREDENTIALS → Vertex AI 모드 (서비스 계정 JSON 경로)

GOOGLE_API_KEY 우선. 없으면 ADC(GOOGLE_APPLICATION_CREDENTIALS)로 Vertex AI
project=496146676363 / location=us-central1 에 연결.

source 라벨 ``llm-only`` 박제 (정직성 시스템 일관).
실패/timeout/no-key → ``None`` 반환, 호출자가 errors[] 에 ErrorTrace 추가.
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
from typing import Any

from models.scan_result import NarrativeMeta

logger = logging.getLogger("scanner_api.narrative")

MODEL_ID = "gemini-2.0-flash"
_VERTEX_PROJECT = "496146676363"
_VERTEX_LOCATION = "us-central1"

NARRATIVE_TIMEOUT_SECONDS = 60.0
MAX_OUTPUT_TOKENS = 1024


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
    hostname = scan_data.get("hostname") or "(unknown)"
    scores = scan_data.get("scores") or {}
    meta = scan_data.get("meta") or {}
    scoring = meta.get("scoring") or {}
    certificate = meta.get("certificate") or {}
    phase2 = meta.get("phase2") or {}

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
    if not text or not text.strip():
        return None

    s = text.strip()
    if s.startswith("```"):
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

    try:
        return NarrativeMeta(
            text=narrative_text.strip(),
            recommendations=[r.strip() for r in recs],
            source="llm-only",
            model=MODEL_ID,
        )
    except Exception as exc:  # noqa: BLE001
        logger.warning("NarrativeMeta 생성 실패: %s", exc)
        return None


async def generate_narrative(
    scan_data: dict[str, Any],
    *,
    api_key: str | None = None,
    timeout: float = NARRATIVE_TIMEOUT_SECONDS,
) -> NarrativeMeta | None:
    """측정 결과로 Gemini 2.0 Flash narrative 생성.

    Returns:
        성공: NarrativeMeta. 실패/timeout/no-key/parse-fail: None.
    """
    key = api_key or os.environ.get("GOOGLE_API_KEY")
    has_vertex = bool(os.environ.get("GOOGLE_APPLICATION_CREDENTIALS"))

    if not key and not has_vertex:
        logger.info("GOOGLE_API_KEY / GOOGLE_APPLICATION_CREDENTIALS 미설정 → narrative 건너뜀")
        return None

    try:
        from google import genai
        from google.genai import types as genai_types
    except ImportError as exc:
        logger.warning("google-genai SDK import 실패: %s", exc)
        return None

    if key:
        client = genai.Client(api_key=key)
    else:
        client = genai.Client(
            vertexai=True,
            project=_VERTEX_PROJECT,
            location=_VERTEX_LOCATION,
        )

    user_text = _build_user_message(scan_data)

    try:
        response = await asyncio.wait_for(
            client.aio.models.generate_content(
                model=MODEL_ID,
                contents=user_text,
                config=genai_types.GenerateContentConfig(
                    system_instruction=_SYSTEM_PROMPT,
                    max_output_tokens=MAX_OUTPUT_TOKENS,
                ),
            ),
            timeout=timeout,
        )
    except asyncio.TimeoutError:
        logger.warning("narrative 호출 timeout (%.1fs 초과)", timeout)
        return None
    except Exception as exc:  # noqa: BLE001
        logger.warning("narrative 예외: %s", exc)
        return None

    try:
        text = response.text
        if not text:
            return None
    except Exception as exc:  # noqa: BLE001
        logger.warning("narrative 응답 텍스트 추출 실패: %s", exc)
        return None

    try:
        usage = response.usage_metadata
        logger.info(
            "narrative usage: prompt_tokens=%s candidates_tokens=%s",
            getattr(usage, "prompt_token_count", "?"),
            getattr(usage, "candidates_token_count", "?"),
        )
    except Exception:  # noqa: BLE001
        pass

    return _parse_response(text)
