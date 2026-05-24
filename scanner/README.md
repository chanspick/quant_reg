# scanner/ — PQC 준비도 측정 엔진 (Python)

본 모듈은 한국 도메인 47~50개를 sslyze 로 자동 측정하여, 4축 점수 모델의 자동 측정 부분 (`tls` / `certOps` / `quantumThreat`)을 채운다. **`hybridKem` 축은 sslyze 한계로 거의 항상 30점**으로 측정되며, 진짜 측정은 Phase 2 (직접 PQC 클라이언트, 미착수) 가 채울 영역.

## 빠른 시작

```bash
pip install -r scanner/requirements.txt
```

### 단일 도메인 (라이브)

```bash
python -m scanner.measure --hostname www.naver.com --name 네이버 --sector IT/플랫폼
# scanner/out/naver_com.partial.json + naver_com.meta.json 생성
```

### 기존 sslyze JSON 재처리 (스코어만 재계산)

```bash
python -m scanner.measure --from-json scanner/out/naver.json --name 네이버 --sector IT/플랫폼
```

### 50개 batch

```bash
python -m scanner.measure --batch scanner/domains.csv --batch-out scanner/out/staged-domains.json
# 약 5~10분. sslyze 내부 동시성 사용.
# 끝나면 scanner/out/staged-domains.json + *.meta.json × N + batch-errors.json
```

batch 후 zod 검증:

```bash
cp scanner/out/staged-domains.json public/data/domains.json
pnpm validate-data
```

## 산출물 구조

| 파일 | 용도 |
|------|------|
| `out/{host}.partial.json` | `DomainSchema` 호환 partial 레코드. `narrative` / `supplyChainNotes` 는 `TODO` placeholder. |
| `out/{host}.meta.json` | 감점 trace (룰별 발화 여부 + 점수 breakdown) — v2 보정 분석용. |
| `out/staged-domains.json` | batch 모드 누적 envelope (`{lastUpdated, version, domains[]}`). |
| `out/batch-errors.json` | batch 모드 실패 도메인·사유. |

## v1 점수 공식 (표준 인용)

모든 룰은 `scoring.py` 의 `_TLS_RULES` / `_CERTOPS_RULES` 리스트에 출처와 함께 박혀있다.

### TLS 위생 (시작 100, 감점 합산 → clamp 0-100)

| 룰 | 감점 | 출처 |
|---|---:|---|
| TLS 1.0 활성 | −30 | RFC 8996 / Mozilla intermediate / NIST 800-52 |
| TLS 1.1 활성 | −20 | RFC 8996 / Mozilla intermediate / NIST 800-52 |
| TLS 1.3 미지원 | −25 | Mozilla intermediate v6.0 / NIST (2024+) |
| TLS 1.2 미지원 | −10 | Mozilla intermediate 최소 |
| Non-AEAD cipher (TLS 1.2) | −2/개 | Mozilla / OWASP |
| Non-ECDHE/DHE cipher (TLS 1.2) | −3/개 | Mozilla forward secrecy |
| CBC mode cipher (TLS 1.2) | −2/개 | OWASP "prioritize GCM" |
| TLS Compression (CRIME) | −15 | OWASP must-disable |
| `TLS_FALLBACK_SCSV` 미지원 | −5 | OWASP |
| Heartbleed / ROBOT / CCS Injection | −50 each | CVE-2014-0160 / 2017 / CVE-2014-0224 |
| Insecure Renegotiation | −20 | CVE-2009-3555 |

### 인증서 운영 (certOps)

| 룰 | 감점 | 출처 |
|---|---:|---|
| 만료됨 | −75 | trivial |
| 만료 임박 (≤30일) | −25 | 운영 위생 |
| 수명 > 366일 | −20 | Mozilla v6.0 최대 |
| 체인 / Leaf SHA-1 | −25 each | OWASP / NIST |
| Leaf MD5 | −50 | OWASP must-not |
| 체인 길이 ≤1 (불완전) | −25 | TLS 신뢰 끊김 |
| 체인 길이 > 4 (과도) | −10 | 위생 |
| OCSP Stapling 미설정 / 미신뢰 | −15 | Mozilla recommended |
| RSA < 2048 bit | −30 | Mozilla minimum |
| ECC 곡선 비표준 | −5 | Mozilla intermediate (prime256v1/secp256r1/secp384r1/secp521r1/X25519 외) |

### 하이브리드 KEM (Phase 1 fallback + Phase 2 우선)

**Phase 2 probe 결과가 있으면 그 값으로 덮어쓰기**. 그 외 fallback:

| 조건 | 점수 | 결정 단계 |
|------|---:|---------|
| Phase 2 probe SUPPORTED | **100** | `scanner/pqc_probe.py` |
| Phase 2 probe NOT_SUPPORTED (alert) | 15 | `scanner/pqc_probe.py` |
| Phase 2 probe NOT_SUPPORTED_OTHER_GROUP | 20 | `scanner/pqc_probe.py` |
| Phase 1 fallback: ECDHE only | 30 | `scoring.py:score_hybridkem` |
| Phase 1 fallback: DHE only | 15 | `scoring.py:score_hybridkem` |
| Phase 1 fallback: RSA key exchange only | 0 | `scoring.py:score_hybridkem` |

