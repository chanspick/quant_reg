# SPEC-PQC-003: PQC 컴플라이언스 리포트 (도메인 1개 → 8섹션 CP 리포트)

> **Status**: Draft v0.2.0 (적대적 무결성 검증 반영)
> **Created**: 2026-06-17
> **Author**: chan
> **Parent**: SPEC-PQC-002 (동적 PQC 스캐너, Railway 배포)
> **Purpose**: SPEC-PQC-002 의 스캔 결과를 "등급(A~F) + 비교군 위치 + 규제 매핑 + HNDL 노출 + 액션플랜 + CBOM" 으로 확장해, "측정 도구"를 **"PQC 컴플라이언스/포스처 리포트 제품"** 으로 재포지셔닝한다. 무료 스캔(깔때기 입구) + 유료 CBOM/컴플라이언스 리포트의 비즈니스 모델을 발표에서 시연.
> **근거**: `research.md` (시장·규제·경쟁사·수익모델 + 8섹션 표준 인용).
> **검증**: `spec003-integrity-review` 워크플로우(하위호환·배포·빌드가능성 3렌즈) 결과 반영 — v0.1.0 의 3개 blocker(demo_cache 오해 · Mosca 코드 부재 · 16-룰 재사용 불가) 정정.

---

## §0. 핵심 아키텍처 결정 (v0.2.0)

> **두 앱은 분리되어 있다.** ROOT 앱(`pqc-readiness-scanner`, `src/`, 정적 47개 대시보드)과 배포 대상(`scanner-web` + `scanner-api`, Railway)은 별개 패키지다. ROOT 자산(16-룰 권고 스크립트, `quantumResources.ts`, `domains.json`, partial.findings)은 **scanner-api 응답 경로에서 직접 재사용 불가**.

**결정: P0/P1 의 8개 섹션은 전부 `scanner-web`(프론트엔드)에서 기존 `ScanResponse` + 번들된 `benchmark.json` 으로 결정적으로 파생한다. `scanner-api`/`scanner` 백엔드는 손대지 않는다.**

근거: 백엔드를 안 건드리면 (a) Pydantic↔zod 스키마 sync 리스크 0, (b) `_do_scan`/`_build_success_response` 변경 0 → demo_cache 회귀 0, (c) Railway/Docker 변경 0. 측정(ScanResponse)은 신뢰원천 그대로 두고, 등급·비교·규제·HNDL·액션플랜은 그 위의 **결정적 view-model 변환**이다. (서버 권위 등급·서명 CBOM 은 유료 로드맵 §7-B.05.)

---

## §1. 메타·범위

### §1.1 목적 (Purpose)

도메인 1개 입력 → SPEC-PQC-002 4축 측정 위에 8섹션 CP 리포트:
① 종합 판정(등급 A~F) · ② 4축 스코어카드 · ③ 비교군 위치 · ④ 핵심 발견 · ⑤ HNDL 양자위협 노출 · ⑥ 규제 컴플라이언스 매핑 · ⑦ 우선순위 액션플랜 · ⑧ CBOM 내보내기.

전략 목적(발표): 결과물을 "공개 대시보드(무료 정보)"가 아니라 **"검증된 비즈니스 모델(SSL Labs/SecurityScorecard 식 무료 등급 → 유료 컴플라이언스 리포트)의 작동 MVP"** 로 제시.

### §1.2 기술 결정 (Tech Decisions) — v0.2.0 정정

