import { useCallback, useEffect, useState } from 'react';
import {
  parseDomainsEnvelope,
  type Domain,
  type DomainValidationResult,
} from './schema';

/**
 * SPEC-PQC-001 §3.3 (Data Layer):
 * - REQ-DAT-001: fetch /data/domains.json
 * - REQ-DAT-002: zod 스키마 검증
 * - REQ-DAT-003: loading / success / error 3-state
 * - REQ-DAT-006/007: 네트워크 실패 시 재시도
 * - REQ-DAT-011: 일부 레코드 검증 실패는 경고 로그 후 스킵
 */

export type DomainsState =
  | { status: 'loading' }
  | { status: 'success'; data: DomainValidationResult }
  | { status: 'error'; error: string };

export interface UseDomainsReturn {
  state: DomainsState;
  data: DomainValidationResult | null;
  domains: Domain[];
  lastUpdated: string | null;
  isLoading: boolean;
  error: string | null;
  retry: () => void;
}

const DEFAULT_URL = '/data/domains.json';

export function useDomains(url: string = DEFAULT_URL): UseDomainsReturn {
  const [state, setState] = useState<DomainsState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const run = async (): Promise<void> => {
      try {
        const response = await fetch(url, {
          headers: { Accept: 'application/json' },
        });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status} ${response.statusText}`);
        }
        const raw: unknown = await response.json();
        const parsed = parseDomainsEnvelope(raw);
        if (cancelled) return;

        if (parsed.invalidCount > 0) {
          // REQ-DAT-011: 일부 실패 시 콘솔 경고
          console.warn(
            `[useDomains] ${parsed.invalidCount}개 레코드가 검증 실패로 제외되었습니다.`,
            parsed.invalidReasons,
          );
        }
        setState({ status: 'success', data: parsed });
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : String(err);
        console.error('[useDomains] 데이터 로드 실패:', message);
        setState({ status: 'error', error: message });
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [url, attempt]);

  const retry = useCallback(() => {
    // retry 시 즉시 loading 상태로 표시 (REQ-DAT-006/007)
    setState({ status: 'loading' });
    setAttempt((n) => n + 1);
  }, []);

  return {
    state,
    data: state.status === 'success' ? state.data : null,
    domains: state.status === 'success' ? state.data.domains : [],
    lastUpdated: state.status === 'success' ? state.data.lastUpdated : null,
    isLoading: state.status === 'loading',
    error: state.status === 'error' ? state.error : null,
    retry,
  };
}
