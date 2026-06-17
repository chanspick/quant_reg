# 강의 개념 ↔ 측정 결과 매핑 (발표용 정리)

> 양자컴퓨팅 강의에서 다룬 개념과 PQC 준비도 스캐너의 측정 결과를 매핑한 정리.
> **사이트 UI 컴포넌트로는 구현하지 않음** — 발표 슬라이드 작성 및 구두 설명 시 참조 자료.
> 기존 `presentation-notes.md`(결과 트랙) + `presentation-making-story.md`(메이킹 트랙) 의 슬라이드 본문에 끼워 쓰는 보조 풀.
>
> **문서 버전**: 0.1.0 · **작성일**: 2026-06-14 · **데이터 기준**: domains.json v0.6.0-phase2-pqc-merge+recs (n=47)

---

## 1. 강의별 핵심 개념 (압축)

| 강의 | 핵심 개념 | 측정 매핑 |
|---|---|---|
| L1 | 디랙 브라-켓, 큐비트 중첩 a\|0⟩+b\|1⟩, 측정 붕괴, Bloch sphere, Pauli X/Y/Z, Hadamard, 위상 게이트 (R_Z, S, T) | (메타 박스) |
| L2 | 텐서곱, 얽힘, Bell 상태, 다중 큐비트 게이트 (SWAP, CNOT, CZ, Toffoli, Fredkin) | (메타 박스) |
| **L3** | **No-Cloning, Superdense Coding, Teleportation, 확률 vs 양자(간섭), 위상 킥백, Grover 진폭 증폭, Deutsch-Jozsa, Simon (Shor 영감)** | **AES cipher (Grover), 모든 인증서 (Simon→Shor 영감)** |
| **L4** | **QFT (단위근 → 회로 분해), 위상 추정, 주기/차수 찾기, GCD/확장 유클리드, 모듈러 거듭제곱, Shor 인수분해** | **RSA-N/ECC-N 인증서 → Shor 다항 분해** |
| **L5** | **Grover 평균 반전, 진폭 증폭 일반화, 양자 카운팅 (해 개수)** | **AES-128/256 cipher → √N 시간** |
| L6 | Schmidt 분해, 부분대각합, 축약 밀도연산자, 충실도 (fidelity) | (calibration 한계 박스 참고) |
| L7 | VQE/QAOA, CVaR, 6 CO 문제 (포트폴리오 등) | — (다른 영역) |
| L8 | 슈뢰딩거, 유니터리, 밀도연산자(자기수반·준양정·trace 1), 양자 단층촬영 | (메타 박스) |
| L9 | 경험분포, PCA, SDR (Li & Duan 1989) | — (다른 영역) |
| **워크숍** | **NISQ→FTQC 로드맵, 물리/논리 큐비트, IBM/IonQ, 양자 밸류체인, PoC 검증** | **모든 도메인 (시간축 컨텍스트)** |

**메인 4 강의: L3 · L4 · L5 · 워크숍**. L1·L2·L6·L8 은 메타 박스에 한 줄씩, L7·L9 는 발표에 포함하지 않음 (강의 다뤘다고 무리해서 끼우면 평가 손해).

---

## 2. 측정 트리거 → 강의 개념 매핑 표

| 측정 트리거 | 발화 카드 | 강의 출처 | 페이퍼 |
|---|---|---|---|
| RSA-N 또는 ECC-N 인증서 (거의 모든 도메인) | 1. Shor | L4 (메인), L3 Simon (영감) | RSA: Beauregard 2003·Gidney-Ekerå 2019/2025 / ECC: Roetteler 2017 / Willsch 2023 / 김의결·안혁 2025 |
| AES cipher (TLS 표준이라 사실상 항상) | 2. Grover | L3 진폭 증폭, L5 KLM 일반화 | — |
| TLS 1.0/1.1 활성 OR non-PFS cipher | 3. HNDL | 워크숍 (시간축), 김의결·안혁 (한국 동기) | 김의결·안혁 2025 |
| Phase 2 SUPPORTED (X25519MLKEM768) | 4. 하이브리드 KEM | 워크숍 (PQC 표준화) | NIST FIPS 203 |
| 전체 컨텍스트 (시간축) | 5. NISQ→FTQC | 워크숍 (메인), L6 충실도 (구현 신뢰도) | Roetteler 2017, Willsch 2023 |
| 모든 도메인 (정직성) | 6. Calibration 한계 | L6 충실도 (개념 빌림) | 김의결·안혁 2025 |