**Phase 2 (`pqc_probe.py`) 가 hybridKem 의 진짜 변별력 원천**. raw `socket` + `struct` 로 TLS 1.3 ClientHello (supported_groups=[X25519MLKEM768], 빈 key_share) → ServerHello/HRR 의 selected_group 관찰. 외부 PQC 라이브러리 의존성 없음.

### 양자 위협 정량 (quantumThreat)

`roetteler.py` — TypeScript `src/data/quantumResources.ts` 와 결정적으로 동일한 결과:

- RSA-n: logical qubits ≈ 2n + 3 (Roetteler 2017 Table 1)
- ECC-n: logical qubits ≈ 9n + 2⌈log₂(n)⌉ + 10 (Roetteler 2017 Table 1)
- 점수 = `clip(0, 100, log10(qubits / 100) × 22 × (1 − 성공률 × 0.7))`
- 보수 시나리오 성공률 = 0.04 (Shor 1994), 실증 = 0.5 (Willsch 2023)
- PQC (ML-KEM, Hybrid-*): 점수 100 / 92(보수)·87(실증)

## 측정 메타 (v2 보정 분석용)

각 `out/{host}.meta.json` 은 다음을 포함:

```json
{
  "scoring": {
    "tls": {
      "rules": [
        {"id": "tls_1_0_active", "label": "TLS 1.0 활성", "fired": true, "deduction": 30,
         "source": "RFC 8996 / Mozilla intermediate / NIST 800-52"},
        ...
      ],
      "cipher_deductions": {"non_aead": 14, "non_ecdhe": 12, "cbc": 14},
      "final": 0
    },
    "certOps": { ... },
    "hybridKem": { "value": 30, "basis": "..." }
  }
}
```

v2 보정 시 "어떤 룰이 50개 중 N개에서 발화했는지" 분석에 그대로 사용.

## 한계 (Phase 1 + Phase 2)

1. **PQC 그룹 직접 협상 시험 (sslyze 단독 한계)** — sslyze 의 `elliptic_curves` scan 은 X25519MLKEM768 (0x11EC, Mozilla v6.0 등재) 을 명시 테스트하지 않음. → **Phase 2 `pqc_probe.py` 가 직접 raw TLS 1.3 ClientHello 로 측정.** Phase 1 단독 시 모든 도메인이 30점으로 수렴하던 변별력 부재가 Phase 2 로 해소됨.
2. **외부 TLS 프로브 차단** — WAF / 금융권 / 공공망 차단 정책으로 측정 불가한 도메인 존재. sslyze 도 4개 (현대모비스·현대글로비스·HL만도·신한은행) 거부, Phase 2 raw TLS 1.3 ClientHello 는 16개 거부 (공공·금융 다수). **차단 자체가 정보** — 별도 카테고리로 분류.
3. **PQC maturity (`pqc.maturity`) 는 자동 측정 불가** — 회사 공개 자료 (블로그·보안 리포트·IR) 리서치 필요. 기본 `'준비 미착수'` 로 두고 사용자가 수동 갱신.
4. **분석 텍스트 (`narrative` / `findings` / `recommendations` / `regulatoryGaps` / `supplyChainNotes`)** — auto-generated `findings` (sslyze + Phase 2 probe 결과 기반) 외에는 placeholder. 사용자가 LLM 도움 또는 직접 작성.
5. **양자 보안 supply chain — Future Scope**: HW 백도어, 펌웨어 PQC 지원, HSM 벤더 로드맵, KMS 키 관리 정책 등 양자 보안의 실재하는 supply chain 축은 Phase 1 자동 측정으로 다룰 수 없어 `supplyChainNotes` 정성 디스크립터로 분리 보존. **강등이 아니라 측정 한계로 인한 분리 보존** — Phase 2+ 보강 대상.
6. **`quantumThreat` 0-100 점수의 calibration**: Roetteler 2017 logical qubit / Toffoli 계산은 표준 인용 유효하지만, 0-100 점수 정규화의 두 상수 (`22`, `0.7`) 는 calibration scalar (정당화 출처 없음). **ordering 보존만 의미, 절대값 의미 없음** — 도메인 간 상대 비교용. HNDL 시간축 모델 (Microsoft Azure Quantum / IBM 등 hardware roadmap 활용) 로 교체가 Future Work.

## 디버깅

- `python -m scanner.measure --from-json scanner/out/{host}.json` 으로 sslyze 재실행 없이 점수만 재계산 (formula 수정 후 회귀 검증용)
- `cat scanner/out/{host}.meta.json | jq '.scoring.tls.rules[] | select(.fired)'` 로 발화한 룰만 추출
- batch 후 `cat scanner/out/batch-errors.json` 으로 실패 도메인 확인
