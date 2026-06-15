# SPEC-PQC-002: 동적 PQC 스캐너 (발표 시연용)

> **Status**: Draft v0.1.0
> **Created**: 2026-06-14
> **Author**: chan
> **Parent**: SPEC-PQC-001 (정적 47개 도메인 대시보드)
> **Purpose**: 발표 시연 중 임의 URL 입력 → 4축 점수 + 점수 근거 표시. 발표 후 service 중지.

---

## §1. 메타·범위

### §1.1 목적 (Purpose)

양자컴퓨팅 강의 발표 시연 중 발표자(또는 청중)가 **임의 도메인**을 입력하면 SPEC-PQC-001 의 측정 엔진을 호출해 **4축 점수 + 점수 근거 trace + LLM 분석**을 반환하는 동적 사이트.

기존 정적 대시보드 (`quant-reg.vercel.app`, 47개 큐레이션) 와 **완전 분리** — 별도 Railway 배포. 발표 종료 후 service 중지하고 데이터 폐기.

### §1.2 기술 결정 (Tech Decisions)

| 항목 | 결정 | 근거 |
|---|---|---|
| Backend | Python 3.10+ · FastAPI · uvicorn | scanner 와 같은 Python 런타임, 추가 언어 없음 |
| Scanner 호출 | **CLI subprocess** (`python -m scanner.measure --hostname X --out -` stdout 캡처) | scanner 코드 무수정, 4-6h 작업 vs import 리팩토링 12-18h |
| LLM | Claude Sonnet 4.6 (`claude-sonnet-4-6`) + prompt cache (`cache_control: ephemeral`) | 사용자 결제 셋업 + prompt cache 시 도메인당 ~$0.005 |
| Frontend | React 19 · Vite 6 · Tailwind v4 · zod (SPEC-PQC-001 동일 스택) | 컴포넌트 재사용 (SourceChip, ScoreBar) |
| 호스팅 | Railway (Docker auto-deploy, GitHub 연동, `*.up.railway.app` 기본 도메인) | 컨테이너로 sslyze + raw socket 그대로 실행, Vercel timeout 없음 |
| 호스팅 비용 | Hobby plan $5/월 (발표 직전 1-2일만 활성) | 무료 trial 도 충분하지만 발표 안정성 위해 $5 |
| 컨테이너 구성 | 단일 이미지 (FastAPI + frontend build 통합) | §7-B.01 에서 검증 |

### §1.3 의도적 제외 (Out of Scope)

- ❌ Cloudflare Turnstile / IP rate limit / 봇 방지 — 발표 시간 한정 운영
- ❌ 영구 저장 (DB) / share URL / OG 메타 / SEO — 발표 후 데이터 폐기
- ❌ 사용약관 / 폴리시 / 비용 모니터링 대시보드 — 임시 운영
- ❌ Custom domain / DNS 설정 — Railway 기본 도메인 사용
- ❌ **강의 개념 연결 UI 카드** — `.moai/specs/SPEC-PQC-001/presentation-concept-mapping.md` 참조, 발표 슬라이드 + 구두 활용
- ❌ discrete grade v2 (5-tier 등급제) — 별개 트랙 Future Work
- ❌ Qiskit Shor 시뮬레이션 — 별개 트랙 (`quantum/`)
- ❌ narrative 47건 큐레이션 — SPEC-PQC-001 영역
- ❌ e2e Playwright smoke — 시연 안전망은 녹화 영상 + localhost backup 으로 대체

---

## §2. 사용자 시나리오

### §2.1 메인 플로우 (Happy Path)

1. 발표자(또는 청중)가 사이트 접속 — 예: `quant-reg-scan.up.railway.app`
2. 입력란에 도메인 입력 — 예: `www.example.com`
3. "스캔 시작" 버튼 클릭
4. 진행 인디케이터 단계 표시:
   - "sslyze 측정 중..." (Phase 1, 5-20초)
   - "PQC probe 측정 중..." (Phase 2, 2-10초)
   - "점수 산출 중..." (< 1초)
   - "LLM 분석 생성 중..." (Sonnet 4.6, 3-8초)
