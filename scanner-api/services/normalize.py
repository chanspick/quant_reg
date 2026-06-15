"""hostname 정규화·검증 — SPEC §3.1 / REQ-WEB-002.

서버측 이중 게이트. 잘못된 입력은 ``HostnameValidationError`` 로 표시하고,
호출자(라우트 핸들러)가 4xx 로 변환한다.

검증 규칙 (SPEC §3.1):
- 길이 4-255 자 (정규화 후)
- ASCII letters · digits · hyphens · dots 만 허용
- 최소 1개의 점(.) 포함
- IPv4 / IPv6 거부 (도메인만)
- 정규화: 소문자, ``https://`` / ``http://`` 제거, 공백 trim, 후행 슬래시 제거
"""

from __future__ import annotations

import ipaddress
import re

# 허용 문자: ASCII 영숫자 + 하이픈 + 점
_HOSTNAME_CHAR_RE = re.compile(r"^[A-Za-z0-9.\-]+$")

# DNS 라벨 검증 — 각 라벨이 1-63자, 시작·끝이 영숫자, 가운데에 하이픈 허용
_DNS_LABEL_RE = re.compile(r"^[A-Za-z0-9]([A-Za-z0-9\-]{0,61}[A-Za-z0-9])?$")

# 정규화 단계에서 벗겨낼 스킴 prefix
_SCHEME_PREFIXES = ("https://", "http://")


class HostnameValidationError(ValueError):
    """검증 실패. ``code`` 는 클라이언트에 노출 가능한 에러 코드.

    code 종류:
    - ``DNS_INVALID_FORMAT`` — DNS 라벨 형식 위반 (시작·끝 하이픈, 빈 라벨 등)
    - ``IS_IP_ADDRESS``       — IPv4/IPv6 거부
    - ``TOO_SHORT``           — 4자 미만
    - ``TOO_LONG``            — 255자 초과
    - ``BAD_CHARS``           — 허용 외 문자 포함
    - ``NO_DOT``              — 점(.) 없음 (단일 라벨 거부)
    - ``EMPTY``               — 정규화 후 빈 문자열
    """

    def __init__(self, code: str, message: str) -> None:
        super().__init__(message)
        self.code = code
        self.message = message


def _is_ip_address(value: str) -> bool:
    """IPv4 / IPv6 여부."""
    try:
        ipaddress.ip_address(value)
        return True
    except ValueError:
        pass
    # IPv6 형식의 단순 검사 (bracket 제거 후 재시도)
    if value.startswith("[") and value.endswith("]"):
        try:
            ipaddress.ip_address(value[1:-1])
            return True
        except ValueError:
            return False
    return False


def normalize_hostname(raw: str) -> str:
    """hostname 정규화 + 검증.

    성공 시 ASCII 소문자 hostname 반환.
    실패 시 ``HostnameValidationError`` raise.
    """
    if raw is None:
        raise HostnameValidationError("EMPTY", "hostname 이 비어 있습니다.")

    # 1) 공백 trim + 소문자
    value = raw.strip().lower()
    if not value:
        raise HostnameValidationError("EMPTY", "hostname 이 비어 있습니다.")

    # 2) scheme prefix 제거 (https:// / http://)
    for prefix in _SCHEME_PREFIXES:
        if value.startswith(prefix):
            value = value[len(prefix):]
            break

    # 3) 경로/쿼리/포트 제거 — 첫 '/' 또는 '?' 또는 ':' 앞까지
    for sep in ("/", "?", "#"):
        idx = value.find(sep)
        if idx >= 0:
            value = value[:idx]

    # 4) 후행 점·하이픈은 보존하면서 후행 슬래시만 제거 (위에서 이미 제거됨)
    value = value.strip(".")  # 시작·끝의 점은 제거 (빈 라벨 방지)

    if not value:
        raise HostnameValidationError("EMPTY", "정규화 후 hostname 이 비어 있습니다.")

    # 5) 포트 분리: 'example.com:8443' → 'example.com'
    if ":" in value:
        # IPv6 가능성도 있지만 위에서 IPv6 거부 처리로 충분
        value = value.split(":", 1)[0]

    # 6) 길이 검증 (SPEC §3.1: 4-255)
    if len(value) < 4:
        raise HostnameValidationError(
            "TOO_SHORT",
            f"hostname 은 최소 4자 이상이어야 합니다 (입력: {len(value)}자).",
        )
    if len(value) > 255:
        raise HostnameValidationError(
            "TOO_LONG",
            f"hostname 은 최대 255자까지 허용됩니다 (입력: {len(value)}자).",
        )

    # 7) IP 주소 거부
    if _is_ip_address(value):
        raise HostnameValidationError(
            "IS_IP_ADDRESS",
            "IP 주소는 거부됩니다. 도메인 이름만 허용됩니다.",
        )

    # 8) 허용 문자 검사
    if not _HOSTNAME_CHAR_RE.match(value):
        raise HostnameValidationError(
            "BAD_CHARS",
            "hostname 은 ASCII 영숫자, 하이픈(-), 점(.) 만 허용됩니다.",
        )

    # 9) 최소 1개 점 포함 (단일 라벨 거부)
    if "." not in value:
        raise HostnameValidationError(
            "NO_DOT",
            "hostname 은 최소 1개의 점(.) 을 포함해야 합니다.",
        )

    # 10) 각 DNS 라벨 형식 검증
    labels = value.split(".")
    for label in labels:
        if not label:
            raise HostnameValidationError(
                "DNS_INVALID_FORMAT",
                "빈 DNS 라벨이 포함되어 있습니다 (연속된 점).",
            )
        if not _DNS_LABEL_RE.match(label):
            raise HostnameValidationError(
                "DNS_INVALID_FORMAT",
                f"DNS 라벨 '{label}' 가 형식 위반입니다 (시작·끝은 영숫자, "
                "1-63자, 가운데 하이픈 허용).",
            )

    return value
