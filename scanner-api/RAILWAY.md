# Railway 배포 가이드 — SPEC-PQC-002 동적 PQC 스캐너

> 발표 시연 D-7 시점에 활성화하고 발표 후 중지하는 single image 배포 절차.
> 평소엔 service 일시 중지(Pause) 로 두고 발표 직전에만 가동.

## 0. 사전 준비 체크리스트

- [ ] GitHub repo 푸시 완료 (`main` 브랜치 — Railway auto-deploy 트리거)
- [ ] `scanner-api/Dockerfile` 멀티스테이지 통합 확인
- [ ] `scanner-web/.env.production` 의 `VITE_SCANNER_API_URL` 빈 값 (same-origin)
- [ ] `scanner-api/demo_cache/` 9개 파일 (lgchem.com / www.naver.com / www.kakao.com × 3) 커밋
- [ ] Anthropic API key 확보 (Sonnet 4.6 — `claude-sonnet-4-6`)

---

## 1. Railway 프로젝트 초기화 (최초 1회)

```bash
# Railway CLI 설치 (npm 권장 — Docker · brew 대안 있음)
npm install -g @railway/cli

# 로그인 — 브라우저 OAuth
railway login

# 프로젝트 생성 (또는 기존 프로젝트 link)
cd C:\Users\jocha\Desktop\quant_reg
railway init          # 새 프로젝트 — name: quant-scanner
# 또는
railway link          # 기존 프로젝트에 연결
```

생성 후 Railway 대시보드에서:
1. **Settings → Build & Deploy**:
   - Builder: `Dockerfile`
   - Dockerfile Path: `scanner-api/Dockerfile`
   - Build Context: `.` (프로젝트 루트)
2. **Settings → Networking**:
   - Generate Domain — `quant-scanner.up.railway.app` 형태 자동 발급
3. **Settings → Source**:
   - GitHub repo 연결 → branch `main` auto-deploy ON

---

## 2. 환경변수 설정

발표 안정성을 위해 **CLI 로 한 번에 셋업** 권장:

```bash
# 필수 — Phase D LLM narrative
railway variables --set "ANTHROPIC_API_KEY=sk-ant-..."

# 필수 — CORS 화이트리스트 (same-origin 단일 이미지지만 명시 권장)
railway variables --set "ALLOWED_ORIGINS=https://quant-scanner.up.railway.app"

# 선택 — 발표 시연 안전망 (캐시 fallback 활성)
railway variables --set "DEMO_CACHE_FALLBACK=1"

# 선택 — 로그 레벨
railway variables --set "LOG_LEVEL=INFO"
```

Railway 가 자동 주입하는 변수 (수동 설정 불필요):
- `PORT` — uvicorn 바인딩 포트 (Dockerfile CMD 가 `${PORT:-8000}` 으로 처리)
- `RAILWAY_*` — 메타데이터

**보안 주의**:
- API key 는 `.env` 로 커밋 금지 — Railway secret manager 만 사용.
- `DEMO_CACHE_FALLBACK=1` 일 때는 lgchem.com / www.naver.com / www.kakao.com 3개에 한해 사전 측정 결과가 즉시 반환된다. 그 외 도메인은 그대로 실시간 측정. **다른 청중이 임의 도메인을 입력해도 캐시가 끼어들지 않는다** — 평소 운영 (=0) 과 동일한 신뢰 모델.

---

## 3. 첫 배포 (push & verify)

```bash
# GitHub 푸시 시 자동 빌드 (Source 연결되어 있으면)
git push origin main

# 또는 수동 트리거 (CI 가 막혔을 때)
railway up --detach

# 빌드 로그 확인
railway logs --service quant-scanner

# 헬스체크
curl -fsS https://quant-scanner.up.railway.app/health
# → {"status":"ok"}

# 캐시 hit 검증 (DEMO_CACHE_FALLBACK=1 일 때만)
curl -X POST https://quant-scanner.up.railway.app/api/scan \
     -H "Content-Type: application/json" \
     -d '{"hostname":"lgchem.com"}'
# → 1초 내 응답 + "cached":true
```

---

## 4. 발표 직전 활성화 절차 (5단계 핵심)

| 단계 | 작업 | 검증 |
|------|------|------|
| **T-30분** | `railway up --detach` 또는 dashboard 의 `Resume` | `railway status` 가 `RUNNING` |
| **T-25분** | `curl /health` 200 OK 확인 | `{"status":"ok"}` |
| **T-20분** | 3개 캐시 도메인 사전 동작 검증 | `cached:true` 응답 |
| **T-15분** | 실시간 도메인 1개 (`example.com`) 측정 검증 | 5-40초 후 `status:"ok"` |
| **T-10분** | 백업 plan — localhost uvicorn 워밍업 (Railway 다운 시) | `uvicorn main:app --port 8000 --app-dir scanner-api` 즉시 실행 가능 |

---

## 5. 발표 후 중지 절차

```bash
# 옵션 A — 일시 정지 (데이터 유지, 비용 0)
# Railway dashboard → Service → Settings → "Pause Service"

# 옵션 B — 프로젝트 삭제 (데이터 완전 폐기, SPEC §1.1 명시)
railway down                # 마지막 배포 제거
# 또는 dashboard → Project Settings → Delete Project
```

SPEC-PQC-002 §1.1 에 따라 **발표 종료 후 데이터 폐기**가 원칙. 영구 저장 (DB) 가 없어 삭제만으로 충분.

---

## 6. 비용 추정

| 플랜 | 시간당 | 발표 1주 (D-7~D+1) | 비고 |
|------|--------|--------|------|
| **Hobby ($5/월 base)** | 메모리 512MB × $0.000231/GB·h | ≈ $1-3 추가 | 권장 — 안정성 |
| **Trial (free $5 credit)** | 동일 단가, credit 소진 시 정지 | $0 (한 번뿐) | 발표 직전 1회용 |

LLM 비용 (Sonnet 4.6 + prompt cache):
- 도메인당 ≈ $0.005 (SPEC §1.2)
- 발표 중 라이브 데모 5건 ≈ $0.025

---

## 7. 트러블슈팅

| 증상 | 원인 | 조치 |
|------|------|------|
| `502 Bad Gateway` | uvicorn 미기동 / `PORT` 미바인딩 | `railway logs` 에서 `Started uvicorn` 확인 |
| `/health` 404 | StaticFiles 가 catch-all 로 `/health` 가림 | main.py 의 라우트 등록 순서 확인 (`scan_router` → `/health` → `mount("/", StaticFiles)`) |
| CORS preflight 거부 | `ALLOWED_ORIGINS` 누락 | 발급된 `*.up.railway.app` URL 정확히 입력 (https 포함) |
| `cached:true` 가 안 나옴 | `DEMO_CACHE_FALLBACK` 미설정 | `railway variables --set DEMO_CACHE_FALLBACK=1` 후 재배포 |
| sslyze import 에러 | 빌드 컨텍스트 누락 | Dockerfile path 가 `scanner-api/Dockerfile`, context 가 루트인지 확인 |

---

## 8. 참조

- SPEC: `.moai/specs/SPEC-PQC-002/spec.md` §1.2, §5.5, §7-A
- 측정 엔진: `scanner/` (수정 금지 — SPEC-PQC-001 검증 완료)
- 캐시 파일: `scanner-api/demo_cache/` (9개 — lgchem / naver / kakao × {partial,meta,probe})
- Railway 공식 문서: https://docs.railway.com/guides/dockerfiles
