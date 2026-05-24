"""Phase 2 — X25519MLKEM768 (PQC hybrid KEM) 협상 probe.

sslyze 의 elliptic_curves scan 은 X25519MLKEM768 (codepoint 0x11EC) 를 명시
테스트하지 않는다. 본 모듈은 raw socket 으로 TLS 1.3 ClientHello 를 직접
조립해 PQC group 협상 가능 여부를 측정한다.

전략 (RFC 8446 §4.1.3 / IANA TLS Named Groups):
    supported_groups = [X25519MLKEM768]  ← 오직 PQC 그룹만
    key_share        = []                ← 빈 client_shares

서버 응답 해석:
    HelloRetryRequest + selected_group = 0x11EC  → SUPPORTED
    Alert (handshake_failure / insufficient_security) → NOT_SUPPORTED
    Different selected_group → NOT_SUPPORTED_OTHER_GROUP (이론상 발생 안 함)
    Timeout / TCP RST → ERROR_*

표준 인용:
- RFC 8446 — TLS 1.3
- IANA TLS Parameters — X25519MLKEM768 = 4588 (0x11EC), DTLS-OK=Y
- draft-ietf-tls-ecdhe-mlkem — Mozilla SSL Config v6.0 (intermediate) 등재
- RFC 8446 §4.1.3 — HelloRetryRequest magic SHA256("HelloRetryRequest")

사용:
    python -m scanner.pqc_probe --hostname pq.cloudflareresearch.com
    python -m scanner.pqc_probe --batch scanner/domains.csv
"""

from __future__ import annotations

import argparse
import csv
import json
import secrets
import socket
import struct
import sys
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from pathlib import Path
from typing import Optional

# ─── RFC 8446 / IANA constants ────────────────────────────────────────────

TLS_CONTENT_HANDSHAKE = 22
TLS_CONTENT_ALERT = 21
TLS_CONTENT_CHANGE_CIPHER_SPEC = 20

HS_CLIENT_HELLO = 1
HS_SERVER_HELLO = 2

EXT_SERVER_NAME = 0
EXT_SUPPORTED_GROUPS = 10
EXT_SIGNATURE_ALGORITHMS = 13
EXT_SUPPORTED_VERSIONS = 43
EXT_KEY_SHARE = 51

# TLS 1.3 cipher suites (RFC 8446 Appendix B.4)
TLS_AES_128_GCM_SHA256 = 0x1301
TLS_AES_256_GCM_SHA384 = 0x1302
TLS_CHACHA20_POLY1305_SHA256 = 0x1303

# IANA TLS Named Groups
GROUP_X25519MLKEM768 = 0x11EC  # 4588 — Mozilla intermediate v6.0
GROUP_X25519 = 0x001D
GROUP_SECP256R1 = 0x0017

# Signature schemes
SIG_ECDSA_SECP256R1_SHA256 = 0x0403
SIG_RSA_PSS_RSAE_SHA256 = 0x0804
SIG_RSA_PKCS1_SHA256 = 0x0401
SIG_RSA_PSS_RSAE_SHA384 = 0x0805

# RFC 8446 §4.1.3 — HRR magic: SHA-256("HelloRetryRequest")
HRR_RANDOM = bytes.fromhex(
    "CF21AD74E59A6111BE1D8C021E65B891C2A211167ABB8C5E079E09E2C8A8339C"
)


class ProbeStatus(str, Enum):
    SUPPORTED = "SUPPORTED"
    NOT_SUPPORTED = "NOT_SUPPORTED"
    NOT_SUPPORTED_OTHER_GROUP = "NOT_SUPPORTED_OTHER_GROUP"
    ERROR_TIMEOUT = "ERROR_TIMEOUT"
    ERROR_NETWORK = "ERROR_NETWORK"
    ERROR_PARSE = "ERROR_PARSE"
    ERROR_TCP_CLOSE = "ERROR_TCP_CLOSE"


