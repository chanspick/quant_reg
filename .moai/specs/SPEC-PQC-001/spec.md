---
spec_id: SPEC-PQC-001
title: PQC 준비도 스캐너 (Post-Quantum Readiness Scanner)
version: 0.1.0
status: Draft
author: MoAI manager-spec
created: 2026-05-14
updated: 2026-05-14
lifecycle: spec-first
priority: High
project: quant_reg
project_type: web_application (PWA)
language: ko
tech_stack:
  - Vite
  - React 19
  - TypeScript 5.9+
  - Tailwind CSS
  - shadcn/ui
  - Radix Primitives
  - vite-plugin-pwa
  - zod
fonts:
  korean: Pretendard
  latin: Inter
  monospace: JetBrains Mono
tags:
  - pqc
  - dashboard
  - pwa
  - demo
  - quantum-computing
  - frontend-only
related_specs: []
---

# SPEC-PQC-001 · PQC 준비도 스캐너

> **본 문서는 양자컴퓨팅 강의 기말 프로젝트 데모용 사양서입니다.**
> 도메인은 실명이나 점수·소견·인증서 정보는 모두 합성(synthetic) 데이터이며, 실 측정 결과가 아닙니다.
> 산출물은 정적 프런트엔드(PWA)이며 백엔드 서비스는 포함하지 않습니다.

---

## 1. Environment (환경)

### 1.1 실행 환경

- **타깃 플랫폼**: 모던 웹 브라우저 (Chrome 120+, Firefox 121+, Safari 17+, Edge 120+)
- **반응형 디바이스**: 모바일(360px~), 태블릿(768px~), 데스크톱(1024px~)
- **빌드 환경**: Node.js 20 LTS 이상, npm 또는 pnpm
- **런타임 의존성**: 정적 호스팅(GitHub Pages, Vercel, Netlify 등) — 서버 없음
- **오프라인 지원**: PWA Service Worker 기반 앱 셸 + 데이터 캐싱

### 1.2 기술 스택 (Locked)

- **빌드 도구**: Vite 5.x
- **UI 프레임워크**: React 19 (Server Components 미사용, 순수 CSR)
- **언어**: TypeScript 5.9+ (strict mode)
- **스타일링**: Tailwind CSS 3.4+, shadcn/ui 컴포넌트, Radix UI Primitives
- **PWA**: `vite-plugin-pwa` (Workbox 기반)
- **데이터 검증**: zod 3.23+
- **선택 라이브러리**:
  - 데이터 캐싱: TanStack Query 5.x (run phase 시점에 채택 여부 확정)
  - 라우팅: React Router 6.x 또는 TanStack Router (run phase 시점에 결정)
  - 차트/시각화: 단순 시각화는 자체 SVG/CSS, 복잡 차트는 Recharts 또는 Visx 후보
- **폰트**: Pretendard(한글), Inter(라틴), JetBrains Mono(수치/코드)

### 1.3 데이터 환경

- **데이터 위치**: `public/data/domains.json` (정적 자산)
- **데이터 로딩**: 런타임 `fetch()` 호출로 동적 로드
- **데이터 검증**: zod 스키마로 런타임 검증
- **데이터 규모**: 50개 도메인 레코드 (단일 JSON 파일, 압축 전 약 50~100KB 추정)
- **데이터 출처**: 합성 데이터 (실 측정 아님)

### 1.4 배포 환경

- **호스팅**: 정적 파일 호스팅 (CDN 권장)
- **빌드 산출물**: `dist/` 디렉터리 (HTML, JS, CSS, 정적 자산, Service Worker, Web App Manifest)
- **HTTPS 필수**: PWA 설치 및 Service Worker 동작 조건

---

## 2. Assumptions (가정)

### 2.1 사용자 가정

- **A-USR-001**: 사용자는 한국어를 주 언어로 사용한다.
- **A-USR-002**: 사용자는 모던 웹 브라우저를 사용하며, JavaScript가 활성화되어 있다.
- **A-USR-003**: 데모 사용자는 PQC 도메인 지식이 일부 있거나, 본 대시보드 자체가 학습 도구로 기능한다고 본다.
- **A-USR-004**: 사용자는 데이터가 합성(synthetic)임을 인지하고 진단 도구가 아닌 데모로 인식한다.

### 2.2 데이터 가정

- **A-DAT-001**: `domains.json`의 50개 레코드는 본 SPEC에 정의된 스키마를 100% 준수한다.
- **A-DAT-002**: 데이터 갱신은 빌드 타임에 이루어지며, 클라이언트가 외부 API를 호출하지 않는다.
- **A-DAT-003**: 모든 점수 값(0~100)은 비정상 케이스(NaN, 음수, 100 초과)를 포함하지 않는다 — zod로 검증.
- **A-DAT-004**: "최종 갱신" 타임스탬프는 빌드 메타데이터 또는 `domains.json` 내 필드로 주입된다.

### 2.3 기술 가정

- **A-TEC-001**: PWA Service Worker는 사용자가 사이트를 1회 이상 방문한 후부터 오프라인 기능을 제공한다.
- **A-TEC-002**: `theme_color` 동적 갱신은 모던 브라우저에서 지원되며, 지원하지 않는 브라우저는 정적 기본값 사용으로 graceful degradation 한다.
- **A-TEC-003**: Tailwind와 shadcn/ui의 HSL CSS 변수 토큰 체계를 그대로 채택하며, 참조 번들의 디자인 토큰을 시드로 사용한다.
- **A-TEC-004**: TypeScript strict mode 위반은 빌드 실패 사유로 간주된다.

### 2.4 범위 가정

- **A-SCO-001**: 본 프로젝트는 그린필드 단일 페이지 PWA로, 마이그레이션·하위 호환·롤아웃 전략을 다루지 않는다.
- **A-SCO-002**: 다국어 i18n은 한국어 단일 로케일이며, 추후 확장을 위해 문자열은 모듈로 분리한다.
- **A-SCO-003**: 인증·결제·사용자 데이터 저장 기능은 본 SPEC 범위 외이다.

---

## 3. Requirements (요구사항 — EARS 형식)

### 3.1 App Shell & Routing (앱 셸 및 라우팅)

#### Ubiquitous

- **REQ-APP-001**: The system shall provide three top-level pages: `/` (대시보드), `/methodology` (측정 방법론), `/about` (프로젝트 소개).
- **REQ-APP-002**: The system shall render a persistent header containing brand `[준비도 스캐너]`, navigation links to all three pages, "최종 갱신 YYYY-MM-DD" timestamp, and theme toggle.
- **REQ-APP-003**: The system shall render a persistent data-source disclosure banner with the following copy: "TLS·KEM·인증서: 자동 측정 / 공급망·정책: 수동 리서치 / 규제 매핑: LLM + 샘플 검증. 데이터 소스별 표시 참고." The banner doubles as a visual legend that maps to the per-field source badges used throughout the UI. The three legend chips MUST be visually distinct and colour-consistent with the corresponding `DataSource` badges (REQ-DSH-020).
- **REQ-APP-004**: The system shall provide a 404 (Not Found) fallback page for unknown routes that includes navigation back to `/`.
- **REQ-APP-005**: The system shall preserve the URL path on full page reload and deep linking.

#### Event-Driven

- **REQ-APP-006**: When the user clicks a navigation link in the header, the system shall transition to the target route without a full page reload (SPA navigation).
- **REQ-APP-007**: When the user activates a navigation link via keyboard (Enter or Space), the system shall transition to the target route equivalent to a mouse click.
- **REQ-APP-008**: When the user clicks the dismiss control on the demo banner, the system shall hide the banner for the remainder of the session.