| 항목 | 결정 | 근거 |
|---|---|---|
| **백엔드 변경** | **없음** (`scanner-api`/`scanner` 무수정) | §0 — 최강 무결성. INTEG-6/7 |
| 섹션 계산 위치 | 전부 `scanner-web` 클라이언트 측 결정적 파생 | 백엔드/스키마/배포 변경 0 |
| 등급(A~F) | `scoreBand.ts` **무수정**, 신규 `lib/grade.ts` — 4축 균등평균→A~F + TLS 1.0/1.1 캡 | 컷오프 `research.md` ① (A≥85,B70-84,C55-69,D40-54,F<40) |
| 종합 점수 | 4축 **균등 가중 평균** | 결정적. 가중치 §7-B.01 |
| ④ 핵심 발견 | `meta.scoring.tls.rules` + `meta.scoring.certOps.rules` 중 `fired=true` 만 클라이언트 필터 | **rules 는 tls·certOps 2축만 보유**(hybridKem=value+basis, quantumThreat=qubits+scenarios). partial.findings 는 응답에 없음 |
| 비교군 데이터 | `scanner-web/public/benchmark.json` — **ROOT `public/data/domains.json` 에서 추출** 후 커밋 | 별도 앱이므로 cross-app 추출 선행작업 필요(§3.4) |
| 비교군 계산 | 클라이언트 `lib/benchmark.ts` (정적 JSON, `fetch('/benchmark.json')`) | 새 API/네트워크 의존 없음 |
| ⑥ 규제 매핑 | 클라이언트 `lib/regulation.ts` — 정적 `sector→deadline` 테이블(`research.md` ⑥) + `min()` | 결정적. LLM 불필요 |
| ⑤ HNDL/Mosca | 신규 `lib/hndl.ts` — **신규 결정적 함수**. `CertificateMeta.keyAlgorithm`("RSA-2048") 파싱 → Mosca **정적 상수**(X=보존 7y+, Y=12~15y, Z=10~15y, `research.md` ⑤) | **Mosca 로직은 코드에 없음 → 신규 작성**(roetteler 는 logical-qubit 추정만) |
| ⑦ 액션플랜 | 신규 `lib/actionPlan.ts` — fired tls/certOps 룰 → 단계별 액션 정적 매핑. execSummary = `narrative?.text`(없으면 unmount) | **16-룰 스크립트는 ROOT 앱 빌드툴 → 직접 재사용 불가** |
| ⑧ CBOM | 신규 `lib/cbom.ts` — 응답(cert/phase2/tls) → CycloneDX 1.6 JSON 클라이언트 조립, **유료 전용** | 표준 라이브러리만, **pip/npm 신규 의존 금지** |
| reportTier | 프론트 토글/쿼리파라미터(기본 `free`) — 발표엔 인증·결제 없음 | §7-B.03 |
| 출력 형태 | 웹 단일 페이지 섹션 확장. PDF 유료/로드맵 | 발표 1~3일 범위 |

### §1.3 무결성 제약 (Integrity Constraints) — HARD

- **[INTEG-1] 백엔드 무변경**: `scanner-api`(routes/services/models)·`scanner/` 를 수정하지 않는다. → `ScanResponse`(Pydantic) 및 `schema.ts`(zod) 의 **응답 스키마도 변경 없음**. P0/P1 은 `scanner-web` + `benchmark.json` 만 추가.
- **[INTEG-2] demo_cache 무결**: demo_cache 파일은 직렬화된 ScanResponse 가 아니라 `_build_success_response()` 의 **입력(partial/meta/probe)** 이다. 백엔드를 안 건드리므로 합성·직렬화 경로가 그대로다 → demo_cache 3개(`lgchem.com`/`www.naver.com`/`www.kakao.com`) 응답은 변경 없이 동작. 프론트는 그 응답에서 가능한 섹션만 파생.
- **[INTEG-3] 정직성 = 조건부 unmount**: 데이터 없거나 추정 불가 시 섹션 unmount. 프론트 판정은 "키 존재"가 아니라 **"truthy + 비어있지 않음"**. (응답이 빈 배열/객체를 줘도 unmount.)
- **[INTEG-4] 요청 경로 성능 보존**: 신규 섹션은 전부 클라이언트 결정적 계산 → **요청 경로에 새 동기 네트워크/LLM 호출 0**. narrative 60s 예산(overall 120s) 그대로.
- **[INTEG-5] 배포 불변**: `railway.json`·`scanner-api/Dockerfile`·`scanner-web/vite.config.ts`(`publicDir`/`base`)·healthcheck·CMD·포트·환경변수·`requirements.txt`·`package.json` 의존성을 변경하지 않는다.
  - **[5a]** `benchmark.json` 은 이미 COPY 되는 `scanner-web/public/`(Dockerfile L28) 안에 둔다. 신규 `scanner-web/src/**`·`scanner-web/src/lib/**`·`components/**` 은 `COPY scanner-web/src ./src`(L27)로 자동 포함.
  - **[5b]** 빌드 컨텍스트 루트는 `quant_reg/` 이고 **적용되는 ignore 는 루트 `.dockerignore` 하나뿐**(nested `scanner-web/.dockerignore` 는 무시됨). 루트 `.dockerignore` 의 `public/`/`src/` 는 **컨텍스트 루트 anchor**라 `scanner-web/public`·`scanner-web/src` 를 제외하지 **않는다**(확인됨: `git check-ignore` EXIT 1). → 이 패턴을 절대 `**/public`·`**/src` 로 바꾸지 말 것(바꾸면 benchmark.json·신규 소스 사일런트 누락).
  - **[5c]** `benchmark.json` 은 **반드시 git 커밋**되어야 Railway 빌드 컨텍스트에 포함된다(현재 `scanner-web/public/` 엔 `.gitkeep` 만 존재).
  - **[5d]** 클라이언트는 same-origin **절대경로 `fetch('/benchmark.json')`**(앞 슬래시 포함) 사용 — Vite 기본 `publicDir='public'` + `base='/'` 의존, SPA 라우트 하위 상대경로 오해석 방지.