@dataclass
class ProbeResult:
    hostname: str
    status: ProbeStatus
    selected_group: Optional[int] = None
    alert_level: Optional[int] = None
    alert_description: Optional[int] = None
    is_hrr: bool = False
    detail: str = ""

    def to_dict(self) -> dict:
        return {
            "hostname": self.hostname,
            "status": self.status.value,
            "selected_group": (
                f"0x{self.selected_group:04X}" if self.selected_group is not None else None
            ),
            "is_hrr": self.is_hrr,
            "alert_level": self.alert_level,
            "alert_description": self.alert_description,
            "detail": self.detail,
        }


# ─── ClientHello 조립 ──────────────────────────────────────────────────────

def _ext(ext_type: int, data: bytes) -> bytes:
    return struct.pack(">HH", ext_type, len(data)) + data


def _build_client_hello(hostname: str, groups: list[int]) -> bytes:
    client_random = secrets.token_bytes(32)
    session_id = secrets.token_bytes(32)

    cipher_suites = struct.pack(
        ">HHH",
        TLS_AES_128_GCM_SHA256,
        TLS_AES_256_GCM_SHA384,
        TLS_CHACHA20_POLY1305_SHA256,
    )

    extensions = b""

    # SNI
    hostname_bytes = hostname.encode("ascii")
    sni_entry = struct.pack(">BH", 0, len(hostname_bytes)) + hostname_bytes
    sni_list = struct.pack(">H", len(sni_entry)) + sni_entry
    extensions += _ext(EXT_SERVER_NAME, sni_list)

    # supported_versions = [TLS 1.3]
    sv_data = struct.pack(">BH", 2, 0x0304)
    extensions += _ext(EXT_SUPPORTED_VERSIONS, sv_data)

    # supported_groups
    groups_bytes = b"".join(struct.pack(">H", g) for g in groups)
    groups_data = struct.pack(">H", len(groups_bytes)) + groups_bytes
    extensions += _ext(EXT_SUPPORTED_GROUPS, groups_data)

    # signature_algorithms
    sigs = [
        SIG_ECDSA_SECP256R1_SHA256,
        SIG_RSA_PSS_RSAE_SHA256,
        SIG_RSA_PSS_RSAE_SHA384,
        SIG_RSA_PKCS1_SHA256,
    ]
    sigs_bytes = b"".join(struct.pack(">H", s) for s in sigs)
    sigs_data = struct.pack(">H", len(sigs_bytes)) + sigs_bytes
    extensions += _ext(EXT_SIGNATURE_ALGORITHMS, sigs_data)

    # key_share (empty client_shares)
    ks_data = struct.pack(">H", 0)
    extensions += _ext(EXT_KEY_SHARE, ks_data)

    # ClientHello body
    body = (
        struct.pack(">H", 0x0303)  # legacy_version
        + client_random
        + struct.pack(">B", len(session_id))
        + session_id
        + struct.pack(">H", len(cipher_suites))
        + cipher_suites
        + struct.pack(">BB", 1, 0)  # legacy_compression_methods: null
        + struct.pack(">H", len(extensions))
        + extensions
    )

    # Handshake header (1 byte type + 24-bit length)
    body_len = len(body)
    hs = struct.pack(">B", HS_CLIENT_HELLO) + struct.pack(">I", body_len)[1:] + body

    # Record header (type + version + length)
    record = struct.pack(">BHH", TLS_CONTENT_HANDSHAKE, 0x0301, len(hs)) + hs
    return record


# ─── 응답 파싱 ─────────────────────────────────────────────────────────────

def _read_exactly(sock: socket.socket, n: int) -> bytes:
    buf = b""
    while len(buf) < n:
        chunk = sock.recv(n - len(buf))
        if not chunk:
            raise ConnectionError("TCP closed early")
        buf += chunk
    return buf


def _read_record(sock: socket.socket) -> tuple[int, bytes]:
    header = _read_exactly(sock, 5)
    content_type, _version, length = struct.unpack(">BHH", header)
    payload = _read_exactly(sock, length) if length > 0 else b""
    return content_type, payload


