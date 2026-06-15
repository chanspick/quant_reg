"""Phase 2 PQC probe wrapper — ``scanner.pqc_probe`` subprocess 호출.

scanner.pqc_probe CLI (검증 결과, ``scanner/pqc_probe.py`` 의 ``main()``):
- ``--hostname <host>`` 필수
- ``--timeout <float>`` 기본 8.0
- ``--out <path>`` 기본 ``scanner/out/pqc-probe-results.json`` (단일 호출 시 사용 안 함)
- 단일 호출 모드는 stdout 으로 ``ProbeResult.to_dict()`` JSON 을 출력
  (``{hostname, status, selected_group, is_hrr, alert_level, alert_description, detail}``)
- exit code: 0 = SUPPORTED, 1 = 그 외 — 즉 0이 아니어도 정상 측정일 수 있음

따라서:
- subprocess 의 returncode 만으로 실패 판단하지 않는다.
- stdout JSON 파싱이 성공하면 ``status`` 필드로 결과를 분류한다.
- stdout 파싱 실패 + 빈 출력 같은 진짜 실패만 ``ok: False`` 로 보고한다.

Phase 1 실패 시 호출하지 않는다 — 호출자(라우트 핸들러) 책임.
"""

from __future__ import annotations

import asyncio
import json
import sys
from typing import Any

from .measure_wrapper import PROJECT_ROOT, ErrorCode, _classify_stderr

# Phase 2 probe timeout (SPEC §5.1 REQ-API-003)
PROBE_TIMEOUT_SECONDS = 15.0
# pqc_probe 내부 socket timeout 도 8s 이지만 외부 wait_for 는 더 여유롭게 15s.


async def run_pqc_probe(hostname: str) -> dict[str, Any]:
    """``scanner.pqc_probe`` 를 subprocess 로 실행해 ProbeResult dict 반환.

    Returns
    -------
    성공 시: ``{"ok": True, "result": <dict>, "stderr": <str>}``
        - ``result`` 는 ``ProbeResult.to_dict()`` 그대로
          (``status`` ∈ ``SUPPORTED`` / ``NOT_SUPPORTED`` /
          ``NOT_SUPPORTED_OTHER_GROUP`` / ``ERROR_*``).
    실패 시: ``{"ok": False, "error_code": ErrorCode, "message": <str>, "stderr": <str>}``

    예외는 raise 하지 않는다 — 전체 요청은 partial 로 진행 가능하므로
    호출자가 errors[] 에 기록하고 Phase 2 만 실패로 표기한다.
    """
    cmd = [
        sys.executable,
        "-m",
        "scanner.pqc_probe",
        "--hostname",
        hostname,
    ]

    try:
        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            cwd=str(PROJECT_ROOT),
        )
    except (OSError, FileNotFoundError) as exc:
        return {
            "ok": False,
            "error_code": ErrorCode.INTERNAL,
            "message": f"subprocess 시작 실패: {exc}",
            "stderr": "",
        }

    try:
        stdout_bytes, stderr_bytes = await asyncio.wait_for(
            proc.communicate(),
            timeout=PROBE_TIMEOUT_SECONDS,
        )
    except asyncio.TimeoutError:
        try:
            proc.kill()
            await proc.wait()
        except ProcessLookupError:
            pass
        return {
            "ok": False,
            "error_code": ErrorCode.TIMEOUT,
            "message": (
                f"scanner.pqc_probe 가 {PROBE_TIMEOUT_SECONDS:.0f}초 내에 "
                "완료되지 않았습니다."
            ),
            "stderr": "",
        }

    stderr_text = stderr_bytes.decode("utf-8", errors="replace") if stderr_bytes else ""
    stdout_text = stdout_bytes.decode("utf-8", errors="replace") if stdout_bytes else ""

    # exit code 가 0 또는 1 이면 정상 측정 — JSON 파싱 시도
    # exit code 가 그 외 (예: 2 = argparse 실패) 이면 무조건 실패
    if proc.returncode not in (0, 1):
        code = _classify_stderr(stderr_text)
        return {
            "ok": False,
            "error_code": code,
            "message": (
                f"scanner.pqc_probe 가 비정상 종료 (exit={proc.returncode}). "
                f"분류: {code.value}"
            ),
            "stderr": stderr_text,
        }

    if not stdout_text.strip():
        return {
            "ok": False,
            "error_code": ErrorCode.INTERNAL,
            "message": "scanner.pqc_probe 가 빈 stdout 을 반환했습니다.",
            "stderr": stderr_text,
        }

    try:
        result = json.loads(stdout_text)
    except json.JSONDecodeError as exc:
        return {
            "ok": False,
            "error_code": ErrorCode.INTERNAL,
            "message": f"scanner.pqc_probe stdout JSON 파싱 실패: {exc}",
            "stderr": stderr_text,
        }

    # 결과 자체에 ``status`` 가 ERROR_* 면 측정은 됐지만 차단/네트워크 문제
    # 이는 ``ok=True`` 로 반환하고 라우트가 status='partial' 로 변환.
    return {
        "ok": True,
        "result": result,
        "stderr": stderr_text,
    }
