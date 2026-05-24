# PQC 준비도 스캐너 (Post-Quantum Readiness Scanner)

> 한국 주요 도메인의 양자내성암호(PQC) 전환 준비도를 4축으로 측정·시각화하는 정적 PWA 대시보드.
> 양자컴퓨팅 강의 기말 프로젝트.

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
| **하이브리드 KEM** | automated (sslyze 한계 + Phase 2 예정) | X25519MLKEM768 (Mozilla v6.0 등재) 협상 가능 여부 |
| **인증서 운영 (certOps)** | automated (sslyze) | 갱신 자동화·체인·OCSP Stapling·키 강도 |
| **양자 위협 정량 (quantumThreat)** | automated (계산) | Roetteler 2017 + Willsch 2023 — 보수·실증 두 시나리오 |

각 점수는 0–100 (높을수록 양자 저항). 모든 측정·분석·정책 데이터는 `source` 필드 (`automated` / `manual` / `llm+verified` / `llm-only`) 로 출처를 명시한다.

## 진행 상태 (2026-05-19 기준)

- ✅ Phase 1 — sslyze 자동 측정 엔진 + Mozilla 표준 기반 점수 산출
- ✅ Phase 1.5 — 한국 50개 도메인 batch 측정 (47/51 성공, 4 connectivity 실패)
- ✅ **Phase 2 — 직접 PQC TLS 클라이언트** (`scanner/pqc_probe.py`): raw socket + struct 로 TLS 1.3 ClientHello 조립, X25519MLKEM768 (0x11EC) 협상 시도
- ⬜ 분석 텍스트 (`narrative` / `findings` / `recommendations`) 채우기 — 진행 중

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
- React Router 7 · next-themes (3-way) · zod 3
- `vite-plugin-pwa` (Workbox · 오프라인 캐싱)
- Pretendard / Inter / JetBrains Mono (self-host)

**측정 엔진**:
- Python 3.10+ · sslyze 6.x · cryptography 45+
- 출력: `DomainSchema` 호환 partial JSON + scoring breakdown meta

**품질·검증**:
- ESLint 9 (flat config) · Prettier 3 · Vitest 2 · Testing Library · jsdom
- zod 런타임 검증 (별도 `pnpm validate-data`, lint 결합)
- 커버리지 95.55% lines / 89.01% functions

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
├── scanner/                      # Python 측정 엔진
│   ├── __init__.py
│   ├── requirements.txt          # sslyze >= 6.0
│   ├── roetteler.py              # 양자 자원 추정 (TS 와 1:1)
│   ├── scoring.py                # 표준 인용 점수 산출
│   ├── measure.py                # CLI (단일 / batch / --from-json)
│   ├── domains.csv               # 50개 후보 도메인
│   └── out/                      # staged-domains.json + *.meta.json
├── public/
│   ├── data/domains.json         # 검증된 도메인 envelope (zod-compliant)
│   └── pwa-*.png, favicon.svg
├── src/
│   ├── App.tsx                   # 라우터 + ThemeProvider
│   ├── components/
│   │   ├── layout/               # AppShell · Header · DemoBanner
│   │   ├── theme/                # ThemeProvider · ThemeToggle
│   │   ├── pwa/                  # InstallButton · UpdateToast · OfflineNotice
│   │   ├── shared/               # SourceChip · ScoreBar · StatusBadge · scoreBand
│   │   ├── dashboard/            # DomainCard · DetailPanel · Search · Filter · Sort · Summary
│   │   └── ui/                   # shadcn-generated
│   ├── pages/                    # Dashboard · Methodology · About · NotFound
│   ├── data/                     # schema (zod) · useDomains · quantumResources · references
│   ├── i18n/ko.ts                # 한국어 UI 메시지
│   └── lib/                      # utils · pwa · themeColor · dashboardState
├── scripts/
│   ├── add-domain.ts             # 도메인 대화식 추가 CLI
│   └── validate-data.ts          # zod envelope 검증 (lint 결합)
├── tests/
│   ├── setup.ts                  # matchMedia 폴리필 + jest-dom matcher
│   ├── fixtures/sample-domains.json
│   ├── __mocks__/pwa-register.ts
│   └── unit/                     # schema · quantumResources · themeColor · dashboard · dashboardState · useDomains · appShell · pages
├── .moai/specs/SPEC-PQC-001/
└── CHANGELOG.md                  # 일자별 진행 기록
```

## Disclaimer

- 도메인 점수·소견·인증서·규제 매핑 정보 중 `source: automated` 항목은 실제 sslyze 측정 결과이나, `manual` / `llm+verified` / `llm-only` 항목은 합성 또는 분석 추론입니다.
- **진단·감사·구매 의사결정에 사용하지 마십시오.** 본 데이터는 강의 데모 목적입니다.
- 4개 도메인은 외부 TLS 스캐너 차단 정책으로 측정 불가 (별도 카테고리 — 그 자체가 발견 사항).