#### State-Driven

- **REQ-APP-009**: While the current route matches a navigation entry, the system shall visually mark that navigation entry as active (e.g., contrast, underline, or distinct background).

#### Optional

- **REQ-APP-010**: Where the user has previously dismissed the demo banner, the system may persist the dismissal state in `localStorage` so the banner stays hidden across sessions.

#### Unwanted Behavior

- **REQ-APP-011**: If a route fails to load due to a JavaScript runtime error, then the system shall render an error boundary UI with a "다시 시도" action and the option to navigate to `/`.
- **REQ-APP-012**: If the user lands on a deep link before client-side hydration completes, then the system shall not display a blank white screen for more than 1 second; a skeleton or loading indicator must appear within 500ms.

---

### 3.2 Theme System (테마)

#### Ubiquitous

- **REQ-THM-001**: The system shall support three theme modes: Light, Dark, and System.
- **REQ-THM-002**: The system shall default to System mode on first visit when no user preference is stored.
- **REQ-THM-003**: The system shall apply theme via shadcn/ui's HSL CSS variable token pattern (e.g., `:root` and `.dark` classes on `<html>` or `<body>`).
- **REQ-THM-004**: The system shall synchronize the Web App Manifest `theme_color` and the meta `theme-color` tag with the currently rendered theme.

#### Event-Driven

- **REQ-THM-005**: When the user selects a theme via the theme toggle, the system shall apply the theme within 100ms without page reload.
- **REQ-THM-006**: When the user selects a theme other than System, the system shall persist the choice to `localStorage` under a stable key (e.g., `pqc-scanner:theme`).
- **REQ-THM-007**: When the user selects System theme, the system shall remove any stored override and follow `prefers-color-scheme` media query.
- **REQ-THM-008**: When the OS `prefers-color-scheme` changes while System mode is active, the system shall update the rendered theme without user action.

#### State-Driven

- **REQ-THM-009**: While Dark mode is active (either explicit or via System), the system shall render all UI surfaces, text, borders, and focus indicators with the Dark token palette meeting WCAG AA contrast.
- **REQ-THM-010**: While Light mode is active (either explicit or via System), the system shall render with the Light token palette meeting WCAG AA contrast.

#### Unwanted Behavior

- **REQ-THM-011**: If `localStorage` is unavailable (private mode, quota exceeded), then the system shall fall back to System mode without throwing an unhandled exception.
- **REQ-THM-012**: If the theme toggle is interacted with via keyboard, then the system shall expose the current selection state via `aria-pressed` or equivalent ARIA semantics.

---

### 3.3 Data Layer (데이터 계층)

#### Ubiquitous

- **REQ-DAT-001**: The system shall load domain data from `public/data/domains.json` at runtime via the `fetch` API.
- **REQ-DAT-002**: The system shall validate the response using a `zod` schema before consuming the data.
- **REQ-DAT-003**: The system shall expose data state in three forms: `loading`, `success` (with parsed data), and `error` (with reason).
- **REQ-DAT-004**: The system shall surface a loading indicator visible within 100ms of mount when data is being fetched.

#### Event-Driven

- **REQ-DAT-005**: When the data fetch succeeds and validation passes, the system shall render the dashboard with the parsed records.
- **REQ-DAT-006**: When the data fetch fails due to a network error, the system shall display an error state with a "다시 시도" action.
- **REQ-DAT-007**: When the user triggers the retry action, the system shall re-attempt the fetch with the same URL.

#### State-Driven

- **REQ-DAT-008**: While in `error` state, the system shall not render stale data and shall not enable filters/sort controls dependent on the dataset.
- **REQ-DAT-009**: While offline and the Service Worker has cached `domains.json`, the system shall serve the cached copy and indicate "오프라인 모드" or equivalent visual cue.

#### Optional

- **REQ-DAT-010**: Where TanStack Query (or equivalent) is integrated, the system may cache fetch results in-memory and dedupe concurrent requests across components.

#### Unwanted Behavior

- **REQ-DAT-011**: If the validation against the zod schema fails for one or more records, then the system shall log a structured warning (console + optional in-page diagnostic UI) and skip the invalid records rather than crashing.
- **REQ-DAT-012**: If `domains.json` is malformed JSON, then the system shall display the error UI with a developer-readable hint and shall not silently render an empty dashboard without explanation.
- **REQ-DAT-013**: If the dataset contains fewer than 50 records after validation, then the system shall display a warning banner in development builds but still render available records in production.

---

### 3.4 Domain Schema (도메인 데이터 스키마)

#### Ubiquitous

- **REQ-SCH-001**: The system shall validate each domain record against a zod schema with the following shape. All measurable, analytical, or AI-generated fields MUST carry a `source` field of type `DataSource` (REQ-SCH-006) so that every data point's provenance is visible in the UI:

```ts
type DataSource  = 'automated' | 'manual' | 'llm+verified' | 'llm-only';
type SourcedScore = { value: number /* 0..100 */; source: DataSource };
type SourcedText  = { text:  string;             source: DataSource };

type KeyAlgorithm = 'RSA' | 'ECC' | 'ML-KEM' | 'Hybrid-ECC-ML-KEM' | 'Hybrid-RSA-ML-KEM' | 'Unknown';
type CitationId  = 'Kim-Ahn-2025' | 'Roetteler-2017' | 'Willsch-2023';
type QuantumEstimate = {
  logicalQubits: number; toffoliGates: number;
  score: number /* 0..100 */; successRate: number; basis: string; note?: string;
};

{
  name: string;
  url: string;
  sector: string;
  scores: {
    tls:           SourcedScore;  // automated
    hybridKem:     SourcedScore;  // automated
    certOps:       SourcedScore;  // automated — 인증서 운영 (갱신·체인·OCSP)
    quantumThreat: SourcedScore;  // automated — Roetteler 2017 + Willsch 2023 계산값 (empirical headline)
  };
  certificate: {
    renewal: '자동 갱신' | '수동 갱신' | '분기 자동 갱신' | '만료 임박' | '미설정';
    ca: string;
    chain?: string;
    keyAlgorithm: KeyAlgorithm;   // 양자 위협 계산 입력
    keyBits: number;              // 양자 위협 계산 입력
  };
  pqc: {
    keyExchange: '활성화' | '미지원' | '비활성화' | '차단됨' | '미설정';
    hybrid: '기본 제공' | '하이브리드' | '미감지';
    maturity: '운영 성숙' | '베타 적용' | '도입 검토 단계' | '준비 미착수' | '전환 미실시';
  };
  regulatoryGaps: Array<{
    refName: '전자금융감독규정' | '개인정보보호법' | '가이드라인';
    article?: string;
    note: string;
    source: DataSource;   // typical: 'llm+verified' | 'llm-only'
  }>;
  findings:        SourcedText[];
  recommendations: SourcedText[];
  narrative:       SourcedText;
  supplyChainNotes: SourcedText;  // 정성 디스크립터 (구 supplyChain 점수에서 강등)
  quantumThreatDetail: {
    keyAlgorithm: string;
    keyBits: number;
    estimates: { conservative: QuantumEstimate; empirical: QuantumEstimate };
    citations: CitationId[];   // ['Roetteler-2017', 'Willsch-2023']
    source: DataSource;        // 'automated' (deterministic 계산)
  };
}
```

The 4-axis score model (TLS / hybridKem / certOps / **quantumThreat**) replaces the previous (TLS / hybridKem / certOps / supplyChain) layout (2026-05-14 갱신). Rationale:

