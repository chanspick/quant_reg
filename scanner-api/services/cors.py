"""CORS origin 파싱 헬퍼 — SPEC-PQC-002 Phase A-3 (REQ-API-006).

``ALLOWED_ORIGINS`` 환경변수 (콤마 구분 문자열) 를 FastAPI ``CORSMiddleware`` 에
바로 넘길 수 있는 ``list[str]`` 로 변환한다. 단위 테스트는
``tests/test_cors.py`` 참조.
"""

from __future__ import annotations

import logging

logger = logging.getLogger("scanner_api.cors")

# 미설정 시 로컬 dev 만 허용 — production 폴백으로 ``*`` 금지 (REQ-API-006)
DEFAULT_ALLOWED_ORIGINS: tuple[str, ...] = (
    "http://localhost:5173",
    "http://localhost:5174",
)

# scheme 검증 — http/https 만 허용
_VALID_SCHEMES: tuple[str, ...] = ("http://", "https://")


def parse_allowed_origins(raw: str | None) -> list[str]:
    """``ALLOWED_ORIGINS`` 환경변수 값을 화이트리스트로 변환.

    Args:
        raw: 환경변수 원본. ``None`` / 빈 문자열이면 dev 기본값 사용.

    Returns:
        scheme 검증을 통과한 origin 목록. 항상 비어있지 않음
        (최소 ``DEFAULT_ALLOWED_ORIGINS``).

    Notes:
        - ``*`` 단일 입력은 경고 로그만 남기고 그대로 통과 (개발 편의).
          production 에서는 명시적 origin 사용 권장.
        - scheme 누락된 항목은 silent drop (warning 로그).
    """
    if raw is None or not raw.strip():
        return list(DEFAULT_ALLOWED_ORIGINS)

    # 와일드카드 단일 입력 — 경고만, 차단 안 함
    if raw.strip() == "*":
        logger.warning(
            "ALLOWED_ORIGINS=* detected — production 에서는 위험. "
            "명시적 origin 사용 권장 (REQ-API-006)."
        )
        return ["*"]

    parsed: list[str] = []
    for item in raw.split(","):
        origin = item.strip()
        if not origin:
            continue
        # scheme 검증 — http/https 만 통과
        if not origin.startswith(_VALID_SCHEMES):
            logger.warning(
                "ALLOWED_ORIGINS entry skipped (invalid scheme): %r", origin
            )
            continue
        parsed.append(origin)

    # 모두 invalid 였다면 dev 기본값 폴백
    if not parsed:
        logger.warning(
            "ALLOWED_ORIGINS parsed empty — falling back to dev defaults."
        )
        return list(DEFAULT_ALLOWED_ORIGINS)

    return parsed
