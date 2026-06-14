# 발표 자료 — 메이킹 스토리 트랙 (Making Story Track)

> 양자컴퓨팅 강의 기말 프로젝트의 **"어떻게 만들었나"** 각도 발표 자료.
> 기존 `presentation-notes.md`(결과 중심 7슬라이드, 10분)와 별도로 운영되는 메이킹·바이브코딩·LLM 사용 중심 트랙.
> 15슬라이드 / 15분 기준. PPT·Keynote·Marp·Slidev 어디에든 옮길 수 있는 마크다운 형식.
>
> **문서 버전**: 0.1.0 · **작성일**: 2026-05-26 · **데이터 기준**: domains.json v0.6.0-phase2-pqc-merge+recs (n=47)

---

## 발표 컨텍스트

| 항목 | 값 |
|---|---|
| 청중 | 양자컴퓨팅 강의 교수님·동급생 |
| 시간 | 15분 발표 + Q&A |
| 슬라이드 수 | 15장 (Why 2 / What 2 / How 4 / Structure 2 / LLM 2 / Result 3) |
| GitHub | https://github.com/chanspick/quant_reg |
| SPEC | `.moai/specs/SPEC-PQC-001/spec.md` (95+ EARS 요구사항) |
| 기존 트랙 | `presentation-notes.md` (결과 중심, Q&A 부록 보유) |

---

# 섹션 A. Why — 왜 필요한 기술인가

## 슬라이드 1: 표지 + 한 줄 메시지

### 헤드라인
**"양자 시대를 5일 만에 측정했다 — Claude Code와 함께"**

### 부제
한국 51개 도메인의 PQC 전환 준비도 측정 — 바이브 코딩으로 12일 만에 완성

### 본문 콘텐츠
- 제출자: 조찬형 (chanspick)
- 강의: 양자컴퓨팅 기말 프로젝트
- 발표일: 2026-05-XX
- GitHub: `github.com/chanspick/quant_reg`
- SPEC: `SPEC-PQC-001` (v0.1.0, Draft)

### 시각 자료
- 4축 레이더 차트 1장 (LG화학 모범 사례)
- 양자 컴퓨터 일러스트 + 한국 지도 오버레이 (선택)

### 발표자 노트
이 발표는 두 축으로 진행합니다. 첫 번째는 PQC 측정 자체의 발견, 두 번째는 바이브 코딩 — Claude Code와 자연어 대화로 12일 만에 95% 테스트 커버리지를 달성한 개발 과정입니다. 코드는 모두 공개되어 있고, 누구나 47개 도메인을 다시 측정할 수 있습니다.

---

## 슬라이드 2: HNDL × NIST × 한국 공백

### 헤드라인
**측정 부재의 교집합 — 왜 지금 측정해야 하는가**

### 본문 콘텐츠
- **HNDL (Harvest Now, Decrypt Later)**: 양자 등장 이전 암호화 데이터를 수집해 두고, 양자 시대에 해독하는 위협 모델
- **NIST FIPS 203/204/205 확정 (2024-08)**: ML-KEM, ML-DSA, SLH-DSA — 양자내성 표준 3종
- **브라우저 기본값 ON**: Chrome 124 (2024-04), Firefox 132 (2024-10), Cloudflare 전역 활성화
- **그런데 한국 인프라는?** → 측정해 본 사람이 없었음 (사전 조사 0건)

### 시각 자료 (타임라인)
```
2024-08  NIST FIPS 203/204/205 표준 확정
2024-04  Chrome 124 X25519MLKEM768 기본 ON
2024-10  Firefox 132 동일
2025     김의결·안혁 — 이론 프레임 (교수 송부 논문)
2026-01  PQC 표준 1.5년차 도래
2026-05  한국 인프라 측정 공백  ← 본 프로젝트가 메우는 자리
```

### 발표자 노트
세 가지 흐름이 만나는 지점에 이 프로젝트가 있습니다. HNDL은 미래 위협이지만 데이터는 지금 수집되고 있다는 점에서 즉각적이고, NIST 표준은 1년 9개월 전에 확정되었으며, 브라우저는 이미 1년 전부터 기본값입니다. 그런데 한국 인프라가 실제로 PQC 협상에 응답하는지 측정한 공개 자료는 찾을 수 없었습니다. 이 측정 부재를 메우는 것이 본 프로젝트의 출발점입니다.

### 인용
- Bernstein & Lange (2017) — "Post-quantum cryptography" Nature 549
- NIST FIPS 203 (2024-08)
- Mozilla SSL Configuration v6.0

---

# 섹션 B. What — 무엇을 만들었나

## 슬라이드 3: 4축 측정 모델 (한 장 요약)

### 헤드라인
**4축 자동 측정 — 모두 표준 인용 기반**

### 본문 콘텐츠 (표)

