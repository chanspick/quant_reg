import { useState, useCallback, type FormEvent } from 'react';
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
  initialSector = 'general',
}: ScanFormProps): React.JSX.Element {
  const [raw, setRaw] = useState(initialValue);
  const [sector, setSector] = useState<Sector>(initialSector);
  const [error, setError] = useState<string | null>(null);

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
              'w-full rounded-md border bg-white px-4 py-3 text-base',
              'text-slate-900 placeholder:text-slate-400',
              'shadow-sm transition-colors',
              'focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30',
              'disabled:cursor-not-allowed disabled:opacity-50',
              'dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500',
              error
                ? 'border-red-500 focus:border-red-500 focus:ring-red-500/30 dark:border-red-500'
                : 'border-slate-300',
            )}
          />
          {error && (
            <p
              id="hostname-error"
              role="alert"
              className="mt-2 text-sm text-red-600 dark:text-red-400"
            >
              {error}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={disabled || raw.trim().length === 0}
          className={cn(
            'shrink-0 rounded-md px-6 py-3 text-base font-semibold transition-colors',
            'bg-brand-600 text-white shadow-sm',
            'hover:bg-brand-700',
            'focus:outline-none focus:ring-2 focus:ring-brand-500/40',
            'disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500',
            'dark:disabled:bg-slate-700 dark:disabled:text-slate-400',
          )}
        >
          스캔 시작
        </button>
      </div>

      {/* 섹터 선택 (선택 사항, 프론트 폼 상태 — 백엔드 미전송) */}
      <div className="flex items-center gap-2">
        <label
          htmlFor="sector-select"
          className="text-xs font-medium text-slate-600 dark:text-slate-400"
        >
          업종 (선택)
        </label>
        <select
          id="sector-select"
          value={sector}
          onChange={(e) => setSector(e.target.value as Sector)}
          disabled={disabled}
          className={cn(
            'rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm',
            'text-slate-900 shadow-sm transition-colors',
            'focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30',
            'disabled:cursor-not-allowed disabled:opacity-50',
            'dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100',
          )}
        >
          {SECTOR_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <span className="text-[11px] text-slate-400 dark:text-slate-500">
          비교군 섹터 평균·규제 데드라인에 사용 (서버 미전송)
        </span>
      </div>
    </form>
  );
}