---

## 3. 카드 6개 (발표 슬라이드 본문용)

### 카드 1: Shor 알고리즘 — 인증서 위협의 근원

**강의 출처**: Lecture 4 (메인), Lecture 3 Simon (영감)
**발화 조건**: 모든 도메인 (RSA/ECC 인증서는 거의 100%)

**본문**:
- 이 도메인의 인증서: **RSA-2048** (또는 ECC-256)
- Shor 알고리즘은 modular exponentiation `f(x) = a^x mod N` 의 **주기 r** 을 찾는 문제로 환원
- 주기 찾기 = **QFT 기반 위상 추정** (L4) — 고유값 `e^(2πiφ)` 의 위상 φ 에서 r 추출
- r 을 얻으면 `gcd(a^(r/2) ± 1, N)` 으로 N=pq 의 약수 복원 (확장 유클리드, L4)
- **다항 시간** → 고전 대비 지수 가속
- Simon 알고리즘이 영감 — L3 의 숨은 주기 찾기

**정량**:
- RSA-2048 분해에 필요한 logical qubits ≈ **2n + 3 = 4099** (Beauregard 2003; 자원 추정 Gidney-Ekerå 2019/Gidney 2025)
- ECC-256: logical qubits ≈ **9n + 2⌈log₂(n)⌉ + 10 ≈ 2330** (Roetteler 2017, Table 1)
- Aer 시뮬레이션 N=15·21 재현 (Willsch 2023)

**왜 양자 위협 축 점수가 낮은가**:
- `score = clip(0, 100, log10(qubits/100) × 22 × (1 − 성공률 × 0.7))`
- RSA-2048 → 약 20-30점 (보수 시나리오 성공률 0.04)

**인용**:
- Beauregard, S. (2003) "Circuit for Shor's algorithm using 2n+3 qubits" — arXiv:quant-ph/0205095 (RSA 2n+3 회로)
- Gidney, C. & Ekerå, M. (2019) "How to factor 2048 bit RSA integers in 8 hours using 20 million noisy qubits" — arXiv:1905.09749 (RSA 자원 추정)
- Gidney, C. (2025) "How to factor 2048 bit RSA integers with less than a million noisy qubits" — arXiv:2505.15917 (RSA 자원 추정 갱신)
- Roetteler, M. et al. (2017) "Quantum resource estimates for computing elliptic curve discrete logarithms" — arXiv:1706.06752 (ECC 전용)
- Willsch, D. et al. (2023) "Large-Scale Simulation of Shor's Quantum Factoring Algorithm" — Mathematics 11(19), 4222
- 김의결·안혁 (2025) — 한국정보통신학회 2025 춘계

---

### 카드 2: Grover 진폭 증폭 — 대칭키 √속도

**강의 출처**: Lecture 3 (진폭 증폭), Lecture 5 (KLM 일반화)
**발화 조건**: 모든 도메인 (AES cipher 는 TLS 표준이라 사실상 항상)

**본문**:
- 이 도메인: **TLS_AES_128_GCM_SHA256** (또는 AES_256)
- Grover: 오라클로 정답에 위상 부여 → **평균에 대한 반전(inversion about the mean)** → 진폭 증폭 (L3·L5)
- 2차원 부분공간에서의 회전으로 해석 (L5)
- **N 개 후보 중 정답 찾기 = O(√N)** 시간

**대칭키 위협의 본질**:
- AES-128 brute force: 고전 2^128 → 양자 2^64 (실효 64-bit 보안 수준)
- AES-256 → 2^128 (여전히 안전)
- **대응: 키 길이 두 배** (AES-128 → AES-256 마이그레이션)