| 축 | 범위 | 도구 | 표준 인용 |
|---|---|---|---|
| **TLS 위생** | 0-100 | sslyze 6.x (자동) | RFC 8996 / Mozilla v6.0 / NIST SP 800-52 / OWASP TLS |
| **하이브리드 KEM** | 0-100 | raw socket TLS 1.3 probe (자동) | IANA Named Groups 0x11EC / draft-ietf-tls-ecdhe-mlkem |
| **인증서 운영** | 0-100 | sslyze 6.x (자동) | Mozilla v6.0 |
| **양자 위협 정량** | 0-100 | Roetteler·Willsch 계산 (결정적) | arXiv:1706.06752 / doi:10.3390/math11194222 |

### 차별점
- **Phase 2 raw TLS 1.3 프로브**: sslyze 같은 표준 도구가 보지 못하는 PQC 신호 포착
- **외부 PQC 라이브러리 의존성 0**: Python 표준 라이브러리 `socket` + `struct`만으로 ClientHello 직접 조립
- **모든 점수에 `source` 필드**: automated · manual · llm+verified · llm-only

### 발표자 노트
4축 모두 자동 측정 또는 결정적 계산입니다. 사람의 주관이 들어간 점수는 없습니다. 특히 두 번째 축 — 하이브리드 KEM — 이 이 프로젝트의 차별점입니다. sslyze 6.x로는 `elliptic_curves` scan만 보이는데 한국 도메인 51개 전부 ECDHE-only로 나옵니다. 그런데 직접 TLS 1.3 ClientHello를 조립해서 `supported_groups=[0x11EC]`을 보내면 12개가 X25519MLKEM768로 응답합니다. 측정 방법을 바꿔야 PQC 신호가 보입니다.

---

## 슬라이드 4: 핵심 발견 두 줄

### 헤드라인
**"측정 방법을 바꾸면 0%가 아니라 24%다"**

### 본문 콘텐츠
- **Phase 1 (sslyze 자동 측정)**: 51개 중 47개 측정 성공, 4개는 외부 프로브 차단 (현대모비스·현대글로비스·HL만도·신한은행)
- **Phase 2 (raw TLS 1.3 PQC probe)**: 51개 중 12개(24%) X25519MLKEM768 협상 응답
  - 삼성SDI, LG이노텍, 현대자동차, 기아, LG화학, 한전, 두산, 삼성바이오, 네이버, LG U+, 미래에셋, 크래프톤
- **차단 패턴**: 16개(31%) raw TLS 1.3 자체 거부 — 공공·금융 다수, TCP RST / DNS block / SNI 차단

### 시각 자료 (도넛 차트)
```
Phase 2 분포 (n=51):
  SUPPORTED    24%  [████░░░░░░░░░░░░]
  NOT_SUPPORTED 45% [█████████░░░░░░░]
  ERROR_NETWORK 31% [██████░░░░░░░░░░]
```

### 발표자 노트
이 슬라이드는 발표 전체의 닻입니다. sslyze 같은 업계 표준 도구로 측정하면 한국 인프라의 PQC 채택률은 0%입니다. 하지만 raw TLS 1.3 ClientHello를 직접 조립해서 보내면 24%가 응답합니다. 이 차이는 한국 인프라 자체가 변한 게 아니라, 측정 방법이 달라진 결과입니다. 기존 도구가 PQC 신호를 놓치고 있었던 것입니다.

---

# 섹션 C. How — 바이브 코딩 (핵심 섹션, 4슬라이드)

## 슬라이드 5: 바이브 코딩이란?

### 헤드라인
**Vibe Coding — Andrej Karpathy, 2025**

### 정의 (인용 카드)
> "자연어로 LLM에게 코딩을 위임하고, 결과를 감각적으로(by vibes) 받아들이는 개발 방식.
> 사람은 코드를 직접 쓰지 않고, 대화하면서 만든다."
> — Andrej Karpathy (Twitter/X, 2025-02)

### 이 프로젝트에서의 의미
- 1인 학부생이 12일 만에 다음을 동시에 만들 수 있었던 이유:
  - Python 측정 엔진 (2,372 라인)
  - React PWA 대시보드 (6,180 라인)
  - Qiskit Shor 회로 골격 (Phase 3)
  - 95+ EARS 요구사항 SPEC (1,300 라인 Markdown)
  - 단위 테스트 9 파일, 95.55% lines / 89.01% functions 커버리지
- **총 9,852 라인의 코드 + 5,408 라인의 도메인 데이터 = 15,260 라인**

### 바이브 코딩의 두 얼굴
- **강점**: 골격 생성, 보일러플레이트 제거, 버그 패턴 진단
- **함정**: 표준 인용 환각, calibration 결정, 측정 책임의 위탁

### 발표자 노트
바이브 코딩은 2025년 초 Karpathy가 만든 용어입니다. 자연어로 코딩을 위임하면서 "감각적으로" 작업하는 방식인데, 이게 학부 1인 프로젝트의 규모 한계를 깨뜨립니다. 다만 이 슬라이드의 마지막 부분 — "두 얼굴" — 이 중요합니다. 강점만 강조하면 발표의 신뢰가 떨어집니다. 표준 인용은 LLM이 환각하기 쉬워서 직접 검증했고, calibration scalar 같은 모델 결정은 사람이 책임져야 합니다.

