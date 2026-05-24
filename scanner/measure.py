"""Phase 1 측정 엔진 — sslyze + v1 점수 → partial Domain JSON.

표준 인용은 ``scanner.scoring`` 모듈 docstring 참조.

사용:
  python scanner/measure.py --hostname www.naver.com --name "네이버" --sector "IT/플랫폼"
  python scanner/measure.py --from-json scanner/out/naver.json --name "네이버" --sector "IT/플랫폼"
  python scanner/measure.py --hostname samsung.com --name "삼성전자" --sector "반도체/전자" \
                            --out scanner/out/samsung.partial.json

출력: TS ``DomainSchema`` 호환 partial 레코드 JSON. 사람이 채워야 할 필드는
  ``"TODO: ..."`` 마커 또는 빈 배열로 둔다.
"""

from __future__ import annotations

import argparse
import csv
import json
import sys
import warnings
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

# cryptography deprecation warning 억제 (sslyze 내부)
warnings.filterwarnings("ignore", category=DeprecationWarning)

from scanner.roetteler import summarize_quantum_threat  # noqa: E402
from scanner.scoring import (  # noqa: E402
    TlsFeatures,
    auto_findings,
    auto_recommendations,
    derive_pqc_status,
    derive_renewal,
    extract_features,
    score_certops,
    score_hybridkem,
    score_tls,
    scoring_breakdown,
)

FORMULA_VERSION = "v1-2026-05-16"


# --- sslyze 실행 (in-process) -------------------------------------------------

def _scan_commands_set():
    """Phase 1 에서 활성화할 sslyze scan command 집합."""
    from sslyze import ScanCommand
    return {
        ScanCommand.CERTIFICATE_INFO,
        ScanCommand.SSL_2_0_CIPHER_SUITES,
        ScanCommand.SSL_3_0_CIPHER_SUITES,
        ScanCommand.TLS_1_0_CIPHER_SUITES,
        ScanCommand.TLS_1_1_CIPHER_SUITES,
        ScanCommand.TLS_1_2_CIPHER_SUITES,
        ScanCommand.TLS_1_3_CIPHER_SUITES,
        ScanCommand.TLS_COMPRESSION,
        ScanCommand.HEARTBLEED,
        ScanCommand.ROBOT,
        ScanCommand.OPENSSL_CCS_INJECTION,
        ScanCommand.SESSION_RENEGOTIATION,
        ScanCommand.TLS_FALLBACK_SCSV,
        ScanCommand.ELLIPTIC_CURVES,
        ScanCommand.HTTP_HEADERS,
        ScanCommand.TLS_EXTENDED_MASTER_SECRET,
    }


def run_sslyze_inprocess(hostname: str) -> dict:
    """sslyze 6.x in-process scan → server_scan_results[0] dict.

    HTTP_HEADERS / SESSION_RESUMPTION 까지 명시 활성화 (기본 set 은 제외함).
    """
    from sslyze import (
        Scanner,
        ServerNetworkLocation,
        ServerScanRequest,
        ServerScanResultAsJson,
    )

    request = ServerScanRequest(
        server_location=ServerNetworkLocation(hostname=hostname),
        scan_commands=_scan_commands_set(),
    )
    scanner = Scanner()
    scanner.queue_scans([request])
    for result in scanner.get_results():
        json_str = ServerScanResultAsJson.model_validate(result).model_dump_json()
        return json.loads(json_str)
    raise RuntimeError("sslyze returned no results")


# --- Batch 모드 ---------------------------------------------------------------

@dataclass
class BatchTarget:
    hostname: str
    name: str
    sector: str


def parse_batch_csv(path: Path) -> list[BatchTarget]:
    """CSV header: hostname,name,sector. '#' 로 시작하는 행은 주석으로 스킵."""
    targets: list[BatchTarget] = []
    with path.open(encoding="utf-8") as fp:
        reader = csv.DictReader(fp)
        for row in reader:
            host = (row.get("hostname") or "").strip()
            if not host or host.startswith("#"):
                continue
            targets.append(
                BatchTarget(
                    hostname=host,
                    name=(row.get("name") or host).strip(),
                    sector=(row.get("sector") or "공공/정부").strip(),
                )
            )
    return targets