- **[INTEG-6] SPEC-002 회귀 0**: AC-001~006 전부 통과(특히 LLM 실패 시 `status='ok'`, blocked/partial 처리). 백엔드 무변경이라 자동 충족되나 회귀 테스트로 확인.
- **[INTEG-7] scanner/ 무수정**: 측정 엔진 손대지 않음.

### §1.4 의도적 제외 (Out of Scope)

- ❌ 다중 도메인/서브도메인/조직 일괄 스캔 — 인풋 도메인 1개
- ❌ 지속 모니터링 SaaS·시계열·알림 — 유료 로드맵
- ❌ PDF 생성 — 유료/로드맵(발표는 웹 + ⑧ 목업)
- ❌ 인증·결제·계정·영구 저장 — 임시 운영(SPEC-002 계승). reportTier 는 토글
- ❌ 백엔드 응답 스키마 확장 — 본 SPEC 범위 밖(서버 권위 등급·서명 CBOM 은 §7-B.05 로드맵)
- ❌ 섹터 자동 판별 — 비교군에 있으면 태그, 없으면 사용자 선택 또는 전체 비교
- ❌ ML-DSA 인증서 없음 감점 — "관측됨(현재 정상)" 표기(`research.md` 한계 4)
- ❌ K-PQC(HAETAE/AIMer/SMAUG-T/NTRU+) 협상 측정 — 측정 범위 밖, 로드맵
- ❌ discrete grade v2 분위수 정규화 — 본 SPEC 은 고정 컷오프

---

## §2. 사용자 시나리오

### §2.1 메인 플로우 (Happy Path)

1. 사용자가 도메인 입력 (+ 선택: 섹터 드롭다운 — 금융/통신/공공/의료/일반). **섹터는 프론트 폼 상태이며 백엔드로 전송하지 않는다**(ScanRequest 무변경).
2. "스캔 시작" → SPEC-002 측정 파이프라인(변경 없음) → `ScanResponse`
3. 결과 페이지를 **리포트 형태**로 렌더(전부 클라이언트 파생):
   - **① 헤더**: 도메인·측정시각·종합 등급(A~F)·한 줄 평·정직성 배지
   - **② 스코어카드**: 4축 점수+밴드+source (기존)
   - **③ 비교군 위치**: "비교군 N개 중 X위 / 하위 Y% · 금융권 평균 62 vs 41 · 앞선 동종사: …" (`benchmark.json` + scores)
   - **④ 핵심 발견**: `meta.scoring.tls.rules` + `certOps.rules` 중 `fired=true` 만 필터(감점값+인용)
   - **⑤ HNDL**: Mosca X+Y>Z 한 줄 + Q-Day 범위(출처). `certificate.keyAlgorithm` 파싱
   - **⑥ 규제 매핑**: 섹터 → 데드라인 D-day + "마이그 평균 12~15년 > 잔여" 갭
   - **⑦ 액션플랜**: 즉시/단기/중기(fired 룰 매핑) + 경영진 요약(`narrative?.text`, 없으면 요약부 unmount)
   - **⑧ CBOM**: 무료=텍스트 요약 / 유료=CycloneDX JSON 다운로드(또는 목업)
