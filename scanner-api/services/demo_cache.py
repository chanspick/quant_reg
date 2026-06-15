"""Demo cache fallback — SPEC-PQC-002 §7 / REQ-DEMO-001.

발표 시연 중 네트워크 장애 · sslyze 차단 · LLM timeout 등으로 실시간 측정이
실패할 때를 대비해 사전 측정 결과를 디스크에 보관하고 환경변수
``DEMO_CACHE_FALLBACK=1`` 일 때만 활성화한다.

왜 별도 경로인가:
- ``scanner-api/cache.py`` (Phase A-3, 5분 TTL in-memory) 와는 다른 목적
  (사전 큐레이션 vs 런타임 hot cache).
- routes/scan.py 의 ``_do_scan`` 호출 전에 lookup 해서 hit 시 subprocess 자체를
  스킵 — 발표 안전망.
- 정직성 게이트: ``cached=True`` 표시 + measuredAt 은 캐시 측정 시각 유지.
  사용자에게 "이건 실시간 측정 아님" 이 noted.

캐시 파일 구조 (``demo_cache/{hostname}.*``):
- ``{hostname}.partial.json`` — scanner.measure partial Domain JSON
- ``{hostname}.meta.json``    — scoring breakdown meta
- ``{hostname}.probe.json``   — pqc_probe stdout (선택 — 미존재 시 phase2=ERROR)

보안 영향:
- ``DEMO_CACHE_FALLBACK=0`` (기본값) 일 때 본 모듈은 호출되지 않음 — 일상 운영
  사용자는 항상 실시간 측정만 보게 된다.
- ``=1`` 일 때만 3개 사전 도메인 (lgchem.com / www.naver.com / www.kakao.com)
  에 한해 즉시 응답. 다른 도메인은 그대로 실시간 측정으로 폴백.
"""

from __future__ import annotations

import json
import logging
import os
from pathlib import Path
from typing import Any

logger = logging.getLogger("scanner_api.demo_cache")

# 왜: 컨테이너 (/app/demo_cache) + 로컬 (scanner-api/demo_cache) 양쪽 자동 감지
_DEFAULT_CACHE_DIRS: tuple[Path, ...] = (
    Path("/app/demo_cache"),
    Path(__file__).resolve().parent.parent / "demo_cache",
)


def _resolve_cache_dir() -> Path | None:
    """존재하는 첫 demo_cache 디렉토리 반환. 환경변수 ``DEMO_CACHE_DIR`` 우선."""
    override = os.environ.get("DEMO_CACHE_DIR")
    if override:
        p = Path(override)
        if p.is_dir():
            return p
    for candidate in _DEFAULT_CACHE_DIRS:
        if candidate.is_dir():
            return candidate
    return None


def is_enabled() -> bool:
    """``DEMO_CACHE_FALLBACK=1`` 이면서 디렉토리가 존재할 때만 True."""
    if os.environ.get("DEMO_CACHE_FALLBACK", "0") != "1":
        return False
    return _resolve_cache_dir() is not None


def lookup(hostname: str) -> dict[str, Any] | None:
    """hostname 에 해당하는 사전 캐시가 있으면 dict 반환, 없으면 None.

    Returns
    -------
    ``{"partial": <dict>, "meta": <dict>, "probe": <dict | None>}`` 또는 ``None``.

    호출 측 (``routes/scan.py``) 은 이 dict 를 받아 ``_build_success_response`` 로
    바로 합성하면 된다. measure_wrapper / probe_wrapper subprocess 는 건너뜀.
    """
    if not is_enabled():
        return None

    cache_dir = _resolve_cache_dir()
    if cache_dir is None:  # is_enabled() 통과 후이지만 race 방어
        return None

    partial_path = cache_dir / f"{hostname}.partial.json"
    meta_path = cache_dir / f"{hostname}.meta.json"
    probe_path = cache_dir / f"{hostname}.probe.json"

    if not (partial_path.exists() and meta_path.exists()):
        return None

    try:
        partial = json.loads(partial_path.read_text(encoding="utf-8"))
        meta = json.loads(meta_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        logger.warning("demo_cache 파싱 실패 (%s): %s", hostname, exc)
        return None

    probe: dict[str, Any] | None = None
    if probe_path.exists():
        try:
            probe = json.loads(probe_path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as exc:
            logger.warning(
                "demo_cache probe 파싱 실패 (%s): %s — Phase2=ERROR 로 fallback",
                hostname,
                exc,
            )

    logger.info(
        "demo_cache HIT (%s) — DEMO_CACHE_FALLBACK 발표 안전망 활성", hostname
    )
    return {"partial": partial, "meta": meta, "probe": probe}
