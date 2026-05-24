"""sslyze 결과 → 점수 산출 (v1, 표준 기반).

표준 인용:
- Mozilla SSL Configuration v6.0 — intermediate profile
  https://ssl-config.mozilla.org/guidelines/latest.json
- NIST SP 800-52 Rev. 2 — TLS Implementation Guidelines
  https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-52r2.pdf
- OWASP Transport Layer Security Cheat Sheet
- RFC 8996 — Deprecating TLS 1.0 and TLS 1.1

전체 흐름:
  sslyze JSON dict → extract_features() → TlsFeatures dataclass
  → score_tls / score_certops / score_hybridkem (각 0~100)
  → derive_renewal (열거형 문자열)
  → 부속 메타: scoring_breakdown() (감점 trace 반환, v2 보정용)
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Optional


# --- Feature 추출 ---------------------------------------------------------------

@dataclass
class TlsFeatures:
    # TLS 버전 활성 여부
    tls_1_0_active: bool = False
    tls_1_1_active: bool = False
    tls_1_2_active: bool = False
    tls_1_3_active: bool = False

    # Cipher suite 통계 (TLS 1.2)
    tls_1_2_total_ciphers: int = 0
    non_aead_ciphers_count: int = 0     # GCM/CHACHA20 외
    non_ecdhe_ciphers_count: int = 0    # ECDHE/DHE 없음
    cbc_ciphers_count: int = 0          # CBC mode

    # 프로토콜 위생
    compression_active: bool = False
    fallback_scsv_supported: bool = True

    # 취약점
    heartbleed: bool = False
    robot_vulnerable: bool = False
    ccs_injection_vulnerable: bool = False
    insecure_renegotiation: bool = False

    # 인증서
    ca_subject: str = ""
    ca_short: str = ""
    chain_length: int = 0
    chain_summary: str = ""
    chain_has_sha1: bool = False
    leaf_signature_hash: str = "sha256"  # 'sha1', 'sha256', 'sha384', 'sha512', 'md5'
    days_until_expiry: int = 0
    cert_lifetime_days: int = 0
    not_valid_before: str = ""
    not_valid_after: str = ""

    # 키
    key_algorithm: str = "Unknown"  # 'RSA', 'ECC', 'ML-KEM', 'Hybrid-*', 'Unknown'
    key_bits: int = 0
    ec_curve_name: Optional[str] = None

    # OCSP
    ocsp_stapling_active: bool = False
    ocsp_response_is_trusted: Optional[bool] = None

    # 곡선 / PQC
    supported_curves: list[str] = field(default_factory=list)
    has_x25519mlkem768: bool = False
    has_pure_ml_kem: bool = False
    has_ecdhe: bool = False
    has_dhe_only: bool = False

    # HSTS (http_headers 스캔이 켜져있을 때만)
    hsts_active: bool = False
    hsts_max_age: Optional[int] = None
    hsts_include_subdomains: bool = False
    hsts_preload: bool = False

    # 측정 메타
    scan_targets_completed: list[str] = field(default_factory=list)


def _safe_get(d: dict | None, *keys: str, default: Any = None) -> Any:
    cur: Any = d
    for k in keys:
        if not isinstance(cur, dict):
            return default
        cur = cur.get(k)
        if cur is None:
            return default
    return cur


def _accepted_cipher_names(scan: dict, version_key: str) -> list[str]:
    block = scan.get(version_key, {})
    if block.get("status") != "COMPLETED":
        return []
    accepted = _safe_get(block, "result", "accepted_cipher_suites", default=[]) or []
    return [c["cipher_suite"]["name"] for c in accepted if "cipher_suite" in c]


def _parse_iso(ts: str) -> Optional[datetime]:
    if not ts:
        return None
    try:
        # sslyze ISO with Z suffix
        return datetime.fromisoformat(ts.replace("Z", "+00:00"))
    except ValueError:
        return None


def _ca_short_name(rfc4514: str) -> str:
    """'CN=DigiCert Global G3 ...,O=DigiCert Inc,C=US' → 'DigiCert'."""
    if not rfc4514:
        return "(unknown)"
    for token in ("DigiCert", "Sectigo", "Let's Encrypt", "GlobalSign",
                  "GoDaddy", "Amazon", "Google Trust", "Comodo", "ISRG",
                  "한국전자인증", "KISA"):
        if token in rfc4514:
            return token
    # fallback: extract O= value
    parts = [p.strip() for p in rfc4514.split(",")]
    for p in parts:
        if p.startswith("O="):
            return p[2:]
    return rfc4514[:40]


def _detect_key_algorithm(public_key: dict | None) -> tuple[str, int, Optional[str]]:
    """public_key dict → (algo, bits, ec_curve_name)."""
    if not public_key:
        return "Unknown", 0, None
    algo_raw = (public_key.get("algorithm") or "").lower()
    bits = public_key.get("key_size", 0) or 0
    curve = public_key.get("ec_curve_name")
    if "rsa" in algo_raw:
        return "RSA", bits, None
    if "ec" in algo_raw or curve:
        return "ECC", bits, curve
    if "ml-kem" in algo_raw or "mlkem" in algo_raw:
        return "ML-KEM", bits, None
    return "Unknown", bits, curve


def _classify_curves(supported: list[dict]) -> tuple[list[str], bool, bool, bool, bool]:
    """elliptic_curves.supported_curves[] → (names, x25519mlkem768, pure_ml_kem, has_ecdhe, dhe_only).

    sslyze 6.x 의 elliptic_curves scan 은 표준 곡선만 시험한다 — Mozilla intermediate v6.0 에
    포함된 X25519MLKEM768 는 현재 sslyze 의 시험 대상이 아니므로 거의 항상 False.
    Phase 2 (직접 PQC 클라이언트)가 이 값을 보강한다.
    """
    names = [c.get("name", "") for c in (supported or [])]
    x25519mlkem = "X25519MLKEM768" in names
    pure_mlkem = any("ML-KEM" in n or "MLKEM" in n for n in names) and not x25519mlkem
    has_ecdhe = any(n in ("X25519", "secp256r1", "secp384r1", "secp521r1",
                          "prime256v1") for n in names)
    return names, x25519mlkem, pure_mlkem, has_ecdhe, False


def extract_features(server_scan_result: dict) -> TlsFeatures:
    """sslyze v6 서버 1개 결과 dict → TlsFeatures.

    server_scan_result 는 sslyze JSON 의 ``server_scan_results[0]`` 형태.
    """
    f = TlsFeatures()
    scan = server_scan_result.get("scan_result", {})

    # --- TLS 버전 --------------------------------------------------------------
    for version_key, attr in (
        ("ssl_2_0_cipher_suites", None),
        ("ssl_3_0_cipher_suites", None),
        ("tls_1_0_cipher_suites", "tls_1_0_active"),
        ("tls_1_1_cipher_suites", "tls_1_1_active"),
        ("tls_1_2_cipher_suites", "tls_1_2_active"),
        ("tls_1_3_cipher_suites", "tls_1_3_active"),
    ):
        block = scan.get(version_key, {})
        if block.get("status") == "COMPLETED":
            f.scan_targets_completed.append(version_key)
        accepted = _accepted_cipher_names(scan, version_key)
        if accepted and attr:
            setattr(f, attr, True)

    # --- TLS 1.2 cipher 분류 ---------------------------------------------------
    tls12 = _accepted_cipher_names(scan, "tls_1_2_cipher_suites")
    f.tls_1_2_total_ciphers = len(tls12)
    for name in tls12:
        is_aead = "GCM" in name or "CHACHA20" in name
        if not is_aead:
            f.non_aead_ciphers_count += 1
        if "ECDHE" not in name and "DHE" not in name:
            f.non_ecdhe_ciphers_count += 1
        if "CBC" in name:
            f.cbc_ciphers_count += 1

    # --- 취약점 / 위생 ---------------------------------------------------------
    def _is_vulnerable(key: str, vuln_field: str) -> bool:
        r = _safe_get(scan, key, "result")
        return bool(r and r.get(vuln_field))

    f.compression_active = _is_vulnerable("tls_compression", "supports_compression")
    f.heartbleed = _is_vulnerable("heartbleed", "is_vulnerable_to_heartbleed")
    f.ccs_injection_vulnerable = _is_vulnerable(
        "openssl_ccs_injection", "is_vulnerable_to_ccs_injection"
    )
    # ROBOT 결과는 enum: VULNERABLE_STRONG_ORACLE / VULNERABLE_WEAK_ORACLE /
    # NOT_VULNERABLE_NO_ORACLE / NOT_VULNERABLE_RSA_NOT_SUPPORTED / UNKNOWN_*
    # substring 매치는 NOT_VULNERABLE 도 잡기 때문에 prefix 비교로 정확하게.
    robot = str(_safe_get(scan, "robot", "result", "robot_result", default="")).upper()
    f.robot_vulnerable = robot.startswith("VULNERABLE_") or robot == "VULNERABLE"
    reneg = _safe_get(scan, "session_renegotiation", "result")
    if reneg:
        # is_vulnerable_to_client_renegotiation_dos OR supports_secure_renegotiation
        f.insecure_renegotiation = not reneg.get("supports_secure_renegotiation", True)

    fallback = _safe_get(scan, "tls_fallback_scsv", "result")
    if fallback is not None:
        f.fallback_scsv_supported = bool(
            fallback.get("supports_fallback_scsv", True)
        )

    # --- 인증서 / 키 -----------------------------------------------------------
    cert_info = _safe_get(scan, "certificate_info", "result")
    if cert_info and cert_info.get("certificate_deployments"):
        dep = cert_info["certificate_deployments"][0]
        chain = dep.get("received_certificate_chain", []) or []
        f.chain_length = len(chain)
        if chain:
            leaf = chain[0]
            f.ca_subject = _safe_get(leaf, "issuer", "rfc4514_string") or ""
            f.ca_short = _ca_short_name(f.ca_subject)
            sig = _safe_get(leaf, "signature_hash_algorithm", "name") or ""
            f.leaf_signature_hash = sig.lower()
            # chain summary "Subject1 → Subject2"
            f.chain_summary = " → ".join(
                _safe_get(c, "subject", "rfc4514_string", default="?")[:60] for c in chain
            )
            algo, bits, curve = _detect_key_algorithm(leaf.get("public_key"))
            f.key_algorithm = algo
            f.key_bits = bits
            f.ec_curve_name = curve
            # validity
            nvb = _parse_iso(leaf.get("not_valid_before") or "")
            nva = _parse_iso(leaf.get("not_valid_after") or "")
            if nvb:
                f.not_valid_before = nvb.date().isoformat()
            if nva:
                f.not_valid_after = nva.date().isoformat()
            now = datetime.now(timezone.utc)
            if nva:
                f.days_until_expiry = (nva - now).days
            if nvb and nva:
                f.cert_lifetime_days = (nva - nvb).days
        # chain SHA-1 검출
        f.chain_has_sha1 = bool(dep.get("verified_chain_has_sha1_signature"))
        # OCSP
        ocsp = dep.get("ocsp_response")
        f.ocsp_stapling_active = bool(ocsp)
        f.ocsp_response_is_trusted = dep.get("ocsp_response_is_trusted")

    # --- elliptic curves (PQC 감지는 거의 항상 False) -----------------------
    ec_result = _safe_get(scan, "elliptic_curves", "result")
    if ec_result:
        names, mlkem, pure, ecdhe, _ = _classify_curves(
            ec_result.get("supported_curves") or []
        )
        f.supported_curves = names
        f.has_x25519mlkem768 = mlkem
        f.has_pure_ml_kem = pure
        f.has_ecdhe = ecdhe or bool(ec_result.get("supports_ecdh_key_exchange"))

    # --- HSTS (http_headers 스캔이 켜져있을 때만) --------------------------
    hh = _safe_get(scan, "http_headers", "result")
    if hh:
        sts = hh.get("strict_transport_security_header")
        if sts:
            f.hsts_active = True
            f.hsts_max_age = sts.get("max_age")
            f.hsts_include_subdomains = bool(sts.get("include_subdomains"))
            f.hsts_preload = bool(sts.get("preload"))

    return f


# --- 점수 산출 ----------------------------------------------------------------

# (rule_id, label, condition_fn, deduction, source) — score_*() 가 공유하는 trace 표
_TLS_RULES = [
    ("tls_1_0_active",  "TLS 1.0 활성",           lambda f: f.tls_1_0_active,           30, "RFC 8996 / Mozilla intermediate / NIST 800-52"),
    ("tls_1_1_active",  "TLS 1.1 활성",           lambda f: f.tls_1_1_active,           20, "RFC 8996 / Mozilla intermediate / NIST 800-52"),
    ("tls_1_3_missing", "TLS 1.3 미지원",         lambda f: not f.tls_1_3_active,       25, "Mozilla intermediate v6.0 / NIST 800-52 (2024+)"),
    ("tls_1_2_missing", "TLS 1.2 미지원",         lambda f: not f.tls_1_2_active,       10, "Mozilla intermediate v6.0 minimum"),
    ("compression",     "TLS Compression 활성 (CRIME)", lambda f: f.compression_active, 15, "OWASP Cheat Sheet — must disable"),
    ("fallback_scsv",   "TLS_FALLBACK_SCSV 미지원",     lambda f: not f.fallback_scsv_supported, 5, "OWASP — should be enabled"),
    ("heartbleed",      "Heartbleed 취약",        lambda f: f.heartbleed,               50, "CVE-2014-0160"),
    ("robot",           "ROBOT 취약",             lambda f: f.robot_vulnerable,         50, "ROBOT attack 2017"),
    ("ccs_injection",   "OpenSSL CCS Injection",  lambda f: f.ccs_injection_vulnerable, 50, "CVE-2014-0224"),
    ("insecure_reneg",  "Insecure Renegotiation", lambda f: f.insecure_renegotiation,   20, "CVE-2009-3555"),
]


def score_tls(f: TlsFeatures) -> int:
    """TLS 위생 점수 (0-100). v1 — 표준 감점 합산 → clamp."""
    score = 100
    for _id, _label, cond, deduction, _src in _TLS_RULES:
        if cond(f):
            score -= deduction
    # cipher suite 합산 감점
    score -= 2 * f.non_aead_ciphers_count
    score -= 3 * f.non_ecdhe_ciphers_count
    score -= 2 * f.cbc_ciphers_count
    return max(0, min(100, score))


_CERTOPS_RULES = [
    ("expired",          "인증서 만료됨",                lambda f: f.days_until_expiry < 0,                       75, "trivial"),
    ("expiring_soon",    "만료 임박 (≤30일)",            lambda f: 0 <= f.days_until_expiry <= 30,                25, "운영 위생"),
    ("lifetime_too_long","수명 > 366일",                lambda f: f.cert_lifetime_days > 366,                    20, "Mozilla v6.0 max 366"),
    ("chain_sha1",       "체인에 SHA-1 서명",           lambda f: f.chain_has_sha1,                              25, "OWASP / NIST 폐기"),
    ("leaf_sha1",        "Leaf SHA-1 서명",             lambda f: f.leaf_signature_hash == "sha1",               25, "OWASP / NIST 폐기"),
    ("leaf_md5",         "Leaf MD5 서명",               lambda f: f.leaf_signature_hash == "md5",                50, "OWASP must not"),
    ("chain_incomplete", "체인 길이 ≤1 (불완전)",        lambda f: 0 < f.chain_length <= 1,                       25, "TLS 신뢰 끊김"),
    ("chain_too_long",   "체인 길이 > 4 (과도)",         lambda f: f.chain_length > 4,                            10, "성능 / 위생"),
    ("ocsp_missing",     "OCSP Stapling 미설정 / 미신뢰", lambda f: not (f.ocsp_stapling_active and f.ocsp_response_is_trusted), 15, "Mozilla recommended"),
    ("rsa_weak",         "RSA 키 < 2048 bit",          lambda f: f.key_algorithm == "RSA" and f.key_bits < 2048, 30, "Mozilla intermediate minimum"),
    # Mozilla intermediate ECDH 곡선: X25519MLKEM768, X25519, prime256v1, secp384r1.
    # sslyze 는 secp256r1 로 보고하지만 prime256v1 와 동일 곡선이므로 별명 모두 인정한다.
    ("ecc_nonstandard",  "ECC 곡선 비표준",             lambda f: f.key_algorithm == "ECC" and (f.ec_curve_name or "").lower() not in ("", "prime256v1", "secp256r1", "secp384r1", "secp521r1", "x25519"), 5, "Mozilla intermediate v6.0 ECDH curves"),
]


def score_certops(f: TlsFeatures) -> int:
    """인증서 운영 점수 (0-100)."""
    score = 100
    for _id, _label, cond, deduction, _src in _CERTOPS_RULES:
        if cond(f):
            score -= deduction
    return max(0, min(100, score))


def score_hybridkem(f: TlsFeatures) -> int:
    """하이브리드 KEM 점수.

    Mozilla SSL Config v6.0 intermediate profile 의 ECDH 곡선 목록에
    X25519MLKEM768 가 포함됨 (2024-2025 추가).
    sslyze 의 elliptic_curves scan 은 X25519MLKEM768 를 명시 테스트하지 않으므로,
    Phase 1 결과는 대부분 ECDHE only → 30 점이 된다.
    Phase 2 (직접 PQC 클라이언트) 가 이 축의 진정한 값을 채운다.
    """
    if f.has_x25519mlkem768:
        return 100
    if f.has_pure_ml_kem:
        return 90
    if f.has_ecdhe:
        return 30
    if f.has_dhe_only:
        return 15
    return 0


# --- 파생 필드 ----------------------------------------------------------------

def derive_renewal(f: TlsFeatures) -> str:
    """certificate.renewal 열거형 도출.

    근거:
    - Let's Encrypt / Google Trust / 90일 이하 수명 → 자동 갱신 추정
    - 만료까지 ≤30일 → 만료 임박
    - 만료 후 → 미설정 으로 표기 (재발급 안 됨)
    - 수명 ≤200일 → 분기 자동 갱신
    - 그 외 (1년+ 수명) → 수동 갱신
    """
    if f.days_until_expiry < 0:
        return "미설정"
    if f.days_until_expiry <= 30:
        return "만료 임박"
    ca_lower = f.ca_subject.lower()
    is_short_cert_ca = (
        "let's encrypt" in ca_lower
        or "google trust" in ca_lower
        or "isrg" in ca_lower
    )
    if f.cert_lifetime_days <= 100 or is_short_cert_ca:
        return "자동 갱신"
    if f.cert_lifetime_days <= 200:
        return "분기 자동 갱신"
    return "수동 갱신"


def derive_pqc_status(f: TlsFeatures) -> dict:
    """pqc.keyExchange / hybrid 도출 (Phase 1 한계 반영).

    Phase 1: sslyze 의 elliptic_curves scan 결과만 사용. 거의 항상 PQC 미감지.
    Phase 2 가 X25519MLKEM768 직접 협상 시도로 진짜 측정.

    Enum 값 주의 (스키마와 일치):
    - keyExchange ∈ {활성화, 미지원, 비활성화, 차단됨, 미설정}
    - hybrid      ∈ {기본 제공, 하이브리드, 미감지}
    """
    if f.has_x25519mlkem768:
        return {"keyExchange": "활성화", "hybrid": "하이브리드"}
    if f.has_pure_ml_kem:
        return {"keyExchange": "활성화", "hybrid": "기본 제공"}
    # PQC 그룹은 서버가 advertise 안 함 → keyExchange '미지원'.
    # ECDHE 자체가 없는 경우 (예: scan 실패 / RSA-only legacy) → '미설정'.
    return {"keyExchange": "미지원" if f.has_ecdhe else "미설정",
            "hybrid": "미감지"}


# --- 자동 발견 사항 (findings) --------------------------------------------

def auto_findings(f: TlsFeatures) -> list[dict]:
    """sslyze 결과에서 직접 발견 가능한 사실들 → findings 배열.

    SourcedText 형태 (text, source='automated').
    """
    out: list[dict] = []
    if f.tls_1_0_active:
        out.append({"text": "TLS 1.0 활성 — RFC 8996 권고에 따라 비활성화 필요.",
                    "source": "automated"})
    if f.tls_1_1_active:
        out.append({"text": "TLS 1.1 활성 — RFC 8996 권고에 따라 비활성화 필요.",
                    "source": "automated"})
    if not f.tls_1_3_active:
        out.append({"text": "TLS 1.3 미지원 — Mozilla intermediate 권고 미충족.",
                    "source": "automated"})
    if f.cbc_ciphers_count > 0:
        out.append({"text": f"TLS 1.2 CBC 모드 cipher {f.cbc_ciphers_count}개 활성 — "
                            "OWASP 권고는 GCM 우선.",
                    "source": "automated"})
    if f.non_ecdhe_ciphers_count > 0:
        out.append({"text": f"Non-ECDHE/DHE cipher {f.non_ecdhe_ciphers_count}개 — "
                            "Forward Secrecy 미적용 cipher 존재.",
                    "source": "automated"})
    if f.heartbleed:
        out.append({"text": "Heartbleed (CVE-2014-0160) 취약 — 즉시 패치 필요.",
                    "source": "automated"})
    if f.robot_vulnerable:
        out.append({"text": "ROBOT 취약 — RSA key transport 비활성화 필요.",
                    "source": "automated"})
    if f.compression_active:
        out.append({"text": "TLS Compression 활성 — CRIME 공격 표면.",
                    "source": "automated"})
    if f.chain_has_sha1:
        out.append({"text": "체인에 SHA-1 서명 존재 — 신뢰 저하.",
                    "source": "automated"})
    if f.ocsp_stapling_active and f.ocsp_response_is_trusted is False:
        out.append({"text": "OCSP Stapling 응답이 신뢰되지 않음.",
                    "source": "automated"})
    if not f.ocsp_stapling_active:
        out.append({"text": "OCSP Stapling 미설정 — 인증서 폐기 확인 지연.",
                    "source": "automated"})
    if f.key_algorithm == "RSA" and f.key_bits < 2048:
        out.append({"text": f"RSA 키 {f.key_bits} bit — Mozilla 최소 권고 (2048) 미달.",
                    "source": "automated"})
    if not f.has_x25519mlkem768 and not f.has_pure_ml_kem:
        out.append({"text": "ClientHello 에서 ML-KEM (X25519MLKEM768 등) PQC KEM 그룹은 "
                            "관측되지 않음.",
                    "source": "automated"})
    return out


# --- 자동 권고 (recommendations) ---------------------------------------------

def auto_recommendations(f: TlsFeatures) -> list[dict]:
    """sslyze features → recommendations 배열 (mechanical mapping).

    auto_findings 와 짝지어 "진단 → 처방" 1:1 매핑. 모든 룰의 권고 텍스트
    끝에 표준 인용 (RFC 8996 / Mozilla v6.0 / OWASP / NIST PQC) 출처가 박혀있어
    source='automated' 가 정확한 라벨이다.

    scripts/regenerate-recommendations.ts (TS) 와 동일한 룰 집합으로 동기화.
    Python 측은 향후 batch 측정 시 to_partial_domain() 에서 자동 호출되며,
    기존 47개 도메인의 recommendations 는 TS 스크립트로 in-place 갱신된다.
    """
    out: list[dict] = []

    if f.tls_1_0_active or f.tls_1_1_active:
        out.append({
            "text": "TLS 1.0 / 1.1 비활성화 후 TLS 1.2+ 만 허용 "
                    "(RFC 8996, Mozilla SSL Config v6.0 intermediate).",
            "source": "automated",
        })
    if not f.tls_1_3_active:
        out.append({
            "text": "TLS 1.3 활성화 — 최신 cipher suite·0-RTT·forward secrecy "
                    "기본 지원 (Mozilla intermediate v6.0).",
            "source": "automated",
        })
    if f.cbc_ciphers_count > 0:
        out.append({
            "text": "TLS 1.2 cipher suite 를 AEAD (AES-GCM, ChaCha20-Poly1305) "
                    "만 허용하도록 제한 (OWASP TLS Cheat Sheet, Mozilla intermediate).",
            "source": "automated",
        })
    if f.non_ecdhe_ciphers_count > 0:
        out.append({
            "text": "Forward Secrecy 미적용 cipher (RSA key transport 등) 제거, "
                    "ECDHE/DHE 기반 cipher 만 허용 (Mozilla v6.0).",
            "source": "automated",
        })
    if f.compression_active:
        out.append({
            "text": "TLS Compression 비활성화 — CRIME 공격 차단 (OWASP must-disable).",
            "source": "automated",
        })
    if f.heartbleed:
        out.append({
            "text": "OpenSSL 즉시 패치 — Heartbleed (CVE-2014-0160) 영향 차단.",
            "source": "automated",
        })
    if f.robot_vulnerable:
        out.append({
            "text": "RSA key transport cipher 비활성화 — ROBOT 공격 (2017) 차단. "
                    "PFS cipher 만 허용.",
            "source": "automated",
        })
    if f.chain_has_sha1 or f.leaf_signature_hash == "sha1":
        out.append({
            "text": "인증서 체인을 SHA-256 이상 서명으로 재발급 — SHA-1 은 "
                    "OWASP·NIST 폐기 (TLS 신뢰 저하).",
            "source": "automated",
        })
    if not f.ocsp_stapling_active:
        out.append({
            "text": "OCSP Stapling 활성화 — 인증서 폐기 확인 지연 완화 및 "
                    "프라이버시 보호 (Mozilla recommended).",
            "source": "automated",
        })
    if f.ocsp_stapling_active and f.ocsp_response_is_trusted is False:
        out.append({
            "text": "OCSP responder URL 및 인증서 신뢰 체인 점검 — stapled "
                    "response 검증 실패 원인 분석.",
            "source": "automated",
        })
    if f.key_algorithm == "RSA" and f.key_bits < 2048:
        out.append({
            "text": "RSA-2048 이상 또는 ECC P-256 이상으로 키 교체 — "
                    "Mozilla minimum 요구.",
            "source": "automated",
        })
    # PQC: Phase 1 단계에서는 항상 'X25519MLKEM768 검토' 권고가 적용됨.
    # Phase 2 merge 후 keyExchange=='활성화' 가 된 도메인은 별도 후속 권고로 전환되며,
    # 그 전환은 merge_pqc.py 또는 scripts/regenerate-recommendations.ts 가 담당한다.
    if not (f.has_x25519mlkem768 or f.has_pure_ml_kem):
        out.append({
            "text": "X25519MLKEM768 (0x11EC) 협상 활성화 검토 — Mozilla SSL "
                    "Config v6.0 intermediate 등재, draft-ietf-tls-ecdhe-mlkem "
                    "표준화 진행 중. CDN/load balancer 단에서 우선 시범 적용 권장.",
            "source": "automated",
        })

    # 분석 영역 — scanner 가 측정 불가한 부분 (회사 공개 자료 필요)
    out.append({
        "text": "PQC 전환 로드맵 수립 — NIST PQC 표준 FIPS 203 (ML-KEM) / "
                "204 (ML-DSA) / 205 (SLH-DSA) 기준, 김의결·안혁 2025 의 "
                "한국 적용 권고 참조.",
        "source": "automated",
    })

    return out


# --- 감점 trace (v2 보정 분석용) ---------------------------------------------

def scoring_breakdown(f: TlsFeatures) -> dict:
    """각 룰이 발화했는지 + 감점 trace 반환. v2 보정 시 변별력 분석에 사용."""
    def trace(rules, score_value):
        return [
            {
                "id": _id,
                "label": label,
                "fired": cond(f),
                "deduction": ded if cond(f) else 0,
                "source": src,
            }
            for _id, label, cond, ded, src in rules
        ]

    return {
        "tls": {
            "rules": trace(_TLS_RULES, score_tls(f)),
            "cipher_deductions": {
                "non_aead": f.non_aead_ciphers_count * 2,
                "non_ecdhe": f.non_ecdhe_ciphers_count * 3,
                "cbc": f.cbc_ciphers_count * 2,
            },
            "final": score_tls(f),
        },
        "certOps": {
            "rules": trace(_CERTOPS_RULES, score_certops(f)),
            "final": score_certops(f),
        },
        "hybridKem": {
            "value": score_hybridkem(f),
            "basis": (
                "X25519MLKEM768=100, ML-KEM=90, ECDHE=30, DHE-only=15, none=0. "
                "Phase 1 sslyze 한계: 대부분 30 (Phase 2 보강 예정)."
            ),
        },
    }
