"""``services.narrative_llm.generate_narrative`` 단위 테스트 — SPEC-PQC-002 Phase D.

실행:
    cd scanner-api && pytest tests/test_narrative_llm.py -v

테스트 전략 — 실제 Anthropic API 호출 금지, ``AsyncAnthropic`` 을 통째로 mock:
- (a) 정상 응답 → NarrativeMeta 반환 + source='llm-only' 박제 확인
- (b) APITimeoutError → None
- (c) NO_API_KEY → None (호출자가 ErrorTrace 추가하는 부분은 routes/scan.py 책임)
- (d) APIStatusError → None

평탄 레이아웃 대응으로 ``scanner-api/`` 를 sys.path 에 추가하는 패턴은
``tests/test_cors.py`` 와 정합.
"""

from __future__ import annotations

import sys
import types
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

# scanner-api/ 를 sys.path 에 추가 — 평탄 레이아웃 대응
_SCANNER_API_ROOT = Path(__file__).resolve().parent.parent
if str(_SCANNER_API_ROOT) not in sys.path:
    sys.path.insert(0, str(_SCANNER_API_ROOT))


# anthropic SDK 가 미설치된 환경에서도 테스트가 돌도록 fake 모듈을 sys.modules 에
# 등록한다. generate_narrative 가 함수 안에서 lazy import 하므로 module 객체에
# AsyncAnthropic / APIStatusError / APITimeoutError / APIConnectionError 만
# 노출돼 있으면 충분하다. 실제 anthropic 이 설치된 환경에서는 그쪽이 우선.
if "anthropic" not in sys.modules:
    _fake = types.ModuleType("anthropic")

    class _FakeAsyncAnthropic:
        def __init__(self, *args, **kwargs):
            pass

        async def close(self):
            pass

        # messages.create 는 테스트에서 patch 로 대체

    class _FakeAPIError(Exception):
        """공통 베이스 — 테스트에서 raise 용."""

    class _FakeAPITimeoutError(_FakeAPIError):
        def __init__(self, *args, request=None, **kwargs):
            super().__init__("fake timeout")

    class _FakeAPIConnectionError(_FakeAPIError):
        def __init__(self, *args, request=None, **kwargs):
            super().__init__("fake connection error")

    class _FakeAPIStatusError(_FakeAPIError):
        def __init__(self, message="", *, response=None, body=None, **kwargs):
            super().__init__(message)
            self.status_code = getattr(response, "status_code", 500)
            self.type = (
                (body or {}).get("error", {}).get("type")
                if isinstance(body, dict)
                else None
            )

    _fake.AsyncAnthropic = _FakeAsyncAnthropic
    _fake.APITimeoutError = _FakeAPITimeoutError
    _fake.APIConnectionError = _FakeAPIConnectionError
    _fake.APIStatusError = _FakeAPIStatusError
    sys.modules["anthropic"] = _fake


from models.scan_result import NarrativeMeta  # noqa: E402
from services.narrative_llm import MODEL_ID, generate_narrative  # noqa: E402


# --- 공통 픽스처 -------------------------------------------------------------


@pytest.fixture
def anyio_backend() -> str:
    """anyio 백엔드 — asyncio 만 사용 (trio 미설치)."""
    return "asyncio"


@pytest.fixture
def scan_data() -> dict:
    """LLM 입력으로 쓸 측정 결과 fixture — 최소한의 필드만."""
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
    """anthropic ``Message`` 응답을 흉내내는 mock — content[0].text 만 채움."""
    block = MagicMock()
    block.text = text
    response = MagicMock()
    response.content = [block]
    # usage 로그 안전성 — getattr 폴백 잘 동작하도록 일부 필드만 세팅
    response.usage = MagicMock(
        input_tokens=100,
        output_tokens=200,
        cache_read_input_tokens=0,
        cache_creation_input_tokens=0,
    )
    return response


# --- (a) 정상 응답 → NarrativeMeta -----------------------------------------