5. 5-40초 후 결과 페이지로 전환:
   - **Section 1 (도해)**: 4축 ScoreBar + 레이더 차트
   - **Section 2 (점수 근거)**: 각 축의 trace 펼침 가능
   - **Section 3 (LLM 분석)**: Claude 가 생성한 narrative + recommendations
6. Footer: 측정 시각 · Calibration disclosure 배지 · GitHub 링크 · `presentation-concept-mapping.md` 참조

### §2.2 에러 케이스

| 에러 | 발생 시점 | UI 처리 | status |
|---|---|---|---|
| DNS 실패 | hostname 해석 불가 | 입력 검증 단계 즉시 메시지 | (요청 거부) |
| TCP 차단 | TCP RST / 방화벽 | 차단 정보 노출 ("외부 TLS 스캔 차단 — 그 자체가 발견") | `blocked` |
| sslyze 거부 | sslyze connection 거부 | SPEC-PQC-001 4개 차단 사례 인용, 차단 정보 노출 | `blocked` |
| Phase 2 only 차단 | sslyze OK, raw TLS 차단 | Phase 1 결과만 표시, Phase 2 ERROR 노출 | `partial` |
| 60초 타임아웃 | 측정 도중 끊김 | 가능한 부분 결과 노출 + 안내 | `partial` |
| LLM API 실패 | Claude 호출 단계 | narrative 섹션 unmount (자가당착 차단) | `ok` (narrative 없이) |
| 백엔드 다운 | Railway 자체 다운 | "현재 측정 불가" + localhost backup 안내 (발표자만) | — |

### §2.3 발표 시연 흐름

- **T-30분**: Railway service 시작, 도메인 3개 사전 동작 검증 (모범/엇갈림/미흡)
- **발표 중**: 청중에게 사이트 URL 안내 → 라이브 데모 (1-2개 도메인)
- **라이브 실패 시**: 사전 녹화 영상 재생 (`presentation-notes.md` 의 데모 큐레이션 3개)
- **T+발표 종료**: Railway service 중지, 데이터 폐기

---

## §3. 데이터 모델

### §3.1 입력 (Input)

```typescript
// POST /api/scan
interface ScanRequest {
  hostname: string;  // 정규화 후 ASCII, 4-255 chars
}
```

검증 규칙 (클라이언트 + 서버 양쪽):
- 길이 4-255자
- ASCII letters · digits · hyphens · dots 만 허용
- 최소 1개의 점(.) 포함
- IP 주소 거부 (도메인만)
- 정규화: 소문자, `https://` / `http://` 제거, 공백 trim, 후행 슬래시 제거

### §3.2 출력 (Output)

SPEC-PQC-001 의 `DomainSchema` partial 재사용 + `out/{host}.meta.json` 의 scoring breakdown 노출:

```typescript
interface ScanResponse {
  hostname: string;
  measuredAt: string;       // ISO 8601
  status: 'ok' | 'partial' | 'blocked' | 'error';
  scores: {
    tls: { value: number; source: 'automated' };
    hybridKem: { value: number; source: 'automated' };
    certOps: { value: number; source: 'automated' };
    quantumThreat: { value: number; source: 'automated' };
  };
  meta: {
    scoring: {              // *.meta.json 의 구조 그대로
      tls: { rules: RuleTrace[]; cipher_deductions: object; final: number };
      certOps: { rules: RuleTrace[]; final: number };
      hybridKem: { value: number; basis: string };
      quantumThreat: { qubits: number; scenarios: object };
    };
    certificate: { issuer: string; subject: string; keyAlgorithm: string; validUntil: string };
    phase2: { status: 'SUPPORTED' | 'NOT_SUPPORTED' | 'NOT_SUPPORTED_OTHER_GROUP' | 'ERROR'; details: object };
  };
  narrative?: {
    text: string;            // 300-500자 한국어
    recommendations: string[];  // 3개
    source: 'llm-only';
    model: 'claude-sonnet-4-6';
  };
  errors?: ErrorTrace[];
  cached?: boolean;          // 캐시 hit 표시
}

interface RuleTrace {
  id: string;                // 예: 'tls_1_0_active'
  label: string;             // 예: 'TLS 1.0 활성'
  fired: boolean;
  deduction: number;
  source: string;            // 인용: 'Mozilla v6.0 / RFC 8996 / NIST 800-52'
}
```