4. Footer: SPEC-002 disclaimer + GitHub + research 인용

### §2.2 무료 vs 유료

| 티어 | 제공 | 결정 주체 |
|---|---|---|
| Free(기본) | ①②③ + ④ 요약 + ⑤ 한 줄 + ⑥ + ⑦ 요약 | 기본값 |
| Paid(목업/로드맵) | ⑦ 상세 + ⑧ CBOM JSON + PDF + 시계열 | 프론트 토글/쿼리파라미터(`?tier=paid`) — 발표는 "유료 미리보기" 목업 |

### §2.3 에러·엣지 (SPEC-002 계승 + 추가)

| 케이스 | 처리 |
|---|---|
| SPEC-002 에러(DNS/blocked/partial/LLM실패) | **동일 처리**(백엔드 무변경). 신규 섹션은 데이터 가능 범위만 렌더 |
| demo_cache 응답 | 정상 ScanResponse 합성됨 → ①②③④⑤⑥⑦ 클라이언트 파생 가능(③은 benchmark.json, ⑤는 cert 키, narrative=None 이면 ⑦ 요약부만 unmount) |
| 섹터 미선택 & 비교군에 없음 | ③ 섹터평균 unmount, 전체 비교군 대비만 · ⑥ "섹터 미지정 — 글로벌 최단 데드라인 기준" |
| 측정 partial(키 정보 부족) | ⑤ HNDL · ⑧ CBOM 해당 항목 unmount |
| narrative=None | ⑦ 경영진 요약 라인 unmount(나머지 액션 단계는 표시) |

### §2.4 발표 시연 흐름

P0(①②③④⑦) 라이브 + P1(⑤⑥) 라이브 + P2(⑧) 목업. 클라이맥스: 관중/학교 도메인 라이브 스캔 → "C등급 / 금융권 하위 30% / 토스는 전환함 / 2030 데드라인 미달".

---

## §3. 데이터 모델

### §3.1 입력 (Input) — 백엔드 무변경

```typescript
// 백엔드 ScanRequest 는 변경하지 않는다 (hostname 만)
interface ScanRequest { hostname: string; }     // 기존 그대로

// 섹터는 프론트엔드 폼 상태 (백엔드 미전송)
type Sector = 'finance' | 'telecom' | 'public' | 'healthcare' | 'general';
```
섹터 결정: 입력 도메인이 `benchmark.json` 에 있으면 그 sector 태그, 없으면 사용자 선택, 미선택이면 `general`/전체 비교.

### §3.2 출력 (Output) — 응답 무변경 + 클라이언트 view-model

**백엔드 응답 `ScanResponse`(SPEC-002 §3.2) 는 변경하지 않는다.** 8섹션은 아래 클라이언트 view-model 로 파생:

```typescript
// scanner-web 내부 타입 (응답 스키마 아님 — 직렬화/전송되지 않음)
interface CPViewModel {
  grade: 'A'|'B'|'C'|'D'|'F';            // lib/grade.ts (scores)
  overall: number; verdict: string;
  benchmark: BenchmarkPosition | null;    // lib/benchmark.ts (benchmark.json + scores + sector)
  keyFindings: Finding[];                 // meta.scoring.{tls,certOps}.rules where fired
  hndl: HndlExposure | null;              // lib/hndl.ts (certificate.keyAlgorithm + 정적 상수)
  regulation: RegulationMap | null;       // lib/regulation.ts (sector + 정적 테이블)
  actionPlan: ActionPlan;                 // lib/actionPlan.ts (fired rules + narrative?.text)
  cbom: CycloneDxBom | null;              // lib/cbom.ts (paid only)
}
interface Finding { id:string; label:string; deduction:number; source:string; }
interface ActionItem { title:string; difficulty:'low'|'med'|'high'; impact:'low'|'med'|'high'; standardRef:string; }
interface ActionPlan { immediate:ActionItem[]; shortTerm:ActionItem[]; midTerm:ActionItem[]; execSummary?:string; }
```
**응답 스키마 무변경 → INTEG-1/2 자동 충족.** (서버가 신규 필드를 emit 하지 않으므로 `exclude_none`/zod-strip trap 무관.)

### §3.3 등급 산출 (lib/grade.ts 신규)

