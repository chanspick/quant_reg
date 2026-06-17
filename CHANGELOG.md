# Changelog

본 프로젝트의 주요 변경 이력. 일자는 KST 기준.

## [Unreleased] — 후속 stepup 후보

- ⬜ calibration scalar v2 — discrete grade 모델로 마이그레이션 (현재 `scanner/roetteler.py:96` 의 `22 · 0.7` self-calibration scalar 의 정당화 논문 미확보, [[feedback_data_source_honesty]] 정직성 게이트 강화 목적, 0-100 연속 점수 → A/B/C/D/F 또는 분위수 정규화)
- ⬜ HNDL (Harvest Now Decrypt Later) 시점 위협 모델 — Roetteler/Willsch 인용을 시간축 모델로 발전
- ⬜ 분석 텍스트 (`narrative` / `findings` / `recommendations`) 채우기 — 사용자 작업
- ⬜ supply chain 측정 보강 — HW 백도어, 펌웨어 PQC 지원, HSM 벤더 로드맵 (Phase 1 자동 측정 불가 영역)

## 2026-06-17 (인용 귀속 교정)

### Fixed
- **양자 위협 정량의 인용 귀속 교정** — RSA 인수분해 자원 추정을 Roetteler 2017 로 잘못 귀속하던 표기를 정정. Roetteler et al. 2017 (arXiv:1706.06752) 은 ECC(타원곡선 이산로그) 자원 추정 논문으로, RSA 를 다루지 않음.
  - RSA logical-qubit 수치(2n+3) 출처 → **Beauregard 2003** (arXiv:quant-ph/0205095), 자원 추정 → **Gidney-Ekerå 2019** (arXiv:1905.09749) / **Gidney 2025** (arXiv:2505.15917).
  - ECC 는 그대로 **Roetteler 2017** 유지. 실증 시뮬레이션은 그대로 **Willsch 2023** 유지.
  - 교정 범위는 귀속(주석·basis 문자열·citations·REFERENCES·산문·README·LLM 프롬프트)에 한정. logicalQubits / toffoliGates / score / successRate 등 수치값과 함수 시그니처·점수 로직은 불변.

## 2026-05-19 (Phase 2 + 정직성 보정)

### Added
- **`scanner/pqc_probe.py`** — Phase 2 직접 PQC TLS 클라이언트. raw `socket` + `struct` 로 TLS 1.3 ClientHello 조립 (외부 의존성 없음), `supported_groups=[X25519MLKEM768]` + 빈 `key_share` 전송, ServerHello/HelloRetryRequest/Alert 파싱. RFC 8446 + IANA TLS Named Groups (4588 = 0x11EC) 인용.
- **`scanner/merge_pqc.py`** — probe 결과 → `public/data/domains.json` 통합. SUPPORTED 12개의 `scores.hybridKem.value` 30 → 100, `pqc.{keyExchange,hybrid}` = '활성화'/'하이브리드', 각 도메인에 probe finding 1건 추가.
- **51개 batch probe 결과**:
  - **SUPPORTED 12개 (24%)**: 삼성SDI, LG이노텍, 현대자동차, 기아, LG화학, 한전, 두산, 삼성바이오, 네이버, LG U+, 미래에셋, 크래프톤. 모두 HRR 통해 X25519MLKEM768 선택 확인.
  - NOT_SUPPORTED 23개 (45%): 명시적 `alert(handshake_failure)`.
  - ERROR_NETWORK 16개 (31%): 공공·금융 다수 — TCP RST / DNS block / SNI 차단. raw TLS 1.3 ClientHello 자체를 거부하는 보안 정책 (그 자체가 발견).
  - 동일 그룹 내 격차: 삼성전자 ↔ 삼성SDI / 삼성바이오, LG전자 ↔ LG U+ / LG화학 / LG이노텍, SKT/KT ↔ LG U+. CDN/edge 정책 분산화.
- **표준 인용 보강**: probe 모듈에 RFC 8446 §4.1.3 (HRR magic), IANA TLS Named Groups, draft-ietf-tls-ecdhe-mlkem, Mozilla SSL Config v6.0 출처 명시.

