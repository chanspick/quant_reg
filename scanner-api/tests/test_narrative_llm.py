"""``services.narrative_llm.generate_narrative`` 단위 테스트 — Gemini 2.0 Flash.

테스트 전략 — 실제 Gemini API 호출 금지, google-genai Client 를 mock:
- (a) 정상 응답 → NarrativeMeta 반환 + source='llm-only' 박제 확인
- (b) asyncio.TimeoutError → None
- (c) NO_KEY (env 미설정) → None
- (d) API 예외 → None
- (e) JSON 파싱 실패 → None
"""

from __future__ import annotations

import asyncio
import sys
import types
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

_SCANNER_API_ROOT = Path(__file__).resolve().parent.parent
if str(_SCANNER_API_ROOT) not in sys.path:
    sys.path.insert(0, str(_SCANNER_API_ROOT))


# google-genai SDK 미설치 환경 대응 — fake 모듈을 sys.modules 에 등록
if "google" not in sys.modules or not hasattr(sys.modules.get("google"), "genai"):
    _fake_google = sys.modules.get("google") or types.ModuleType("google")
    _fake_genai = types.ModuleType("google.genai")
    _fake_types = types.ModuleType("google.genai.types")

    class _FakeGenerateContentConfig:
        def __init__(self, **kwargs: object) -> None:
            for k, v in kwargs.items():
                setattr(self, k, v)

    _fake_types.GenerateContentConfig = _FakeGenerateContentConfig

    class _FakeAioModels:
        async def generate_content(self, **kwargs: object) -> MagicMock:  # type: ignore[override]
            raise NotImplementedError("replace in each test")

    class _FakeAio:
        def __init__(self) -> None:
            self.models = _FakeAioModels()

    class _FakeClient:
        def __init__(self, **kwargs: object) -> None:
            self.aio = _FakeAio()

    _fake_genai.Client = _FakeClient
    _fake_genai.types = _fake_types
    _fake_google.genai = _fake_genai  # type: ignore[attr-defined]
    sys.modules["google"] = _fake_google
    sys.modules["google.genai"] = _fake_genai
    sys.modules["google.genai.types"] = _fake_types


from models.scan_result import NarrativeMeta  # noqa: E402
from services.narrative_llm import MODEL_ID, generate_narrative  # noqa: E402


# --- 픽스처 ------------------------------------------------------------------


@pytest.fixture
def anyio_backend() -> str:
    return "asyncio"


@pytest.fixture
def scan_data() -> dict:
    return {
        "hostname": "example.com",
        "scores": {
            "tls": {"value": 85, "source": "automated"},
            "hybridKem": {"value": 0, "source": "automated"},
            "certOps": {"value": 70, "source": "automated"},
            "quantumThreat": {"value": 50, "source": "automated"},
        },
        "meta": {
            "scoring": {
                "tls": {"rules": [], "cipher_deductions": {}, "final": 85},
                "certOps": {"rules": [], "final": 70},
                "hybridKem": {"value": 0, "basis": "no hybrid group"},
                "quantumThreat": {"qubits": 2330, "scenarios": {}},
            },
            "certificate": {
                "issuer": "Let's Encrypt",
                "subject": "example.com",
                "keyAlgorithm": "RSA-2048",
                "validUntil": "2026-12-31T00:00:00Z",
            },
            "phase2": {"status": "NOT_SUPPORTED", "details": {}},
        },
    }


def _make_response_mock(text: str) -> MagicMock:
    """google-genai GenerateContentResponse 흉내내는 mock."""
    response = MagicMock()
    response.text = text
    usage = MagicMock()
    usage.prompt_token_count = 100
    usage.candidates_token_count = 200
    response.usage_metadata = usage
    return response


_VALID_JSON = (
    '{"text": "example.com 의 TLS 1.3 기본 위생은 양호하나 hybrid KEM 미채택으로'
    ' 양자 내성은 부족합니다.",'
    ' "recommendations": ['
    '"TLS 1.0/1.1 비활성화 권장",'
    '"인증서 키를 ECDSA P-256 로 전환",'
    '"X25519MLKEM768 hybrid group 도입 검토"'
    "]}"
)


# --- (a) 정상 응답 → NarrativeMeta ------------------------------------------


@pytest.mark.anyio
async def test_generate_narrative_success(scan_data: dict) -> None:
    fake_client = MagicMock()
    fake_client.aio.models.generate_content = AsyncMock(
        return_value=_make_response_mock(_VALID_JSON)
    )

    with patch.dict("os.environ", {"GOOGLE_API_KEY": "fake-key"}), patch(
        "google.genai.Client", return_value=fake_client
    ):
        result = await generate_narrative(scan_data)

    assert result is not None
    assert isinstance(result, NarrativeMeta)
    assert result.source == "llm-only"
    assert result.model == MODEL_ID
    assert len(result.recommendations) == 3
    call_kwargs = fake_client.aio.models.generate_content.call_args.kwargs
    assert call_kwargs["model"] == MODEL_ID


# --- (b) timeout → None ------------------------------------------------------


@pytest.mark.anyio
async def test_generate_narrative_timeout(scan_data: dict) -> None:
    async def _slow(**_: object) -> None:
        await asyncio.sleep(9999)

    fake_client = MagicMock()
    fake_client.aio.models.generate_content = _slow

    with patch.dict("os.environ", {"GOOGLE_API_KEY": "fake-key"}), patch(
        "google.genai.Client", return_value=fake_client
    ):
        result = await generate_narrative(scan_data, timeout=0.01)

    assert result is None


# --- (c) NO_KEY → None -------------------------------------------------------


@pytest.mark.anyio
async def test_generate_narrative_no_key(
    scan_data: dict, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.delenv("GOOGLE_API_KEY", raising=False)
    monkeypatch.delenv("GOOGLE_APPLICATION_CREDENTIALS", raising=False)

    result = await generate_narrative(scan_data)
    assert result is None


# --- (d) API 예외 → None -----------------------------------------------------


@pytest.mark.anyio
async def test_generate_narrative_api_error(scan_data: dict) -> None:
    fake_client = MagicMock()
    fake_client.aio.models.generate_content = AsyncMock(
        side_effect=Exception("API 오류 시뮬레이션")
    )

    with patch.dict("os.environ", {"GOOGLE_API_KEY": "fake-key"}), patch(
        "google.genai.Client", return_value=fake_client
    ):
        result = await generate_narrative(scan_data)

    assert result is None


# --- (e) JSON 파싱 실패 → None -----------------------------------------------


@pytest.mark.anyio
async def test_generate_narrative_invalid_json(scan_data: dict) -> None:
    fake_client = MagicMock()
    fake_client.aio.models.generate_content = AsyncMock(
        return_value=_make_response_mock("죄송합니다, JSON 형식으로 답변하지 못했습니다.")
    )

    with patch.dict("os.environ", {"GOOGLE_API_KEY": "fake-key"}), patch(
        "google.genai.Client", return_value=fake_client
    ):
        result = await generate_narrative(scan_data)

    assert result is None
