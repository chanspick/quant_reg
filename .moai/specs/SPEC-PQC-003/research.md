# SPEC-PQC-003 기반 리서치 — PQC Compliance Report 섹션별 근거

> **출처**: chan 작성 + MoAI 리서치 워크플로우(시장·규제·경쟁사·수익모델) 교차 검증.
> **용도**: SPEC-PQC-003 의 측정 근거·인용 표준·구현 메모. 발표 슬라이드 인용 자산.
> **인용 번호 [n]**: 본 문서 하단/각 섹션의 출처를 가리킨다(원 리서치 캡처 기준).

***

## ① 종합 판정 (헤더)

종합 판정은 하위 4축(②)의 가중 평균으로 산출. 상용 스캐너 관행은 **0~100 점수 + 알파벳 등급** 병행(KF-Cipher Post-Quantum Readiness Checker, PostQ "52/100 – High Risk"). [1][2]

정직성 배지:
- **measured**: TLS 핸드셰이크·인증서 체인·서버 응답 직접 계측값
- **estimated**: BGP/RIR 등 간접 추론값 (NIST SP 800-57 — 계측 불가 영역은 추정 구분 표기 권장) [3]

등급 컷오프(채택): A ≥ 85, B 70–84, C 55–69, D 40–54, F < 40. TLS 1.0/1.1 지원 시 상한 캡(SSL Labs 방식, 최대 B). [4]

## ② 4축 스코어카드

| 축 | 측정 대상 | 핵심 표준 |
|---|---|---|
| TLS 위생 | TLS 버전·cipher·HSTS | Mozilla TLS Config, PCI DSS, NIST IR 8547 |
| 하이브리드 KEM | X25519MLKEM768 협상 | FIPS 203(ML-KEM), RFC 9180 |
| 인증서 운영 | RSA/ECDSA·키 길이·만료·CT | NIST IR 8547, CA/Browser Forum |
| 양자위협 노출 | RSA/ECC 잔존 → Shor 취약 | NIST IR 8547, CNSA 2.0 |

- TLS 1.0/1.1: PCI DSS "strong cryptography" 불인정, SSL Labs B-cap(2020~). [5][4]
- TLS 1.3: 하이브리드 PQC KEM 유일 기반. 2026.4 웹 트래픽 약 60~67% PQ 암호화. [6]
- 취약 cipher: RC4, 3DES, export, DH-1024. [7]
- FIPS 203(ML-KEM) 2024.8.13 최종 확정. [8][3] 배포: `X25519MLKEM768`(X25519+ML-KEM-768 하이브리드). [3]
- 2026.2 상위 100만 도메인 41%가 X25519MLKEM768 지원. [9]
- Apple iOS 26(2025.9) 이후 Cloudflare PQ 트래픽 29%→52% — 서버 미지원 시 협상 불가 → 서버 지원 여부가 핵심 측정점. [10]
- NIST IR 8547: RSA-2048(112-bit) → 2030 deprecated, 2035 disallowed. ECC P-256 동일. [11][12][13]
- CA/Browser Forum: 인증서 최대 유효기간 398일.
- CycloneDX CBOM 1.6(2024.4)부터 X.509 인증서를 cryptographic-asset 으로 표현. [14][15]

## ③ 벤치마크 위치

"업계 표준" ❌ → **"주요 대기업 N개 비교군 대비 위치"** ✅ (정직성+학술 방어력).

```
sorted = benchmark_set 를 4축 합산 점수 오름차순 정렬
rank = target 점수보다 낮은 도메인 수
percentile = rank / len(sorted) × 100
→ "전체 N개 비교군 중 상위 X% / 하위 Y%"
```

- 2025.6 상위 100만 도메인 중 8.6%만 하이브리드 PQC KEM 지원 → 섹터 구분 필수. [16]
- 비교군에서 target 보다 높은 동종 도메인 나열 → "토스·IBK 이미 전환" 자동 생성(peer pressure).
- 글로벌 기준점: Cloudflare 서버측 PQC ~100%(2022~) [17], 상위 100만 평균 ~41%. [9]

## ④ 핵심 발견 (측정 증거 + 인용)