### Changed
- **`hybridKem` 점수 계산 — Phase 2 우선**: probe SUPPORTED → 100, NOT_SUPPORTED → 15, NOT_SUPPORTED_OTHER → 20, ERROR_* → 30 (Phase 1 default 유지). 기존 47개 중 12개 점수 100 으로 격상.
- **`pqc.{keyExchange,hybrid}` enum 값** — Phase 2 probe 가 SUPPORTED 면 '활성화'/'하이브리드' 로 재라벨.
- **통계 표현 톤 보정 (epistemological hygiene)** — README · 메모리의 "섹터 격차 6배", "91% RSA-2048" 같은 inferential 한 표현을 "표본 47 기준 산술 평균 격차 6×", "측정된 47개 중 91%, 모집단 추정 불가" 로 약화. 비평 수용.
- **`supplyChain` 강등 프레이밍 재진술** (SPEC §8-A 13번) — "코드 일관성 위해 강등" 이 아니라 **"Phase 1 자동 측정 불가 영역 → 정성 디스크립터로 분리 보존. Phase 2+ 에서 HW 백도어 / 펌웨어 PQC 지원 / HSM 벤더 로드맵 측정으로 보강"** 으로 재진술. 양자 보안 supply chain 자체의 중요성 인정.

### Fixed
- **enum 정합성 버그** — `scanner/scoring.py:derive_pqc_status` 가 `keyExchange` 값으로 `"미감지"` 반환했으나 이 값은 `hybrid` enum 에만 있고 `keyExchange` enum (`활성화|미지원|비활성화|차단됨|미설정`) 에는 없음. 빌드·테스트는 통과했으나 zod 런타임 검증이 47개 중 46개를 거부. → `"미지원"` (PQC 그룹 advertise 안 함) 으로 수정. `public/data/domains.json` 46개 in-place 패치.

### Added (도구·검증)
- **`scripts/validate-data.ts`** — `public/data/domains.json` 을 zod `DomainsEnvelopeSchema` 로 검증하는 스탠드얼론 스크립트. invalid 시 exit 1 + 상세 trace (`--verbose`).
- **`pnpm lint` 결합** — eslint + validate-data 순차 실행. 빌드/CI 에서 측정 엔진 ↔ 스키마 정합성 자동 검사.
- **`pnpm validate-data`** — 분리 실행 옵션.

## 2026-05-17 ~ 18

### Added
- **`scanner/` Python 모듈** — sslyze 자동 측정 엔진. 4개 파일:
  - `roetteler.py` — TS `quantumResources.ts` 와 결정적 동일한 양자 자원 추정 + 보수·실증 시나리오
  - `scoring.py` — 표준 인용 점수 산출 (Mozilla v6.0 / NIST 800-52 / OWASP / RFC 8996)
  - `measure.py` — CLI (단일 도메인 / `--from-json` / `--batch`)
  - `requirements.txt` — sslyze >= 6.0
- **`scanner/domains.csv`** — 50개 한국 도메인 후보 (13 섹터)
- **batch 측정 + 분포 분석**:
  - 47/51 성공 (4 connectivity 실패: 현대모비스·현대글로비스·HL만도·신한은행 — 외부 TLS 프로브 차단)
  - TLS 점수 분포 이극화: 위험(0-30) 20개 + 우수(81-100) 14개 — 한국 인프라 양극화
  - 섹터 격차: 통신 평균 87 vs 공공/정부 16 (6배)
  - 키 알고리즘: RSA-2048 43개 / ECC-256 4개 / ML-KEM 0개
  - CVE 취약점 (Heartbleed / ROBOT / CCS / CRIME) — 0건 (한국 인프라 패치 양호)
- **v1 점수 공식 표준 인용** — `scoring.py` 의 `_TLS_RULES` / `_CERTOPS_RULES` 에 각 룰의 출처 명시 (RFC/Mozilla/NIST/OWASP/CVE).