def _parse_server_hello(hs_body: bytes) -> tuple[bytes, dict[int, bytes]]:
    pos = 0
    pos += 2  # legacy_version
    server_random = hs_body[pos : pos + 32]
    pos += 32
    sid_len = hs_body[pos]
    pos += 1 + sid_len
    pos += 2  # cipher_suite
    pos += 1  # legacy_compression_method

    ext_total_len = struct.unpack(">H", hs_body[pos : pos + 2])[0]
    pos += 2
    ext_end = pos + ext_total_len

    extensions: dict[int, bytes] = {}
    while pos < ext_end:
        ext_type, ext_len = struct.unpack(">HH", hs_body[pos : pos + 4])
        pos += 4
        extensions[ext_type] = hs_body[pos : pos + ext_len]
        pos += ext_len
    return server_random, extensions


def _selected_group(exts: dict[int, bytes]) -> Optional[int]:
    """HRR / ServerHello 의 key_share extension 에서 선택된 group 추출.

    - HRR: key_share = 2 bytes (group)
    - ServerHello: KeyShareEntry = group(2) + key_exchange_len(2) + key_exchange
      → 첫 2 bytes 가 group.
    """
    ks = exts.get(EXT_KEY_SHARE)
    if ks is None or len(ks) < 2:
        return None
    return struct.unpack(">H", ks[:2])[0]


# ─── 메인 probe ────────────────────────────────────────────────────────────

def probe_pqc_support(
    hostname: str,
    port: int = 443,
    timeout: float = 8.0,
) -> ProbeResult:
    ch = _build_client_hello(hostname, [GROUP_X25519MLKEM768])
    try:
        with socket.create_connection((hostname, port), timeout=timeout) as sock:
            sock.settimeout(timeout)
            sock.sendall(ch)
            content_type, payload = _read_record(sock)
    except socket.timeout:
        return ProbeResult(hostname, ProbeStatus.ERROR_TIMEOUT, detail="socket timeout")
    except (ConnectionError, OSError) as e:
        return ProbeResult(
            hostname, ProbeStatus.ERROR_NETWORK, detail=str(e)[:120]
        )

    # Alert?
    if content_type == TLS_CONTENT_ALERT:
        if len(payload) < 2:
            return ProbeResult(hostname, ProbeStatus.ERROR_PARSE, detail="short alert")
        level, desc = payload[0], payload[1]
        return ProbeResult(
            hostname,
            ProbeStatus.NOT_SUPPORTED,
            alert_level=level,
            alert_description=desc,
            detail=f"alert level={level} desc={desc}",
        )

    if content_type == TLS_CONTENT_CHANGE_CIPHER_SPEC:
        # 일부 서버는 ChangeCipherSpec 을 먼저 보냄. 그 다음 record 가 본 Handshake.
        try:
            content_type, payload = _read_record(sock)
        except (ConnectionError, OSError) as e:
            return ProbeResult(
                hostname, ProbeStatus.ERROR_TCP_CLOSE, detail=str(e)[:80]
            )

    if content_type != TLS_CONTENT_HANDSHAKE:
        return ProbeResult(
            hostname,
            ProbeStatus.ERROR_PARSE,
            detail=f"unexpected record content_type={content_type}",
        )

    # Handshake header (1 byte type + 24-bit length)
    if len(payload) < 4:
        return ProbeResult(hostname, ProbeStatus.ERROR_PARSE, detail="short hs header")
    msg_type = payload[0]
    if msg_type != HS_SERVER_HELLO:
        return ProbeResult(
            hostname,
            ProbeStatus.ERROR_PARSE,
            detail=f"unexpected handshake msg_type={msg_type}",
        )

    hs_body = payload[4:]
    try:
        server_random, exts = _parse_server_hello(hs_body)
    except (struct.error, IndexError) as e:
        return ProbeResult(hostname, ProbeStatus.ERROR_PARSE, detail=f"parse: {e}")

    is_hrr = server_random == HRR_RANDOM
    selected = _selected_group(exts)

    if selected == GROUP_X25519MLKEM768:
        return ProbeResult(
            hostname,
            ProbeStatus.SUPPORTED,
            selected_group=selected,
            is_hrr=is_hrr,
            detail=f"selected X25519MLKEM768 via {'HRR' if is_hrr else 'ServerHello'}",
        )
    if selected is None:
        return ProbeResult(
            hostname,
            ProbeStatus.ERROR_PARSE,
            is_hrr=is_hrr,
            detail=f"no key_share in {'HRR' if is_hrr else 'ServerHello'} extensions "
                   f"(ext types: {sorted(exts.keys())})",
        )
    return ProbeResult(
        hostname,
        ProbeStatus.NOT_SUPPORTED_OTHER_GROUP,
        selected_group=selected,
        is_hrr=is_hrr,
        detail=f"server picked group 0x{selected:04X} instead",
    )


