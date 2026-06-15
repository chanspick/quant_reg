# syntax=docker/dockerfile:1.7
# SPEC-PQC-002 Phase B — Railway single image (FastAPI + scanner-web/dist).
# 빌드 컨텍스트는 프로젝트 루트(quant_reg/) — 루트 .dockerignore 가 컨텍스트 정리.
# 빌드:  docker build -t quant-scanner:test -f scanner-api/Dockerfile .
# 실행:  docker run -p 8000:8000 -e ALLOWED_ORIGINS=http://localhost:8000 quant-scanner:test

# ---------------------------------------------------------------------------
# Stage 1: web-builder — scanner-web/ → /build/dist (Vite production build)
# ---------------------------------------------------------------------------
FROM node:22-alpine AS web-builder

# 왜: corepack 으로 pnpm 버전 락 (host 환경 의존 제거)
RUN corepack enable

WORKDIR /build

# 왜: 의존성 레이어 캐시 분리 — lockfile 변경 없을 때 pnpm install skip
# .npmrc 도 함께 — pnpm install 시 정책 (minimum-release-age) 즉시 적용
COPY scanner-web/package.json scanner-web/pnpm-lock.yaml scanner-web/.npmrc ./
# 왜: 발표 시연 빌드 안정성 — pnpm 11+ supply-chain policy CLI 인자로도 명시 disable
RUN pnpm install --frozen-lockfile --config.minimum-release-age=0

# 왜: 소스 복사 후 빌드 — TS strict + Vite 6
COPY scanner-web/tsconfig.json scanner-web/tsconfig.app.json scanner-web/tsconfig.node.json ./
COPY scanner-web/vite.config.ts scanner-web/index.html ./
COPY scanner-web/src ./src
COPY scanner-web/public ./public
COPY scanner-web/.env.production ./

RUN pnpm build

# 산출물 확인 (실패 시 fail-fast)
RUN test -f /build/dist/index.html

# ---------------------------------------------------------------------------
# Stage 2: api-runtime — Python 3.12-slim + FastAPI + scanner/ + static
# ---------------------------------------------------------------------------
FROM python:3.12-slim AS api-runtime

# 왜: sslyze · cryptography · raw socket — OS 의존성 (build tool 은 제외해 이미지 슬림화)
# ca-certificates: 서버 인증서 검증 / curl: HEALTHCHECK
RUN apt-get update && apt-get install -y --no-install-recommends \
        ca-certificates \
        curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 왜: pip 캐시 레이어 분리 — requirements 변경 없을 때 install skip
COPY scanner-api/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

# 왜: scanner/ 측정 엔진 (SPEC-PQC-001) — measure_wrapper 가 subprocess 로 호출
# scanner-api/ 가 /app 의 평탄 레이아웃 (sys.path), scanner/ 는 /app/scanner 패키지
COPY scanner /app/scanner
COPY scanner-api/main.py /app/main.py
COPY scanner-api/__init__.py /app/__init__.py
COPY scanner-api/routes /app/routes
COPY scanner-api/services /app/services
COPY scanner-api/models /app/models

# 왜: 시연 사전 캐시 (DEMO_CACHE_FALLBACK=1 일 때만 활성) — REQ-DEMO-001
COPY scanner-api/demo_cache /app/demo_cache

# 왜: web-builder 산출물 → /app/static 으로 마운트 (main.py StaticFiles)
COPY --from=web-builder /build/dist /app/static

# 왜: subprocess 가 `python -m scanner.measure` 호출 시 cwd=/app (PROJECT_ROOT 자동 감지)
ENV SCANNER_PROJECT_ROOT=/app \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8000

# 왜: non-root 보안 + Railway 권장
RUN groupadd --system app && useradd --system --gid app --create-home --home-dir /home/app app \
    && chown -R app:app /app
USER app

EXPOSE 8000

# 왜: Railway healthcheckPath=/health 매칭 — 30s 간격 / 5s timeout
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD curl -fsS http://localhost:${PORT:-8000}/health || exit 1

# 왜: scanner-api/ 는 평탄 레이아웃 — `main:app` (scanner_api.main 이 아님)
# Railway 는 $PORT 를 주입 — JSON exec form 으로는 변수 치환이 안 되므로 shell form
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