### §3.3 LLM Narrative 생성

프롬프트 구조 (시스템 메시지 prompt cache 적용):

- **System (cached, ephemeral)**:
  - 4축 모델 설명 + 점수 산출 룰 컨텍스트
  - 정직성 규칙: "당신의 분석은 source='llm-only' 로 표시됩니다"
  - 톤: 한국어, 학술적, 300-500자
  - 절대 진단 / 감사 / 구매 의사결정 권고 X
- **User**: 측정 결과 JSON (scores + meta + phase2)
- **Output**:
  - `text`: 300-500자 narrative
  - `recommendations`: 3개 (각 50-100자)

source 라벨: `llm-only` 고정 (정직성 시스템 일관).

---

## §4. 아키텍처

### §4.1 디렉토리 (계획)

```
quant_reg/
├── scanner/                        # 기존 SPEC-PQC-001 (재사용, 무수정)
├── scanner-api/                    # NEW — FastAPI wrapper
│   ├── main.py                     # FastAPI app + uvicorn entry
│   ├── routes/
│   │   └── scan.py                 # POST /api/scan
│   ├── services/
│   │   ├── measure_wrapper.py      # subprocess scanner.measure
│   │   ├── probe_wrapper.py        # subprocess scanner.pqc_probe + merge
│   │   ├── narrative_llm.py        # Anthropic Sonnet 4.6
│   │   └── normalize.py            # hostname 검증·정규화
│   ├── models/
│   │   └── scan_result.py          # Pydantic 모델
│   ├── cache.py                    # in-memory TTL 300s
│   ├── Dockerfile
│   ├── requirements.txt            # fastapi · uvicorn · anthropic · (scanner deps 재사용)
│   └── README.md                   # 로컬 실행 + Railway 배포 가이드
├── scanner-web/                    # NEW — Frontend (별도 Vite 빌드)
│   ├── src/
│   │   ├── App.tsx                 # 단일 페이지 (입력+로딩+결과)
│   │   ├── components/
│   │   │   ├── ScanForm.tsx        # 입력 + 클라이언트 검증
│   │   │   ├── LoadingProgress.tsx # 진행 인디케이터 (4 단계)
│   │   │   ├── ResultDohae.tsx     # Section 1 도해 (ScoreBar + 레이더)
│   │   │   ├── ScoreTrace.tsx      # Section 2 점수 근거 펼침
│   │   │   ├── NarrativeCard.tsx   # Section 3 LLM 분석
│   │   │   └── DisclosureBadge.tsx # Calibration disclosure
│   │   ├── shared/                 # SPEC-PQC-001 src/components/shared 재사용
│   │   │   ├── SourceChip.tsx
│   │   │   └── ScoreBar.tsx
│   │   ├── data/
│   │   │   └── scanSchema.ts       # zod (DomainSchema partial 재사용)
│   │   └── lib/
│   │       └── scanClient.ts       # fetch /api/scan
│   ├── vite.config.ts
│   ├── package.json
│   └── tsconfig.json
└── docker-compose.yml              # 로컬 통합 실행 (선택)
```

### §4.2 데이터 흐름

