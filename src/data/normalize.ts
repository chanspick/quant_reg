import type { HostnameValidationCode } from './scannerSchema';

/**
 * SPEC-PQC-002 §3.1 / REQ-WEB-002 — 클라이언트 정규화·검증.
 *
 * 백엔드(scanner-api/services/normalize.py)와 1:1 정합:
 *  - 동일한 정규화 순서: trim → lower → scheme 제거 → path/port 제거 → 점 strip
 *  - 동일한 길이(4-255), 점 필수, IP 거부, DNS 라벨 형식
 *  - 동일한 에러 코드 (DNS_INVALID_FORMAT/IS_IP_ADDRESS/TOO_SHORT/...)
 *
 * 백엔드도 같은 검증을 수행하므로 본 함수는 UX 개선용 (서버 왕복 회피).
 * 백엔드만 신뢰하는 입력 검증의 단일 진실은 services/normalize.py.
 */

export class HostnameValidationError extends Error {
  readonly code: HostnameValidationCode;

  constructor(code: HostnameValidationCode, message: string) {
    super(message);
    this.name = 'HostnameValidationError';
    this.code = code;
  }
}

// 허용 문자: ASCII 영숫자 + 하이픈 + 점 (백엔드 _HOSTNAME_CHAR_RE)
const HOSTNAME_CHAR_RE = /^[A-Za-z0-9.\-]+$/;

// DNS 라벨: 1-63자, 시작·끝 영숫자, 가운데 하이픈 허용 (백엔드 _DNS_LABEL_RE)
const DNS_LABEL_RE = /^[A-Za-z0-9]([A-Za-z0-9-]{0,61}[A-Za-z0-9])?$/;

const SCHEME_PREFIXES = ['https://', 'http://'] as const;

// IPv4 단순 매처 (모든 라벨이 1-3 자리 숫자, 4개 분할)
const IPV4_RE = /^(\d{1,3}\.){3}\d{1,3}$/;

function isIpAddress(value: string): boolean {
  if (IPV4_RE.test(value)) {
    return value.split('.').every((p) => {
      const n = Number(p);
      return Number.isFinite(n) && n >= 0 && n <= 255;
    });
  }
  // IPv6: 콜론 포함 — 브라우저에서 [::1] 같은 입력은 거의 없지만 방어
  if (value.includes(':')) return true;
  return false;
}

/** 백엔드 normalize_hostname 의 TS 미러. 성공 시 정규화된 hostname 반환. */
export function normalizeHostname(raw: string | null | undefined): string {
  if (raw === null || raw === undefined) {
    throw new HostnameValidationError('EMPTY', 'hostname 이 비어 있습니다.');
  }

  // 1) trim + lower
  let value = raw.trim().toLowerCase();
  if (!value) {
    throw new HostnameValidationError('EMPTY', 'hostname 이 비어 있습니다.');
  }

  // 2) scheme prefix 제거
  for (const prefix of SCHEME_PREFIXES) {
    if (value.startsWith(prefix)) {
      value = value.slice(prefix.length);
      break;
    }
  }

  // 3) 경로/쿼리/프래그먼트 제거 — 첫 '/' '?' '#' 앞까지
  for (const sep of ['/', '?', '#'] as const) {
    const idx = value.indexOf(sep);
    if (idx >= 0) {
      value = value.slice(0, idx);
    }
  }

  // 4) 시작·끝 점 strip (빈 라벨 방지)
  value = value.replace(/^\.+|\.+$/g, '');

  if (!value) {
    throw new HostnameValidationError(
      'EMPTY',
      '정규화 후 hostname 이 비어 있습니다.',
    );
  }

  // 5) IPv6 가능성을 위해 포트 분리 전 IP 체크. 단순 host:port 면 호스트만 추출
  //    백엔드와 동일하게 ':' 이 있으면 먼저 자른다 (IPv6 거부와 동시 처리)
  if (value.includes(':')) {
    // IPv6 거부 우선 — 콜론이 ::처럼 여러 개면 IPv6 로 간주
    if (value.includes('::') || value.split(':').length > 2) {
      throw new HostnameValidationError(
        'IS_IP_ADDRESS',
        'IP 주소는 거부됩니다. 도메인 이름만 허용됩니다.',
      );
    }
    // host:port → host 만
    const head = value.split(':', 1)[0];
    value = head ?? '';
  }

  // 6) 길이 (백엔드 4-255)
  if (value.length < 4) {
    throw new HostnameValidationError(
      'TOO_SHORT',
      `hostname 은 최소 4자 이상이어야 합니다 (입력: ${value.length}자).`,
    );
  }
  if (value.length > 255) {
    throw new HostnameValidationError(
      'TOO_LONG',
      `hostname 은 최대 255자까지 허용됩니다 (입력: ${value.length}자).`,
    );
  }

  // 7) IPv4 거부
  if (isIpAddress(value)) {
    throw new HostnameValidationError(
      'IS_IP_ADDRESS',
      'IP 주소는 거부됩니다. 도메인 이름만 허용됩니다.',
    );
  }

  // 8) 허용 문자
  if (!HOSTNAME_CHAR_RE.test(value)) {
    throw new HostnameValidationError(
      'BAD_CHARS',
      'hostname 은 ASCII 영숫자, 하이픈(-), 점(.) 만 허용됩니다.',
    );
  }

  // 9) 점 필수
  if (!value.includes('.')) {
    throw new HostnameValidationError(
      'NO_DOT',
      'hostname 은 최소 1개의 점(.) 을 포함해야 합니다.',
    );
  }

  // 10) DNS 라벨 형식
  for (const label of value.split('.')) {
    if (!label) {
      throw new HostnameValidationError(
        'DNS_INVALID_FORMAT',
        '빈 DNS 라벨이 포함되어 있습니다 (연속된 점).',
      );
    }
    if (!DNS_LABEL_RE.test(label)) {
      throw new HostnameValidationError(
        'DNS_INVALID_FORMAT',
        `DNS 라벨 '${label}' 가 형식 위반입니다 (시작·끝은 영숫자, 1-63자, 가운데 하이픈 허용).`,
      );
    }
  }

  return value;
}