```
overall = round(mean(scores.tls.value, hybridKem.value, certOps.value, quantumThreat.value))
grade   = A(≥85) / B(70-84) / C(55-69) / D(40-54) / F(<40)
cap     = meta.scoring.tls.rules 중 id 가 tls_1_0/tls_1_1 계열이고 fired=true → grade 최대 'B'
```
`scoreBand.ts` 무수정(밴드 색은 별개로 계속 사용).

### §3.4 비교군 (benchmark.json) — 선행 추출 작업

**생성(P0 선행)**: ROOT `public/data/domains.json`(47~51개) → 각 도메인에서 추출:
```json
{ "version":"1.0.0", "generatedFrom":"public/data/domains.json@<버전>",
  "domains":[ { "hostname":"www.samsung.com",        // url 에서 scheme 제거
                "name":"삼성전자", "sector":"반도체/전자",  // domains.json 원 sector 라벨
                "axes":{"tls":100,"hybridKem":15,"certOps":100,"quantumThreat":23},
                "overall":60 } ] }                    // 4축 균등평균
```
- 생성 방법: `scanner-web/scripts/gen-benchmark.ts`(ROOT domains.json 읽어 산출) 1회 실행 후 산출물 커밋. (또는 수동 큐레이션 고정 — §7-B.04)
- 백분위: target overall 보다 낮은 도메인 수 / 전체 × 100. 순위 = 내림차순 위치.
- 섹터 평균: 동일 sector 라벨 부분집합 평균. "앞선 동종사" = 동일 sector 에서 overall > target 인 name 목록(상위 3).
- 화면에 "주요 대기업 N개 비교군(통계적 업계표준 아님)" 명시(REQ-HON-005).

### §3.5 규제 매핑 (lib/regulation.ts)

`research.md` ⑥ 정적 테이블:
```
sector_map = { finance:{korea:2027,nist:2030,cnsa:2027,eu:2030},
               telecom:{korea:2026,nist:2030,cnsa:2026,eu:2030},
               healthcare:{korea:2025,nist:2030,cnsa:2030,eu:2030},
               public:{korea:2027,nist:2030,cnsa:2030,eu:2030},
               general:{nist:2030,cnsa:2033,eu:2030} }
effectiveDeadline = min(values)；daysLeft = (deadline - now)
status: 점수 충분+잔여>마이그소요 → compliant / 잔여<마이그 → fail / 그 외 at-risk
```

### §3.6 HNDL / Mosca (lib/hndl.ts 신규)

- 키 소스: `meta.certificate.keyAlgorithm`(예 "RSA-2048") 파싱 → {algo:"RSA", bits:2048}. 키 미측정/파싱 불가 시 ⑤ unmount(INTEG-3).
- Mosca: X(데이터 보존, 기본 7y+) + Y(마이그, 대기업 12~15y) > Z(Q-Day 잔여, 보수 10~15y) → `atRisk`. **X·Y·Z 는 측정값이 아닌 정적 가정 상수**(`research.md` ⑤, 화면에 "추정·출처" 라벨, REQ-HON-006).
- Q-Day 는 단일 시점 아닌 **범위+출처**(예 "2030±3, Gidney 2025 arXiv:2505.15917").

### §3.7 CBOM (lib/cbom.ts, 유료)

응답(certificate/phase2/tls cipher) → CycloneDX 1.6 `cryptographic-asset` 배열 클라이언트 조립(`research.md` ⑧ 형식). **표준 JS 만 사용, 신규 의존 금지(INTEG-5)**. ML-DSA 인증서 없음 = "관측됨(정상)" 표기.

---

## §4. 아키텍처

### §4.1 디렉토리 변경 (scanner-web 만, additive)

