import { useCallback, useState } from 'react';
import { ScanResponseSchema, type ScanResponse } from './scannerSchema';

/**
 * SPEC-PQC-002 §4.2 — POST /api/scan 호출 훅.
 *
 * VITE_SCANNER_API_URL 동작:
 *  - dev (vite dev): 보통 http://localhost:8000 (uvicorn). .env.development 에서 지정
 *  - prod (Railway): Railway 가 같은 서비스에 frontend+API 통합 배포한다면 빈 문자열 → 상대 경로
 *  - 미지정 시 fallback: 'http://localhost:8000'
 *
 * timeout: 65초 (백엔드 60초 + 네트워크 여유).
 *
 * 백엔드 응답 정합:
 *  - 200: ScanResponse JSON. zod 검증 통과 → success 상태
 *  - 200 + errors[]: partial/blocked/error. zod 통과는 같으나 status 로 분기 (호출자)
 *  - 4xx: { detail: { code, message } } — 검증 실패 (REQ-API-001)
 *  - 5xx: { detail: { code, message } } — 내부 오류
 *  - timeout/network: AbortError or TypeError
 */

const FALLBACK_API_URL = 'http://localhost:8000';
const REQUEST_TIMEOUT_MS = 65_000;

function getApiBaseUrl(): string {
  // import.meta.env 는 vite 가 빌드 타임에 치환
  const fromEnv = import.meta.env.VITE_SCANNER_API_URL as string | undefined;
  if (fromEnv === undefined) return FALLBACK_API_URL;
  // 빈 문자열은 의도적으로 상대 경로(same-origin) 모드
  return fromEnv;
}

export interface ScanError {
  /** 'VALIDATION' | 'TIMEOUT' | 'NETWORK' | 'SERVER' | 'PARSE' */
  kind: 'VALIDATION' | 'TIMEOUT' | 'NETWORK' | 'SERVER' | 'PARSE';
  /** 백엔드 detail.code 가 있으면 그대로, 없으면 본 훅 분류 코드 */
  code: string;
  message: string;
  /** 디버깅용 원본 (zod issue / Response status 등) */
  cause?: unknown;
}

export interface UseScanState {
  status: 'idle' | 'loading' | 'success' | 'error';
  data: ScanResponse | null;
  error: ScanError | null;
  /** 측정 시작 시각 (epoch ms). LoadingProgress 단계 추정에 사용. */
  startedAt: number | null;
}

const INITIAL_STATE: UseScanState = {
  status: 'idle',
  data: null,
  error: null,
  startedAt: null,
};

async function postScan(
  hostname: string,
  signal: AbortSignal,
): Promise<ScanResponse> {
  const base = getApiBaseUrl();
  const url = `${base}/api/scan`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ hostname }),
    signal,
  });

  // 4xx/5xx: 백엔드 detail 구조
  if (!res.ok) {
    let detailCode = `HTTP_${res.status}`;
    let detailMessage = `요청 실패 (HTTP ${res.status})`;
    try {
      const errBody = (await res.json()) as { detail?: { code?: string; message?: string } };
      if (errBody?.detail?.code) detailCode = errBody.detail.code;
      if (errBody?.detail?.message) detailMessage = errBody.detail.message;
    } catch {
      // JSON 파싱 실패 — 기본 메시지 유지
    }
    const kind = res.status >= 500 ? 'SERVER' : 'VALIDATION';
    const err: ScanError = {
      kind,
      code: detailCode,
      message: detailMessage,
      cause: res.status,
    };
    throw err;
  }

  // 200: zod 검증
  const json: unknown = await res.json();
  const parsed = ScanResponseSchema.safeParse(json);
  if (!parsed.success) {
    const err: ScanError = {
      kind: 'PARSE',
      code: 'SCHEMA_MISMATCH',
      message:
        '백엔드 응답이 스키마와 일치하지 않습니다. scanner-api 버전을 확인하세요.',
      cause: parsed.error.issues,
    };
    throw err;
  }
  return parsed.data;
}

export function useScan(): UseScanState & {
  scan: (hostname: string) => Promise<void>;
  reset: () => void;
} {
  const [state, setState] = useState<UseScanState>(INITIAL_STATE);

  const reset = useCallback(() => {
    setState(INITIAL_STATE);
  }, []);

  const scan = useCallback(async (hostname: string) => {
    setState({
      status: 'loading',
      data: null,
      error: null,
      startedAt: Date.now(),
    });

    const controller = new AbortController();
    const timer = setTimeout(() => {
      controller.abort();
    }, REQUEST_TIMEOUT_MS);

    try {
      const data = await postScan(hostname, controller.signal);
      setState({
        status: 'success',
        data,
        error: null,
        startedAt: null,
      });
    } catch (raw) {
      let err: ScanError;
      if (raw instanceof DOMException && raw.name === 'AbortError') {
        err = {
          kind: 'TIMEOUT',
          code: 'CLIENT_TIMEOUT',
          message: `${Math.round(REQUEST_TIMEOUT_MS / 1000)}초 내에 응답이 도착하지 않았습니다.`,
          cause: raw,
        };
      } else if (raw instanceof TypeError) {
        // fetch network failure (CORS, DNS, refused)
        err = {
          kind: 'NETWORK',
          code: 'NETWORK_FAIL',
          message:
            '서버에 접속할 수 없습니다. scanner-api 가 실행 중인지, CORS 설정을 확인하세요.',
          cause: raw,
        };
      } else if (isScanError(raw)) {
        err = raw;
      } else {
        err = {
          kind: 'NETWORK',
          code: 'UNKNOWN',
          message: '알 수 없는 오류가 발생했습니다.',
          cause: raw,
        };
      }
      setState({
        status: 'error',
        data: null,
        error: err,
        startedAt: null,
      });
    } finally {
      clearTimeout(timer);
    }
  }, []);

  return { ...state, scan, reset };
}

function isScanError(value: unknown): value is ScanError {
  return (
    typeof value === 'object' &&
    value !== null &&
    'kind' in value &&
    'code' in value &&
    'message' in value
  );
}