```
사용자 입력 (hostname)
       │
       ▼
[scanner-web]
   클라이언트 검증 (normalize.ts: 소문자, https 제거, ASCII)
       │
       ▼  POST /api/scan
       │
[scanner-api (FastAPI)]
   ├─ services/normalize.py: 서버측 검증 (이중 게이트)
   ├─ cache.py: 5분 캐시 확인 → hit 시 즉시 반환 (cached: true)
   │
   ├─ services/measure_wrapper.py
   │    subprocess: python -m scanner.measure --hostname X --out -
   │    timeout: 40s
   │    → stdout: partial Domain JSON
   │    → stderr: 무시 (로그)
   │    → 실패 시: errors[] 기록 후 status='blocked' 또는 'error'
   │
   ├─ services/probe_wrapper.py (Phase 1 성공 시)
   │    subprocess: python -m scanner.pqc_probe --hostname X
   │    timeout: 15s
   │    → Phase 2 probe 결과 merge
   │
   ├─ services/narrative_llm.py (병렬, 측정 완료 후)
   │    Anthropic SDK: claude-sonnet-4-6
   │    prompt cache: system 메시지 ephemeral
   │    timeout: 12s
   │    → 실패 시 narrative 필드 omit (REQ-LLM-004)
   │
   └─ 결과 통합 → ScanResponse JSON 반환
       │
       ▼  fetch response
       │
[scanner-web]
   zod 검증 → 결과 페이지 렌더:
   ├─ Section 1 (도해): 4축 ScoreBar + 레이더 차트
   ├─ Section 2 (근거): meta.scoring.rules 중 fired=true 만 펼침
   └─ Section 3 (분석): NarrativeCard (있을 때만, source='llm-only' SourceChip)
```

---

## §5. EARS 요구사항

### §5.1 REQ-API (Backend) — 6개

- **REQ-API-001**: WHEN 클라이언트가 `POST /api/scan` with valid `{ hostname }` 보내면, 시스템은 60초 내에 `ScanResponse` JSON 또는 4xx/5xx 에러를 반환한다.
- **REQ-API-002**: WHEN 측정이 시작되면, 시스템은 `python -m scanner.measure --hostname {host} --out -` 을 subprocess 로 호출하고 stdout 의 JSON 을 파싱한다 (40s timeout).
- **REQ-API-003**: WHEN Phase 1 측정이 성공하면, 시스템은 `python -m scanner.pqc_probe --hostname {host}` 를 subprocess 로 호출해 Phase 2 결과를 merge 한다 (15s timeout).
- **REQ-API-004**: WHEN 측정 중 에러가 발생하면, 시스템은 `errors[]` 배열에 `{ stage, code, message }` 형식으로 기록하되 가능한 부분 결과는 `status='partial'` 로 반환한다.
- **REQ-API-005**: WHEN 같은 hostname 이 5분 이내 재요청되면, 시스템은 캐시된 결과를 즉시 반환하고 응답에 `cached: true` 를 포함한다 (in-memory dict, TTL 300s).
- **REQ-API-006**: WHEN CORS preflight 요청이 오면, 시스템은 환경변수 `ALLOWED_ORIGINS` 의 origin 만 허용한다.

### §5.2 REQ-WEB (Frontend) — 6개

- **REQ-WEB-001**: WHEN 사용자가 사이트에 접속하면, 단일 페이지에 hostname 입력란 + "스캔 시작" 버튼이 표시된다.
- **REQ-WEB-002**: WHEN 사용자가 hostname 입력하면, 시스템은 클라이언트 측에서 정규화한다 — `https://` / `http://` 제거, 소문자, 공백 trim, ASCII 검증.
- **REQ-WEB-003**: WHEN 스캔이 시작되면, 시스템은 진행 인디케이터로 4단계 표시 ("sslyze 측정 중" → "PQC probe 중" → "점수 산출 중" → "LLM 분석 생성 중").
- **REQ-WEB-004**: WHEN 측정 결과가 도착하면, 시스템은 Section 1 (도해 — 4축 ScoreBar + 레이더 차트) 을 즉시 표시한다.
- **REQ-WEB-005**: WHEN 사용자가 점수 근거 버튼을 클릭하면, 시스템은 Section 2 의 `meta.scoring.rules` 중 `fired=true` 인 룰만 trace 형태로 표시한다 (감점값 + 인용 출처 포함).
- **REQ-WEB-006**: WHEN LLM narrative 가 응답에 포함되면, 시스템은 Section 3 (`NarrativeCard`) 을 `source='llm-only'` violet-500 `SourceChip` 과 함께 표시한다.

