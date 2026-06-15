# PQC 준비도 스캐너 (Post-Quantum Readiness Scanner)

> 한국 주요 도메인의 양자내성암호(PQC) 전환 준비도를 4축으로 측정·시각화하는 정적 PWA 대시보드.
> 양자컴퓨팅 강의 기말 프로젝트.

**핵심 발견**: 업계 표준 스캐너(sslyze)로는 한국 인프라의 ML-KEM 협상이 "0건"으로 보이지만, raw TLS 1.3 ClientHello 직접 측정으로는 **51개 중 12개 (24%) 가 X25519MLKEM768 협상에 응답**합니다. 측정 방법을 바꾸면 한국 웹의 PQC 전환 신호가 드러납니다.

## Live Demo

- **사이트**: <https://quant-reg.vercel.app/>
- **PWA 설치**: 데스크톱 Chrome/Edge → 주소창 우측 "설치" 아이콘, 또는 사이트 헤더의 "앱 설치" 버튼. 모바일은 브라우저 메뉴 → "홈 화면에 추가". 설치 후 독립 앱 윈도우로 실행되며 Service Worker 캐시로 오프라인 동작.
- **소스**: <https://github.com/chanspick/quant_reg>
- **발표 노트**: [`.moai/specs/SPEC-PQC-001/presentation-notes.md`](.moai/specs/SPEC-PQC-001/presentation-notes.md) — 7 슬라이드 + 데모 3개 큐레이션 (LG화학 / 네이버 / 카카오) + Q&A 5개 + 시간 배분.

본 프로젝트는 두 개의 모듈로 구성됩니다:

1. **`scanner/`** — Python 측정 엔진. sslyze 6.x 기반 자동 측정 + Mozilla SSL Config v6.0 / NIST SP 800-52 Rev. 2 / OWASP / RFC 8996 인용 점수 산출 + Roetteler 2017 + Willsch 2023 양자 위협 정량.
2. **`src/`** — React 19 / Vite 6 / Tailwind v4 / shadcn 대시보드 (PWA). `public/data/domains.json` 을 zod 로 검증·렌더링.

SPEC: [`.moai/specs/SPEC-PQC-001/spec.md`](.moai/specs/SPEC-PQC-001/spec.md) · 자세한 측정 방법론: 빌드 후 `/methodology` 페이지.

## Quickstart

```bash
# 1) 프론트엔드 (대시보드)
pnpm install
pnpm dev                       # http://localhost:5173

# 2) 측정 엔진 (Python — 별도)
pip install -r scanner/requirements.txt
python -m scanner.measure --hostname www.naver.com --name 네이버 --sector IT/플랫폼
```

Node 20.11+ / pnpm 10+ / Python 3.10+ 권장. 자세한 scanner 사용법은 [`scanner/README.md`](scanner/README.md).

## 4축 측정 모델

| 축 | 출처 | 산출 방식 |
|----|------|---------|
| **TLS 위생** | automated (sslyze) | Mozilla v6.0 / RFC 8996 / OWASP 기준 감점 합산 |
| **하이브리드 KEM** | automated (Phase 2 raw TLS 1.3 probe) | X25519MLKEM768 (Mozilla v6.0 등재) 협상 응답 — sslyze 한계를 raw `socket`+`struct` 직접 측정으로 보완 |
| **인증서 운영 (certOps)** | automated (sslyze) | 갱신 자동화·체인·OCSP Stapling·키 강도 |
| **양자 위협 정량 (quantumThreat)** | automated (계산) | Roetteler 2017 + Willsch 2023 — 보수·실증 두 시나리오 |

각 점수는 0–100 (높을수록 양자 저항). 모든 측정·분석·정책 데이터는 `source` 필드 (`automated` / `manual` / `llm+verified` / `llm-only`) 로 출처를 명시한다.

## 진행 상태 (2026-05-24 기준)

