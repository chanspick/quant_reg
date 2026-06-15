# scanner-api/ — FastAPI subprocess wrapper (SPEC-PQC-002 Phase A)

`scanner/` 의 CLI 측정 엔진을 `POST /api/scan` HTTP 엔드포인트로 노출하는
FastAPI 서비스. 발표 시연용 임시 데모 — 진단·감사·구매 의사결정에 사용 금지.

## 디렉토리 규칙 (하이픈 이슈)

본 디렉토리 이름은 SPEC §4.1 에 따라 `scanner-api/` (하이픈) 로 유지. Python 패키지는
하이픈을 허용하지 않으므로 다음 규칙을 따른다:

- `main.py` · `routes/` · `services/` · `models/` 는 **`scanner-api/` 자체를
  `app-dir` 로 삼는 평탄 레이아웃**. 즉 `scanner-api` 는 Python 패키지가 아니다.
- 모듈 import 는 `from routes.scan import router`, `from services.normalize
  import ...` 등 sub-디렉토리만 패키지로 취급.

## 로컬 실행

```bash
# 1) 의존성 설치 (가상환경 권장)
pip install -r scanner-api/requirements.txt

# 2) uvicorn 실행 — 프로젝트 루트(quant_reg/) 에서
uvicorn main:app --reload --port 8000 --app-dir scanner-api

# 또는 (Windows PowerShell 에서)
cd scanner-api; python main.py
```

`--app-dir scanner-api` 로 uvicorn 의 sys.path 에 `scanner-api/` 가 추가되어 평탄
import 가 동작. subprocess 호출 시 `python -m scanner.measure` 는 프로젝트 루트의
`scanner/` 패키지를 참조해야 하므로 `services/measure_wrapper.py` 는 `cwd` 를
프로젝트 루트(`scanner-api/` 의 부모) 로 명시적으로 지정한다. 환경변수
`SCANNER_PROJECT_ROOT` 로 override 가능 (Docker / Railway 용).

## 빠른 검증

```bash
# Health check
curl http://localhost:8000/health
# → {"status":"ok"}

# 스캔 (성공 케이스)
curl -X POST http://localhost:8000/api/scan \
     -H "Content-Type: application/json" \
     -d '{"hostname":"www.naver.com"}'
# → ScanResponse JSON (status=ok, scores, meta.scoring, meta.certificate, meta.phase2)

# 스캔 (검증 실패 — IP 거부)
curl -X POST http://localhost:8000/api/scan \
     -H "Content-Type: application/json" \
     -d '{"hostname":"1.2.3.4"}'
# → 400 {"detail": {"code": "IS_IP_ADDRESS", "message": "..."}}
```

## 환경변수

| 변수 | 기본 | 용도 | Phase |
|------|------|------|-------|
| `PORT` | `8000` | uvicorn 포트 | A |
| `LOG_LEVEL` | `INFO` | logging 레벨 | A |
| `SCANNER_PROJECT_ROOT` | (자동 감지) | `scanner/` 패키지 부모 디렉토리 | A |
| `ALLOWED_ORIGINS` | `http://localhost:5173,http://localhost:5174` | CORS 화이트리스트 (콤마 구분, scheme 필수). 예: `https://quant-reg.vercel.app,http://localhost:5173`. `*` 입력 시 경고 로그 출력 (차단 안 함). | A-3 |
| `ANTHROPIC_API_KEY` | (미설정) | Claude Sonnet 4.6 (`claude-sonnet-4-6`) narrative 호출용. 미설정 시 narrative 섹션 omit + `errors[]` 에 `stage="narrative"`, `code="NO_API_KEY"` 추가. timeout 8초 (SPEC §5.1). | D |
| `DEMO_CACHE_FALLBACK` | `0` | `=1` 시 `demo_cache/{hostname}.*` 사전 측정 결과로 즉시 응답 (REQ-DEMO-001 발표 안전망). lgchem.com / www.naver.com / www.kakao.com 3개 한정. 그 외는 그대로 실시간 측정. | B |
| `DEMO_CACHE_DIR` | (자동 감지) | `demo_cache/` 디렉토리 override. Docker: `/app/demo_cache`, 로컬: `scanner-api/demo_cache`. | B |
| `STATIC_DIR` | `/app/static` | scanner-web 빌드 산출물 경로. 미존재 시 StaticFiles 마운트 skip (로컬 dev 가정). | B |

## Phase A 범위

| 항목 | 상태 |
|------|------|
| `POST /api/scan` 라우트 + Pydantic 검증 | 완료 |
| hostname 정규화 (소문자, scheme 제거, IP 거부, ASCII 검증) | 완료 |
| Phase 1 `scanner.measure` subprocess (40s timeout) | 완료 |
| Phase 2 `scanner.pqc_probe` subprocess (15s timeout) | 완료 |
| 60s 전체 timeout + errors[] 응답 (REQ-API-001/004) | 완료 |
| In-memory 캐시 (REQ-API-005) | **Phase A-3** |
| 엄격 CORS (REQ-API-006) | 완료 (`ALLOWED_ORIGINS` 화이트리스트, `.env.example` 참조) |
| Dockerfile + Railway 배포 (REQ-OPS-001) | 완료 (`Dockerfile` 멀티스테이지 + [`RAILWAY.md`](./RAILWAY.md) 가이드) |
| frontend (scanner-web/) | **Phase C** |
| LLM narrative (REQ-LLM-001~004) | 완료 (Sonnet 4.6 + prompt cache, 8s timeout, `services/narrative_llm.py`) |
| pytest / E2E | **Phase A-3** |

## 의도적 SPEC 차이

- SPEC §1.2 / REQ-API-002 는 `python -m scanner.measure --hostname X --out -`
  (stdout 모드) 를 가정하지만 실제 CLI 는 `--stdout` (action) 플래그만 지원하며
  이 플래그는 partial 만 stdout 으로 출력하고 scoring breakdown(meta) 파일은
  쓰지 않는다. SPEC §3.2 가 `meta.scoring` 을 요구하므로 wrapper 는 임시
  디렉토리에 `--out` + `--meta-out` 으로 호출해 두 파일을 함께 얻는다.
- SPEC §3.2 의 `meta.scoring.quantumThreat` 형식은 `scanner.scoring.scoring_breakdown()`
  가 emit 하지 않는다. wrapper 가 partial 의 `quantumThreatDetail` 에서
  `{qubits, scenarios}` 를 합성한다.
