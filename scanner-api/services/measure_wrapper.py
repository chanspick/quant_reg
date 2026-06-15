"""Phase 1 측정 wrapper — ``scanner.measure`` subprocess 호출.

설계 결정 (SPEC §1.2 vs scanner CLI 실제):
- SPEC §1.2 / §5.1 REQ-API-002 는 ``--out -`` (stdout 모드) 를 가정하지만
  실제 ``scanner/measure.py`` 는 ``--stdout`` 플래그만 지원하며 이 플래그
  사용 시 partial 만 stdout 으로 출력하고 meta(scoring breakdown) 파일은
  쓰지 않는다.
- SPEC §3.2 ``ScanResponse.meta.scoring`` 은 scoring breakdown 을 요구하므로
  partial + meta 두 파일을 모두 얻어야 한다.
- 결론: ``--stdout`` 대신 ``--out <tmp>/p.json`` + ``--meta-out <tmp>/m.json``
  으로 호출하고, 종료 후 두 파일을 읽어 합치고 tmp 디렉토리는 정리한다.
- scanner 코드 무수정 원칙 준수, scanner/out 디렉토리 오염 없음.

subprocess 실행 모델:
- ``asyncio.create_subprocess_exec`` 는 Windows 에서 ProactorEventLoop 필수.
  uvicorn --reload + watchfiles 가 SelectorEventLoop 로 떨어뜨리는 경우
  ``loop.subprocess_exec`` 가 NotImplementedError 로 죽는다.
- 대안: 동기 ``subprocess.run`` 을 ``asyncio.to_thread`` 로 thread pool 에서
  실행 → event loop 타입 무관, POSIX/Windows 동일 동작.

에러 코드 (ErrorCode enum):
- ``DNS_FAIL``        — hostname 해석 실패 (subprocess stderr 의 socket / DNS 키워드)
- ``TCP_BLOCKED``     — TCP RST / 방화벽 차단
- ``SSLYZE_REJECTED`` — sslyze 가 connectivity error 로 거부
- ``TIMEOUT``         — 40초 timeout 초과
- ``INTERNAL``        — 그 외 모든 실패 (subprocess non-zero exit, JSON parse 실패 등)
"""

from __future__ import annotations

import asyncio
import json
import os
import shutil
import subprocess
import sys
import tempfile
from enum import Enum
from pathlib import Path
from typing import Any

# Phase 1 측정 timeout (SPEC §5.1 REQ-API-002)
MEASURE_TIMEOUT_SECONDS = 40.0

# scanner 패키지가 위치한 프로젝트 루트.
# - scanner-api/services/measure_wrapper.py 의 부모의 부모의 부모 = quant_reg/
# - 환경변수 ``SCANNER_PROJECT_ROOT`` 로 override 가능 (Docker / Railway 용).
_DEFAULT_PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
PROJECT_ROOT = Path(
    os.environ.get("SCANNER_PROJECT_ROOT") or _DEFAULT_PROJECT_ROOT
).resolve()


class ErrorCode(str, Enum):
    """측정 실패 분류 — wrapper 공통."""

    DNS_FAIL = "DNS_FAIL"
    TCP_BLOCKED = "TCP_BLOCKED"
    SSLYZE_REJECTED = "SSLYZE_REJECTED"
    TIMEOUT = "TIMEOUT"
    INTERNAL = "INTERNAL"


# stderr 키워드 → ErrorCode 매핑 (대소문자 무관 substring 매칭)
_STDERR_PATTERNS: tuple[tuple[str, ErrorCode], ...] = (
    ("name or service not known", ErrorCode.DNS_FAIL),
    ("nodename nor servname", ErrorCode.DNS_FAIL),
    ("temporary failure in name resolution", ErrorCode.DNS_FAIL),
    ("getaddrinfo failed", ErrorCode.DNS_FAIL),
    ("no address associated", ErrorCode.DNS_FAIL),
    ("connection refused", ErrorCode.TCP_BLOCKED),
    ("connection reset", ErrorCode.TCP_BLOCKED),
    ("network is unreachable", ErrorCode.TCP_BLOCKED),
    ("no route to host", ErrorCode.TCP_BLOCKED),
    ("connectivity error", ErrorCode.SSLYZE_REJECTED),
    ("connectivityerror", ErrorCode.SSLYZE_REJECTED),
    ("could not connect", ErrorCode.SSLYZE_REJECTED),
    ("handshake failed", ErrorCode.SSLYZE_REJECTED),
)


