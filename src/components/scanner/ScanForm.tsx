import { useState, useCallback, useEffect, type FormEvent } from 'react';
import { cn } from '@/lib/utils';
import {
  HostnameValidationError,
  normalizeHostname,
} from '@/data/normalize';
import { SECTOR_OPTIONS, type Sector } from '@/lib/sector';

/**
 * SPEC-PQC-002 REQ-WEB-001/002 + SPEC-PQC-003 §2.1 — hostname 입력 + 섹터 선택 + 제출.
 *
 * 흐름:
 *   1) 사용자가 'www.example.com' 또는 'https://www.example.com' 입력 (+ 선택: 섹터)
 *   2) onSubmit 에서 normalizeHostname 호출
 *   3) 성공 시 onScan(normalized, sector) — 부모가 useScan.scan 호출
 *   4) 실패 시 HostnameValidationError 메시지를 폼 안에 노출 (백엔드 왕복 회피)
 *
 * 섹터는 프론트엔드 폼 상태이며 백엔드로 전송하지 않는다 (ScanRequest 무변경, INTEG-1).
 */

interface ScanFormProps {
  onScan: (hostname: string, sector: Sector) => void;
  disabled: boolean;
  initialValue?: string;
  initialSector?: Sector;
}

export function ScanForm({
  onScan,
  disabled,
  initialValue = '',
  initialSector = '일반',
}: ScanFormProps): React.JSX.Element {
  const [raw, setRaw] = useState(initialValue);
  const [sector, setSector] = useState<Sector>(initialSector);
  const [error, setError] = useState<string | null>(null);

  // quick scan 등 외부에서 initialValue 가 변경되면 폼 값을 동기화
  useEffect(() => {
    if (initialValue) setRaw(initialValue);
  }, [initialValue]);

  const handleSubmit = useCallback(
    (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setError(null);
      try {
        const normalized = normalizeHostname(raw);
        onScan(normalized, sector);
      } catch (err) {
        if (err instanceof HostnameValidationError) {
          setError(err.message);
          return;
        }
        setError('알 수 없는 입력 오류가 발생했습니다.');
      }
    },
    [raw, sector, onScan],
  );

  return (
    <form
      onSubmit={handleSubmit}
      className="flex w-full flex-col gap-3"
      aria-label="PQC 스캔 폼"
    >
      <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-start">
        <div className="flex-1">
          <label
            htmlFor="hostname-input"
            className="sr-only"
          >
            도메인 입력
          </label>
          <input
            id="hostname-input"
            type="text"
            inputMode="url"
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            placeholder="예) www.example.com"
            value={raw}
            onChange={(e) => {
              setRaw(e.target.value);
              if (error) setError(null);
            }}
            disabled={disabled}
            aria-invalid={error !== null}
            aria-describedby={error ? 'hostname-error' : undefined}
            className={cn(
              'w-full rounded-md border bg-surface-2 px-4 py-3 text-base font-sans',
              'text-ink placeholder:text-faint',
              'transition-colors',
              'focus:border-muted focus:outline-none focus:ring-2 focus:ring-muted/30',
              'disabled:cursor-not-allowed disabled:opacity-50',
              error
                ? 'border-risk focus:border-risk focus:ring-risk/30'
                : 'border-edge',
            )}
          />
          {error && (
            <p
              id="hostname-error"
              role="alert"
              className="mt-2 font-sans text-sm text-risk"
            >
              {error}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={disabled || raw.trim().length === 0}
          className={cn(
            'shrink-0 rounded-md px-6 py-3 text-base font-sans font-semibold transition-colors',
            'bg-ink text-coal',
            'hover:bg-muted',
            'focus:outline-none focus:ring-2 focus:ring-muted/40',
            'disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-faint',
          )}
        >
          스캔 시작
        </button>
      </div>

      {/* 섹터 선택 (선택 사항, 프론트 폼 상태 — 백엔드 미전송) */}
      <div className="flex items-center gap-2">
        <label
          htmlFor="sector-select"
          className="font-sans text-xs font-medium text-muted"
        >
          업종 (선택)
        </label>
        <select
          id="sector-select"
          value={sector}
          onChange={(e) => setSector(e.target.value as Sector)}
          disabled={disabled}
          className={cn(
            'rounded-md border border-edge bg-surface-2 px-3 py-1.5 text-sm font-sans',
            'text-ink transition-colors',
            'focus:border-muted focus:outline-none focus:ring-2 focus:ring-muted/30',
            'disabled:cursor-not-allowed disabled:opacity-50',
          )}
        >
          {SECTOR_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <span className="font-sans text-[11px] text-faint">
          비교군 산정용 · 서버 미전송
        </span>
      </div>
    </form>
  );
}