def run_sslyze_batch(targets: list[BatchTarget]) -> dict[str, dict]:
    """병렬 sslyze scan. sslyze 가 내부 thread pool 로 동시성 관리."""
    from sslyze import (
        Scanner,
        ServerNetworkLocation,
        ServerScanRequest,
        ServerScanResultAsJson,
    )

    scan_commands = _scan_commands_set()
    requests = []
    for t in targets:
        try:
            requests.append(
                ServerScanRequest(
                    server_location=ServerNetworkLocation(hostname=t.hostname),
                    scan_commands=scan_commands,
                )
            )
        except Exception as e:  # noqa: BLE001
            print(f"[!] {t.hostname:40} request build failed: {e}", file=sys.stderr)

    scanner = Scanner()
    scanner.queue_scans(requests)

    results: dict[str, dict] = {}
    total = len(requests)
    done = 0
    for result in scanner.get_results():
        done += 1
        host = result.server_location.hostname
        try:
            data = json.loads(
                ServerScanResultAsJson.model_validate(result).model_dump_json()
            )
            results[host] = data
            status = data.get("scan_status", "?")
            print(f"[{done:>2}/{total}] {host:40} {status}", file=sys.stderr)
        except Exception as e:  # noqa: BLE001
            print(
                f"[{done:>2}/{total}] {host:40} serialize failed: {e}",
                file=sys.stderr,
            )
    return results