1. `supplyChain` 점수는 수동 리서치 영역이라 신뢰도가 낮았다. 점수에서 강등하고 `supplyChainNotes` (`SourcedText`, source='manual') 정성 디스크립터로 보존한다.
2. 그 자리에 `quantumThreat` 가 들어선다. Roetteler 2017 의 자원 추정 공식과 Willsch 2023 의 실증 시뮬레이션 결과를 결합해 결정적(deterministic)으로 계산되므로 모든 4축이 `source='automated'` 로 통일된다.
3. `quantumThreatDetail` 은 보수(Shor 1994 + Roetteler 2017) 와 실증(Willsch 2023 + Ekerå post-processing) 두 시나리오의 logical qubit / Toffoli / 성공률 / 점수를 모두 보관한다. 헤드라인 점수(`scores.quantumThreat.value`)는 empirical 시나리오 값이다.
4. `certificate` 와 `pqc` 의 factual descriptor 블록은 점수의 입력으로서 source 가 부모 점수에 의해 함의된다. `certificate.keyAlgorithm` / `keyBits` 는 양자 위협 계산의 직접 입력이다.
5. 구 `compliance` 는 `regulatoryGaps` 로 명명 변경되어 정직성을 강화했다 (REQ-SCH-007).

- **REQ-SCH-002**: The system shall define the sector taxonomy as one of: `반도체/전자`, `자동차`, `철강/소재`, `화학/에너지`, `IT/플랫폼`, `바이오`, `통신`, `금융지주`, `은행`, `증권`, `페이먼트`, `공공/정부`, `게임` (extensible if necessary, but enumerated for filter UI).
- **REQ-SCH-003**: The system shall expose the validated TypeScript type `Domain` (and supporting union types) inferred from the zod schema (`z.infer<typeof DomainSchema>`).
- **REQ-SCH-006**: The system shall define a `DataSource` enum (`'automated' | 'manual' | 'llm+verified' | 'llm-only'`) and `SourcedScore` / `SourcedText` envelopes used by every measurable, analytical, or AI-generated field. Records that lack a `source` on any required field MUST be rejected by the schema validator. The four source modes MUST each be assigned a stable visual treatment (chip/badge colour) reused across the banner legend (REQ-APP-003) and per-field badges (REQ-DSH-020).
- **REQ-SCH-007**: The system shall expose the regulatory mapping array as `regulatoryGaps` (not `compliance`). The naming reflects the project's honesty stance: items in this list are gaps or unverified mappings, not certified compliance.

#### Unwanted Behavior

- **REQ-SCH-004**: If a record's `scores.<axis>.value` is out of range (negative or > 100), or the corresponding `source` field is missing or not in the `DataSource` enum, then the system shall log the record name and reason, mark the record as invalid, and exclude it from aggregate calculations.
- **REQ-SCH-005**: If a record contains an enum value outside the defined union types (e.g., `pqc.maturity: '운영 안정'`), then the system shall treat the record as invalid and report it.

---

### 3.5 Dashboard View (`/` 대시보드)

#### Ubiquitous

- **REQ-DSH-001**: The system shall render a list (or grid) of all valid domain records on the dashboard.
- **REQ-DSH-002**: The system shall provide a search input that filters records by domain `name` (substring, case-insensitive) and `url` (substring, case-insensitive).
- **REQ-DSH-003**: The system shall provide a sector filter that accepts one or more sector values and intersects the visible set.
- **REQ-DSH-004**: The system shall provide a sort control supporting at least the following axes: TLS 위생 점수, 하이브리드 KEM 점수, 인증서 운영 점수 (certOps), 양자 위협 점수 (quantumThreat, empirical headline), 도메인 이름 (가나다 순), 섹터.
- **REQ-DSH-005**: The system shall visualize each record's four measurement axes (TLS 위생, 하이브리드 KEM, 인증서 운영, 양자 위협 정량) using a consistent visualization (e.g., score bar, mini bar chart, or radial indicator). Each visualized score MUST also surface its `source` mode via the chip/badge pattern defined in REQ-DSH-020. The 양자 위협 cell MUST also indicate the dual-scenario value (보수 ↔ 실증) on hover or via an inline secondary marker, per REQ-DSH-021.
- **REQ-DSH-006**: The system shall render badges for `pqc.keyExchange`, `pqc.hybrid`, `pqc.maturity`, and `certificate.renewal` using a consistent badge taxonomy with distinct visual treatments per value.
- **REQ-DSH-020**: The system shall render a compact data-source badge (chip) adjacent to every `SourcedScore`, `SourcedText`, and `regulatoryGaps` entry, using the four-mode palette established in REQ-APP-003 / REQ-SCH-006 (자동 측정 · 수동 리서치 · LLM + 샘플 검증 · LLM 미검증). The badge MUST be screen-reader accessible (`aria-label` describing the source mode).
- **REQ-DSH-007**: The system shall provide an expandable detail view per domain that reveals `findings`, `recommendations`, `regulatoryGaps`, `narrative`, `supplyChainNotes`, and `quantumThreatDetail` (with both conservative + empirical estimates).
- **REQ-DSH-021**: The system shall render the `quantumThreatDetail` block with both 보수 시나리오 (Shor 1994 + Roetteler 2017) and 실증 시나리오 (Willsch 2023 + Ekerå post-processing) values displayed side-by-side, including logical qubits, Toffoli gates, and normalized scores. Citation tooltips MUST link to the Methodology page references.
- **REQ-DSH-008**: The system shall display a sector breakdown summary (counts, averages, or distribution) at the top or side of the dashboard.

#### Event-Driven

- **REQ-DSH-009**: When the user types in the search input, the system shall update the filtered list with debounce ≤ 200ms.
- **REQ-DSH-010**: When the user toggles a sector filter chip, the system shall recompute and re-render the visible records within 100ms.
- **REQ-DSH-011**: When the user changes the sort axis or direction, the system shall reorder the list with a stable sort.
- **REQ-DSH-012**: When the user activates a domain card or its expand control, the system shall reveal the detail view inline (or in a side panel — implementation choice) without a route change.
- **REQ-DSH-013**: When the user clears the search input, the system shall restore the visible list to the sector-filtered baseline.

#### State-Driven

- **REQ-DSH-014**: While zero records match the current filters/search, the system shall display an empty state with copy that suggests resetting filters.
- **REQ-DSH-015**: While the dashboard is loading initial data, the system shall render skeleton placeholders for at least the first viewport's worth of cards.

#### Optional

- **REQ-DSH-016**: Where useful, the system may serialize the current filter/sort/search state to URL query parameters so the view is shareable.
- **REQ-DSH-017**: Where useful, the system may render a small chart showing PQC maturity distribution (e.g., pie or stacked bar by `pqc.maturity`).

#### Unwanted Behavior

- **REQ-DSH-018**: If the dashboard is rendered with no valid records, then the system shall display a top-level error state instead of an empty list silently.
- **REQ-DSH-019**: If a score field is missing or undefined for an optional axis (e.g., `supplyChain`), then the system shall render a "—" or "데이터 없음" indicator instead of `NaN` or `undefined`.

---

### 3.6 Methodology Page (`/methodology` 측정 방법론)

#### Ubiquitous