### 인용
- Karpathy, A. (2025-02) "There's a new kind of coding I call 'vibe coding'…" — X/Twitter
- Chen et al. (2021) "Evaluating Large Language Models Trained on Code" — Codex 평가, arXiv:2107.03374

---

## 슬라이드 6: 도구 스택 — 개발 환경 자체가 시스템

### 헤드라인
**Claude Code + MoAI-ADK — 21개 specialized agent의 조율**

### 다이어그램
```
┌─ Claude Code (Opus 4.7, 1M context window)
│   │
│   └─ MoAI-ADK 워크플로우 (Strategic Orchestrator)
│       │
│       ├─ Manager Agents (7)
│       │   ├─ manager-spec     → SPEC EARS 작성
│       │   ├─ manager-ddd      → ANALYZE-PRESERVE-IMPROVE
│       │   ├─ manager-docs     → 문서 동기화
│       │   ├─ manager-quality  → TRUST 5 게이트
│       │   ├─ manager-project  → 프로젝트 구조
│       │   ├─ manager-strategy → 아키텍처 결정
│       │   └─ manager-git      → 브랜치·PR·머지
│       │
│       └─ Expert Agents (8)
│           ├─ expert-backend     → Python 측정 엔진
│           ├─ expert-frontend    → React PWA
│           ├─ expert-security    → OWASP 검토
│           ├─ expert-testing     → vitest 작성
│           ├─ expert-refactoring → AST-grep 변환
│           ├─ expert-debug       → 버그 추적
│           ├─ expert-performance → 프로파일링
│           └─ expert-devops      → 빌드·배포
```

### 의도적 분리의 이유
- **컨텍스트 폭주 방지**: 각 agent는 독립 200K 토큰 세션
- **책임 경계 명확화**: 어떤 산출물이 어느 agent에서 나왔는지 추적 가능
- **Progressive Disclosure**: 메타데이터(100 토큰) → 본문(5K) → 번들(필요시) 3단계 로딩

### 발표자 노트
도구 자체가 시스템입니다. MoAI는 직접 코드를 쓰지 않습니다. 사용자 요청을 분석해서 어떤 전문 agent에게 위임할지 결정하는 오케스트레이터 역할입니다. 이 분리가 왜 중요한지가 다음 슬라이드 — SPEC-First DDD — 에서 드러납니다.

### 인용
- Anthropic (2025) "Claude Code Architecture" — claude.com/code
- Evans, E. (2003) "Domain-Driven Design" — DDD 방법론의 원전

---

## 슬라이드 7: SPEC-First DDD 사이클

### 헤드라인
**Plan → Run → Sync — LLM에게 코드를 쓰게 하기 전에 SPEC을 먼저**

### 사이클 다이어그램
```
        ┌──── Plan ────┐
        │  manager-spec │
        │  30K tokens   │  ── SPEC EARS 95+ 작성
        │               │     `.moai/specs/SPEC-PQC-001/spec.md`
        └───────┬───────┘
                │
                ▼ (사용자 승인 후 /clear)
        ┌──── Run ─────┐
        │ manager-ddd   │
        │ 180K tokens   │  ── ANALYZE: 기존 코드 읽기
        │               │  ── PRESERVE: 특성화 테스트
        │               │  ── IMPROVE: 점진적 변경
        └───────┬───────┘
                │
                ▼
        ┌──── Sync ────┐
        │ manager-docs  │
        │ 40K tokens    │  ── README, CHANGELOG, PR
        │               │     문서·코드 동기화
        └───────────────┘
```

### 토큰 예산 전략
- **총 250K**: 1M 윈도우의 25%만 사용 → 컨텍스트 폭주 차단
- **/clear 강제**: Plan 완료 시 컨텍스트 초기화 → 45-50K 토큰 회복
- **결과**: Run 페이즈에 70% 더 큰 구현 가능

### 핵심
코드 한 줄 짜기 전에 95+ EARS 요구사항을 먼저 확정 → LLM의 hallucination을 SPEC이 차단

### 발표자 노트
이게 바이브 코딩의 함정을 막는 방어선입니다. LLM이 환각하는 가장 큰 이유는 요구사항이 모호하기 때문입니다. SPEC을 먼저 EARS 형식 — "WHEN 조건이면, 시스템은 행동한다" — 으로 95개 이상 명시한 후에야 코드 작성을 시작합니다. 이 SPEC이 검증 인프라(zod, validate-data, vitest)와 결합되어 LLM 산출물의 안전망 역할을 합니다.

### 인용
- Mavin et al. (2009) "Easy Approach to Requirements Syntax (EARS)" — IEEE RE'09
- Feathers, M. (2004) "Working Effectively with Legacy Code" — 특성화 테스트 원전