```
scanner-web/
├── public/benchmark.json        # NEW — ROOT domains.json 에서 추출(커밋 필수, INTEG-5c)
├── scripts/gen-benchmark.ts     # NEW(선택) — benchmark.json 생성 스크립트
├── src/lib/
│   ├── grade.ts                 # NEW — A~F + cap (scoreBand.ts 무수정)
│   ├── benchmark.ts             # NEW — 순위/백분위/섹터평균/앞선동종사
│   ├── findings.ts              # NEW — meta.scoring.{tls,certOps}.rules fired 필터
│   ├── regulation.ts            # NEW — sector→deadline 정적 테이블 + min()
│   ├── hndl.ts                  # NEW — keyAlgorithm 파싱 + Mosca 정적 상수
│   └── cbom.ts                  # NEW — CycloneDX 1.6 조립(유료)
└── src/components/report/       # NEW — GradeHeader / BenchmarkPosition / KeyFindings /
                                 #       ActionPlan / HndlExposure / RegulationMap / CbomExport
                                 # + ResultDohae.tsx 확장(섹션 컨테이너, 조건부 mount)
                                 # + ScanForm.tsx 에 섹터 드롭다운(프론트 상태)
```
**`scanner-api`/`scanner`/`schema.ts`(응답)/`scoreBand.ts`/Dockerfile/railway.json/vite.config 무변경.** 신규 `services/*.py`·models 확장 없음(§0 결정). Dockerfile 은 `scanner-web/src`·`scanner-web/public` 를 디렉토리 단위 COPY 하므로 신규 파일 자동 포함.

### §4.2 데이터 흐름

```
[scanner-api] 측정(SPEC-002, 무변경) → ScanResponse(JSON)
       │  (요청 경로 추가 호출 없음)
[scanner-web] zod 검증(기존 ScanResponseSchema, 무변경)
       │
   클라이언트 파생(결정적, 마이크로초):
   ├─ grade.ts      → grade, overall, verdict
   ├─ benchmark.ts  → fetch('/benchmark.json') + scores + sector → 순위/백분위
   ├─ findings.ts   → meta.scoring.{tls,certOps}.rules fired
   ├─ regulation.ts → sector + 정적 테이블 → D-day
   ├─ hndl.ts       → certificate.keyAlgorithm + Mosca 상수
   ├─ actionPlan.ts → fired 룰 매핑 + narrative?.text
   └─ cbom.ts       → (paid) CycloneDX
       │
   report/* 컴포넌트 조건부 mount(truthy+비어있지않음 → 아니면 unmount)
```

---

## §5. EARS 요구사항

### §5.1 REQ-CP (리포트 코어) — 4개
- **REQ-CP-001**: WHEN 측정 응답이 도착하면, 클라이언트는 4축 균등평균으로 `overall` 을 산출하고 `grade`(A~F)+`verdict` 를 표시한다.
- **REQ-CP-002**: WHEN `meta.scoring.tls.rules` 에 TLS 1.0/1.1 룰이 `fired` 이면, `grade` 는 최대 'B' 로 캡된다.
- **REQ-CP-003**: WHEN 결과가 렌더되면, 8섹션이 데이터 가용 범위 내에서 표시되고, truthy 하지 않거나 빈 섹션은 unmount 된다(INTEG-3).
- **REQ-CP-004**: WHEN `tier='free'` 이면 ⑦ 상세·⑧ CBOM JSON 은 유료 미리보기로, `tier='paid'`(토글) 이면 전체 표시.

### §5.2 REQ-BENCH (비교군) — 3개
- **REQ-BENCH-001**: WHEN 점수가 산출되면, 클라이언트는 `fetch('/benchmark.json')` 대비 순위·백분위를 계산해 표시한다.
- **REQ-BENCH-002**: WHEN 섹터가 결정되면, 동일 sector 평균과 "앞선 동종사"(상위 3)를 표시하고, 미결정 시 섹터 항목 unmount + 전체 비교군 대비만 표시한다.
- **REQ-BENCH-003**: WHEN ③ 이 렌더되면, "주요 대기업 N개 비교군(통계적 업계표준 아님)" 문구가 동반된다.

### §5.3 REQ-REG (규제 매핑) — 3개
- **REQ-REG-001**: WHEN 섹터가 결정되면, 정적 `sector→deadline` 테이블로 한국 마스터플랜·NIST IR 8547·CNSA 2.0·EU 데드라인과 D-day 를 표시한다.
- **REQ-REG-002**: WHEN 데드라인이 표시되면, 각 항목은 `compliant|at-risk|fail` 상태를 가지며 `effectiveDeadline=min(...)` 을 강조한다.
- **REQ-REG-003**: WHEN ⑥ 이 렌더되면, "평균 마이그레이션(12~15년) vs 데드라인 잔여" 갭이 표시된다.