- ✅ Phase 1 — sslyze 자동 측정 엔진 + Mozilla 표준 기반 점수 산출
- ✅ Phase 1.5 — 한국 50개 도메인 batch 측정 (47/51 성공, 4 connectivity 실패)
- ✅ **Phase 2 — 직접 PQC TLS 클라이언트** (`scanner/pqc_probe.py`): raw `socket` + `struct` 로 TLS 1.3 ClientHello 조립, X25519MLKEM768 (0x11EC) 협상 시도 — **12/51 SUPPORTED 확인**
- ✅ **Phase 3 — 정직성 강화 (2026-05-24)**:
  - Methodology 페이지 Section 4 에 **Calibration Disclosure** 박스 — 계수 22 와 0.7 이 정당화 출처 없는 calibration scalar 임을 명시, **ordering-preserving 측정으로만 해석** + HNDL Future Work 인정
  - `DomainDetailPanel` — narrative · 공급망 메모가 `TODO:` placeholder 일 때 섹션 자체 unmount (정직성: 자가당착 차단)
  - `scripts/regenerate-recommendations.ts` — 17 룰 mechanical mapping (RFC 8996 / Mozilla v6.0 / OWASP / NIST PQC FIPS 203-205 인용 박힘) 으로 47개 도메인 권고 **264개 자동 채움**. Phase 2 SUPPORTED 12개는 "Hybrid KEM 운영 안정화" 후속 권고로 자동 swap (35 + 12 = 47 완벽 분할)
  - 신규 테스트 6개 — `isPlaceholderText` false-positive 방어 + DetailPanel conditional unmount + Methodology calibration disclosure 노출 검증 (총 78 passed)
- ✅ **Phase 4 — 배포 + 모바일 첫 로드 최적화 (2026-05-24)**:
  - Vercel 배포 — <https://quant-reg.vercel.app/>
  - **Pretendard dynamic-subset** — 2 MB 단일 woff2 를 ~40 KB × 100 subset 으로 분리. 페이지 표시 글자에 해당하는 5-10개만 첫 로드 (~200-400 KB)
  - Route-based code splitting (REQ-PRF-007) — `/methodology`, `/about` 을 `React.lazy()` 로 분리
- ⬜ 분석 텍스트 (`narrative` / `supplyChainNotes`) 수동 작성 — 47/47 `TODO:` placeholder 상태 (자동 finding/recommendations 는 채워짐). 발표 후 LLM 검증 게이트로 작성 예정

📊 **측정 핵심 발견** (표본 47–51, [CHANGELOG](CHANGELOG.md) 상세):

- **Phase 2 PQC probe**: 51개 중 **12개 (24%) 가 X25519MLKEM768 협상 응답**. sslyze 의 `elliptic_curves` scan 으로는 모두 ECDHE-only 로 보이던 결과를 raw TLS 1.3 ClientHello + HRR 파싱으로 뒤집음. CDN 레이어가 한국 인프라의 PQC 도입을 주도하는 신호.
- Phase 2 차단: **16개 (공공·금융 다수) 는 raw TLS 1.3 probe 자체를 거부** (TCP RST / DNS block / SNI 차단). 그 자체가 정보.
- 측정된 표본 기준 인증서 키 분포: **RSA-2048 91% / ECC-256 9%**, ML-KEM 또는 PQC 단독 keying 0% (n=47, 모집단 추정 불가).
- 섹터별 산술 평균 TLS 점수 격차: 통신(n=3) 87 ↔ 공공/정부(n=9) 16 — **표본 한계 명시, 통계적 일반화 불가**. 관측된 격차로만 보고.
- 주요 CVE (Heartbleed / ROBOT / CCS / CRIME / Renegotiation) — 측정 표본 내 **0건**. 한국 메이저 인프라는 known CVE 패치 운영은 양호.
- 4개 도메인 (현대모비스·현대글로비스·HL만도·신한은행) sslyze 자체도 거부.

## Scripts

| 스크립트 | 용도 |
|---------|------|
| `pnpm dev` | Vite 개발 서버 |
| `pnpm build` | 프로덕션 빌드 (`tsc -b` + `vite build` + PWA SW) |
| `pnpm preview` | 빌드 산출물 로컬 미리보기 |
| `pnpm typecheck` | TypeScript strict 검증 |
| **`pnpm lint`** | ESLint + zod 데이터 검증 (`validate-data` 결합) |
| `pnpm lint:js` | ESLint 만 분리 실행 |
| `pnpm format` | Prettier 포맷 |
| `pnpm test` | Vitest 단위 테스트 1회 |
| `pnpm test:coverage` | v8 커버리지 (목표 85%) |
| `pnpm validate-data` | `public/data/domains.json` zod 검증 |
| `pnpm add-domain` | 도메인 1개 대화식 추가 (CLI) |

## 도메인 데이터 흐름

```
scanner/domains.csv  ──▶  python -m scanner.measure --batch
                                │
                                ▼
                  scanner/out/staged-domains.json   ←  per-domain *.meta.json (감점 trace)
                                │
                                ▼
                   public/data/domains.json         ←  zod 검증 (pnpm validate-data)
                                │
                                ▼  fetch
                   src/data/useDomains.ts           ←  런타임 검증·skip-on-invalid
                                │
                                ▼
                   Dashboard / Methodology / About
```