---

## 슬라이드 8: 12일 타임라인 (실제 빌드 로그)

### 헤드라인
**12일, 5단계, 95+ EARS, 9,852 라인의 코드**

### 간트형 타임라인
```
05-14  ────────────────────  Phase 0 — SPEC + 스캐폴드
       │ SPEC-PQC-001 v0.1 (763줄 → 827줄, 95+ EARS)
       │ Vite 6 + React 19 + Tailwind 4 + shadcn/ui
       │ 4축 모델 + 3 논문 인용 (김의결·안혁 / Roetteler / Willsch)
       │ source 필드 의무화 + SourceChip 4색 레전드
05-16  ────────────────────  Phase 0 완료
       │ Dashboard 본구현 + PWA (Service Worker + Manifest)
       │ 테마 시스템 (Light/Dark/System)
       │ 테스트 9 파일, 95.55% lines 커버리지
05-17  ────────────────────  Phase 1 — Python 측정 엔진
       │ scanner/measure.py (sslyze 6.x CLI)
       │ scanner/scoring.py (Mozilla/NIST/OWASP/RFC 인용)
       │ scanner/roetteler.py (logical qubits 계산)
       │ 50개 도메인 batch (47/51 성공)
       │ Bug fix 2건: ROBOT enum substring + ECC 곡선 별명
05-18  ────────────────────  Phase 1 결과 분석
       │ TLS 분포 이극화 발견 (위험 20개 / 우수 14개)
       │ 섹터 평균 격차: 통신 87 vs 공공/정부 16
05-19  ────────────────────  Phase 2 — raw TLS 1.3 + 정직성 보정
       │ scanner/pqc_probe.py (외부 의존성 0)
       │ scanner/merge_pqc.py (probe → domains.json)
       │ X25519MLKEM768 협상 12/51 (24%) 발견
       │ 통계 톤 약화: "섹터 격차 6배" → "표본 47 기준 6×"
       │ enum 정합성 버그 발견·수정 (validate-data 자동 감지)
05-21  ────────────────────  presentation-notes 작성 (결과 트랙)
05-25  ────────────────────  GitHub 공개 (chanspick/quant_reg)
05-26  ────────────────────  presentation-making-story 작성 (메이킹 트랙) ← 현재
```

### 발표자 노트
12일이라는 짧은 기간이 가능했던 이유 두 가지. 첫째는 SPEC을 먼저 95+ EARS로 작성해서 LLM이 산만하게 다른 방향으로 가지 않도록 차단했고, 둘째는 검증 인프라(zod, validate-data, vitest)가 LLM 산출물을 자동으로 점검했기 때문입니다. 5월 19일 한 줄을 주목해 주세요 — Phase 2 구현하면서 enum 정합성 버그를 자동으로 잡았습니다. 이게 바이브 코딩의 안전망입니다.

---

# 섹션 D. 코드베이스 구조

## 슬라이드 9: 디렉토리 구조도

### 헤드라인
**quant_reg/ — Python 측정 + TS 대시보드의 단일 진실 공급원**

### 트리 (주요 디렉토리만)
```
quant_reg/
├── scanner/                   [Python 2,372 라인 — Phase 1+2 측정 엔진]
│   ├── measure.py             sslyze 6.x 배치 측정 CLI
│   ├── scoring.py             4축 점수 산출 (표준 인용)
│   ├── roetteler.py           양자 위협 정량 (logical qubits)
│   ├── pqc_probe.py     ★    raw TLS 1.3 X25519MLKEM768 프로브
│   ├── merge_pqc.py           probe 결과 → domains.json 병합
│   ├── domains.csv            51개 한국 도메인 후보
│   └── requirements.txt       sslyze >= 6.0 (유일한 의존성)
│
├── quantum/                   [Python (Phase 3 예정) — Qiskit Shor]
│   ├── shor_circuit.py
│   └── shor_experiment.py
│
├── src/                       [TypeScript 6,180 라인 — React PWA]
│   ├── components/
│   │   ├── dashboard/         DomainCard, DomainDetailPanel, SearchInput,
│   │   │                      SectorFilter, SortControl, SectorSummary
│   │   ├── shared/            SourceChip ★, ScoreBar, StatusBadge
│   │   ├── pwa/               InstallButton, UpdateToast, OfflineNotice
│   │   ├── theme/             ThemeProvider, ThemeToggle (Light/Dark/System)
│   │   └── layout/            AppShell, Header, DemoBanner
│   ├── data/
│   │   ├── schema.ts    ★    zod DomainSchema (275 라인, 16 enum)
│   │   ├── useDomains.ts     fetch + zod 런타임 검증 훅
│   │   ├── quantumResources.ts  Roetteler·Willsch TS 미러
│   │   └── references.ts        3 논문 메타데이터
│   ├── pages/                  Dashboard / Methodology / About / 404
│   └── lib/                    pwa, themeColor, dashboardState, utils
│
├── public/data/
│   └── domains.json     ★    47 도메인 × 25+ 필드 (5,408 라인)
│                              source: automated 716 / manual 47 / llm-only 47
│
├── tests/                     [TypeScript — vitest 9 파일]
│   ├── unit/                  schema, dashboard, useDomains, …
│   └── fixtures/sample-domains.json
│
├── scripts/                   [TypeScript — 인프라]
│   ├── validate-data.ts ★    zod 검증 (enum 정합성 게이트)
│   └── add-domain.ts          @inquirer/prompts 대화식 추가
│
└── .moai/specs/SPEC-PQC-001/
    ├── spec.md           ★   95+ EARS, 1,300 라인 (한국어)
    ├── presentation-notes.md          (결과 트랙)
    └── presentation-making-story.md   (메이킹 트랙, 본 문서)
```

