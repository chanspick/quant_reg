"""FastAPI app entry — SPEC-PQC-002 Phase A.

실행:
    uvicorn main:app --reload --port 8000 --app-dir scanner-api

또는 (포트는 환경변수 ``PORT`` 기본 8000):
    python -m scanner-api.main   # X — 하이픈 때문에 import 불가
    cd scanner-api && python main.py

CORS:
    Phase A-3 부터 ``ALLOWED_ORIGINS`` 환경변수 (콤마 구분) 화이트리스트로
    제한 (REQ-API-006). 미설정 시 로컬 dev 기본값만 허용 — production 폴백
    으로 ``*`` 금지. 파싱 로직은 ``services.cors.parse_allowed_origins`` 참조.

환경변수:
    - PORT             : uvicorn 포트 (기본 8000)
    - ALLOWED_ORIGINS  : CORS 화이트리스트 (콤마 구분, 예: ``https://a.com,https://b.com``)
    - ANTHROPIC_API_KEY: Phase D 에서 사용 (현재는 미사용)
    - LOG_LEVEL        : 로그 레벨 (기본 INFO)
"""

from __future__ import annotations

import asyncio
import logging
import os
import sys
from pathlib import Path

# Windows + uvicorn --reload 조합에서 SelectorEventLoop 가 활성화되면
# asyncio.create_subprocess_exec 가 NotImplementedError 로 죽는다
# (scanner.measure / scanner.pqc_probe subprocess 호출 불가).
# ProactorEventLoop 강제 — POSIX 에는 if 문이 매칭되지 않아 영향 없음.
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from routes.scan import router as scan_router
from services.cors import parse_allowed_origins

# 로깅 — 환경변수로 레벨 제어
_log_level = os.environ.get("LOG_LEVEL", "INFO").upper()
logging.basicConfig(
    level=getattr(logging, _log_level, logging.INFO),
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("scanner_api")

app = FastAPI(
    title="PQC Scanner API",
    description=(
        "SPEC-PQC-002 동적 PQC 스캐너 — scanner CLI 의 FastAPI subprocess "
        "wrapper. 발표 시연 한정, 진단·감사·구매 결정에 사용 금지."
    ),
    version="0.1.0-phase-a",
)

# REQ-API-006 — ALLOWED_ORIGINS 환경변수 기반 화이트리스트
_allowed_origins = parse_allowed_origins(os.environ.get("ALLOWED_ORIGINS"))
logger.info("CORS allow_origins=%s", _allowed_origins)
app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)

# /api/scan 라우터 마운트
app.include_router(scan_router)


@app.get("/health", tags=["meta"])
async def health() -> dict[str, str]:
    """헬스 체크 — Railway / load balancer 용."""
    return {"status": "ok"}


# 발표 시연용 single image 배포 — Railway 컨테이너에서만 활성
# StaticFiles 는 반드시 /api · /health 라우트 **이후** 마운트 (catch-all 이 API 를 가리지 않도록).
_static_dir = Path(os.environ.get("STATIC_DIR", "/app/static"))
if _static_dir.is_dir() and (_static_dir / "index.html").exists():
    app.mount(
        "/",
        StaticFiles(directory=str(_static_dir), html=True),
        name="static",
    )
    logger.info("StaticFiles mounted at / from %s", _static_dir)
else:
    logger.info(
        "StaticFiles skip — %s 미존재 (로컬 dev: scanner-web/dist 별도 서빙 가정)",
        _static_dir,
    )


def main() -> None:
    """``python main.py`` 직접 실행 진입점.

    프로덕션에서는 ``uvicorn main:app --host 0.0.0.0 --port $PORT`` 권장.
    """
    import uvicorn

    port = int(os.environ.get("PORT", "8000"))
    logger.info("Starting uvicorn on 0.0.0.0:%d", port)
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        reload=False,
    )


if __name__ == "__main__":
    main()