- **REQ-MTH-001**: The system shall explain the four measurement axes in dedicated sections:
  - **TLS 위생** (automated) — certificate renewal cadence, cipher suite hygiene, HSTS posture, deprecated TLS version exposure.
  - **하이브리드 KEM** (automated) — PQC hybrid Key Encapsulation Mechanism adoption progress, including detection of hybrid X25519+ML-KEM or equivalent.
  - **인증서 운영 (certOps)** (automated) — 인증서 갱신 자동화·체인·OCSP Stapling 위생.
  - **양자 위협 정량 (quantumThreat)** (automated/computed) — Roetteler 2017 자원 추정 공식 + Willsch 2023 실증 시뮬레이션 기반 deterministic 계산. 자세한 사양은 §3.14 참조.
- **REQ-MTH-002**: The system shall describe the scoring scale (0~100, higher = quantum-resistant) and the qualitative bands (e.g., 우수/양호/주의/위험) used in dashboard visualization.
- **REQ-MTH-003**: The system shall list the regulatory references used in `regulatoryGaps` bullets: `전자금융감독규정`, `개인정보보호법`, `가이드라인`.
- **REQ-MTH-004**: The system shall explicitly disclose the synthetic-data limitation: "본 데이터는 합성이며 실 측정 결과가 아닙니다. 실제 진단·감사·구매 의사결정에 사용하지 마십시오."
- **REQ-MTH-005**: The system shall list the demo limitations including: no real TLS handshake measurement, no continuous monitoring, no live CT log subscription, no actual hybrid KEM negotiation telemetry.
- **REQ-MTH-007**: The system shall render the Roetteler 2017 logical qubit formulas explicitly (`RSA-n: 2n+3`, `ECC-n: 9n + 2⌈log₂(n)⌉ + 10`) within the methodology page as a typographically distinct code block.
- **REQ-MTH-008**: The system shall present the two-scenario comparison (보수 / 실증) as a side-by-side card layout, with each card stating its basis (Shor 1994 + Roetteler 2017 vs. Willsch 2023 + Ekerå post-processing), assumed success rate, and meaning for evaluation.
- **REQ-MTH-009**: The system shall render a reference list at the bottom of the methodology page containing all three citations (`Kim-Ahn-2025`, `Roetteler-2017`, `Willsch-2023`) with full bibliographic detail and external links to arXiv / DOI where available.

#### State-Driven

- **REQ-MTH-006**: While the methodology page is active, the system shall keep the page text within reading-friendly typography (line-length 60~80 chars, `max-w-prose` or equivalent).

---

### 3.7 About Page (`/about` 프로젝트 소개)

#### Ubiquitous

- **REQ-ABT-001**: The system shall describe the project purpose, the course context (양자컴퓨팅 강의 기말 프로젝트), and the demo nature of the data.
- **REQ-ABT-002**: The system shall display credits including author(s) and acknowledgments.
- **REQ-ABT-003**: The system shall display a prominent disclaimer matching REQ-MTH-004.
- **REQ-ABT-004**: The system shall provide an external link to the source repository (placeholder until repo URL is finalized).
- **REQ-ABT-005**: The system shall display the project keystone statement as a typographically distinct blockquote: "교수님 논문(김의결·안혁 2025)이 양자 위협의 이론적 측면을 다뤘다면, 본 프로젝트는 Roetteler 2017의 리소스 추정 공식과 Willsch 2023의 최신 시뮬레이션 결과(평균 성공률 50%+)를 한국 50개 실제 인프라에 적용하여, 도메인별 양자 깨짐 비용을 보수·실증 두 시나리오로 정량화한다."
- **REQ-ABT-006**: The system shall list the three citations with their role in the project (이론 프레임 / 정량 추정 공식 / 실증 데이터) and bibliographic detail. The presentation MUST make clear that the citation chain is intentional — the keystone paper (Kim-Ahn 2025) is absorbed and its own references (Roetteler) are directly leveraged.

---

### 3.8 PWA (Progressive Web App)

#### Ubiquitous

- **REQ-PWA-001**: The system shall ship a Web App Manifest with the following minimum fields: `name`, `short_name`, `start_url`, `display: standalone`, `background_color`, `theme_color`, `icons` (192px and 512px, plus maskable variants).
- **REQ-PWA-002**: The system shall register a Service Worker via `vite-plugin-pwa` that pre-caches the app shell (HTML, JS, CSS, fonts, manifest, icons).
- **REQ-PWA-003**: The system shall cache `public/data/domains.json` with a stale-while-revalidate strategy.
- **REQ-PWA-004**: The system shall provide an offline fallback page or in-app offline state when network is unavailable and the requested resource is not cached.
- **REQ-PWA-005**: The system shall produce a Lighthouse PWA audit result of "installable" with no critical errors.

#### Event-Driven

- **REQ-PWA-006**: When the browser fires `beforeinstallprompt`, the system shall surface an install affordance (button or banner) in the UI.
- **REQ-PWA-007**: When a new Service Worker version is available, the system shall notify the user and offer a "새 버전 적용" action that activates the new worker and reloads.

#### State-Driven

- **REQ-PWA-008**: While offline, the system shall render a non-blocking indicator informing the user that data may be stale.

#### Unwanted Behavior

- **REQ-PWA-009**: If the Service Worker registration fails (HTTP, scope, or browser restriction), then the system shall continue to function as a standard SPA without throwing user-visible errors.
- **REQ-PWA-010**: If a cached asset hash becomes stale after a deploy, then the system shall purge stale entries on Service Worker activation without leaving orphan caches.

---

### 3.9 Accessibility (WCAG 2.2 AA)

#### Ubiquitous

- **REQ-A11Y-001**: The system shall meet WCAG 2.2 AA contrast ratios for all text and meaningful UI elements in both Light and Dark themes.
- **REQ-A11Y-002**: The system shall make every interactive element reachable via keyboard alone in a logical tab order.
- **REQ-A11Y-003**: The system shall render visible focus indicators on all interactive elements with at least 3:1 contrast against adjacent colors.
- **REQ-A11Y-004**: The system shall provide accessible names (via `aria-label`, `aria-labelledby`, or visible text) for all controls including the theme toggle, sector filter chips, sort control, search input, and expand triggers.
- **REQ-A11Y-005**: The system shall use semantic landmarks (`<header>`, `<nav>`, `<main>`, `<footer>`) and a `lang="ko"` attribute on `<html>`.
- **REQ-A11Y-006**: The system shall respect `prefers-reduced-motion: reduce` and disable or shorten non-essential animations.

#### Event-Driven

- **REQ-A11Y-007**: When the expandable detail view opens, the system shall move focus into the panel or expose its state via `aria-expanded` so screen readers announce the change.
- **REQ-A11Y-008**: When a filter or sort changes the visible list, the system shall announce the new count via an `aria-live="polite"` region.

#### Unwanted Behavior

- **REQ-A11Y-009**: If a control conveys state only through color (e.g., active filter chip), then the system shall additionally convey state through shape, icon, or text.
- **REQ-A11Y-010**: If automated axe-core checks report any "serious" or "critical" issues, then the build shall fail in CI (target — see Quality Gates).

---

### 3.10 Responsive Design (반응형)

#### Ubiquitous

- **REQ-RWD-001**: The system shall adopt a mobile-first design with the following Tailwind breakpoints:
  - `sm`: ≥ 640px (large mobile / small tablet)
  - `md`: ≥ 768px (tablet)
  - `lg`: ≥ 1024px (desktop)
  - `xl`: ≥ 1280px (large desktop)
- **REQ-RWD-002**: The system shall render all primary content above-the-fold at 360px viewport width without horizontal scroll.
- **REQ-RWD-003**: The system shall adapt the dashboard layout: single-column at `< sm`, 2-column at `md`, 3-column at `lg`, optionally 4-column at `xl`.
- **REQ-RWD-004**: The system shall collapse navigation into a compact menu (e.g., hamburger or condensed icon set) at viewports `< sm` if horizontal space is insufficient.

