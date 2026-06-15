# 발표 준비 노트 — PQC 준비도 스캐너

> 양자컴퓨팅 강의 기말 프로젝트 발표용. 본 문서는 슬라이드 초안 + 데모 큐레이션 + 한계 인정 텍스트를 한 곳에 정리한 발표 보조 자료입니다. PPT/Keynote/Marp/Slidev 어느 도구로든 옮길 수 있는 마크다운 형식.

---

## 슬라이드 1: 한 줄 메시지 (발표 첫 슬라이드)

```
기존 도구로는 보이지 않는 한국 웹의 PQC 전환.

측정 방법을 바꾸면 0%가 아니라 24%다.
```

**Speaker note**:
- sslyze 같은 업계 표준 스캐너로 51개 도메인 측정 시 ML-KEM 협상 0건
- raw socket + struct 로 TLS 1.3 ClientHello 직접 조립하면 12개 (24%) 가 X25519MLKEM768 협상 응답
- 이 프로젝트의 진짜 발견은 "한국이 PQC 전환에 얼마나 늦었나" 가 아니라 "기존 측정 방법이 PQC 도입 신호를 놓치고 있다" 는 것

---

## 슬라이드 2: 문제 (Background)

- **HNDL (Harvest Now, Decrypt Later)**: 양자 컴퓨터 등장 이전에 암호화된 데이터를 수집해 두고, 양자 시대에 해독하는 위협
- **NIST PQC 표준 확정 (2024-08)**: FIPS 203 (ML-KEM) / 204 (ML-DSA) / 205 (SLH-DSA)
- **브라우저·CDN 기본값 활성화**: Chrome 124 (2024-04), Firefox 132 (2024-10), Cloudflare 기본 ON
- **그런데 한국 인프라는?** — 측정해 본 사람이 없었음

---

## 슬라이드 3: 측정 방법 (Method)

**4축 측정 모델** (모두 자동 측정·계산):

| 축 | 도구 | 표준 인용 |
|----|------|-----------|
| TLS 위생 | sslyze 6.x | RFC 8996 / Mozilla v6.0 / OWASP / NIST 800-52 |
| 하이브리드 KEM | **raw socket TLS 1.3 probe** | IANA Named Groups 4588, draft-ietf-tls-ecdhe-mlkem |
| 인증서 운영 | sslyze | Mozilla v6.0 |
| 양자 위협 정량 | Roetteler 2017 + Willsch 2023 계산 | arXiv:1706.06752, doi:10.3390/math11194222 |

**Phase 2 핵심 구현**: 외부 PQC 라이브러리 의존성 0. `socket` + `struct` 만으로 ClientHello 조립, `supported_groups=[0x11EC]` + 빈 `key_share` 전송 → ServerHello/HRR 의 `selected_group` 관찰.

---

## 슬라이드 4: 발견 (Findings)

**Phase 2 probe 결과 (n=51)**:
- ✅ SUPPORTED **12개 (24%)** — X25519MLKEM768 협상 응답 (HRR 또는 ServerHello key_share)
- ❌ NOT_SUPPORTED 23개 (45%) — 명시적 `alert(handshake_failure)`
- ⚠ ERROR_NETWORK 16개 (31%) — TCP RST / DNS block / SNI 차단 (공공·금융 다수)

**섹터별 PQC 채택 (SUPPORTED 12개의 분포)**:
- 반도체/전자: LG이노텍, 삼성SDI, 삼성바이오 — 4개
- 자동차: 현대자동차, 기아 — 2개
- 화학/에너지: LG화학, 한국전력공사, 두산 — 3개
- IT/플랫폼: 네이버 — 1개
- 통신: LG U+ — 1개
- 증권: 미래에셋, 게임: 크래프톤 — 2개

**동일 그룹 내 격차 (CDN/edge 정책 분산화 가설)**:
- 삼성전자 (NOT_SUPPORTED) ↔ 삼성SDI/바이오 (SUPPORTED)
- SKT/KT (NOT_SUPPORTED) ↔ LG U+ (SUPPORTED)
- → CDN/edge 레이어가 PQC 채택의 실질적 게이트키퍼

---

## 슬라이드 5: 데모 — 3개 카테고리

