import { useCallback, useMemo, useState } from 'react';
import { ScanForm } from './components/ScanForm';
import { LoadingProgress } from './components/LoadingProgress';
import { ResultDohae } from './components/ResultDohae';
import { useScan, type ScanError } from './data/useScan';
import type { Sector } from './lib/sector';
import { readTier } from './lib/tier';

/**
 * SPEC-PQC-002 + SPEC-PQC-003 — 단일 페이지 SPA 진입점.
 *
 * 상태 머신 (useScan):
 *   idle    → ScanForm 만
 *   loading → ScanForm (disabled) + LoadingProgress (4단계)
 *   success → ScanForm + ResultDohae (① 등급 + ② 4축 + ③ 비교군 + ④ 발견 + ⑦ 액션플랜)
 *   error   → ScanForm + 에러 패널 (400/500/network/timeout 모두 동일 표면)
 *
 * SPEC-PQC-003: 섹터는 프론트 폼 상태(백엔드 미전송), tier 는 ?tier=paid 토글.
 */

export function App(): React.JSX.Element {
  const { status, data, error, startedAt, scan, reset } = useScan();
  const [sector, setSector] = useState<Sector>('일반');
  const tier = useMemo(() => readTier(), []);

  const handleScan = useCallback(
    (hostname: string, selectedSector: Sector) => {
      setSector(selectedSector);
      void scan(hostname);
    },
    [scan],
  );

  const handleScanAgain = useCallback(() => {
    reset();
  }, [reset]);

  return (
    <div className="min-h-screen bg-coal text-ink">
      <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-12">
        {/* Header */}
        <header>
          <h1 className="font-serif text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            동적 PQC 스캐너
          </h1>
          <p className="mt-2 font-sans text-sm leading-relaxed text-muted">
            도메인을 입력하면 TLS · 하이브리드 KEM · 인증서 운영 · 양자 위협 4축 점수를 측정합니다.
          </p>
        </header>

        {/* Form (항상 노출) */}
        <section
          aria-label="hostname 입력"
          className="rounded-lg border border-edge bg-surface p-5"
        >
          <ScanForm
            onScan={handleScan}
            disabled={status === 'loading'}
            initialValue={data?.hostname ?? ''}
            initialSector={sector}
          />
        </section>

        {/* Loading */}
        {status === 'loading' && startedAt !== null && (
          <LoadingProgress
            startedAt={startedAt}
            hostname={data?.hostname ?? '...'}
          />
        )}

        {/* Error */}
        {status === 'error' && error && <ErrorPanel error={error} />}

        {/* Result */}
        {status === 'success' && data && (
          <ResultDohae
            result={data}
            onScanAgain={handleScanAgain}
            sector={sector}
            tier={tier}
          />
        )}

        {/* Footer (항상 노출) — 전역 disclaimer 통합 1곳 */}
        <footer className="mt-8 border-t border-edge pt-5 font-sans text-xs text-faint">
          <p className="text-faint">
            발표 시연용 임시 데모 — 진단 · 감사 용도 금지. 입력은{' '}
            <code className="font-mono">https://</code> 제거 · 소문자 변환 · IP 거부, 최대 60초 소요
            (sslyze + PQC probe + Claude Sonnet 4.6).
          </p>
          <p className="mt-2">
            정적 47개 도메인 대시보드:{' '}
            <a
              href="https://quant-reg.vercel.app"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted underline hover:text-ink"
            >
              quant-reg.vercel.app
            </a>
          </p>
          <p className="mt-1">
            강의 개념 매핑:{' '}
            <code className="font-mono">
              .moai/specs/SPEC-PQC-001/presentation-concept-mapping.md
            </code>
          </p>
        </footer>
      </div>
    </div>
  );
}

// === Sub-component ============================================================

function ErrorPanel({ error }: { error: ScanError }): React.JSX.Element {
  const title =
    error.kind === 'VALIDATION'
      ? '입력 검증 실패 (HTTP 400)'
      : error.kind === 'TIMEOUT'
        ? '응답 시간 초과'
        : error.kind === 'NETWORK'
          ? '네트워크 오류'
          : error.kind === 'PARSE'
            ? '응답 스키마 오류'
            : '서버 오류 (HTTP 500)';

  return (
    <section
      role="alert"
      className="rounded-lg border border-risk bg-surface p-6"
    >
      <h3 className="font-serif text-base font-semibold text-risk">
        {title}
      </h3>
      <p className="mt-2 font-sans text-sm text-ink">
        {error.message}
      </p>
      <p className="mt-3 font-mono text-xs text-faint">
        code = {error.code}
      </p>
      {error.kind === 'NETWORK' && (
        <p className="mt-3 rounded border border-edge bg-surface-2 p-2 text-xs text-muted">
          scanner-api 가 실행 중인지 확인:{' '}
          <code className="font-mono">uvicorn main:app --port 8000</code>.
          dev 환경에서는{' '}
          <code className="font-mono">VITE_SCANNER_API_URL</code> 환경변수도 확인.
        </p>
      )}
    </section>
  );
}