### 언어 비중 (도메인 데이터 제외)
```
TypeScript/TSX  6,180 라인  62.7%  ▓▓▓▓▓▓▓▓▓▓▓▓▓
Python          2,372 라인  24.1%  ▓▓▓▓▓
Markdown        1,300 라인  13.2%  ▓▓▓
                ────────
총             9,852 라인
```

### 발표자 노트
프론트엔드가 62.7%를 차지하지만 측정의 본질은 Python 24%에 있습니다. 별표 표시한 5개 파일이 핵심입니다 — `pqc_probe.py`(Phase 2 차별점), `schema.ts`(zod 검증 게이트), `domains.json`(단일 진실 공급원), `validate-data.ts`(자동 게이트), `spec.md`(95+ EARS 요구사항).

---

## 슬라이드 10: 데이터 흐름 — single source of truth

### 헤드라인
**측정 엔진 ↔ UI 사이에 zod 스키마가 두 번 게이트**

### 다이어그램
```
┌──────────────────┐   ┌──────────────────┐
│   [sslyze 6.x]   │   │  [raw TLS 1.3]   │
│   Phase 1 자동   │   │  Phase 2 PQC     │
│   47/51 도메인   │   │  probe (24%)     │
└────────┬─────────┘   └────────┬─────────┘
         │                      │
         ▼                      ▼
    {host}.partial.json    {host}.probe.json
         │                      │
         └──────── merge ───────┘
                    │
                    ▼
       ┌─────────────────────────┐
       │  public/data/domains.json│  ← 단일 진실 공급원
       │  47 도메인 × 25+ 필드     │     source: automated 716
       │                          │             manual      47
       │                          │             llm-only    47
       └────────────┬─────────────┘
                    │
        ┌───────────┴────────────┐
        ▼                        ▼
┌───────────────────┐    ┌───────────────────┐
│ validate-data.ts  │    │  React useDomains │
│ (빌드 시 게이트)  │    │  (런타임 게이트)  │
│ zod 거부 → exit 1│    │  zod 거부 → Error │
└──────────┬────────┘    └──────────┬────────┘
           │                        │
           ▼                        ▼
      빌드 차단                 PWA 렌더링
   (pnpm lint)              (Dashboard / Detail)
```

### 핵심 메시지
- **두 번 게이트**: 빌드 시(`pnpm lint = eslint + validate-data`) + 런타임(`useDomains` 훅)
- **enum 정합성 보장**: Python `scoring.py`가 산출하는 enum 값과 TypeScript `schema.ts`의 enum이 일치해야 통과
- **실제 잡힌 버그**: 2026-05-19 `derive_pqc_status`가 `keyExchange`에 `"미감지"` 반환 → enum 거부 → 46/47 invalid → 5분 만에 수정

### 발표자 노트
이 다이어그램이 바이브 코딩 검증의 핵심입니다. LLM이 만든 코드가 빌드를 통과해도 런타임에서 거부될 수 있습니다. 그 사이에 validate-data가 들어가서 빌드 차단을 합니다. 실제로 5월 19일 Phase 2 구현 중에 enum 값 하나가 잘못 들어가서 46개 도메인이 거부됐고, 5분 만에 잡았습니다. 검증 인프라가 없었다면 프로덕션까지 갔을 버그입니다.

---

# 섹션 E. LLM이 어디 쓰였나 — 정직성 시스템

## 슬라이드 11: source 분포 — 정량 공개

### 헤드라인
**모든 데이터에 출처 라벨 — 자동 측정 716건 vs LLM 산출 47건**

### 본문 (정량 카드)

| source | 건수 | 색상 | 역할 |
|---|---|---|---|
| `automated` | **716** | sky-500 | Python 자동 측정 + 결정적 계산 (4축 점수, 인증서 메타, Phase 2 probe) |
| `manual` | **47** | amber-500 | 도메인 메타 직접 작성 (이름, 섹터, URL) |
| `llm-only` | **47** | violet-500 | narrative · supplyChainNotes placeholder (TODO 작성 대기) |
| `llm+verified` | **0** | slate-500 | 검증된 LLM 분석 (향후 도메인별 정성 분석 작성 시) |