### 모범 사례: **LG화학** (화학/에너지)
- TLS 92 / KEM 100 / certOps 100 / quantumThreat 23
- Phase 2 SUPPORTED, RSA-2048 수동 갱신
- **메시지**: 4축 중 3축이 90+. 양자 시대 대비 + 클래식 위생 모두 우수한 드문 사례

### 엇갈리는 신호: **네이버** (IT/플랫폼)
- TLS **10** / KEM 100 / certOps 85 / quantumThreat 20
- Phase 2 SUPPORTED, ECC-256, 분기 자동 갱신
- **메시지**: 한국 IT 1위 포털이 PQC 협상에는 응답하지만 TLS 위생 (TLS 1.0/1.1, CBC cipher 잔존) 은 미흡
- **인사이트**: CDN 단 PQC 적용이 service-level TLS 위생을 자동 보장하지 않는다. PQC 와 클래식 보안은 별개로 관리되어야 함

### 전 영역 미흡: **카카오** (IT/플랫폼) 또는 **다음**
- TLS 0 / KEM 15 / certOps 65 / quantumThreat 23
- Phase 2 NOT_SUPPORTED, RSA-2048 수동 갱신
- **메시지**: 같은 섹터 1위 포털 (네이버) 과의 대조. NIST FIPS 203 확정 (2024-08) 이후 한국 메신저 1위 기업의 PQC 전환 의지 점검 필요

**큐레이션 원칙**: 47개 전체보다 3개 도메인을 깊게 보여주는 게 임팩트 큼. 실명 vs 익명 (`A화학기업` / `B포털` / `C포털`) 은 발표 컨텍스트에 따라 선택.

---

## 슬라이드 6: 한계 (Limitations) — 본인이 먼저 짚기

본 슬라이드가 발표의 결정적 한 장입니다. 평가자가 한계를 잡아내기 전에 본인이 먼저 명시 → "본인이 인지하고 있음" 으로 자동 재분류됩니다.

| # | 한계 | Future Work |
|---|------|-------------|
| 1 | Calibration scalar (22, 0.7) — `scanner/roetteler.py:96` 한 줄에 박혀있는 self-calibration. 정당화 논문 없음, ordering-preserving 측정으로만 해석 | 발표 이후 discrete grade v2 로 마이그레이션 — 0-100 연속 점수 → A/B/C/D/F 5-tier 또는 분위수 정규화 (self-calibration scalar 의존 제거) |
| 2 | narrative / 공급망 메모 수동 작성 미완 (placeholder 47/47) | LLM 검증 파이프라인 (도메인별 자동 분석 + 사람 검증 게이트) |
| 3 | HNDL 시간축 미반영 — 정적 점수만, decrypt-later 임계 미모델링 | 데이터 수명 × Q-day 추정 결합 모델 (Microsoft Azure Quantum / IBM hardware roadmap 활용) |
| 4 | Supply chain 자동 측정 불가 — HW/펌웨어/HSM 영역 측정 안 됨 | CDN/CA 의존성 자동 그래프 + HSM 벤더 PQC 로드맵 트래킹 |
| 5 | 표본 한계 (n=47~51) — 한국 인프라 전체로 일반화 불가 | 1000+ 도메인 스캔 + 시계열 변화 추적 (월간 batch) |
| 6 | 외부 probe 차단 16개 — 보안 감사·외부 평가 자체가 어려움 | 내부 측정 협업 또는 passive 측정 (CT log, TLS 통계) 보강 |

**Speaker note**: 6개 한계 중 1·2·3·4 는 발표용 4줄로 충분. 5·6 은 청중 질문 시 답변용 보조.

---

## 슬라이드 7: 결론 (Conclusion)

1. **방법론 기여**: sslyze 같은 표준 도구가 놓치는 PQC 신호를 raw TLS 1.3 직접 측정으로 발견. 24% vs 0% 의 차이가 측정 방법론 자체에서 나옴
2. **데이터 발견**: 한국 인프라의 PQC 전환은 CDN/edge 레이어가 주도. 동일 그룹 내 도메인 격차가 그 가설을 뒷받침
3. **정직성 시스템**: 모든 데이터에 `source` 라벨 (automated / manual / llm+verified / llm-only) + calibration scalar 의 한정 명시 + placeholder 자동 unmount. 학부 데모지만 평가 자료로서 책임 의식
4. **재현 가능성**: Python 측정 엔진 + TypeScript 검증 파이프라인 모두 open source 구조. 누구나 47개 도메인을 다시 측정 가능

