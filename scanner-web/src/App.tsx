import { useCallback, useMemo, useState } from 'react';
import { ScanForm } from './components/ScanForm';
import { LoadingProgress } from './components/LoadingProgress';
import { ResultDohae } from './components/ResultDohae';
import { HeroSection } from './components/HeroSection';
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
  // loading 중 hostname 표시용 — useScan 은 loading 시 data=null
  const [pendingHostname, setPendingHostname] = useState('');
  const tier = useMemo(() => readTier(), []);

  const handleScan = useCallback(
    (hostname: string, selectedSector: Sector) => {
      setSector(selectedSector);
      setPendingHostname(hostname);
      void scan(hostname);
    },
    [scan],
  );

  const handleScanAgain = useCallback(() => {
    reset();
    setPendingHostname('');
  }, [reset]);

  return (
    <div className="min-h-screen bg-coal text-ink">
      <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-12">
        {/* Site header */}
        <header>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h1 className="font-serif text-2xl font-bold tracking-tight text-ink sm:text-3xl">
              PQC 준비도 스캐너
            </h1>
            <span className="font-mono text-[10px] text-faint">
              양자컴퓨팅 강의 기말 프로젝트
            </span>
          </div>
        </header>

        {/* 결과가 없을 때만 Hero 노출 (스캔 중·완료 시 스크롤 최소화) */}
        {status === 'idle' && (
          <HeroSection
            onQuickScan={(hostname) => handleScan(hostname, sector)}
            disabled={false}
          />
        )}

        {/* Form (항상 노출) */}
        <section
          aria-label="hostname 입력"
          className="rounded-lg border border-edge bg-surface p-5"
        >
          <ScanForm
            onScan={handleScan}
            disabled={status === 'loading'}
            initialValue={data?.hostname ?? pendingHostname}
            initialSector={sector}
          />
        </section>

        {/* Loading */}
        {status === 'loading' && startedAt !== null && (
          <LoadingProgress
            startedAt={startedAt}
            hostname={pendingHostname || data?.hostname || '...'}
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

        {/* Footer */}
        <footer className="mt-4 border-t border-edge pt-5 font-sans text-xs text-faint">
          <p>
            발표 시연용 데모 — 진단 · 감사 용도 금지.{' '}
            <code className="font-mono">https://</code> 제거 · 소문자 변환 · IP 거부, 최대 60초
            (sslyze + PQC probe + Claude Sonnet 4.6).
          </p>
          <p className="mt-1.5">
            데이터 출처 인용 확인:{' '}
            <span className="font-mono">각 측정값 옆 SourceChip 참조</span>
            {' · '}
            <span className="font-mono">점수 근거 &gt; 자세히</span> 에서 rule trace 확인 가능.
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