수동 추가는 `pnpm add-domain` (대화식 CLI) 또는 `public/data/domains.json` 직접 편집. 스키마는 [`src/data/schema.ts`](src/data/schema.ts) 의 `DomainSchema` 참조.

## Tech Stack

**프론트엔드**:
- Vite 6 · React 19 · TypeScript 5.9 strict
- Tailwind CSS v4 (CSS-first `@theme`) · shadcn/ui · Radix Primitives
- React Router 7 (`React.lazy()` route splitting) · next-themes (3-way) · zod 3
- `vite-plugin-pwa` (Workbox · 오프라인 캐싱)
- Pretendard (dynamic-subset, self-host) · Inter · JetBrains Mono

**측정 엔진**:
- Python 3.10+ · sslyze 6.x · cryptography 45+
- 출력: `DomainSchema` 호환 partial JSON + scoring breakdown meta

**양자 시뮬레이션 (Phase 3, 선택 모듈)**:
- Qiskit 2.4+ · qiskit-aer · qiskit-ibm-runtime
- Shor 회로 N=15 / N=21 + Aer noiseless / Aer+device noise / IBM 실 HW

**품질·검증**:
- ESLint 9 (flat config) · Prettier 3 · Vitest 2 · Testing Library · jsdom
- zod 런타임 검증 (별도 `pnpm validate-data`, lint 결합)
- 테스트 78 passed (9 files) · 커버리지 85%+ 라인·함수 목표

