"""FastAPI app entry — SPEC-PQC-002 Phase A.

실행:
    uvicorn main:app --reload --port 8000 --app-dir scanner-api

또는 (포트는 환경변수 ``PORT`` 기본 8000):
    python -m scanner-api.main   # X — 하이픈 때문에 import 불가
    cd scanner-api && python main.py

CORS:
    Phase A-1+A-2 는 ``allow_origins=["*"]`` 로 모두 허용.
    Phase A-3 에서 ``ALLOWED_ORIGINS`` 환경변수 기반으로 제한 (REQ-API-006).

환경변수:
    - PORT             : uvicorn 포트 (기본 8000)
    - ALLOWED_ORIGINS  : Phase A-3 에서 사용 (현재는 미사용)
    - ANTHROPIC_API_KEY: Phase D 에서 사용 (현재는 미사용)
    - LOG_LEVEL        : 로그 레벨 (기본 INFO)
"""

from __future__ import annotations

import logging
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routes.scan import router as scan_router

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

# TODO Phase A-3: tighten via ALLOWED_ORIGINS env (REQ-API-006)
# 현재는 개발 편의를 위해 모든 origin 허용.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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