@pytest.mark.anyio
async def test_generate_narrative_success(scan_data: dict) -> None:
    """정상 JSON 응답이면 NarrativeMeta + source='llm-only' 박제."""
    payload_text = (
        '{"text": "example.com 의 TLS 위생은 양호하나 hybrid KEM 미채택으로 '
        '양자 내성은 부족합니다. " ,'
        ' "recommendations": ["TLS 1.0/1.1 비활성", "RSA-2048 → ECDSA P-256",'
        ' "X25519MLKEM768 도입"]}'
    )
    # JSON 파싱 가능하도록 다시 만들기 (위 문자열은 보기용)
    payload_text = (
        '{"text": "example.com 의 TLS 1.3 기본 위생은 양호하나 hybrid KEM 미채택으로'
        ' 양자 내성은 부족합니다.",'
        ' "recommendations": ['
        '"TLS 1.0/1.1 비활성화 권장",'
        '"인증서 키를 ECDSA P-256 로 전환",'
        '"X25519MLKEM768 hybrid group 도입 검토"'
        ']}'
    )

    fake_client = MagicMock()
    fake_client.messages.create = AsyncMock(
        return_value=_make_response_mock(payload_text)
    )
    fake_client.close = AsyncMock()

    with patch.dict("os.environ", {"ANTHROPIC_API_KEY": "sk-test"}), patch(
        "anthropic.AsyncAnthropic", return_value=fake_client
    ):
        result = await generate_narrative(scan_data)

    assert result is not None
    assert isinstance(result, NarrativeMeta)
    assert result.source == "llm-only"
    assert result.model == MODEL_ID
    assert len(result.recommendations) == 3
    assert "TLS" in result.text or "tls" in result.text.lower()
    # cache_control 적용 호출 확인
    call_kwargs = fake_client.messages.create.call_args.kwargs
    assert call_kwargs["model"] == MODEL_ID
    system = call_kwargs["system"]
    assert isinstance(system, list)
    assert system[0]["cache_control"] == {"type": "ephemeral"}


# --- (b) timeout → None ------------------------------------------------------


@pytest.mark.anyio
async def test_generate_narrative_timeout(scan_data: dict) -> None:
    """APITimeoutError 발생 시 None — 호출자가 errors[] 처리."""
    from anthropic import APITimeoutError

    fake_client = MagicMock()
    # APITimeoutError 는 httpx.Request 인자 필요 — MagicMock 으로 대체
    fake_client.messages.create = AsyncMock(
        side_effect=APITimeoutError(request=MagicMock())
    )
    fake_client.close = AsyncMock()

    with patch.dict("os.environ", {"ANTHROPIC_API_KEY": "sk-test"}), patch(
        "anthropic.AsyncAnthropic", return_value=fake_client
    ):
        result = await generate_narrative(scan_data, timeout=1.0)

    assert result is None


# --- (c) NO_API_KEY → None ---------------------------------------------------


@pytest.mark.anyio
async def test_generate_narrative_no_api_key(
    scan_data: dict, monkeypatch: pytest.MonkeyPatch
) -> None:
    """환경변수 미설정이면 SDK 초기화 전에 즉시 None."""
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)

    # patch 자체 없이도 동작해야 함 — generate_narrative 가 SDK 를 import 도 안 한다
    result = await generate_narrative(scan_data)
    assert result is None


# --- (d) APIStatusError → None ----------------------------------------------


@pytest.mark.anyio
async def test_generate_narrative_api_error(scan_data: dict) -> None:
    """API 5xx / 4xx 시 None — 자가당착 차단."""
    from anthropic import APIStatusError

    fake_response = MagicMock()
    fake_response.status_code = 529
    # APIStatusError signature: message, response, body
    err = APIStatusError(
        "overloaded",
        response=fake_response,
        body={"error": {"type": "overloaded_error"}},
    )

    fake_client = MagicMock()
    fake_client.messages.create = AsyncMock(side_effect=err)
    fake_client.close = AsyncMock()

    with patch.dict("os.environ", {"ANTHROPIC_API_KEY": "sk-test"}), patch(
        "anthropic.AsyncAnthropic", return_value=fake_client
    ):
        result = await generate_narrative(scan_data)

    assert result is None


# --- 보너스: JSON 파싱 실패도 None -------------------------------------------


@pytest.mark.anyio
async def test_generate_narrative_invalid_json(scan_data: dict) -> None:
    """LLM 이 JSON 이 아닌 산문을 반환하면 None — 응답에 narrative omit."""
    fake_client = MagicMock()
    fake_client.messages.create = AsyncMock(
        return_value=_make_response_mock(
            "죄송합니다, JSON 형식으로 답하지 못했습니다."
        )
    )
    fake_client.close = AsyncMock()

    with patch.dict("os.environ", {"ANTHROPIC_API_KEY": "sk-test"}), patch(
        "anthropic.AsyncAnthropic", return_value=fake_client
    ):
        result = await generate_narrative(scan_data)

    assert result is None