**왜 RSA는 다항·AES는 √인가**:
- Shor는 구조(주기 r) 발견 → 다항 가속
- Grover는 일반 탐색 → √ 가속 (Bennett 1997 lower bound)
- **양자 위협 비대칭의 원천** — RSA/ECC 는 즉각 위험, AES 는 키 길이로 대응 가능

**인용**:
- Grover, L.K. (1996) — `arxiv:quant-ph/9605043`
- Bennett, C.H. et al. (1997) "Strengths and Weaknesses of Quantum Computing" — SIAM J. Comput. (lower bound)

---

### 카드 3: HNDL (Harvest Now, Decrypt Later)

**강의 출처**: 워크숍 (시간축), 김의결·안혁 2025 (한국 PQC 동기)
**발화 조건**: TLS 1.0/1.1 활성 OR non-PFS cipher 검출

**본문**:
- HNDL = 양자 시대 이전에 암호문을 **수집해 두고** 양자 등장 후 해독하는 위협 모델
- 데이터의 **수명** 이 양자 우위 시점까지 도달하면 위험
- **PFS(Perfect Forward Secrecy)** 미적용 시: 단일 장기 키 노출 = 과거·미래 트래픽 모두 위험
- 의료 기록 · 금융 거래 · 외교 통신 등 **장수명 데이터** 가 표적

**측정 매핑**:
- TLS 1.0/1.1 활성 → HNDL 즉시 위험 (감점 −30/−20, RFC 8996 / Mozilla v6.0 / NIST 800-52)
- Non-ECDHE/DHE cipher → PFS 없음 (감점 −3/개, Mozilla forward secrecy)
- 이 도메인이 HNDL 위협에 노출되는 이유 = TLS 위생 축 감점의 직접 원인

**왜 지금 측정하는가**:
- NIST FIPS 203 (2024-08) 확정 1.5년차
- Chrome 124 (2024-04), Firefox 132 (2024-10) 기본 ON
- 그러나 한국 인프라의 PQC 협상 응답률 측정 공개 자료 부재 → 본 프로젝트의 측정 공백 충당

**인용**:
- Bernstein & Lange (2017) "Post-quantum cryptography" — Nature 549
- 김의결·안혁 (2025) — 한국정보통신학회 2025 춘계 (한국 PQC 동기)

---

### 카드 4: 하이브리드 KEM (NIST FIPS 203 ML-KEM)

**강의 출처**: 워크숍 (PQC 표준화)
**발화 조건**: Phase 2 SUPPORTED (X25519MLKEM768 협상 응답)

**본문**:
- Phase 2 raw TLS 1.3 ClientHello 에서 `supported_groups=[0x11EC]` 전송 → ServerHello 가 같은 그룹으로 응답
- **0x11EC = X25519MLKEM768** (IANA Named Groups)
- 구성: **ECDHE(고전 안전성) × ML-KEM-768(격자 기반 PQC)**
- 두 KEM 결과를 **HKDF로 결합** → 한쪽 깨져도 다른 쪽이 보호 (defense in depth)

**ML-KEM 기반**:
- Module-LWE (Module Learning With Errors) 문제 의존
- 격자에서의 짧은 벡터 찾기 어려움 = 안전성 근거
- Shor / Grover 모두 다항 가속 미발견 → 양자 시대에도 안전 (현재까지)

**왜 양자 마이그레이션 권고 패턴인가**:
- 단독 ML-KEM 전환 = 신규 표준의 미발견 결함 노출 위험
- 하이브리드 = 검증된 고전 + 후보 PQC = 점진적 마이그레이션
- Chrome/Firefox 기본 ON, Mozilla v6.0 권고

**측정 결과**:
- 한국 인프라 **24% (12/51)** 가 X25519MLKEM768 협상 응답
- CDN 레이어가 한국 PQC 도입 주도 신호

**인용**:
- NIST FIPS 203 (2024-08) — Module-Lattice-Based KEM
- draft-ietf-tls-ecdhe-mlkem
- IANA TLS Named Groups Registry