### §5.4 REQ-HNDL (양자위협 노출) — 2개
- **REQ-HNDL-001**: WHEN `certificate.keyAlgorithm` 이 파싱 가능하면, 클라이언트는 정적 Mosca 상수(X/Y/Z, `research.md` ⑤)로 X+Y>Z 와 `atRisk` 를 계산해 표시한다(키 파싱 불가 시 unmount).
- **REQ-HNDL-002**: WHEN Q-Day 가 표시되면, 단일 시점이 아닌 **범위+출처**(Gidney 2025 등)로 "추정" 라벨과 함께 표기한다.

### §5.5 REQ-CBOM (유료) — 2개
- **REQ-CBOM-001**: WHEN `tier='paid'` 이고 측정이 성공하면, 클라이언트는 응답 자산을 CycloneDX 1.6 `cryptographic-asset` 배열로 조립해 다운로드 제공한다(신규 의존 없이).
- **REQ-CBOM-002**: WHEN ML-DSA 인증서가 없으면, 감점이 아니라 "관측됨(현재 정상)" 으로 표기한다.

### §5.6 REQ-INTEG (무결성) — 7개
- **REQ-INTEG-001**: 시스템은 `scanner-api`/`scanner`/응답 스키마(`scan_result.py`, `schema.ts`의 ScanResponse)/`scoreBand.ts`/`vite.config.ts`/`Dockerfile`/`railway.json`/`requirements.txt`/`package.json` 의존성을 변경하지 않는다.
- **REQ-INTEG-002**: 8섹션은 전부 기존 `ScanResponse` + `benchmark.json` 에서 클라이언트 측 결정적 파생으로 생성한다(요청 경로 추가 호출 0).
- **REQ-INTEG-003**: `benchmark.json` 은 `scanner-web/public/` 에 두고 **git 커밋**한다. 루트 `.dockerignore` 의 `public/`/`src/` 패턴은 컨텍스트 루트 anchor 이므로 `scanner-web/public`·`scanner-web/src` 를 제외하지 않으며, 이 패턴을 `**/public`·`**/src` 로 변경하지 않는다.
- **REQ-INTEG-004**: 클라이언트는 `fetch('/benchmark.json')`(절대경로) 로 same-origin 로드한다(Vite 기본 publicDir/base 의존).
- **REQ-INTEG-005**: demo_cache 3개 응답(백엔드 무변경)이 그대로 동작하고, 프론트가 가능한 섹션만 파생하며 나머지는 unmount 한다.
- **REQ-INTEG-006**: SPEC-PQC-002 AC-001~006 이 회귀 없이 통과한다.
- **REQ-INTEG-007**: 신규 view-model 타입은 응답 스키마(`schema.ts`)와 분리한다(전송되지 않는 내부 타입). 만약 향후 서버 권위 필드가 필요하면 INTEG-1 예외로 §7-B.05 에서 pydantic+zod 동시 추가를 별도 결정한다.

### §5.7 REQ-HON (정직성 확장) — 3개
- **REQ-HON-005**: ③ 비교군은 "통계적 업계표준 아님" 을 명시한다.
- **REQ-HON-006**: ⑤·⑥ 의 추정 항목(Q-Day, Mosca 상수, 데드라인 해석)은 출처 인용 + "추정" 라벨을 단다.
- **REQ-HON-007**: 데이터 없는 섹션은 placeholder 없이 unmount(판정: truthy+비어있지않음).

**총 신규 EARS: 24개** (SPEC-002 25개와 별개)

---

## §6. 인수 조건 (Given/When/Then)