### §5.3 REQ-LLM (Claude 통합) — 4개

- **REQ-LLM-001**: WHEN 측정 결과가 산출되면, 시스템은 Anthropic Claude Sonnet 4.6 (`claude-sonnet-4-6`) 을 호출해 narrative 와 3개 recommendations 를 생성한다.
- **REQ-LLM-002**: 시스템 프롬프트 (4축 모델 설명 + 정직성 규칙) 는 `cache_control: ephemeral` 로 prompt cache 가 적용된다.
- **REQ-LLM-003**: WHEN narrative 가 생성되면, `source` 필드는 `llm-only` 로 고정되고 `model` 필드는 사용한 모델 ID 를 포함한다.
- **REQ-LLM-004**: WHEN LLM API 호출이 실패하면 (timeout · rate limit · API error · invalid response), 시스템은 narrative 섹션을 응답에서 제외하고 측정 결과만 반환한다 (자가당착 차단).

### §5.4 REQ-HON (정직성) — 4개

- **REQ-HON-001**: WHEN 결과 페이지가 렌더되면, 양자 위협 점수 카드 옆에 disclosure 배지 ("ordering-preserving 만 의미 · 절대값 매핑 없음") 가 표시된다.
- **REQ-HON-002**: WHEN 점수가 표시되면, 각 점수 옆에 `source` `SourceChip` 이 동반된다 (자동 측정 = sky-500, LLM 분석 = violet-500).
- **REQ-HON-003**: WHEN 페이지가 로드되면, 헤더에 발표 시연 사이트 disclaimer 가 표시된다 — "이 사이트는 강의 발표 시연용 임시 데모. 진단·감사·구매 의사결정에 사용하지 마십시오".
- **REQ-HON-004**: WHEN 결과 페이지가 렌더되면, footer 에 측정 시각 (ISO 8601) + scanner 버전 + GitHub 링크 + `presentation-concept-mapping.md` 참조가 표시된다.

### §5.5 REQ-OPS (배포·운영) — 3개

- **REQ-OPS-001**: 시스템은 Dockerfile 로 컨테이너화되며 Railway 의 GitHub auto-deploy 로 빌드된다.
- **REQ-OPS-002**: 시스템은 Railway 기본 도메인 (`*.up.railway.app`) 을 사용하고 custom domain 은 설정하지 않는다.
- **REQ-OPS-003**: 시스템은 환경변수 `ANTHROPIC_API_KEY` + `ALLOWED_ORIGINS` + `LOG_LEVEL` 을 받으며 secret 은 Railway secret manager 로 관리한다.

### §5.6 REQ-DEMO (시연 안전망) — 2개

- **REQ-DEMO-001**: 시스템은 `uvicorn main:app --host 0.0.0.0 --port 8000` 으로 localhost 실행이 가능하다 (Railway 다운 시 즉시 fallback 시연).
- **REQ-DEMO-002**: `scanner-api/README.md` 에 도메인 3개 측정 영상 사전 녹화 가이드 + Railway service 시작/중지 절차 + 발표 직전 사전 검증 체크리스트가 포함된다.

**총 EARS 요구사항: 25개**

---

## §6. 인수 조건 (Given/When/Then)

- **AC-001 메인 플로우**:
  - Given: 발표자가 사이트 접속, 정상 도메인 입력 (예: www.naver.com)
  - When: "스캔 시작" 클릭
  - Then: 5-40초 후 4축 점수 + 점수 근거 (펼침 가능) + LLM narrative 표시. `status='ok'`.

- **AC-002 DNS 실패**:
  - Given: 존재하지 않는 도메인 입력 (예: nonexistent.invalid)
  - When: "스캔 시작" 클릭
  - Then: 입력 검증 단계에서 즉시 "DNS 해석 실패" 메시지, 재입력 유도. 백엔드 호출 없음.