#### State-Driven

- **REQ-RWD-005**: While on touch devices, the system shall ensure tap targets are at least 44×44 CSS pixels.

---

### 3.11 Performance Budgets

#### Ubiquitous

- **REQ-PRF-001**: The system shall keep initial JavaScript bundle size ≤ 200KB gzipped (excluding `domains.json`).
- **REQ-PRF-002**: The system shall achieve Largest Contentful Paint (LCP) < 2.5s on a Moto G4-class mobile profile (Lighthouse default mobile throttling).
- **REQ-PRF-003**: The system shall achieve Cumulative Layout Shift (CLS) < 0.1.
- **REQ-PRF-004**: The system shall achieve Interaction to Next Paint (INP) < 200ms for primary interactions (filter toggle, sort, card expand).
- **REQ-PRF-005**: The system shall achieve a Lighthouse Performance score ≥ 90 on desktop and ≥ 80 on mobile.
- **REQ-PRF-006**: The system shall achieve a Lighthouse PWA result of "installable".

#### Optional

- **REQ-PRF-007**: Where bundle size approaches the limit, the system may apply route-based code splitting for `/methodology` and `/about`.

#### Unwanted Behavior

- **REQ-PRF-008**: If a bundle exceeds the budget by more than 10%, then CI shall warn and the PR shall require explicit justification.

---

### 3.12 Internationalization (한국어 단일 로케일)

#### Ubiquitous

- **REQ-I18N-001**: The system shall render all primary UI copy in Korean.
- **REQ-I18N-002**: The system shall keep UI strings outside of component source — strings shall live in a single module such as `src/i18n/ko.ts` (or `messages/ko.ts`) keyed by message ID.
- **REQ-I18N-003**: The system shall set `<html lang="ko">` and apply the Pretendard font stack for Korean glyphs.
- **REQ-I18N-004**: The system shall use Inter for Latin glyphs and JetBrains Mono for numeric/code/score readouts where monospaced presentation aids legibility.

#### Optional

- **REQ-I18N-005**: Where natural, the system may render technical terms in their original English form (e.g., "Hybrid KEM", "TLS 1.3") alongside Korean labels.

#### Unwanted Behavior

- **REQ-I18N-006**: If a translation key is missing at runtime, then the system shall render the key name as a visible fallback (development) or a graceful blank with console warning (production).

---

### 3.13 Quality Gates (품질 게이트)

#### Ubiquitous

- **REQ-QG-001**: The system shall pass `tsc --noEmit` with `strict: true` and `noUncheckedIndexedAccess: true`.
- **REQ-QG-002**: The system shall pass ESLint with zero errors (warnings allowed below a configured threshold).
- **REQ-QG-003**: The system shall include unit tests with vitest covering at minimum: zod schema validation, filter/sort/search helpers, badge taxonomy resolvers.
- **REQ-QG-004**: The system shall include at least one Playwright smoke test that loads `/`, asserts the dashboard renders ≥ 1 domain card, navigates to `/methodology` and `/about`, and toggles the theme.
- **REQ-QG-005**: The system shall achieve ≥ 85% line coverage on tested modules (per `.moai/config/sections/quality.yaml` `test_coverage_target: 85`).
- **REQ-QG-006**: The system shall pass an axe-core accessibility scan with zero serious or critical issues on `/`, `/methodology`, `/about`.

#### Event-Driven

- **REQ-QG-007**: When CI runs, the system shall execute typecheck, lint, unit tests, smoke test, and Lighthouse CI in that order; failures shall block merge.

#### Unwanted Behavior

- **REQ-QG-008**: If LSP errors, type errors, or lint errors are introduced during the run phase, then per `.moai/config/sections/quality.yaml` `lsp_quality_gates.run.max_errors: 0`, the change shall be blocked.

---

### 3.14 Quantum Threat Quantification (양자 위협 정량화)

본 섹션은 4축 중 4번째 축인 `quantumThreat` 의 계산·시나리오·데이터 출처를 규정한다. 모든 수치는 결정적(deterministic) 이며 source 는 항상 'automated'.

#### Ubiquitous

- **REQ-QT-001**: The system shall implement Roetteler 2017 (Table 1) logical qubit formulas exactly: `RSA-n: 2n + 3`, `ECC-n: 9n + 2⌈log₂(n)⌉ + 10`. These functions MUST be unit-tested with known reference values (RSA-2048 → 4099 qubits, ECC P-256 → 2330 qubits).
- **REQ-QT-002**: The system shall implement Toffoli-gate fits (RSA ≈ 64·n³, ECC ≈ 25·n³) as deterministic estimators with monotonicity tests (gates(n+1) > gates(n)).
- **REQ-QT-003**: The system shall provide a `summarizeQuantumThreat(algo: KeyAlgorithm, bits: number): QuantumThreatDetail` helper that returns both 보수(conservative) and 실증(empirical) `QuantumEstimate` values along with deterministic citations array.
- **REQ-QT-004**: The system shall treat PQC algorithms (ML-KEM and any future NIST-PQC family) as immune to Shor: both scenario scores MUST be 100. The basis field MUST cite the NIST PQC standardization context.
- **REQ-QT-005**: The system shall treat Hybrid (e.g., X25519+ML-KEM-768) as quantum-resistant by virtue of the PQC fallback, with conservative score ≥ 85 and empirical score ≥ 80 by default.
- **REQ-QT-006**: The headline score displayed on the dashboard (`scores.quantumThreat.value`) MUST equal the empirical scenario score (Willsch 2023 + Ekerå basis), reflecting the project's preference for realistic threat assessment.
- **REQ-QT-007**: The 보수 시나리오 basis string MUST cite "Shor 1994 + Roetteler 2017" and the assumed success rate (3~4%). The 실증 시나리오 basis string MUST cite "Willsch 2023 + Ekerå post-processing" and the observed success rate (50%+, ~100% with post-processing).
- **REQ-QT-008**: `quantumThreatDetail.citations` MUST contain at least `'Roetteler-2017'` and `'Willsch-2023'`. The Methodology and About pages MUST surface `'Kim-Ahn-2025'` as the keystone paper that frames the theoretical context.

#### Unwanted Behavior

- **REQ-QT-009**: If a domain's `certificate.keyAlgorithm` is `'Unknown'` or `certificate.keyBits` is zero, then the system shall either omit the `quantumThreatDetail` block or mark its `score` fields as 0 with a basis string indicating insufficient input; the record MUST NOT be silently scored.
- **REQ-QT-010**: If a future migration introduces a new PQC algorithm not yet enumerated in `KeyAlgorithm`, then the validator shall reject the record and the failure mode MUST be visible in the data layer's `invalidReasons` array.

---

## 4. Specifications (구체 사양)

### 4.1 디렉터리 구조 (제안 — run phase에서 확정)