---

### 카드 5: NISQ → FTQC 로드맵 — 양자 위협의 시간축

**강의 출처**: 워크숍 (메인), Lecture 6 충실도 (구현 신뢰도)
**발화 조건**: 모든 도메인 (전체 시간축 컨텍스트)

**본문**:
- **NISQ (Noisy Intermediate-Scale Quantum)**: 현재 단계 — 수백~수천 noisy physical qubits, 게이트 오류율 ~10^-3
- **FTQC (Fault-Tolerant Quantum Computing)**: 양자 오류 정정으로 logical qubits 구축
- RSA-2048 분해 = **logical 4099 × physical overhead (~1000) = 수백만 physical qubits 필요**
- 현재 IBM Condor (1121 qubits, 2023), IonQ Forte (~36 qubits) — FTQC 까지 거리

**충실도(L6 fidelity)** 의 의미:
- 측정 결과 ρ 와 이상 상태 |ψ⟩ 의 근접도 = `F(ρ, |ψ⟩) = √⟨ψ|ρ|ψ⟩`
- 현재 NISQ 의 충실도는 깊은 회로에 부족 → Shor 풀 스케일 미달
- Aer 시뮬레이션은 noiseless / device noise 두 시나리오 (Willsch 2023)

**양자 우위 시점**:
- 보수 추정: 10-20년 (RSA-2048 깨짐 시점)
- 그러나 HNDL 위협 때문에 **지금** 측정 의미 있음 — 데이터 수명 ≥ 10년이면 즉시 위험

**Future Work — HNDL 시간축 모델**:
- `데이터 수명 × Q-day 추정` 결합으로 calibration scalar 교체
- IBM hardware roadmap / Microsoft Azure Quantum 활용

**인용**:
- IBM Quantum Roadmap 2033 (Condor 2023, Heron 2024, ...)
- Roetteler et al. (2017) — FTQC 자원 추정
- 워크숍 자료 — NISQ→FTQC

---

### 카드 6: 양자 위협 정량의 한계 (정직성)

**강의 출처**: Lecture 6 충실도 (개념 빌림), 자체 정직성 시스템
**발화 조건**: 모든 도메인 (정직성 시스템 일관 노출)

**본문**:
- 양자 위협 점수 공식: `clip(0, 100, log10(qubits/100) × 22 × (1 − 성공률 × 0.7))`
- **계수 22 와 0.7** = 정당화된 출처 없는 calibration scalar
- 따라서: **ordering-preserving 으로만 해석** — 두 도메인 점수 차이는 **상대 순위만** 의미
- 절대값은 **양자 깨짐까지의 시간·자원·확률 어느 것과도 직접 매핑되지 않음**

**왜 이런 한계가 있는가**:
- Roetteler 2017 logical qubit 추정 자체는 표준 인용 유효
- 0-100 정규화 = 시각화 편의를 위한 변환
- 시간축(언제) 또는 확률(얼마나) 의 의미 결정에는 추가 모델 필요

**Lecture 6 충실도 비유**:
- 양자 시뮬레이션의 fidelity 도 절대값보다 상대 비교에 유용
- "도메인 A의 fidelity 0.85 > B의 0.72" = 상대 순위, 절대 안전성 매핑 X

**Future Work**:
- `discrete grade v2` — 5-tier (pq-observed / hybrid-capable / classical-only / legacy / critical) 로 calibration scalar 폐기
- 또는 HNDL 시간축 모델 도입

**인용**:
- 김의결·안혁 (2025) — 한국정보통신학회 2025 춘계 (정직성·표본 한계 명시)
- SPEC-PQC-001 §8-A.13, §8-A.23 (정직성 정책)
- Methodology Page Section 4 (Calibration Disclosure)

---

## 4. 발표 슬라이드 끼움 가이드

### presentation-notes.md (결과 트랙, 7 슬라이드 / 10분)

