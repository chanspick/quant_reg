# PQC 준비도 스캐너

> 한국 주요 도메인이 양자컴퓨팅 위협에 얼마나 준비되어 있는가 — 4축 자동 측정 + 실시간 스캐너.  
> 양자컴퓨팅 강의 기말 프로젝트.

**Live** → [quant-reg.vercel.app](https://quant-reg.vercel.app/) · [quantreg-production.up.railway.app](https://quantreg-production.up.railway.app/)

---

## 핵심 발견

업계 표준 스캐너(sslyze)로 측정하면 한국 인프라의 ML-KEM 협상은 **"0건"** 으로 보입니다.  
raw TLS 1.3 ClientHello를 직접 조립해 X25519MLKEM768(0x11EC)을 명시적으로 제안하자 **51개 중 12개(24%)** 가 응답했습니다.

측정 방법을 바꾸면 결론이 바뀝니다.

---

## 피드백 반영 핵심 방향

피드백의 공통된 요구는 세 가지였습니다.  
**앱만 봐도 제작자의 의도가 전달될 것**, **개념 설명을 간결하고 흥미롭게 재구성할 것**, **사용자가 직접 조작하며 "살아 있는 보고서"처럼 느낄 수 있도록 구성할 것**.  
이 세 방향을 중심으로 전면 개편했습니다.

---

## ■ 전체 구조 재편 — 기능 나열에서 스토리 흐름으로

기존에는 대시보드가 첫 화면이었습니다. 앱을 열자마자 도메인 카드 47개가 쏟아졌고, 이것이 무슨 프로젝트인지 맥락 없이 데이터 탐색부터 시작해야 했습니다.

개편 후에는 **프로젝트 소개 페이지가 메인(/)** 이 됩니다.

| 탭 | URL | 역할 |
|---|---|---|
| 프로젝트 소개 | `/` | 문제 설정 → 발견 → 방법론 → 회고 (에세이 전체 임베드) |
| 대시보드 | `/dashboard` | 47개 도메인 4축 시각화 · 검색 · 필터 · 정렬 |
| 측정 방법론 | `/methodology` | 4축 모델 · Phase 2 발견 스토리 · 인터랙티브 qubit 계산기 |
| 동적 스캐너 | `/scan` | 임의 도메인 입력 → 실시간 측정 + Gemini narrative |

앱 아이콘을 누른 순간부터 탭 순서대로 따라가면 **문제 파악 → 데이터 탐색 → 원리 이해 → 직접 실험** 흐름이 자연스럽게 이어집니다.

---

## ■ 고정 섹션 신설 — "게시글 없이 앱만으로도 의도가 전달되어야 한다"

기존에는 탭을 열기 전까지 이 앱이 무엇을 다루는지 알 방법이 없었습니다.

개편 후에는 항상 고정 표시되는 **DashboardHero** 섹션을 대시보드 상단에 추가했습니다.

- **HNDL 위협 카드** — Harvest Now, Decrypt Later. 지금 암호화된 트래픽이 미래의 양자컴퓨터에 노출될 수 있다는 공격 모델을 한 줄로 설명.
- **Q-Day 타임라인** — 2024–2035 시각화. NIST FIPS 203 확정(2024-08), Q-Day 추정 범위(2028–2033), 빅테크 전환 시작점.
- **라이브 메트릭** — 실제 domains.json 기반으로 측정 시 실시간 계산. "47개 중 12개가 ML-KEM 활성화"라는 숫자가 데이터에서 직접 흘러나옵니다.

앱만 열어도 투자자나 처음 보는 사람에게 제작 의도가 전달되도록 설계했습니다.

---

## ■ 프로젝트 소개 탭 — 에세이 전체를 앱 안으로

기존에는 설명이 게시글 텍스트에만 존재했습니다. 앱과 설명이 분리되어 있었습니다.

개편 후에는 작성했던 에세이 전체를 구조화된 섹션으로 앱 안에 담았습니다.

**결과물 섹션** — 정적 대시보드(Vercel)와 동적 스캐너(Railway) 두 배포처를 카드로 소개. `google.com` 실측 예시(TLS 15 / KEM 30 / CertOps 85 / Quantum 20)를 인라인 표시해 "PQC 협상과 TLS 위생은 별개로 관리된다"는 발견을 바로 보여줍니다.

**문제 설정** — Shor·Grover 알고리즘이 현재 TLS를 위협하는 맥락과 두 가지 연구 질문(Q1: 표준 도구 사각지대 드러내기 / Q2: 양자 위협 정량화)을 서술합니다.

**핵심 발견 A·B·C** — 단순 숫자(24%, 4,099, 47, 2028–2033)를 stat box로 강조한 뒤 발견별 서술을 전개합니다. 발견 B "CDN/edge 레이어가 PQC 채택을 주도한다"(삼성전자 미지원 ↔ 삼성SDI·삼성바이오 활성화)와 발견 C "섹터별 격차"(통신 TLS 87 ↔ 공공/정부 16)까지 포함합니다.

**데모 큐레이션** — LG화학(모범 사례), 네이버(PQC 100 but TLS 10), 카카오(전 영역 미흡) 세 도메인을 한 테이블에 비교해 "같은 국내 포털인데 왜 이렇게 다른가"를 보여줍니다.

**개발 중 어려움** — calibration scalar 정직성 공개, 데이터 출처 정직성 게이트(source enum + validate-data), Windows asyncio subprocess 호환, Railway 배포 6차 시도. 과정을 숨기지 않고 드러냅니다.

**개발 마일스톤** — 추측 날짜 없음. 실제 git 커밋 SHA 기반 6개 타임라인으로 이 프로젝트가 어떤 사건들을 거쳐 만들어졌는지 보여줍니다.

---

## ■ 측정 방법론 탭 — Phase 2 발견 스토리 + 인터랙티브 계산기

기존에는 파라미터 설명과 공식이 마크다운 문단으로 나열되어 있었습니다.

개편 후에는 **"측정 방법이 결과를 결정한다"** 는 핵심 사건을 별도 섹션으로 시각화했습니다.

- **Phase 2 발견 스토리** — sslyze가 PQC 응답을 0건으로 보고한 이유(ClientHello에 PQC 그룹 미포함)와 raw socket + struct로 TLS 1.3 ClientHello를 직접 조립해 24%를 발견한 과정을 before / after / insight 3단계로 보여줍니다. 네이버의 HelloRetryRequest 케이스도 포함.
- **인터랙티브 qubit 계산기** — RSA/ECC 알고리즘과 키 길이를 선택하면 Beauregard 2003(2n+3) · Roetteler 2017(9n+2⌈log₂n⌉+10) 공식이 실시간 전개되며 Logical Qubits · Toffoli Gates · 보수/실증 점수 4개 박스가 즉시 갱신됩니다.

---

## ■ 동적 스캐너 통합 — Vercel 분리에서 Railway 단일 배포로

기존에는 정적 대시보드(Vercel)와 동적 스캐너(Railway)가 완전히 별개 사이트였습니다.

개편 후에는 **Railway 단일 이미지** 안에 대시보드와 스캐너가 함께 배포됩니다. FastAPI가 React SPA를 StaticFiles로 서브하고, `/scan` 탭으로 라우팅됩니다. Docker 멀티스테이지 Stage 1에서 루트 프로젝트를 빌드하고 Stage 2 Python 환경이 `dist/`를 탑재하는 구조입니다.

배포 과정에서 해결한 이슈: `.dockerignore` 충돌 · pnpm 11 supply-chain policy fatal error(packageManager 고정으로 해결) · watchPatterns 미등록으로 인한 재빌드 미트리거.

---


## ■ 인용 귀속 교정

- **RSA 2n+3**: Roetteler 2017이 ECC 논문임을 뒤늦게 확인. RSA logical-qubit 공식(2n+3)의 실제 출처는 **Beauregard 2003**, 자원 추정은 **Gidney-Ekerå 2019/2025**. 숫자와 공식은 불변, 귀속만 교정.
- **논문 인용 체인**: 기존에 "교수님 논문"으로 잘못 표기된 김의결·안혁(2025) 클레임을 제거. 인용 체인은 Beauregard + Roetteler + Gidney-Ekerå → Willsch → 본 프로젝트 순서로 재구성.

---

## Tech Stack

**프론트엔드** — React 19 · Vite 6 · TypeScript 5.9 strict · Tailwind CSS v4 · React Router 7 · zod · vite-plugin-pwa (PWA)

**동적 스캐너 백엔드** — Python 3.12 · FastAPI · sslyze 6.x · raw socket TLS 1.3 probe · Gemini 3.1 Flash Lite (google-genai)

**배포** — Vercel (정적 대시보드) · Railway (Docker 단일 이미지, 대시보드 + 스캐너 통합)

---

## 인용

- Beauregard, S. (2003). *Circuit for Shor's algorithm using 2n+3 qubits.* Quantum Information and Computation 3(2). [arXiv:quant-ph/0205095](https://arxiv.org/abs/quant-ph/0205095)
- Gidney, C., Ekerå, M. (2019). *How to factor 2048 bit RSA integers in 8 hours using 20 million noisy qubits.* Quantum 5, 433. [arXiv:1905.09749](https://arxiv.org/abs/1905.09749)
- Gidney, C. (2025). *How to factor 2048 bit RSA integers with less than a million noisy qubits.* [arXiv:2505.15917](https://arxiv.org/abs/2505.15917)
- Roetteler, M. et al. (2017). *Quantum resource estimates for computing elliptic curve discrete logarithms.* [arXiv:1706.06752](https://arxiv.org/abs/1706.06752) — ECC(타원곡선 이산로그) 공식. RSA 아님.
- Willsch, D. et al. (2023). *Large-Scale Simulation of Shor's Quantum Factoring Algorithm.* [Mathematics 11(19), 4222](https://www.mdpi.com/2227-7390/11/19/4222)
- Mozilla SSL Configuration v6.0 · NIST SP 800-52 Rev.2 · RFC 8996 · NIST FIPS 203 (ML-KEM)

---

> **Disclaimer** — 본 데이터는 강의 데모 목적입니다. 진단·감사·구매 의사결정에 사용하지 마십시오.  
> calibration scalar(22, 0.7)는 self-calibration이며 논문 직접 인용이 아닙니다. ordering-preserving 비교에만 유효합니다.
