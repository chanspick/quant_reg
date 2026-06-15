"""``services.cors.parse_allowed_origins`` 단위 테스트 — SPEC-PQC-002 Phase A-3.

실행:
    cd scanner-api && pytest tests/test_cors.py -v

``scanner-api/`` 자체가 ``app-dir`` (README 의 평탄 레이아웃 규칙) 이므로
sys.path 에 직접 추가해 ``services.cors`` 를 import.
"""

from __future__ import annotations

import logging
import sys
from pathlib import Path

import pytest

# scanner-api/ 를 sys.path 에 추가 — 평탄 레이아웃 대응
_SCANNER_API_ROOT = Path(__file__).resolve().parent.parent
if str(_SCANNER_API_ROOT) not in sys.path:
    sys.path.insert(0, str(_SCANNER_API_ROOT))

from services.cors import DEFAULT_ALLOWED_ORIGINS, parse_allowed_origins


class TestParseAllowedOrigins:
    """파싱 헬퍼 정상/엣지 케이스."""

    def test_none_returns_dev_defaults(self) -> None:
        """env 미설정 → 로컬 dev 기본값."""
        assert parse_allowed_origins(None) == list(DEFAULT_ALLOWED_ORIGINS)

    def test_empty_string_returns_dev_defaults(self) -> None:
        """빈 문자열 / 공백 only → dev 기본값."""
        assert parse_allowed_origins("") == list(DEFAULT_ALLOWED_ORIGINS)
        assert parse_allowed_origins("   ") == list(DEFAULT_ALLOWED_ORIGINS)

    def test_comma_separated_https_origins(self) -> None:
        """정상 production 시나리오 — https origin 두 개."""
        raw = "https://quant-reg.vercel.app,https://api.example.com"
        result = parse_allowed_origins(raw)
        assert result == [
            "https://quant-reg.vercel.app",
            "https://api.example.com",
        ]

    def test_whitespace_and_empty_entries_are_trimmed(self) -> None:
        """주변 공백/빈 항목 제거."""
        raw = "  http://localhost:5173 ,, https://app.example.com ,"
        result = parse_allowed_origins(raw)
        assert result == [
            "http://localhost:5173",
            "https://app.example.com",
        ]

    def test_wildcard_passes_with_warning(
        self, caplog: pytest.LogCaptureFixture
    ) -> None:
        """``*`` 단일 입력 — 경고 로그 출력하되 통과 (개발 편의)."""
        with caplog.at_level(logging.WARNING, logger="scanner_api.cors"):
            result = parse_allowed_origins("*")
        assert result == ["*"]
        assert any("ALLOWED_ORIGINS=*" in rec.message for rec in caplog.records)

    def test_invalid_scheme_entries_are_dropped(
        self, caplog: pytest.LogCaptureFixture
    ) -> None:
        """scheme 누락 entry 는 silent drop (warning 만)."""
        raw = "example.com,https://ok.com,ftp://bad.com"
        with caplog.at_level(logging.WARNING, logger="scanner_api.cors"):
            result = parse_allowed_origins(raw)
        assert result == ["https://ok.com"]
        # 두 개의 invalid entry 가 경고로 남았는지
        warnings = [r for r in caplog.records if r.levelno == logging.WARNING]
        assert len(warnings) >= 2