- **AC-003 sslyze 거부**:
  - Given: SPEC-PQC-001 의 4개 차단 도메인 중 하나 입력 (예: 신한은행)
  - When: "스캔 시작" 클릭
  - Then: `status='blocked'`, 차단 메시지 노출, "그 자체가 발견" 명시.

- **AC-004 캐시 hit**:
  - Given: 같은 도메인 5분 이내 재요청
  - When: "스캔 시작" 클릭
  - Then: 1초 내 결과 표시, footer 에 "5분 이내 캐시" 표시 (`cached: true`).

- **AC-005 LLM 실패**:
  - Given: Anthropic API 일시 다운 또는 API key 누락
  - When: 측정 완료 후 LLM 호출 단계
  - Then: narrative 섹션 비표시, 측정 결과 (Section 1·2) 는 정상 표시. `status='ok'`.

- **AC-006 정직성 노출**:
  - Given: 임의 정상 도메인 측정 완료
  - When: 결과 페이지 렌더
  - Then: 양자 위협 카드 옆 calibration disclosure 배지 + 헤더 시연용 disclaimer + 각 점수 SourceChip 모두 표시.

---

## §7. 후속 결정 슬롯

### §7-A. 발표 운영 결정 (TBD, 발표 1주 전 확정)

- **§7-A.01**: 발표 도메인 후보 3-5개 사전 동작 검증 (모범/엇갈림/미흡 큐레이션)
- **§7-A.02**: Railway 무료 trial vs Hobby ($5/월) 결정
- **§7-A.03**: 발표 후 service 중지 일자 (발표일 + 2일 안)
- **§7-A.04**: 사전 녹화 영상 도메인 선정 (3개)
- **§7-A.05**: `presentation-concept-mapping.md` 카드 6개의 슬라이드 채택 위치 최종 확정

### §7-B. 기술 결정 (TBD during implementation)

- **§7-B.01**: scanner-web 빌드 산출물을 scanner-api 컨테이너에 통합할지 (single image) vs 별도 nginx 컨테이너 분리 (multi-service)
- **§7-B.02**: subprocess 동시 호출 수 제한 (Railway hobby 인스턴스 메모리 512MB-1GB 고려)
- **§7-B.03**: LLM 응답 streaming 적용 여부 (Sonnet 의 부분 응답을 진행 인디케이터에 노출)
- **§7-B.04**: 진행 인디케이터 통신 — Server-Sent Events vs polling vs 단순 sequential await

---

## §8. 참조

- 부모 SPEC: `.moai/specs/SPEC-PQC-001/spec.md`
- 측정 엔진 (재사용): `scanner/` (특히 `measure.py`, `pqc_probe.py`, `merge_pqc.py`, `scoring.py`)
- 강의 매핑: `.moai/specs/SPEC-PQC-001/presentation-concept-mapping.md`
- 발표 결과 트랙: `.moai/specs/SPEC-PQC-001/presentation-notes.md`
- 발표 메이킹 트랙: `.moai/specs/SPEC-PQC-001/presentation-making-story.md`
- Anthropic API: `claude-sonnet-4-6` (1M context, prompt cache)
- 정직성 원칙: SPEC-PQC-001 §8-A.13, §8-A.23 + Methodology Calibration Disclosure

---

## §9. 시간 추정

| Phase | 작업 | 시간 |
|---|---|---|
| **A** | FastAPI subprocess wrapper + 에러 처리 + 캐시 | 4-6h |
| **B** | Dockerfile + Railway 배포 + 환경변수 | 1-2h |
| **C** | scanner-web 단일 페이지 + 도해 + 점수 근거 | 6-8h |
| **D** | Claude Sonnet 4.6 통합 + prompt cache + 정직성 라벨 | 6-8h |
| **합계 (MVP + LLM)** | | **17-24h ≈ 3일 풀타임 / 1주 학업 병행** |

---

*SPEC v0.1.0 Draft. 사용자 검토 후 v1.0.0 승인 → `/moai run` Phase A 진입.*