### 시각화
- 도넛 차트: automated 89% / manual 6% / llm-only 6% / llm+verified 0%
- SourceChip 컴포넌트 스크린샷 (Dashboard Detail Panel에서 각 필드별 색상)

### 핵심
- 학부 데모지만 평가 자료로서의 책임 의식
- 모든 필드에 출처가 시각적으로 구분되어 청중이 직접 검증 가능
- `llm-only` 47건은 발표 후 `llm+verified`로 승격 예정 (LLM 분석 + 사람 검증 게이트)

### 발표자 노트
이 슬라이드는 두 가지를 동시에 보여줍니다. 첫째, LLM이 데이터의 6%만 차지하고 나머지 94%는 자동 측정 또는 직접 작성된 것입니다. 둘째, 그 6%마저도 `llm-only` 색상으로 명확히 구분되어 청중이 "이건 LLM 산출물이니 검증이 필요하다"고 인지할 수 있습니다. 이게 바이브 코딩에서 정직성을 유지하는 방법입니다.

### 인용
- Bender et al. (2021) "On the Dangers of Stochastic Parrots" — FAccT'21, LLM 출처 추적의 윤리적 근거

---

## 슬라이드 12: LLM이 한 일 vs 안 한 일 — 책임 경계

### 헤드라인
**LLM의 강점과 사람의 책임 — 책임 경계의 명시**

### 비교 표

| 영역 | LLM이 한 일 (Claude Code) | 사람이 한 일 (직접 결정·검증) |
|---|---|---|
| **스캐폴딩** | Vite/Tailwind/shadcn 세팅 ✓ | — |
| **SPEC** | EARS 95+ 요구사항 초안 ✓ | 4축 모델 + 3 논문 선정 |
| **표준 인용** | RFC/Mozilla/NIST 검색 보조 | Mozilla v6.0 vs v5.7 차이 검증, 출처 확인 |
| **Python 측정 코드** | scanner/ 4개 모듈 골격 ✓ | sslyze 옵션 선택, 도메인 50개 선정 |
| **Phase 2 raw socket** | TLS 1.3 ClientHello 구조 ✓ | 0x11EC IANA 값 확인, HRR 파싱 로직 검토 |
| **버그 진단** | ROBOT enum substring, ECC 별명 ✓ | 어디서 측정이 틀어졌는지 가설 제시 |
| **enum 정합성** | validate-data 보고 → 수정 ✓ | enum 거부 의미 해석, 영향 범위 추정 |
| **calibration scalar** | — | **22 · 0.7 결정 (사람 책임)** ordering-preserving only 명시 |
| **narrative 47건** | placeholder 생성 ✓ | (미작성 — 다음 단계) |
| **measurement 실행** | — | **batch 측정 실행 (자동, 사람 관여 0)** |
| **통계 톤** | 1차 표현 작성 ✓ | "섹터 격차 6배" → "표본 47 기준 6×" 보정 |

### 책임의 비대칭성
- **LLM은 골격과 패턴 인식에 강함** — 보일러플레이트, 버그 진단, 코드 패턴
- **사람은 결정과 검증에 책임** — 표준 출처, 칼리브레이션, 측정 해석
- **위탁할 수 없는 영역**: 측정의 의미·표본 한계·윤리적 해석

### 발표자 노트
이 슬라이드가 바이브 코딩 발표의 가장 정직한 한 장입니다. LLM이 만든 부분과 사람이 만든 부분을 명시하지 않으면, 청중은 "이 학생이 다 만든 거냐, LLM이 다 만든 거냐"를 혼동합니다. 표를 보면 분명합니다 — LLM은 골격에 강하고, 사람은 결정과 해석에 책임을 집니다. 특히 calibration scalar 22와 0.7은 제가 직접 결정한 값이며, 그 근거가 없다는 한계도 SPEC과 Methodology 페이지에 명시했습니다.

---

# 섹션 F. 결과 + 회고

## 슬라이드 13: 라이브 데모 — 3 카테고리 큐레이션

### 헤드라인
**47개 전체보다 3개 도메인을 깊게 — 정직성이 시각화되는 방식**

### 데모 도메인 3개

#### 모범 사례: LG화학 (화학/에너지)
- 점수: TLS **92** / KEM **100** / certOps **100** / quantumThreat **23**
- Phase 2 SUPPORTED, RSA-2048 수동 갱신
- **이 트랙 추가**: SourceChip 4색 모두 표시 — automated(점수) + manual(섹터) + llm-only(narrative TODO)

#### 엇갈리는 신호: 네이버 (IT/플랫폼)
- 점수: TLS **10** / KEM **100** / certOps **85** / quantumThreat **20**
- Phase 2 SUPPORTED, ECC-256, 분기 자동 갱신
- **인사이트**: 한국 IT 1위 포털이 PQC 협상은 응답하지만 TLS 1.0/1.1 잔존
- **CDN 가설**: PQC 채택이 service-level TLS 위생을 자동 보장하지 않음