- **AC-001 리포트 렌더**: Given 정상 도메인+섹터 / When 스캔 / Then 8섹션 + 등급 + 비교군 위치 + 규제 D-day + 액션플랜 표시.
- **AC-002 등급 캡**: Given TLS 1.0 fired 도메인 / When 스캔 / Then `grade ≤ B`.
- **AC-003 demo_cache(핵심)**: Given `DEMO_CACHE_FALLBACK=1` 로 3개 도메인 중 하나 `/api/scan` / When 200 응답 / Then 응답은 SPEC-002 와 동일 합성되고, 프론트가 ①②③④⑤⑥⑦ 파생(narrative 없으면 ⑦ 요약부 unmount), **에러·깨짐 없음**.
- **AC-004 섹터 미지정**: Given 비교군에 없는 도메인+섹터 미선택 / When 스캔 / Then 전체 비교군 대비만, 섹터평균 unmount, ⑥ 글로벌 최단 데드라인 기준.
- **AC-005 SPEC-002 회귀 0**: Given AC-001~006 시나리오 / When 실행 / Then 전부 동일 통과.
- **AC-006 배포 무결**: Given 구현 후 `docker build -f scanner-api/Dockerfile .` / When 실행 컨테이너 / Then healthcheck 200 + 기존 스캔 동작 + `GET /benchmark.json` 200 (커밋·번들 확인).
- **AC-007 유료 토글**: Given `?tier=paid` / When ⑧ 렌더 / Then CBOM JSON 다운로드 제공. 기본(free) 은 텍스트 요약 + "유료" 목업.

---

## §7. 후속 결정 슬롯

### §7-A. 발표 운영
- **§7-A.01**: 라이브 섹션 범위 (제안: P0=①②③④⑦, P1=⑤⑥, P2=⑧ 목업)
- **§7-A.02**: 등급 표기 — A~F vs 점수+백분위 vs 병행(제안: 병행)
- **§7-A.03**: 데모 도메인 섹터 큐레이션(금융/통신/공공 각 1)

### §7-B. 기술
- **§7-B.01**: 종합 점수 가중치 — 균등(기본) vs 양자위협 가중
- **§7-B.02**: 섹터 판별 — 사용자 선택 vs 비교군 태그 vs (로드맵)자동
- **§7-B.03**: reportTier 토글 방식 — 쿼리파라미터(`?tier=paid`) 확정 여부
- **§7-B.04**: `benchmark.json` 생성 — `gen-benchmark.ts` 자동화 vs 수동 큐레이션 고정 (P0 선행 의존)
- **§7-B.05**(로드맵): 서버 권위 등급 + 서명 CBOM — pydantic+zod 동시 확장(INTEG-1 예외), 유료 제품 단계

---

## §8. 참조

- 부모: `.moai/specs/SPEC-PQC-002/spec.md`, `.moai/specs/SPEC-PQC-001/spec.md`
- 기반 리서치(인용 전체): `.moai/specs/SPEC-PQC-003/research.md`
- 응답 스키마(무변경, 읽기 전용 참조): `scanner-api/models/scan_result.py`, `scanner-web/src/data/schema.ts`
- 비교군 소스: `public/data/domains.json`(ROOT 앱) → `scanner-web/public/benchmark.json`
- 재사용(읽기): `scanner-web/src/components/shared/scoreBand.ts`(무수정), `scanner-web/src/components/ResultDohae.tsx`(확장)
- 배포(불변): `railway.json`, `scanner-api/Dockerfile`, `.dockerignore`, `scanner-web/vite.config.ts`
- 표준: NIST FIPS 203 / IR 8547, CNSA 2.0, 한국 PQC 마스터플랜, CycloneDX 1.6(ECMA-424)

---

## §9. 시간 추정 (발표 1~3일)

| 우선순위 | 섹션 | 작업 | 시간 |
|---|---|---|---|
| **P0-선행** | ③ | `benchmark.json` 추출(domains.json→sector/4축/overall) + gen 스크립트 | 1~2h |
| **P0** | ①②③④⑦ | grade.ts · benchmark.ts · findings.ts · actionPlan.ts · report 컨테이너 · 섹터 드롭다운 | 6~9h |
| **P1** | ⑤⑥ | regulation.ts(정적 테이블) · hndl.ts(Mosca 신규) · 컴포넌트 | 4~6h |
| **P2** | ⑧ | cbom.ts(CycloneDX) 또는 정적 목업 + 다운로드 | 2~4h(목업 1h) |
| 무결성 | 전체 | demo_cache 회귀(AC-003) · `docker build` + `/benchmark.json` 200(AC-006) · pnpm build/typecheck | 2~3h |
| **합계** | | | **15~24h ≈ 2~3일** |

---

*SPEC v0.2.0 Draft (무결성 검증 반영). 최우선 제약: §0 백엔드 무변경 + §1.3 무결성. 승인 후 P0 구현 진입.*