```
quant_reg/
├── public/
│   ├── data/
│   │   └── domains.json
│   ├── icons/
│   │   ├── icon-192.png
│   │   ├── icon-512.png
│   │   └── icon-maskable-512.png
│   └── manifest.webmanifest          # vite-plugin-pwa가 생성
├── src/
│   ├── app/
│   │   ├── App.tsx
│   │   ├── routes.tsx
│   │   └── providers.tsx             # 테마, 쿼리, 라우터 프로바이더
│   ├── pages/
│   │   ├── DashboardPage.tsx
│   │   ├── MethodologyPage.tsx
│   │   ├── AboutPage.tsx
│   │   └── NotFoundPage.tsx
│   ├── components/
│   │   ├── layout/                   # 헤더, 네비, 데모 배너, 푸터
│   │   ├── theme/                    # 테마 토글, 테마 프로바이더
│   │   ├── domain/                   # 도메인 카드, 상세 패널, 점수 시각화
│   │   ├── filters/                  # 검색, 섹터 필터, 정렬
│   │   └── ui/                       # shadcn/ui 생성 컴포넌트
│   ├── data/
│   │   ├── schema.ts                 # zod 스키마 정의
│   │   ├── loader.ts                 # fetch + 검증
│   │   └── selectors.ts              # 필터/정렬/집계 helper
│   ├── hooks/
│   │   ├── useTheme.ts
│   │   └── useDomains.ts
│   ├── i18n/
│   │   └── ko.ts                     # 한국어 메시지 모듈
│   ├── lib/
│   │   ├── cn.ts                     # className 머지
│   │   └── format.ts                 # 점수 포맷터 등
│   ├── styles/
│   │   └── globals.css               # Tailwind layer + 토큰
│   ├── pwa/
│   │   └── register-sw.ts
│   ├── main.tsx
│   └── vite-env.d.ts
├── tests/
│   ├── unit/
│   │   ├── schema.test.ts
│   │   ├── selectors.test.ts
│   │   └── theme.test.ts
│   └── e2e/
│       └── smoke.spec.ts
├── index.html
├── vite.config.ts                    # vite-plugin-pwa 설정
├── tailwind.config.ts
├── tsconfig.json
├── package.json
└── .moai/
    └── specs/
        └── SPEC-PQC-001/
            ├── spec.md               # 본 문서
            ├── plan.md
            └── acceptance.md
```

### 4.2 데이터 파일 사양

- **파일 경로**: `public/data/domains.json`
- **포맷**: UTF-8 인코딩된 JSON 배열
- **루트 형태**:

```json
{
  "lastUpdated": "2026-05-14",
  "version": "0.1.0",
  "domains": [ /* 50 records */ ]
}
```

- **레코드 수**: 정확히 50개 (REQ-DAT-013 참고)
- **레코드 스키마**: REQ-SCH-001 참조

### 4.3 zod 스키마 의도 (요약)

`src/data/schema.ts`는 다음 구조를 export 한다:

- `DomainSchema` — 단일 도메인 객체 스키마
- `DomainsEnvelopeSchema` — 루트 JSON 스키마 (`{ lastUpdated, version, domains: DomainSchema[] }`)
- 정직성 envelope (REQ-SCH-006): `DataSourceSchema`, `SourcedScoreSchema`, `SourcedTextSchema`, `RegulatoryGapSchema`
- 파생 타입: `Domain`, `DataSource`, `SourcedScore`, `SourcedText`, `RegulatoryGap`
- 유니온 타입 export: `RenewalStatus`, `KeyExchangeStatus`, `HybridStatus`, `MaturityStatus`, `Sector`, `ComplianceRefName`

### 4.4 테마 토큰 사양

shadcn/ui 표준 HSL 변수 패턴을 채택:

```css
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  /* ... shadcn 표준 토큰 ... */
}
.dark {
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
  /* ... */
}
```

- 참조 번들의 토큰 값을 시드로 사용하되, 운영 단계에서 자유롭게 조정 가능
- `theme_color` 메타 태그 값은 활성 테마의 `--background` HSL을 RGB hex로 변환한 값

### 4.5 PWA 매니페스트 사양 (예시)