| 슬라이드 | 끼울 카드 | 사용 방식 |
|---|---|---|
| 1. 표지 | — | — |
| 2. Problem (HNDL/NIST/한국 공백) | 카드 3 HNDL | 본문 1줄 인용 |
| 3. Method (4축 모델) | 카드 1 Shor, 카드 2 Grover | 양자 위협 축 설명 시 활용 |
| 4. Findings (24% 발견) | 카드 4 하이브리드 KEM | Phase 2 결과 해석 |
| 5. 데모 큐레이션 | — | (LG화학/네이버/카카오) |
| 6. 한계 + Future Work | 카드 5 NISQ→FTQC, 카드 6 Calibration | 정직성 마무리 |
| 7. Q&A | 전체 카드 | 청중 질문 대응 풀 |

### presentation-making-story.md (메이킹 트랙, 15 슬라이드 / 15분)

| 슬라이드 | 끼울 카드 | 사용 방식 |
|---|---|---|
| 1. 표지 | — | — |
| 2. HNDL × NIST × 한국 공백 | 카드 3 HNDL | 본문 핵심 |
| 3. 4축 모델 | 카드 1 Shor, 카드 2 Grover | 양자 위협 축 설명 |
| 4. 24% 발견 | 카드 4 하이브리드 KEM | Phase 2 결과 |
| 5-12. 메이킹 (바이브 코딩 핵심) | — | (강의 매핑 없음) |
| 13. 데모 큐레이션 | — | (LG화학/네이버/카카오) |
| 14. enum 버그 회고 | — | (정직성 시스템 실증) |
| 15. 결론 + Future Work | 카드 5 NISQ→FTQC, 카드 6 Calibration | 정직성 마무리 |

### 동적 스캐너 라이브 데모 (발표 중)

스캐너 결과 페이지의 **점수 근거(Section 2)** 를 보여주면서 **구두로** 강의 매핑 설명:
- "이 도메인 RSA-2048 → Shor 알고리즘으로 다항 분해 가능. 강의 4주차 위상 추정."
- "이 도메인은 Phase 2 SUPPORTED → 격자 기반 ML-KEM, NIST FIPS 203."

---

## 5. 인용 페이퍼 ↔ 카드 매핑

| 페이퍼 | 활용 카드 | 강의 출처 |
|---|---|---|
| **김의결·안혁 (2025)** "Shor 알고리즘의 기존 암호체계에 미치는 영향과 양자내성암호의 대응 전략" 한국정보통신학회 춘계 | 1, 3, 6 | 강의 송부 (이론 프레임) |
| **Roetteler et al. (2017)** "Quantum resource estimates for computing elliptic curve discrete logarithms" arXiv:1706.06752 | 1, 5 | 강의 (Shor 후속) |
| **Willsch et al. (2023)** "Large-Scale Simulation of Shor's Quantum Factoring Algorithm" Mathematics 11(19), 4222 | 1, 5 | 강의 (Shor 실증) |
| NIST FIPS 203 (2024-08) | 4 | 워크숍 (PQC 표준화) |
| Mozilla SSL Config v6.0 / RFC 8996 / NIST SP 800-52 / OWASP | 3 | (TLS 위생 표준) |
| draft-ietf-tls-ecdhe-mlkem / IANA Named Groups | 4 | (PQC TLS 표준) |
| Grover (1996), Bennett (1997) | 2 | 강의 (Grover) |

---

## 6. 발표 운영 메모

- **카드 6개 전부를 슬라이드에 박지 않음** — 슬라이드는 결과·메이킹 중심, 카드 6개는 구두 + Q&A 풀
- **Q&A 부록**: `presentation-notes.md` 의 Q&A 5개 + 카드 6개 = 11개 청중 질문 대응 풀
- **시연 중 라이브 데모**: 점수 근거 화면에서 구두로 카드 1·2·4 활용
- **calibration 한계 카드 6 은 반드시 1회 명시** — 양자 위협 축 점수의 해석 한정. 정직성 시그널

---

*문서 끝. SPEC-PQC-002 (동적 스캐너) 의 결과 페이지에는 카드 UI 비포함 결정 — 발표 자료에서만 활용.*