def _classify_stderr(stderr: str) -> ErrorCode:
    """stderr 내용에서 에러 코드 추정. 매칭 실패 시 INTERNAL."""
    low = (stderr or "").lower()
    for needle, code in _STDERR_PATTERNS:
        if needle in low:
            return code
    return ErrorCode.INTERNAL


async def run_measure(hostname: str) -> dict[str, Any]:
    """``scanner.measure`` 를 subprocess 로 실행해 partial + scoring 반환.

    Returns
    -------
    성공 시: ``{"ok": True, "partial": <dict>, "meta": <dict>, "stderr": <str>}``
        - ``partial`` 은 to_partial_domain 결과 (scores, certificate, quantumThreatDetail, ...)
        - ``meta``    는 build_measurement_meta 결과 (scoring breakdown 포함)
    실패 시: ``{"ok": False, "error_code": ErrorCode, "message": <str>, "stderr": <str>}``

    예외는 raise 하지 않는다 — 모든 실패를 dict 로 반환해 라우트에서 errors[] 처리.
    """
    # 임시 출력 디렉토리: scanner/out 오염 방지
    tmp_dir = Path(tempfile.mkdtemp(prefix="scanner_api_measure_"))
    out_path = tmp_dir / "partial.json"
    meta_path = tmp_dir / "meta.json"

    cmd = [
        sys.executable,
        "-m",
        "scanner.measure",
        "--hostname",
        hostname,
        "--out",
        str(out_path),
        "--meta-out",
        str(meta_path),
    ]

    # event loop 타입 무관 패턴 — Windows SelectorEventLoop 에서도 동작.
    def _run_sync() -> subprocess.CompletedProcess[bytes]:
        # cmd 는 신뢰된 sys.executable + 고정 인자 — shell injection 위험 없음
        return subprocess.run(  # noqa: S603
            cmd,
            capture_output=True,
            timeout=MEASURE_TIMEOUT_SECONDS,
            cwd=str(PROJECT_ROOT),
            check=False,
        )

    try:
        try:
            completed = await asyncio.to_thread(_run_sync)
        except subprocess.TimeoutExpired:
            # subprocess.run 이 timeout 시 자동으로 자식 프로세스 kill 후 raise
            return {
                "ok": False,
                "error_code": ErrorCode.TIMEOUT,
                "message": (
                    f"scanner.measure 측정이 {MEASURE_TIMEOUT_SECONDS:.0f}초 "
                    "내에 완료되지 않았습니다."
                ),
                "stderr": "",
            }
        except (OSError, FileNotFoundError) as exc:
            return {
                "ok": False,
                "error_code": ErrorCode.INTERNAL,
                "message": f"subprocess 시작 실패: {exc}",
                "stderr": "",
            }

        stderr_text = completed.stderr.decode("utf-8", errors="replace") if completed.stderr else ""

        # subprocess 비정상 종료 시
        if completed.returncode != 0:
            code = _classify_stderr(stderr_text)
            return {
                "ok": False,
                "error_code": code,
                "message": (
                    f"scanner.measure 가 비정상 종료 (exit={completed.returncode}). "
                    f"분류: {code.value}"
                ),
                "stderr": stderr_text,
            }

        # 출력 파일 존재 확인
        if not out_path.exists() or not meta_path.exists():
            return {
                "ok": False,
                "error_code": ErrorCode.INTERNAL,
                "message": (
                    "scanner.measure 가 정상 종료했으나 출력 파일이 없습니다."
                ),
                "stderr": stderr_text,
            }

        # JSON 파싱
        try:
            partial = json.loads(out_path.read_text(encoding="utf-8"))
            meta = json.loads(meta_path.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError) as exc:
            return {
                "ok": False,
                "error_code": ErrorCode.INTERNAL,
                "message": f"scanner.measure 출력 파싱 실패: {exc}",
                "stderr": stderr_text,
            }

        return {
            "ok": True,
            "partial": partial,
            "meta": meta,
            "stderr": stderr_text,
        }

    finally:
        # 임시 디렉토리 정리 — 실패해도 무시
        try:
            shutil.rmtree(tmp_dir, ignore_errors=True)
        except Exception:  # noqa: BLE001
            pass