**배포**:
- Vercel ([quant-reg.vercel.app](https://quant-reg.vercel.app/)) · GitHub 자동 빌드 (push 시 재배포)
- HTTPS · PWA installable · Service Worker precache

## 인용 자료

- 김의결, 안혁 (2025). "Shor 알고리즘의 기존 암호체계에 미치는 영향과 양자내성암호의 대응 전략." 한국정보통신학회 2025 춘계.
- Roetteler, M., Naehrig, M., Svore, K. M., Lauter, K. (2017). "Quantum resource estimates for computing elliptic curve discrete logarithms." [arXiv:1706.06752](https://arxiv.org/abs/1706.06752)
- Willsch, D., Willsch, M., Jin, F., De Raedt, H., Michielsen, K. (2023). "Large-Scale Simulation of Shor's Quantum Factoring Algorithm." [Mathematics 11(19), 4222](https://www.mdpi.com/2227-7390/11/19/4222)

표준:
- [Mozilla SSL Configuration v6.0 (intermediate)](https://ssl-config.mozilla.org/)
- [NIST SP 800-52 Rev. 2](https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-52r2.pdf)
- [OWASP TLS Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Transport_Layer_Security_Cheat_Sheet.html) · [HSTS Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Strict_Transport_Security_Cheat_Sheet.html)
- [RFC 8996](https://datatracker.ietf.org/doc/rfc8996/) (Deprecating TLS 1.0/1.1)
- [NIST PQC 표준 (FIPS 203 ML-KEM 외)](https://csrc.nist.gov/projects/post-quantum-cryptography)

## Project Structure

```
quant_reg/
├── scanner/                      # Python 측정 엔진 (Phase 1+2)
│   ├── __init__.py
│   ├── requirements.txt          # sslyze >= 6.0
│   ├── roetteler.py              # 양자 자원 추정 (TS 와 1:1 deterministic)
│   ├── scoring.py                # 표준 인용 점수 + auto_findings + auto_recommendations
│   ├── measure.py                # CLI (단일 / batch / --from-json)
│   ├── pqc_probe.py              # Phase 2 — raw socket TLS 1.3 ClientHello probe
│   ├── merge_pqc.py              # Phase 2 결과 → domains.json in-place merge
│   ├── domains.csv               # 51개 후보 도메인
│   └── out/                      # staged-domains.json + *.meta.json + pqc-probe-results.json
├── quantum/                      # Phase 3 — Qiskit Shor 알고리즘 시뮬레이션
│   ├── __init__.py
│   ├── requirements.txt          # qiskit >= 2.4, qiskit-aer, qiskit-ibm-runtime
│   ├── shor_circuit.py           # N=15 (Vandersypen 2001) + N=21 (generic) 회로 빌더
│   ├── analyze.py                # 측정 → 연분수 → 주기 r → factor 복원
│   └── shor_experiment.py        # Aer noiseless / Aer+noise / IBM 실 HW 오케스트레이션
├── public/
│   ├── data/domains.json         # 검증된 도메인 envelope (zod-compliant, version 0.6.0-phase2-pqc-merge+recs)
│   └── pwa-*.png, favicon.svg
├── src/
│   ├── App.tsx                   # 라우터 + ThemeProvider + React.lazy 분할
│   ├── components/
│   │   ├── layout/               # AppShell · Header · DemoBanner
│   │   ├── theme/                # ThemeProvider · ThemeToggle
│   │   ├── pwa/                  # InstallButton · UpdateToast · OfflineNotice
│   │   ├── shared/               # SourceChip · ScoreBar · StatusBadge · scoreBand
│   │   ├── dashboard/            # DomainCard · DetailPanel · Search · Filter · Sort · Summary
│   │   └── ui/                   # shadcn-generated
│   ├── pages/                    # Dashboard · Methodology(Calibration Disclosure) · About · NotFound
│   ├── data/                     # schema (zod + isPlaceholderText) · useDomains · quantumResources · references
│   ├── i18n/ko.ts                # 한국어 UI 메시지 (단일 출처)
│   └── lib/                      # utils · pwa · themeColor · dashboardState
├── scripts/
│   ├── add-domain.ts                    # 도메인 대화식 추가 CLI
│   ├── validate-data.ts                 # zod envelope 검증 (lint 결합)
│   └── regenerate-recommendations.ts    # 17 룰 mechanical mapping (Phase 3, idempotent sync)
├── tests/
│   ├── setup.ts                  # matchMedia 폴리필 + jest-dom matcher
│   ├── fixtures/sample-domains.json
│   ├── __mocks__/pwa-register.ts
│   └── unit/                     # schema · quantumResources · themeColor · dashboard · dashboardState · useDomains · appShell · pages (78 tests)
├── .moai/specs/SPEC-PQC-001/
│   ├── spec.md                   # EARS 형식 SPEC (95+ 요구사항)
│   └── presentation-notes.md     # 발표 7 슬라이드 + 데모 큐레이션 + Q&A
└── CHANGELOG.md                  # 일자별 진행 기록
```

## Disclaimer

- **자동 측정 (`source: automated`)**: 4축 점수 + Phase 2 PQC probe + 인증서 메타 + 자동 finding + 자동 recommendations — 모두 실측 또는 결정적 계산. RFC 8996 / Mozilla SSL Config v6.0 / OWASP / NIST PQC 표준 인용이 룰 안에 박혀있음. UI 의 `SourceChip` (sky 색) 로 시각 구분.
- **미완성 영역 (`TODO:` placeholder)**: narrative · supplyChainNotes (47/47). UI 는 placeholder 가 감지되면 섹션 자체 unmount 하여 노출 차단. 향후 LLM 검증 게이트로 채울 예정.
- **calibration scalar (22 와 0.7)**: 정당화된 출처 없음 — `scanner/roetteler.py:96` 의 `score = gap * 22 * (1 - success_rate * 0.7)` 한 줄에서 사용되며, 같은 공식이 `src/i18n/ko.ts:101` (Methodology 페이지 Section 4 Calibration Disclosure) 에 그대로 노출. **두 상수는 논문 직접 인용이 아니라 측정 분포 정규화를 위한 self-calibration scalar** 이며 (사전 가정값 부근에 도메인 점수가 위치하도록 눈으로 보정한 값), 별도 정당화 논문은 확보되지 않음. **ordering-preserving 측정으로만 해석** — 두 도메인 점수 차이는 상대 순위만 의미하고, 절대값은 양자 깨짐까지의 시간·자원·확률 어느 것과도 직접 매핑되지 않음.
- **Future Work — discrete grade 모델 v2 마이그레이션**: 발표 이후 별도 사이클에서 0-100 연속 점수를 `discrete grade` (예: A/B/C/D/F 5-tier 또는 `pq-observed` / `hybrid-capable` / `classical-only` / `legacy` / `critical`) 또는 분위수 정규화(quantile normalization) 로 교체 예정. 목적은 ① calibration scalar 의존 제거, ② 표본 격차의 의미를 등급 경계로 흡수, ③ 측정 모델의 정직성 게이트 ([[feedback_data_source_honesty]]) 강화. 마이그레이션 시점은 발표 이후로 잡되, 본 문서에는 구체 일자 박제하지 않음.
- **진단·감사·구매 의사결정에 사용하지 마십시오.** 본 데이터는 강의 데모 목적입니다.
- 4개 도메인 (현대모비스·현대글로비스·HL만도·신한은행) 은 sslyze 자체 차단, Phase 2 raw probe 도 16개 (공공·금융 다수) 추가 차단 — 별도 카테고리, 그 자체가 발견 사항.