| 발견 | 인용 | 심각도 |
|---|---|---|
| TLS 1.0/1.1 활성 | PCI DSS 6.4.3 [5], Mozilla 2020 | High |
| RC4·3DES·DH-1024 | NIST SP 800-131A, Mozilla | High |
| PQC KEM 미협상 | FIPS 203, NIST IR 8547 [13] | Med-High |
| RSA-2048 사용 | NIST IR 8547(2030 deprecated) [12] | Medium |
| 인증서 만료 임박 | CA/Browser Forum, PCI DSS 4.0 12.3.2 | High |
| TLS 1.3 미지원 | CNSA 2.0(웹서버 2025 preferred) [18] | Medium |

증거 출처: TLS 핸드셰이크 원시 데이터, X.509 SubjectPublicKeyInfo 파싱, ServerHello `supported_groups` 의 X25519MLKEM768(0x11ec). [10]

## ⑤ 양자 위협 노출 (HNDL)

HNDL = 현재 암호문 수집·저장 → 미래 양자컴퓨터로 복호화. NSA 2021 "이미 수집 중" 경고. CRQC 없어도 인터셉트+저장만으로 작동. [19][20]

| 출처 | 예상 Q-Day | 근거 |
|---|---|---|
| Gidney & Ekerå 2019 | — | RSA-2048: 20M 물리큐비트/8h |
| **Gidney 2025.5** [21][22] | 2030±3 설득력↑ | **1M 물리큐비트/1주 — 95%↓** |
| RAND 2023 [23] | 2028~2033 | 10분~6년 분포 |
| HNDL 학술 2025 [24] | 2030±3 | 의료기록 98-100% 파괴확률 |
| CSA 노트 2026 [25] | 2028~2030 | 대기업 마이그 12-15년 → 3-5년 취약창 |

**Mosca 부등식**: X(기밀 유지 기간) + Y(마이그 소요, 대기업 12~15년 [26][27]) > Z(Q-Day까지 잔여, 보수 10~15년) ⟹ **지금 시작**.

리포트 표현: "RSA-2048 인증서가 지금 수집·저장될 수 있음. Q-Day(Gidney 2025: ~1M큐비트, 2030±3) 이후 복호화 가능. 데이터 보존 7년+ 면 이미 노출 구간."

## ⑥ 규제 컴플라이언스 매핑 (CP의 알맹이)

| 규제 | 대상 | 핵심 데드라인 | 비고 |
|---|---|---|---|
| 한국 PQC 마스터플랜(2023.7) [28][29] | 전 국가 인프라 | 2027 금융·우주 파일럿 / 2035 완료 | KISA+과기정통부 |
| KpqC 선정 [30] | 국내 시스템 | 2024 완료(HAETAE·AIMer·SMAUG-T·NTRU+) | NIST 병행 |
| 한국 파일럿 2026 [31][32] | 통신·금융·교통·국방·우주 | 2026 실시(금융: KSmartech×하나카드) | Dream Security 등 |
| NIST IR 8547 [11][12][13] | NIST 표준 사용 | 2030 deprecated / 2035 disallowed | NSM-10 이행 |
| CNSA 2.0(NSA) [33][34][18] | 미 NSS | 2027.1 신규조달 / 2030 비준수 퇴출 / 2035 전면 | 웹서버 2025 pref, 2033 excl |
| EU PQC 로드맵(2025.6.23) [35][36][37] | NIS2 대상 | 2025말 인벤토리 / 2026-27 하이브리드 / 2030 핵심인프라 | EC Recommendation |
| CISA 조달(2026.1) [38] | 미 연방 | 즉시 PQC 지원 제품만 | 2025 EO |
| PCI DSS | 카드결제 | TLS 1.0/1.1 금지(현행) [5] | PQC 요건 2025~27 개정예고 |

금융: 한국 2027 파일럿→2035 완료, 2026 하나카드 결제 PQC 전환. FSC/FSS 고시는 2025~26 준비 단계. EU 금융은 DORA+NIS2 교차, 2030 고위험 완료. [32][39][40][35]

```python
sector_map = {
  "finance":   {"korea":2027,"nist":2030,"cnsa":2027,"eu":2030},
  "telecom":   {"korea":2026,"nist":2030,"cnsa":2026,"eu":2030},
  "healthcare":{"korea":2025,"nist":2030,"cnsa":2030,"eu":2030},
}
effective_deadline = min(sector_map[sector].values())
```

