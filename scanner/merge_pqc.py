"""Phase 2 probe 결과를 domains.json 에 반영.

입력:
  - public/data/domains.json (Phase 1 측정 결과 47개)
  - scanner/out/pqc-probe-results.json (Phase 2 probe 결과 51개)

출력:
  - public/data/domains.json (in-place 갱신):
    * scores.hybridKem.value : SUPPORTED=100, NOT_SUPPORTED=15, OTHER=20, ERROR=30(유지)
    * pqc.keyExchange        : SUPPORTED='활성화' / NOT_SUPPORTED='미지원' / ERROR=기존
    * pqc.hybrid             : SUPPORTED='하이브리드' / NOT_SUPPORTED='미감지' / ERROR=기존
    * findings               : 각 도메인에 probe 결과 finding 1건 추가 (automated)
    * version, lastUpdated   : 갱신
"""

from __future__ import annotations

import json
import sys
from datetime import datetime, timezone
from pathlib import Path

DOMAINS_JSON = Path("public/data/domains.json")
PROBE_JSON = Path("scanner/out/pqc-probe-results.json")
PHASE2_VERSION_TAG = "0.6.0-phase2-pqc-merge"


def _score_for_status(status: str) -> int:
    """Phase 2 결과 → hybridKem 점수.

    SUPPORTED (HRR 확인)  → 100  ← Mozilla intermediate v6.0 부합
    NOT_SUPPORTED (alert) →  15  ← 명시적 거부
    NOT_SUPPORTED_OTHER_GROUP → 20
    ERROR_*                → 30  ← Phase 1 default (측정 불가)
    """
    if status == "SUPPORTED":
        return 100
    if status == "NOT_SUPPORTED":
        return 15
    if status == "NOT_SUPPORTED_OTHER_GROUP":
        return 20
    return 30  # ERROR_* 유지


def _finding_for_result(probe: dict) -> dict:
    status = probe["status"]
    detail = probe.get("detail", "")
    if status == "SUPPORTED":
        is_hrr = " (HRR)" if probe.get("is_hrr") else ""
        text = (
            f"Phase 2 직접 TLS 1.3 probe: X25519MLKEM768 (0x11EC, Mozilla v6.0) 협상 응답"
            f"{is_hrr}."
        )
    elif status in ("NOT_SUPPORTED", "NOT_SUPPORTED_OTHER_GROUP"):
        text = (
            f"Phase 2 직접 TLS 1.3 probe: X25519MLKEM768 협상 거부 ({detail[:60]})."
        )
    elif status == "ERROR_NETWORK":
        text = (
            f"Phase 2 직접 TLS 1.3 probe 차단 — 외부 정책 추정 ({detail[:60]})."
        )
    elif status == "ERROR_TIMEOUT":
        text = "Phase 2 직접 TLS 1.3 probe timeout."
    else:
        text = f"Phase 2 probe: {status} ({detail[:60]})"
    return {"text": text, "source": "automated"}


# Phase 1 기본 권고 (auto_recommendations 가 모든 도메인에 추가하는 텍스트).
# Phase 2 SUPPORTED 도메인에서는 이 두 권고를 제거하고 후속 권고로 교체한다.
# "로드맵 수립" 은 SUPPORTED 도메인 fact 와 모순되므로 함께 제거.
_PHASE1_PQC_REC = (
    "X25519MLKEM768 (0x11EC) 협상 활성화 검토 — Mozilla SSL "
    "Config v6.0 intermediate 등재, draft-ietf-tls-ecdhe-mlkem "
    "표준화 진행 중. CDN/load balancer 단에서 우선 시범 적용 권장."
)
_PHASE1_ROADMAP_REC = (
    "PQC 전환 로드맵 수립 — NIST PQC 표준 FIPS 203 (ML-KEM) / "
    "204 (ML-DSA) / 205 (SLH-DSA) 기준, 김의결·안혁 2025 의 "
    "한국 적용 권고 참조."
)
_PHASE2_SUPPORTED_REC = (
    "Hybrid KEM (X25519+ML-KEM-768) 운영 안정화 — 클라이언트 호환성 "
    "모니터링·핸드셰이크 latency 측정·PQC-only 마이그레이션 일정 수립. "
    "HNDL 위협 모델상 선도 사례."
)