```json
{
  "name": "PQC 준비도 스캐너",
  "short_name": "준비도 스캐너",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0b1020",
  "theme_color": "#0b1020",
  "lang": "ko",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/icons/icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

### 4.6 Service Worker 캐싱 전략

- **App Shell (HTML/JS/CSS/icons/fonts)**: precache (Workbox precache)
- **`domains.json`**: stale-while-revalidate, 24시간 캐시
- **외부 폰트 (Pretendard CDN 등)**: cache-first, 30일
- **나머지**: network-first with fallback

### 4.7 점수 시각화 배지 사양 (예시 — 자유 영역)

- **0~39점**: "위험" 빨간 계열
- **40~69점**: "주의" 노란/주황 계열
- **70~84점**: "양호" 청록 계열
- **85~100점**: "우수" 녹색 계열

(구체 컬러 토큰은 run phase에서 디자인 조정 가능. 데이터셋의 점수 분포에 맞춰 밴드 경계는 조정 가능.)

---

## 5. Acceptance Criteria (Given/When/Then 요약)

자세한 시나리오는 `acceptance.md`를 참조한다. 본 절은 SPEC 내 요약이다.

### 5.1 앱 셸 & 라우팅

- **Given** 사용자가 `/`를 방문한다 **When** 페이지가 로드된다 **Then** 헤더, 데모 배너, 대시보드 본문, 푸터가 모두 렌더링된다.
- **Given** 사용자가 `/foo` (없는 경로)를 방문한다 **When** 페이지가 로드된다 **Then** 404 페이지와 `/`로 돌아가는 링크가 표시된다.

### 5.2 테마

- **Given** 첫 방문 사용자 **When** 페이지가 로드된다 **Then** OS 다크모드를 따른다(System 기본값).
- **Given** Dark 선택 후 페이지 새로고침 **When** 페이지가 로드된다 **Then** Dark가 유지되고 `theme_color` 메타값이 Dark 배경색과 일치한다.

### 5.3 데이터 계층

- **Given** `domains.json`이 정상 응답한다 **When** 페이지가 로드된다 **Then** 50개 도메인 카드가 렌더링된다.
- **Given** 한 레코드의 `scores.tls`가 150이다 **When** zod 검증이 수행된다 **Then** 해당 레코드는 제외되고 콘솔에 경고가 출력된다.

### 5.4 대시보드

- **Given** 사용자가 "삼성"을 검색에 입력한다 **When** 디바운스(≤200ms) 후 **Then** 이름에 "삼성"이 포함된 도메인만 표시된다.
- **Given** 사용자가 "금융지주" 섹터 칩을 활성화한다 **When** 100ms 내 **Then** 해당 섹터 도메인만 표시된다.
- **Given** 사용자가 도메인 카드를 펼친다 **When** 펼침 후 **Then** findings, recommendations, compliance, narrative가 표시된다.

### 5.5 PWA

- **Given** 사용자가 사이트를 1회 방문하여 SW가 설치된다 **When** 오프라인 상태에서 재방문 **Then** 캐시된 앱 셸과 `domains.json`이 렌더링되며 "오프라인" 표시가 나타난다.
- **Given** 사용자가 Lighthouse 감사를 실행한다 **When** PWA 카테고리를 확인한다 **Then** "installable" 결과를 받는다.

### 5.6 접근성

- **Given** 사용자가 키보드만 사용한다 **When** Tab 키로 이동한다 **Then** 모든 인터랙티브 요소가 논리적 순서로 포커스를 받고 가시 포커스 링이 표시된다.
- **Given** 사용자가 `prefers-reduced-motion: reduce`를 설정했다 **When** 페이지가 로드된다 **Then** 비필수 애니메이션이 비활성화된다.

### 5.7 반응형

- **Given** 360px 폭의 모바일 뷰포트 **When** `/`가 로드된다 **Then** 가로 스크롤이 발생하지 않고 1열 레이아웃이 적용된다.
- **Given** 1024px 이상 데스크톱 **When** `/`가 로드된다 **Then** 3열 이상의 카드 그리드가 적용된다.

### 5.8 성능

- **Given** 프로덕션 빌드 **When** Lighthouse Mobile 감사를 실행한다 **Then** LCP < 2.5s, CLS < 0.1, Performance score ≥ 80을 충족한다.

### 5.9 품질 게이트

- **Given** CI 파이프라인 실행 **When** 모든 단계가 수행된다 **Then** typecheck, lint, vitest, Playwright smoke, axe-core가 모두 통과한다.

---

## 6. Traceability (추적성)

| 요구사항 ID 그룹 | 기능 영역 | 검증 산출물 |
|---|---|---|
| REQ-APP-* | 앱 셸 & 라우팅 | `tests/e2e/smoke.spec.ts`, `tests/unit/routes.test.ts` |
| REQ-THM-* | 테마 | `tests/unit/theme.test.ts`, smoke 내 토글 단계 |
| REQ-DAT-*, REQ-SCH-* | 데이터 계층 & 스키마 | `tests/unit/schema.test.ts`, `tests/unit/loader.test.ts` |
| REQ-DSH-* | 대시보드 | `tests/unit/selectors.test.ts`, smoke 내 필터 단계 |
| REQ-MTH-*, REQ-ABT-* | 정적 페이지 | smoke 내 페이지 도달 단계 |
| REQ-PWA-* | PWA | Lighthouse CI, manual offline 검증 |
| REQ-A11Y-* | 접근성 | axe-core CI, manual keyboard 검증 |
| REQ-RWD-* | 반응형 | Playwright viewport 매트릭스 |
| REQ-PRF-* | 성능 | Lighthouse CI, bundle-size CI |
| REQ-I18N-* | i18n | `tests/unit/i18n.test.ts` |
| REQ-QG-* | 품질 게이트 | CI 파이프라인 전체 |

---

## 7. Glossary (한국어 용어집)

### 7.1 측정 축

- **TLS 위생 (TLS Hygiene)**: TLS 연결의 인증서 갱신 주기, cipher suite 안정성, HSTS 적용, 구버전 TLS 노출 여부에 대한 종합 점수 (0~100).
- **하이브리드 KEM (Hybrid KEM)**: 고전 + PQC 키 교환 알고리즘을 함께 사용하는 하이브리드 키 캡슐화 메커니즘. 예: X25519 + ML-KEM.
- **인증서·공급망 (Certificate & Supply Chain)**: 인증서 발급 CA 의존도, CDN/WAF 구성, 제3자 PKI 노출에 대한 정성·정량 평가.

### 7.2 인증서 갱신 상태 (`certificate.renewal`)

- **자동 갱신**: ACME 등 자동화 도구로 갱신 파이프라인이 구성된 상태.
- **분기 자동 갱신**: 분기 단위 자동 갱신 정책이 운영되는 상태.
- **수동 갱신**: 운영자가 직접 갱신을 수행.
- **만료 임박**: 만료일이 가까워 즉시 조치가 필요한 상태.
- **미설정**: 갱신 정책이 미정의된 상태.

### 7.3 PQC 키 교환 상태 (`pqc.keyExchange`)

- **활성화**: PQC 키 교환이 운영 환경에서 활성 상태.
- **미지원**: 서버가 PQC 키 교환을 지원하지 않음.
- **비활성화**: 지원은 가능하나 운영 정책상 비활성.
- **차단됨**: 미들박스/방화벽/CDN에 의해 차단된 것으로 추정됨.
- **미설정**: 측정/구성 정보가 없음.

### 7.4 하이브리드 상태 (`pqc.hybrid`)

- **기본 제공**: 기본 ClientHello에 하이브리드가 포함되어 협상됨.
- **하이브리드**: 하이브리드 협상이 가능하나 기본은 아님.
- **미감지**: 하이브리드 시그널이 관측되지 않음.

### 7.5 PQC 성숙도 (`pqc.maturity`)

- **운영 성숙**: 운영 환경에서 안정적으로 운영 중.
- **베타 적용**: 일부 워크로드/엔드포인트에서 베타 적용 중.
- **도입 검토 단계**: 도입 의사결정·검토 단계.
- **준비 미착수**: 검토 일정조차 미정.
- **전환 미실시**: 전환 계획이 미수립.

### 7.6 규제 참조 (`compliance.refName`)

- **전자금융감독규정**: 금융위원회·금융감독원 소관 전자금융 관련 감독규정.
- **개인정보보호법**: 개인정보보호위원회 소관 개인정보보호 관련 법령.
- **가이드라인**: KISA·관계기관의 가이드라인·권고 문서.

---

## 8. Resolved Questions (확정 결정 · 2026-05-14)

사용자 확정 완료. 본 SPEC의 구현 가이드로 사용합니다.

1. **OQ-001 → 세션 한정 dismissal**: 데모 배너 dismissal은 `sessionStorage` 또는 in-memory state로 처리. `localStorage` 영속화는 도입하지 않음. (REQ-APP-010 반영)
2. **OQ-002 → React Router 7**: 표준 React Router 7 채택. URL 필터 직렬화(REQ-DSH-016)는 자체 `URLSearchParams` 헬퍼로 구현.
3. **OQ-003 → TanStack Query 미사용**: 정적 JSON 단일 fetch이므로 `useEffect` + 커스텀 `useDomains()` 훅으로 충분. PWA Service Worker가 캐싱 담당.
4. **OQ-004 → Recharts 채택**: shadcn 차트 컴포넌트 기반. 섹터별 평균/점수 분포 등 1~2개 차트에 한정해 번들 예산(REQ-PRF-001 ≤200KB gzip) 유지.
5. **OQ-005 → run phase에서 처리**: 50개 도메인 합성 데이터 생성은 `/moai run` 단계에서 별도 가이드라인(섹터별 평균·점수 분포·narrative 톤)을 수립해 일괄 생성.
6. **OQ-006 → Pretendard self-host**: npm 패키지(`pretendard`)로 self-host. SW precache 대상. PWA 오프라인 지원 충족.
7. **OQ-007 → `domains.json` 내 `lastUpdated`**: 데이터 envelope의 `lastUpdated` 필드를 단일 진실 원천으로 사용. 헤더 타임스탬프는 이 필드에서 읽음.
8. **OQ-008 → `supplyChain` optional 점수 + 정성 통합**: 점수는 optional로 유지하고, 정성 평가는 `findings`·`narrative`에 통합. 별도 `supplyChainNotes` 필드는 추가하지 않음.
9. **OQ-009 → 헤더 1회 노출 + About 페이지 재노출**: install 프롬프트는 헤더에 한 번 등장하고, dismiss 시 About 페이지에 항상 재노출. 침해 최소화.
10. **OQ-010 → 50개 고정**: 페이지네이션·가상 스크롤 미도입. 모두 단일 스크롤 + 클라이언트 필터로 처리.

### 8-A. Phase 1 후속 결정 (2026-05-17~19 추가)

본 SPEC 작성 이후 실측·실 구현에서 도출된 추가 결정·갱신 사항.

11. **OQ-005 갱신 → Phase 1 자동 측정 + Phase 2 직접 PQC**: 50개 합성 데이터는 폐기. 대신 `scanner/` Python 모듈 (sslyze 6.x + Mozilla 표준 점수 공식)로 47개 실측 완료 (4개 connectivity 실패). 분석 텍스트는 사용자 수동 작성.
12. **OQ-008 갱신 → `supplyChainNotes` 신규 필드 채택**: 본래 "정성 평가는 `findings`·`narrative`에 통합" 으로 결정했으나, supplyChain 점수 강등 후 정성 메모를 위한 전용 필드가 필요하다고 판단해 `supplyChainNotes: SourcedText` (default source='manual') 신설. 스키마 + Domain 페이지 모두 반영.
13. **scores.supplyChain 강등 → quantumThreat 신설**: 4번째 점수 축을 `supplyChain` (수동 리서치, 신뢰도 낮음) 에서 `quantumThreat` (자동 계산, deterministic) 으로 교체. 4축 모두 `source='automated'` 로 일관성 확보. supplyChain 정성 메모는 `supplyChainNotes` 로 보존.
14. **점수 공식 표준 인용 확정**: v1 공식의 모든 룰이 RFC 8996 / Mozilla SSL Config v6.0 (intermediate) / NIST SP 800-52 Rev. 2 / OWASP TLS Cheat Sheet 중 하나 이상에 매핑됨. 임의 가중치 없음. v2 보정은 50개 실측 분포 분석 후 별도.
15. **데이터 검증 자동화**: `scripts/validate-data.ts` 신규. `pnpm lint` = `eslint . && pnpm validate-data` 결합 — 측정 엔진(Python) ↔ 스키마(TypeScript) 간 정합성 갭이 빌드·테스트 통과해도 zod 런타임에서 잡힘. 본 결정의 계기는 2026-05-19 발견된 `pqc.keyExchange` enum 혼동 버그 (47/47 → 46/47 거부).
16. **외부 TLS 프로브 차단 도메인 처리**: 현대모비스·현대글로비스·HL만도·신한은행은 sslyze 측정 거부 (WAF 또는 금융권 보안 정책). 본 SPEC 범위 내에서는 별도 "측정 불가" 카테고리로 분류, batch-errors.json 에 보존. 발견 자체가 정보 가치.
17. **Phase 2 (hybridKem 실측) — 별도 마일스톤**: sslyze 의 `elliptic_curves` scan 은 X25519MLKEM768 를 명시 테스트하지 않으므로 Phase 1 결과는 거의 모든 도메인이 30점 (ECDHE only) 으로 수렴. 진짜 hybridKem 측정은 raw TLS 1.3 ClientHello 수동 조립 + ServerHello key_share 파싱 (Python `cryptography` 45+ 또는 `liboqs-python`) 으로 구현 예정. 별도 SPEC 추가 또는 본 SPEC §3.14 확장.

### 8-B. Phase 2 후속 결정 (2026-05-19 추가)

18. **Phase 2 구현 완료 — 외부 의존성 없는 raw probe**: `scanner/pqc_probe.py` 가 raw `socket` + `struct` 로 TLS 1.3 ClientHello 조립 + ServerHello/HRR/Alert 파싱. 외부 PQC 라이브러리 (`liboqs-python` / `cryptography 45+`) 사용 안 함 — 빈 `key_share` 전송으로 서버가 HRR 발행하면 그 시점의 `selected_group` 만 관찰. 표준 인용: RFC 8446 §4.1.3, IANA TLS Named Groups (4588 = 0x11EC), draft-ietf-tls-ecdhe-mlkem.

19. **Phase 2 측정 결과 (n=51)**: SUPPORTED 12 / NOT_SUPPORTED 23 / ERROR_NETWORK 16. **24% 가 X25519MLKEM768 협상에 응답** — Phase 1 (sslyze) 의 "ML-KEM 0건" 결론을 뒤집음. 동일 그룹 내 도메인별 격차 (예: 삼성전자 ↔ 삼성SDI/바이오) 가 발견됨 → CDN/edge 단위 정책 분산화 가설. 16개 ERROR_NETWORK 중 다수가 공공·금융권 = raw TLS 1.3 직접 협상 차단 보안 정책 (그 자체가 정보).

20. **`hybridKem` 점수 산정 — Phase 2 우선 통합**: probe SUPPORTED → 100 (Mozilla v6.0 부합), NOT_SUPPORTED (explicit alert) → 15, NOT_SUPPORTED_OTHER_GROUP → 20, ERROR_* → 30 (Phase 1 default, 측정 불가). `scanner/merge_pqc.py` 가 probe 결과를 `public/data/domains.json` 에 in-place 통합. 동시에 각 도메인의 `findings` 배열에 probe 결과 1건씩 자동 추가 (source='automated').

21. **supplyChain 프레이밍 재진술 (epistemological correction)**: §8-A 13번의 "강등 → quantumThreat 신설" 은 **코드 일관성 관점의 정리**이지 양자 보안 관점의 정당화가 아님. **양자 보안 supply chain 은 실재하는 중요 축** (HW 백도어, 펌웨어 PQC 지원, HSM 벤더 로드맵, KMS 키 관리 정책 등). Phase 1 자동 측정 한계로 정성 디스크립터 (`supplyChainNotes`, source='manual') 로 분리 보존했을 뿐, Phase 2+ 에서 보강 대상. 본 SPEC 의 Out of Scope 가 아니라 **Future Scope**.

22. **통계 표현 톤 보정**: README · 메모리의 "섹터 격차 6배", "91% RSA-2048" 같은 inferential 톤을 "표본 47 기준 산술 평균 격차 6×, 모집단 추정 불가" 로 약화. n=3 (통신) 같은 작은 표본을 통계적 결론으로 일반화하지 않음. 발표·자소서에서도 동일 톤 유지.

23. **calibration scalars 인정 — Future Work**: `roetteler.py:classical_score` 의 `22` 와 `1 − rate × 0.7` 계수는 정당화된 출처 없음 (사전 가정값 근처에 떨어지도록 눈으로 calibrate 한 수). Roetteler 2017 인용은 logical_qubits / Toffoli gate 계산까지만 유효하며, **0-100 점수 정규화는 calibration scalar 적용 — ordering 보존만 의미, 절대값 의미 없음**. 다음 stepup 후보: Microsoft Azure Quantum / IBM 등 hardware roadmap 곡선을 시간축으로 변환 (HNDL 모델) 하여 실제 의미 가진 시점 추정으로 교체.

---

## 9. Out of Scope (범위 외)

명시적으로 본 SPEC 범위 밖임을 기록합니다.

- 실제 TLS 핸드셰이크 측정 및 라이브 PQC 협상 텔레메트리
- 백엔드 API 또는 데이터 수집 파이프라인
- 사용자 인증, 권한 관리, 결제 기능
- 다국어 i18n (한국어 외 로케일)
- 모바일 네이티브 앱(iOS/Android)으로의 패키징
- 마이그레이션·하위 호환·기존 시스템과의 연동
- 운영 모니터링·알림·SRE 기능

---

## 10. References (참조)

- EARS Methodology: Alistair Mavin, *Easy Approach to Requirements Syntax* (2009)
- WCAG 2.2 AA: <https://www.w3.org/TR/WCAG22/>
- PWA Manifest: <https://developer.mozilla.org/docs/Web/Manifest>
- Workbox / vite-plugin-pwa: <https://vite-pwa-org.netlify.app/>
- shadcn/ui: <https://ui.shadcn.com/>
- Radix Primitives: <https://www.radix-ui.com/primitives>
- zod: <https://zod.dev/>
- Pretendard: <https://github.com/orioncactus/pretendard>
- MoAI 프로젝트 규약: `.moai/config/sections/quality.yaml`, `.claude/rules/moai/`

---

*문서 버전: 0.1.0 · 상태: Draft · 작성자: MoAI manager-spec · 작성일: 2026-05-14*