## ⑦ 액션플랜

| 단계 | 기간 | 핵심 액션 | 근거 |
|---|---|---|---|
| 즉시 | 0~3개월 | 암호 인벤토리 / TLS 1.0·1.1 off / RSA-1024·DH-1024 제거 / 만료임박 갱신 | EU 2025말 인벤토리 [36], ISACA Q1 [41] |
| 단기 | ~2027 | TLS 1.3 전면 / X25519MLKEM768 배포 / ML-DSA 인증서 파일럿 / HSM PQC 확인 | CNSA 2.0 웹서버 2025 pref [18], EU 26-27 [36] |
| 중기 | ~2030 | ML-KEM 전용 전환 / CBOM 유지 / 공급망 PQC 로드맵 / 규제 제출 문서 | NIST IR 8547 2030 [13], CNSA 2030 [33] |

마이그레이션 소요: 소기업 5~7y / 중견 8~12y / 대기업 12~15y+ [26][27], Moody's 10~15y [25]. → 2030까지 ~4년, 대기업 이미 지연. 이 계산이 긴급성 서사 핵심.

LLM 요약 프롬프트: system="PQC 컨설턴트. 3문단(현재상태/왜지금/즉시 3액션)", user=scan_result_json.

## ⑧ CBOM 내보내기 (CycloneDX 1.6/1.7)

CBOM = 암호 자산(알고리즘·프로토콜·인증서·키) 목록 표준. [42][15]
- CycloneDX 1.6(2024.4) CBOM 정식 지원 [43][14] → ECMA-424(2024.7) 표준 채택 [14] → 1.7(2025.10) 강화. IBM Research 초안 → OWASP. [44]
- 규제 연결: NIST SP 1800-38B(draft) CBOM 표준산출물 [15], EU CRA·EO 14028 SBOM 의무(CBOM은 하위) [15], BSI TR-03183 [15], IBM 노트는 CBOM으로 CNSA 2.0 준수 자동평가. [44]

도메인 스캔 → CBOM 변환(예시):
```json
{ "bomFormat":"CycloneDX","specVersion":"1.6","components":[
  {"type":"cryptographic-asset","cryptoProperties":{"assetType":"protocol",
    "protocolProperties":{"type":"tls","version":"1.3","cipherSuites":["TLS_AES_256_GCM_SHA384"],
      "ikev2TransformTypes":[{"type":"KEM","algorithmRef":"X25519MLKEM768"}]}}},
  {"type":"cryptographic-asset","cryptoProperties":{"assetType":"certificate",
    "certificateProperties":{"subjectPublicKeyAlgorithm":"RSA","keyLength":2048,
      "signatureAlgorithm":"SHA256WithRSA","notValidAfter":"2026-09-30"}}}
]}
```
무료 = "RSA-2048 사용 중" 텍스트. 유료 = 위 JSON 다운로드(규제 제출·내부감사). 유료 전환 핵심 가치.

## 비즈니스 모델 (SecurityScorecard 벤치마크)

A~F 등급 레이팅, 88만+ 다운로드. Free(자사 스코어카드)/Business(VRM·모니터링)/Enterprise(API·보험)/UK Gov(£500~2,000/년). [45][46][47] PQC CP 리포트 포지셔닝: Vanta/Drata(SOC2 자동화, ACV $1~3만) 같은 컴플라이언스 자동화의 PQC 버티컬 — CBOM JSON + 규제 매핑 + 시계열 모니터링이 유료 핵심.

## 리서치 한계 (정직성)

1. 한국 금융 PQC 직접 고시 미확정(2026 기준 준비 단계, 마스터플랜 수준만). [28][48]
2. Q-Day 불확실 — Gidney 2025는 물리큐비트 기준, fault-tolerant 등장은 2028~2033 분산. [21][25]
3. 벤치마크 ~50개는 "대기업 비교군"이지 통계적 업계표준 아님 → 화면 명시 필수.
4. ML-DSA 인증서 공개 CA 발급은 2026 초기단계 → "ML-DSA 인증서 없음"은 현재 정상 범주(감점 아님).