#### 전 영역 미흡: 카카오 (IT/플랫폼)
- 점수: TLS **0** / KEM **15** / certOps **65** / quantumThreat **23**
- Phase 2 NOT_SUPPORTED, RSA-2048 수동 갱신
- **대조**: 같은 섹터 1위 포털(네이버)과의 격차 — NIST 표준 1년 9개월 후의 메신저 1위 기업

### 발표자 노트
3개 도메인을 깊게 보여주는 게 47개 평균치보다 인상적입니다. 각 카드에서 SourceChip 색상에 주목해 주세요 — automated(파랑)는 자동 측정, manual(주황)은 직접 작성, llm-only(보라)는 LLM placeholder입니다. 이 색상 차이가 정직성 시스템의 시각화입니다. 라이브 데모가 가능하면 dev server를 띄우고, 안 되면 스크린샷 3장으로 대체합니다.

---

## 슬라이드 14: 바이브 코딩 회고 — 검증 인프라가 잡은 enum 버그

### 헤드라인
**5월 19일, 46/47 도메인이 거부됐다 — 그리고 5분 만에 잡혔다**

### 실제 시나리오
```
[15:32]  Claude Code: Phase 2 구현 완료 (pqc_probe.py + merge_pqc.py)
[15:33]  $ pnpm lint
[15:33]    eslint . ………………… ✓ pass
[15:34]    tsx scripts/validate-data.ts
[15:34]    ZodError: domains[1].scores.keyExchange
[15:34]      Invalid enum value. Expected '활성화'|'미지원'|'비활성화'|'차단됨'|'미설정',
[15:34]      received '미감지'
[15:34]    … 46 more errors (similar)
[15:34]    ✗ exit 1
[15:35]  진단: scanner/scoring.py:derive_pqc_status() → keyExchange 에 "미감지" 반환
         그러나 "미감지" 는 hybrid enum 에만 있음
[15:37]  Fix: return "미지원" (PQC 그룹 advertise 안 함)
[15:38]  $ python -m scanner.merge_pqc  → domains.json 46개 in-place 패치
[15:39]  $ pnpm lint  → ✓ pass (47/47 유효)
```

### 교훈 (3줄)
1. **빌드 통과 ≠ 데이터 유효**: ESLint와 TypeScript는 enum 정합성을 잡지 못함
2. **zod 런타임 검증이 안전망**: Python ↔ TypeScript enum 일치를 자동 게이트
3. **바이브 코딩의 안전망**: LLM 산출물이 빌드를 통과해도 zod가 거부하면 멈춤

### 발표자 노트
이게 바이브 코딩이 무너지지 않은 이유입니다. LLM이 자동으로 만든 Phase 2 코드가 빌드를 통과했지만, validate-data 스크립트가 46개 도메인의 enum 정합성 오류를 잡았습니다. 사람이 5분 만에 진단·수정했습니다. 검증 인프라(zod 스키마 + validate-data + vitest)가 없었다면 프로덕션까지 갔을 버그입니다.

### 인용
- Colin Robertson (2023) "Type-driven development" — 런타임 검증의 필요성
- Zod docs — zod.dev (런타임 스키마 검증의 표준)

---

## 슬라이드 15: 결론 + 다음 단계

### 헤드라인
**측정 방법론 × 바이브 코딩 × 정직성 시스템**

### 3줄 결론
1. **방법론 기여**: sslyze 같은 표준 도구가 놓치는 PQC 신호를 raw TLS 1.3 직접 측정으로 발견 — 0% vs 24% 의 차이는 측정 방법론에서 나옴
2. **바이브 코딩의 가능성과 책임**: 1인 학부생이 12일 만에 9,852 라인의 코드 + 95+ EARS SPEC을 완성할 수 있었던 이유는 SPEC-First DDD + 검증 인프라(zod, validate-data, vitest) 덕분
3. **정직성 시스템의 실증**: 716 / 47 / 47 / 0 의 source 분포, calibration scalar의 한정 명시, placeholder 자동 unmount — 학부 데모지만 평가 자료로서의 책임 의식

### 다음 단계 (Future Work)
- **narrative 47건 작성** — LLM 분석 + 사람 검증 게이트 → `llm+verified` 승격
- **HNDL 시간축 모델** — 데이터 수명 × Q-day 추정 결합 (Microsoft Azure Quantum / IBM hardware roadmap)
- **Phase 3 Shor 시뮬레이션** — Qiskit으로 RSA-15/21 양자 분해, Willsch 2023 재현
- **discrete grade v2** — calibration scalar 폐기 → 5-tier (pq-observed / hybrid-capable / classical-only / legacy / critical)