### Fixed
- **ROBOT enum substring 매치 버그** — `"NOT_VULNERABLE_NO_ORACLE"` 안에 `"VULNERABLE"` 부분 문자열이 포함되어 잘못 True 반환. `startswith("VULNERABLE_")` prefix 매치로 수정.
- **ECC 곡선 별명 처리** — `secp256r1` (sslyze 출력) 과 `prime256v1` (Mozilla 표기) 가 같은 곡선임을 인식하도록 별명 리스트 확장.

## 2026-05-14 ~ 16

### Added (Phase 0 — 스캐폴드 + 4축 모델 + 3 논문 인용)
- **스캐폴드** — Vite 6 + React 19 + TypeScript 5.9 strict + Tailwind v4 + shadcn/ui + Radix + `vite-plugin-pwa` + Pretendard / Inter / JetBrains Mono.
- **4축 측정 모델 통합** — `tls` / `hybridKem` / `certOps` / `quantumThreat` 각 `SourcedScore` envelope. `supplyChain` 점수는 강등되어 `supplyChainNotes: SourcedText` 정성 디스크립터로 보존.
- **양자 위협 정량 + 3 논문 인용 체인**:
  - 김의결·안혁 (2025) — 이론 프레임 (교수 송부)
  - Roetteler et al. (2017, arXiv:1706.06752) — 자원 추정 공식
  - Willsch et al. (2023, Mathematics 11, 4222) — 실증 시뮬레이션
  - `src/data/quantumResources.ts` — TS 결정적 계산 + 보수·실증 시나리오
  - `src/data/references.ts` — 인용 메타데이터 단일 출처
- **정직성 출처 라벨링** — 모든 측정·분석·정책 데이터에 `source: 'automated' | 'manual' | 'llm+verified' | 'llm-only'` 필수. `SourceChip` 시각 레전드 (sky / amber / violet / slate) — 배너와 detail panel 1:1 매핑.
- **공유 컴포넌트** — `src/components/shared/`: `SourceChip` · `ScoreBar` (dual-scenario marker 지원) · `StatusBadge` · `scoreBand`.
- **Dashboard 본구현** — `src/components/dashboard/`: `DomainCard` · `DomainDetailPanel` · `SearchInput` (200ms debounce) · `SectorFilter` · `SortControl` (6축) · `SectorSummary` · `EmptyState` · `DashboardSkeleton` · `useDashboardState` (URL 직렬화).
- **PWA UI** — `InstallButton` (헤더 + About 재노출) · `UpdateToast` · `OfflineNotice`.
- **테마 시스템** — next-themes 3-way (Light/Dark/System) + PWA Manifest `theme_color` 동적 sync + FOUC 방지 inline 스크립트.
- **방법론 / 소개 페이지** — Roetteler 공식·시나리오 카드·참고 문헌·핵심 한 줄 keystone.
- **CLI** — `pnpm add-domain` 대화식 도메인 추가 (`@inquirer/prompts` 기반).
- **테스트 72개** — schema · quantumResources · themeColor · dashboard · dashboardState · useDomains · appShell · methodologyPage · aboutPage. 커버리지 95.55% lines / 89.01% functions.

### Changed
- `compliance` → `regulatoryGaps` 명명 변경 (정직성: "준수" 가 아닌 "갭 매핑")
- `public/data/domains.json` 빈 envelope 으로 초기화 (실측 데이터로 채울 자리)
- 기존 3 샘플 (삼성·네이버·KEPCO) → `tests/fixtures/sample-domains.json` 으로 이동

## 2026-05-14 (초기)

### Added
- SPEC-PQC-001 작성 (763 → 827 줄, 95+ EARS 요구사항, §3.14 양자 위협 정량화 신설)
- 데이터 출처 정직성 원칙 (`source` 필드 의무화) 설계
- Mozilla SSL Configuration v6.0 / NIST SP 800-52 Rev. 2 / OWASP TLS / RFC 8996 표준 인용 결정

---

[Unreleased]: ./