---

## 부록: 자주 받을 질문 (Q&A 준비)

**Q1. 22 와 0.7 은 어디서 나왔나요?**
- A. 정당화된 출처 없는 calibration scalar 입니다. Methodology 페이지 Section 4 에 명시했듯이 ordering-preserving 측정으로만 해석합니다. Roetteler 2017 인용은 logical qubit · Toffoli gate 계산까지 유효하며, 0-100 정규화 자체는 도메인 간 상대 순위만 의미합니다. Future Work 로 discrete grade 마이그레이션을 계획하고 있습니다.

**Q2. 왜 47/51 개 도메인만 측정 가능했나요?**
- A. 4개 도메인 (현대모비스·현대글로비스·HL만도·신한은행) 은 sslyze 자체가 거부합니다 — WAF 또는 금융권 보안 정책. Phase 2 raw TLS 1.3 probe 는 추가로 16개 도메인이 차단합니다 (공공·금융 다수). 차단 자체가 정보 — "외부 보안 감사가 불가능한 상태" 로 별도 카테고리화했습니다.

**Q3. PQC 가 진짜 양자 컴퓨터를 막을 수 있나요?**
- A. 본 프로젝트의 양자 위협 점수는 결정적 (deterministic) 계산입니다. ML-KEM 등 NIST PQC 표준은 Shor 알고리즘으로 다항시간 내 깨지지 않으므로 두 시나리오 모두 점수 100 으로 산출됩니다. 다만 PQC 자체의 수학적 안전성 (예: lattice 문제의 양자 hardness) 은 활발한 연구 영역이며, NIST 도 4개 알고리즘을 동시에 표준화한 이유가 알고리즘 다양성 확보입니다.

**Q4. 합성 데이터 vs 실측 데이터 비율은?**
- A. 4축 점수 + 인증서 메타 + Phase 2 PQC probe + 자동 finding + 자동 권고 — 전부 실측·자동 계산 (`source: automated`). narrative · 공급망 메모 · 규제 갭은 placeholder 또는 비어있음 — 자동 측정 한계로 분리 보존. SourceChip 으로 모든 필드의 출처가 시각적으로 구분됩니다.

**Q5. 왜 강의 프로젝트인데 이렇게 깊이 갔나요?**
- A. 교수님 논문 (김의결·안혁 2025) 이 양자 위협의 이론적 측면을 다뤘다면, 본 프로젝트는 Roetteler 2017 의 리소스 추정 공식과 Willsch 2023 의 최신 시뮬레이션 결과를 한국 50개 실제 인프라에 적용하는 게 목표였습니다. 이론 → 측정 → 정량 의 한 단계 더 나아간 적용입니다.

---

## 부록: 발표 시간 배분 (10분 기준)

| 시간 | 슬라이드 | 핵심 |
|:----:|:--------:|------|
| 0:00 | 1 | 한 줄 메시지 — "0% 가 아니라 24% 다" |
| 0:30 | 2 | HNDL + NIST 표준 + 그런데 한국은? |
| 1:30 | 3 | 4축 모델 + Phase 2 직접 구현 (사진/다이어그램 1장) |
| 3:00 | 4 | 24% 발견 + 섹터 분포 + CDN 가설 |
| 5:00 | 5 | 데모 3개 (LG화학 / 네이버 / 카카오) — 라이브 dashboard 또는 스크린샷 |
| 7:30 | 6 | **한계 4줄 + Future Work 4줄** — 본인이 먼저 짚기 |
| 9:00 | 7 | 결론 (방법론 기여 + 데이터 발견 + 정직성 + 재현 가능성) |
| 9:30 | Q&A | (위 부록 활용) |

---

*문서 버전: 0.1.0 · 작성일: 2026-05-24 · 데모 데이터: domains.json v0.6.0-phase2-pqc-merge+recs (n=47)*