def _swap_pqc_recommendation_if_supported(rec_list: list[dict]) -> None:
    """Phase 2 SUPPORTED 도메인의 권고 배열을 in-place 갱신.

    Phase 1 의 두 권고("X25519MLKEM768 검토" + "PQC 로드맵 수립") 를 제거하고,
    "Hybrid KEM 운영 안정화 + PQC-only 마이그레이션" 후속 권고로 교체.
    중복 방지: 이미 후속 권고가 있으면 추가 안 함.

    "로드맵 수립" 까지 제거하는 이유:
        Phase 2 SUPPORTED 는 이미 PQC 협상 활성화된 상태이므로 "roadmap required"
        라는 권고가 fact 와 모순. 후속 권고만 남기는 게 정직성 일관.
    """
    obsolete = {_PHASE1_PQC_REC, _PHASE1_ROADMAP_REC}
    rec_list[:] = [r for r in rec_list if r.get("text") not in obsolete]
    existing_texts = {r.get("text") for r in rec_list}
    if _PHASE2_SUPPORTED_REC not in existing_texts:
        rec_list.append({"text": _PHASE2_SUPPORTED_REC, "source": "automated"})


def _normalize_host(url_or_host: str) -> str:
    """https://www.foo.com → www.foo.com / foo.com → foo.com (lowercase, no scheme/path)."""
    h = url_or_host.lower()
    if h.startswith("https://"):
        h = h[8:]
    elif h.startswith("http://"):
        h = h[7:]
    return h.split("/", 1)[0]


def main() -> int:
    if not DOMAINS_JSON.exists():
        print(f"[!] {DOMAINS_JSON} 없음", file=sys.stderr)
        return 1
    if not PROBE_JSON.exists():
        print(f"[!] {PROBE_JSON} 없음 — scanner.pqc_probe --batch 먼저 실행", file=sys.stderr)
        return 1

    env = json.loads(DOMAINS_JSON.read_text(encoding="utf-8"))
    probe_env = json.loads(PROBE_JSON.read_text(encoding="utf-8"))
    probes_by_host = {
        _normalize_host(r["hostname"]): r for r in probe_env.get("results", [])
    }

    updated = 0
    upgraded_to_100 = []
    confirmed_not_supported = []
    error_kept_default = []
    unmatched = []

    for rec in env.get("domains", []):
        host = _normalize_host(rec.get("url") or "")
        probe = probes_by_host.get(host)
        if not probe:
            unmatched.append(rec.get("name"))
            continue

        status = probe["status"]
        new_score = _score_for_status(status)
        old_score = rec["scores"]["hybridKem"]["value"]
        rec["scores"]["hybridKem"]["value"] = new_score
        rec["scores"]["hybridKem"]["source"] = "automated"

        if status == "SUPPORTED":
            rec["pqc"]["keyExchange"] = "활성화"
            rec["pqc"]["hybrid"] = "하이브리드"
            # Phase 2 SUPPORTED: Phase 1 권고를 후속 권고로 교체
            _swap_pqc_recommendation_if_supported(rec.setdefault("recommendations", []))
            upgraded_to_100.append(rec.get("name"))
        elif status in ("NOT_SUPPORTED", "NOT_SUPPORTED_OTHER_GROUP"):
            rec["pqc"]["keyExchange"] = "미지원"
            rec["pqc"]["hybrid"] = "미감지"
            confirmed_not_supported.append(rec.get("name"))
        else:
            # ERROR_* — Phase 1 기본값 유지
            error_kept_default.append(rec.get("name"))

        # 자동 finding 추가 (중복 방지: 같은 text 가 이미 있으면 skip)
        new_finding = _finding_for_result(probe)
        existing_texts = {f.get("text") for f in rec.get("findings", [])}
        if new_finding["text"] not in existing_texts:
            rec.setdefault("findings", []).append(new_finding)

        updated += 1

    env["version"] = PHASE2_VERSION_TAG
    env["lastUpdated"] = datetime.now(timezone.utc).date().isoformat()
    DOMAINS_JSON.write_text(
        json.dumps(env, ensure_ascii=False, indent=2), encoding="utf-8"
    )

    print(f"[merge-pqc] {updated}/{len(env.get('domains', []))} 레코드 갱신")
    print(f"  ✓ SUPPORTED → hybridKem=100 ({len(upgraded_to_100)}): "
          + ", ".join(upgraded_to_100[:6])
          + (f" ... +{len(upgraded_to_100)-6}" if len(upgraded_to_100) > 6 else ""))
    print(f"  · NOT_SUPPORTED → hybridKem=15 ({len(confirmed_not_supported)})")
    print(f"  ! ERROR (Phase 1 기본값 30 유지) ({len(error_kept_default)})")
    if unmatched:
        print(f"  ? probe 결과 없음 ({len(unmatched)}): {', '.join(unmatched[:6])}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