# ─── CLI ───────────────────────────────────────────────────────────────────

@dataclass
class BatchTarget:
    hostname: str
    name: str
    sector: str


def _parse_batch_csv(path: Path) -> list[BatchTarget]:
    targets: list[BatchTarget] = []
    with path.open(encoding="utf-8") as f:
        for row in csv.DictReader(f):
            h = (row.get("hostname") or "").strip()
            if not h or h.startswith("#"):
                continue
            targets.append(
                BatchTarget(
                    hostname=h,
                    name=(row.get("name") or h).strip(),
                    sector=(row.get("sector") or "").strip(),
                )
            )
    return targets


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(
        prog="scanner.pqc_probe",
        description="X25519MLKEM768 협상 probe (Phase 2)",
    )
    grp = p.add_mutually_exclusive_group(required=True)
    grp.add_argument("--hostname", help="단일 도메인")
    grp.add_argument("--batch", type=Path, help="CSV (hostname,name,sector)")
    p.add_argument("--out", type=Path, default=Path("scanner/out/pqc-probe-results.json"))
    p.add_argument("--timeout", type=float, default=8.0)
    args = p.parse_args(argv if argv is not None else sys.argv[1:])

    if args.hostname:
        r = probe_pqc_support(args.hostname, timeout=args.timeout)
        print(json.dumps(r.to_dict(), ensure_ascii=False, indent=2))
        return 0 if r.status == ProbeStatus.SUPPORTED else 1

    # Batch
    targets = _parse_batch_csv(args.batch)
    print(f"[pqc-probe] {len(targets)} targets, timeout={args.timeout}s ...", file=sys.stderr)
    results = []
    for i, t in enumerate(targets, 1):
        r = probe_pqc_support(t.hostname, timeout=args.timeout)
        results.append(
            {**r.to_dict(), "name": t.name, "sector": t.sector}
        )
        marker = "✓" if r.status == ProbeStatus.SUPPORTED else (
            "·" if r.status.value.startswith("NOT_SUPPORTED") else "!"
        )
        print(
            f"[{i:>2}/{len(targets)}] {marker} {t.hostname:40} "
            f"{r.status.value:30} {r.detail[:70]}",
            file=sys.stderr,
        )

    envelope = {
        "measured_at": datetime.now(timezone.utc).isoformat(),
        "probe": "X25519MLKEM768 (0x11EC)",
        "sources": [
            "RFC 8446 TLS 1.3",
            "IANA TLS Named Groups (4588)",
            "draft-ietf-tls-ecdhe-mlkem",
            "Mozilla SSL Config v6.0 intermediate",
        ],
        "results": results,
    }
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(envelope, ensure_ascii=False, indent=2), encoding="utf-8")

    counts: dict[str, int] = {}
    for r in results:
        counts[r["status"]] = counts.get(r["status"], 0) + 1
    print("\n[pqc-probe] 통계:", file=sys.stderr)
    for k, v in sorted(counts.items(), key=lambda kv: -kv[1]):
        print(f"  {k:<35} {v}", file=sys.stderr)
    print(f"[pqc-probe] saved → {args.out}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