### 자료 + 인용
- **GitHub**: github.com/chanspick/quant_reg (MIT License 예정)
- **SPEC**: `.moai/specs/SPEC-PQC-001/spec.md`
- **참고 문헌**:
  - 김의결·안혁 (2025) — 교수 송부 논문
  - Roetteler et al. (2017) — arXiv:1706.06752
  - Willsch et al. (2023) — Mathematics 11(19), 4222

### 발표자 노트
세 가지 축이 만나는 지점에 이 프로젝트가 있습니다. 측정 방법론, 바이브 코딩, 정직성 시스템. 어느 하나만 강조해도 발표가 됩니다만, 셋이 같이 있을 때 학부 데모의 책임감이 완성됩니다. 다음 단계의 핵심은 narrative 47건 작성 — 현재 placeholder인 정성 분석을 LLM 검증 파이프라인으로 채우는 것입니다.

---

# 시간 배분 (15분 기준)

| 시간 | 슬라이드 | 섹션 | 핵심 메시지 |
|:---:|:---:|---|---|
| 0:00 – 1:30 | S1 – S2 | Why | HNDL + NIST + 한국 측정 공백 |
| 1:30 – 3:30 | S3 – S4 | What | 4축 모델 + 24% 발견 |
| 3:30 – 8:00 | **S5 – S8** | **How (바이브 코딩)** | **핵심 4.5분 — Karpathy 정의 + 도구 + SPEC-First + 12일 타임라인** |
| 8:00 – 10:30 | S9 – S10 | 구조 | 디렉토리 + 데이터 흐름 (zod 두 번 게이트) |
| 10:30 – 12:30 | S11 – S12 | LLM 사용 | source 분포 + 책임 경계 |
| 12:30 – 14:30 | S13 – S15 | 결과·회고 | 데모 3개 + enum 버그 회고 + 결론 |
| 14:30 – 15:00 | Q&A | — | `presentation-notes.md` 부록 활용 |

---

# 슬라이드 도구 추천

| 도구 | 장점 | 단점 | 추천도 |
|---|---|---|---|
| **Marp** | Markdown 그대로, GitHub 친화적 | 디자인 자유도 낮음 | ★★★ |
| **Slidev** | 코드 데모 강점, Vue 컴포넌트 | 학습 필요 | ★★★★ (개발자 청중) |
| **Reveal.js** | 라이브 데모 통합 | 빌드 복잡 | ★★ |
| **PowerPoint** | 디자인 자유, 인쇄 친화 | 마크다운 수동 변환 필요 | ★★★ (학술 발표 무난) |

본 문서가 마크다운으로 작성되어 있어 Marp 또는 Slidev로 즉시 변환 가능합니다. 학술 발표 청중이면 PowerPoint/Keynote도 무난합니다.

---

# 출처 부록 (논문·표준·도구)

### 양자 위협 정량
- Roetteler, M. et al. (2017) "Quantum resource estimates for computing elliptic curve discrete logarithms" — arXiv:1706.06752
- Willsch, M. et al. (2023) "Benchmarking advantage and D-Wave 2000Q quantum annealers with exact cover problems" — Mathematics 11(19), 4222
- 김의결·안혁 (2025) — 교수 송부 논문 (이론 프레임)

### PQC 표준
- NIST FIPS 203 (2024-08) — Module-Lattice-Based Key-Encapsulation Mechanism
- NIST FIPS 204 (2024-08) — Module-Lattice-Based Digital Signature Algorithm
- NIST FIPS 205 (2024-08) — Stateless Hash-Based Digital Signature Algorithm
- draft-ietf-tls-ecdhe-mlkem (2024+) — Hybrid key exchange in TLS 1.3
- IANA TLS Named Groups — 0x11EC = X25519MLKEM768

### TLS·인증서 표준
- RFC 8446 — TLS 1.3
- RFC 8996 — Deprecating TLS 1.0/1.1
- Mozilla SSL Configuration v6.0 (2024)
- NIST SP 800-52 Rev. 2 (2019) — TLS Implementations
- OWASP TLS Cheat Sheet

### 바이브 코딩 + 개발 방법론
- Karpathy, A. (2025-02) "Vibe coding" — X/Twitter
- Chen et al. (2021) "Evaluating Large Language Models Trained on Code" — arXiv:2107.03374
- Evans, E. (2003) "Domain-Driven Design" — Addison-Wesley
- Feathers, M. (2004) "Working Effectively with Legacy Code" — Prentice Hall
- Mavin et al. (2009) "EARS: Easy Approach to Requirements Syntax" — IEEE RE'09

### 도구
- Claude Code (Anthropic, 2025) — claude.com/code
- MoAI-ADK (MoAI Strategic Orchestrator, 2025)
- sslyze 6.x — github.com/nabla-c0d3/sslyze
- Vite 6 + React 19 + Tailwind 4 + shadcn/ui
- zod — zod.dev (런타임 스키마 검증)

---

*문서 끝. presentation-notes.md (결과 트랙)와 병행 운영.*