def process_batch(
    csv_path: Path,
    batch_out: Path,
    max_domains: int | None = None,
) -> int:
    """CSV → sslyze batch → staged-domains.json + per-domain meta files."""
    targets = parse_batch_csv(csv_path)
    if max_domains is not None:
        targets = targets[:max_domains]
    print(f"[batch] {len(targets)} domains queued ...", file=sys.stderr)

    measured_at = datetime.now(timezone.utc).isoformat()
    scan_results = run_sslyze_batch(targets)

    out_dir = Path("scanner/out")
    out_dir.mkdir(parents=True, exist_ok=True)

    partials: list[dict] = []
    errors: list[dict] = []
    for t in targets:
        sr = scan_results.get(t.hostname)
        if not sr:
            errors.append({"hostname": t.hostname, "name": t.name, "reason": "no result"})
            continue
        if sr.get("scan_status") != "COMPLETED":
            trace = sr.get("connectivity_error_trace") or sr.get("scan_status")
            errors.append({
                "hostname": t.hostname,
                "name": t.name,
                "reason": str(trace)[:120],
            })
            continue
        try:
            f = extract_features(sr)
            partials.append(to_partial_domain(t.hostname, t.name, t.sector, f))
            short = t.hostname.replace("www.", "").replace(".", "_")
            (out_dir / f"{short}.meta.json").write_text(
                json.dumps(
                    build_measurement_meta(t.hostname, f, measured_at),
                    ensure_ascii=False,
                    indent=2,
                ),
                encoding="utf-8",
            )
        except Exception as e:  # noqa: BLE001
            errors.append({"hostname": t.hostname, "name": t.name, "reason": str(e)})

    envelope = {
        "lastUpdated": datetime.now(timezone.utc).date().isoformat(),
        "version": f"0.5.0-phase1-batch+{FORMULA_VERSION}",
        "domains": partials,
    }
    batch_out.parent.mkdir(parents=True, exist_ok=True)
    batch_out.write_text(
        json.dumps(envelope, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    err_out = out_dir / "batch-errors.json"
    err_out.write_text(
        json.dumps(errors, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    print(
        f"[batch] saved staged → {batch_out}  "
        f"({len(partials)}/{len(targets)} succeeded, {len(errors)} errors)",
        file=sys.stderr,
    )
    if errors:
        print(f"[batch] error log → {err_out}", file=sys.stderr)
        for e in errors:
            print(f"  ! {e['hostname']:40} {e['reason']}", file=sys.stderr)
    return 0


def load_from_json(path: Path) -> dict:
    """기존 sslyze --json_out 결과 파일에서 첫 서버 result 추출."""
    with path.open(encoding="utf-8") as fp:
        data = json.load(fp)
    if "server_scan_results" in data:
        # CLI --json_out 형태
        return data["server_scan_results"][0]
    return data


# --- partial Domain JSON 생성 ------------------------------------------------

def to_partial_domain(
    hostname: str,
    name: str,
    sector: str,
    f: TlsFeatures,
) -> dict[str, Any]:
    """TS DomainSchema 호환 partial 레코드 생성.

    자동 측정 가능한 필드만 채우고 분석 텍스트·정성 메모는 TODO 마커 또는 빈 값.
    """
    quantum = summarize_quantum_threat(f.key_algorithm, f.key_bits)
    headline_q = quantum["estimates"]["empirical"]["score"]
    tls_score = score_tls(f)
    cert_score = score_certops(f)
    kem_score = score_hybridkem(f)
    pqc_status = derive_pqc_status(f)

    return {
        "name": name,
        "url": f"https://{hostname}",
        "sector": sector,
        "scores": {
            "tls":           {"value": tls_score,   "source": "automated"},
            "hybridKem":     {"value": kem_score,   "source": "automated"},
            "certOps":       {"value": cert_score,  "source": "automated"},
            "quantumThreat": {"value": headline_q,  "source": "automated"},
        },
        "certificate": {
            "renewal":      derive_renewal(f),
            "ca":           f.ca_short or "(unknown)",
            "chain":        f.chain_summary or None,
            "keyAlgorithm": f.key_algorithm,
            "keyBits":      f.key_bits or 0,
        },
        "pqc": {
            "keyExchange": pqc_status["keyExchange"],
            "hybrid":      pqc_status["hybrid"],
            # maturity 는 회사 공개자료 리서치가 필요 — 기본은 가장 보수적
            "maturity":    "준비 미착수",
        },
        "regulatoryGaps": [],
        "findings":       auto_findings(f),
        "recommendations": auto_recommendations(f),
        "narrative": {
            "text":   f"TODO: {name} 분석 narrative 를 작성하세요 "
                      "(예: TLS 위생 N점, PQC 미적용 등).",
            "source": "llm-only",
        },
        "supplyChainNotes": {
            "text":   f"TODO: {name} 공급망(CA·CDN·WAF) 종속성 메모를 작성하세요.",
            "source": "manual",
        },
        "quantumThreatDetail": quantum,
    }


def build_measurement_meta(
    hostname: str,
    f: TlsFeatures,
    measured_at: str,
) -> dict[str, Any]:
    """측정 메타 + scoring breakdown — v2 보정 분석용 별도 JSON 파일."""
    return {
        "hostname": hostname,
        "measured_at": measured_at,
        "formula_version": FORMULA_VERSION,
        "scanner": "sslyze (in-process)",
        "scan_targets_completed": f.scan_targets_completed,
        "features": {
            "tls_versions": {
                "1.0": f.tls_1_0_active,
                "1.1": f.tls_1_1_active,
                "1.2": f.tls_1_2_active,
                "1.3": f.tls_1_3_active,
            },
            "tls_1_2_ciphers": {
                "total": f.tls_1_2_total_ciphers,
                "non_aead": f.non_aead_ciphers_count,
                "non_ecdhe": f.non_ecdhe_ciphers_count,
                "cbc": f.cbc_ciphers_count,
            },
            "vulnerabilities": {
                "heartbleed": f.heartbleed,
                "robot": f.robot_vulnerable,
                "ccs_injection": f.ccs_injection_vulnerable,
                "insecure_renegotiation": f.insecure_renegotiation,
                "compression": f.compression_active,
            },
            "certificate": {
                "ca_subject": f.ca_subject,
                "ca_short": f.ca_short,
                "chain_length": f.chain_length,
                "chain_has_sha1": f.chain_has_sha1,
                "leaf_signature_hash": f.leaf_signature_hash,
                "key_algorithm": f.key_algorithm,
                "key_bits": f.key_bits,
                "ec_curve_name": f.ec_curve_name,
                "not_valid_before": f.not_valid_before,
                "not_valid_after": f.not_valid_after,
                "cert_lifetime_days": f.cert_lifetime_days,
                "days_until_expiry": f.days_until_expiry,
                "ocsp_stapling_active": f.ocsp_stapling_active,
                "ocsp_response_is_trusted": f.ocsp_response_is_trusted,
            },
            "curves": {
                "supported": f.supported_curves,
                "has_x25519mlkem768": f.has_x25519mlkem768,
                "has_pure_ml_kem": f.has_pure_ml_kem,
                "has_ecdhe": f.has_ecdhe,
            },
            "hsts": {
                "active": f.hsts_active,
                "max_age": f.hsts_max_age,
                "include_subdomains": f.hsts_include_subdomains,
                "preload": f.hsts_preload,
            },
        },
        "scoring": scoring_breakdown(f),
    }


# --- CLI ----------------------------------------------------------------------

def parse_args(argv: list[str]) -> argparse.Namespace:
    p = argparse.ArgumentParser(
        prog="scanner.measure",
        description="PQC Phase 1 — sslyze + v1 표준 기반 점수 산출",
    )
    src = p.add_mutually_exclusive_group(required=True)
    src.add_argument("--hostname", help="실시간 sslyze 측정 대상 (예: www.naver.com)")
    src.add_argument("--from-json", type=Path,
                     help="기존 sslyze JSON 결과 파일에서 features 만 재추출")
    src.add_argument("--batch", type=Path,
                     help="CSV 파일 (hostname,name,sector) 50개 batch 측정")
    p.add_argument("--name", default=None, help="한글 표시명 (예: 네이버)")
    p.add_argument("--sector", default="공공/정부",
                   help="섹터 enum (반도체/전자, IT/플랫폼, 통신, 금융지주 등)")
    p.add_argument("--out", type=Path, default=None,
                   help="partial 도메인 레코드 출력 경로 (기본: scanner/out/{hostname}.partial.json)")
    p.add_argument("--meta-out", type=Path, default=None,
                   help="측정 메타+scoring breakdown 출력 경로 (기본: ...{hostname}.meta.json)")
    p.add_argument("--stdout", action="store_true",
                   help="파일 대신 stdout 으로 partial JSON 출력")
    p.add_argument("--batch-out", type=Path,
                   default=Path("scanner/out/staged-domains.json"),
                   help="batch 모드 누적 envelope 출력 경로")
    p.add_argument("--max-domains", type=int, default=None,
                   help="batch 모드에서 처음 N 개만 처리 (테스트 용)")
    return p.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv if argv is not None else sys.argv[1:])

    if args.batch:
        return process_batch(args.batch, args.batch_out, args.max_domains)

    if args.from_json:
        server_result = load_from_json(args.from_json)
        hostname = server_result.get("server_location", {}).get("hostname") or "unknown"
    else:
        hostname = args.hostname
        print(f"[scanner] sslyze 측정 시작: {hostname} ...", file=sys.stderr)
        server_result = run_sslyze_inprocess(hostname)
        print(f"[scanner] sslyze 측정 완료.", file=sys.stderr)

    name = args.name or hostname
    measured_at = datetime.now(timezone.utc).isoformat()

    f = extract_features(server_result)
    partial = to_partial_domain(hostname, name, args.sector, f)
    meta = build_measurement_meta(hostname, f, measured_at)

    if args.stdout:
        print(json.dumps(partial, ensure_ascii=False, indent=2))
        return 0

    out_dir = Path("scanner/out")
    out_dir.mkdir(parents=True, exist_ok=True)
    short = hostname.replace("www.", "").replace(".", "_")
    out_path = args.out or (out_dir / f"{short}.partial.json")
    meta_path = args.meta_out or (out_dir / f"{short}.meta.json")

    out_path.write_text(json.dumps(partial, ensure_ascii=False, indent=2),
                        encoding="utf-8")
    meta_path.write_text(json.dumps(meta, ensure_ascii=False, indent=2),
                         encoding="utf-8")

    print(f"[scanner] saved partial : {out_path}", file=sys.stderr)
    print(f"[scanner] saved meta    : {meta_path}", file=sys.stderr)
    print(
        f"[scanner] {name} → tls={partial['scores']['tls']['value']}  "
        f"hybridKem={partial['scores']['hybridKem']['value']}  "
        f"certOps={partial['scores']['certOps']['value']}  "
        f"quantumThreat={partial['scores']['quantumThreat']['value']}",
        file=sys.stderr,
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
