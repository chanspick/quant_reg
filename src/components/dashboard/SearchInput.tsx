import { useEffect, useId, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * SPEC-PQC-001 §3.5:
 * - REQ-DSH-002: name/url 부분 일치 검색
 * - REQ-DSH-009: 200ms 디바운스 (lodash 미사용, setTimeout 수동 구현)
 * - REQ-DSH-013: 입력 클리어 시 즉시 onChange 호출 (디바운스 우회)
 * - REQ-A11Y-004: aria-label, label 연결
 */

interface SearchInputProps {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  className?: string;
  /** debounce ms (REQ-DSH-009). 기본 200. */
  debounceMs?: number;
}

export function SearchInput({
  value,
  onChange,
  placeholder = '도메인 이름 또는 URL 검색',
  className,
  debounceMs = 200,
}: SearchInputProps): React.JSX.Element {
  const id = useId();
  const [local, setLocal] = useState(value);
  // 외부 value 와의 동기화 추적용. 렌더 중 prop 비교 → 변경 시 즉시 local 갱신.
  // React 19 권장 패턴: useEffect 내부 setState 회피 (cascading render 방지).
  // 참고: https://react.dev/reference/react/useState#storing-information-from-previous-renders
  const [lastSyncedValue, setLastSyncedValue] = useState(value);
  if (value !== lastSyncedValue) {
    setLastSyncedValue(value);
    setLocal(value);
  }
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const scheduleChange = (next: string): void => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      onChange(next);
    }, debounceMs);
  };

  const handleClear = (): void => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setLocal('');
    onChange(''); // 즉시 (REQ-DSH-013)
  };

  return (
    <div className={cn('relative w-full sm:max-w-sm', className)}>
      <label htmlFor={id} className="sr-only">
        {placeholder}
      </label>
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[hsl(var(--muted-foreground))]"
      />
      <input
        id={id}
        type="search"
        value={local}
        onChange={(e) => {
          const next = e.target.value;
          setLocal(next);
          scheduleChange(next);
        }}
        placeholder={placeholder}
        aria-label={placeholder}
        autoComplete="off"
        spellCheck={false}
        className={cn(
          'w-full rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--background))]',
          'pl-9 pr-9 py-2 text-sm',
          'placeholder:text-[hsl(var(--muted-foreground))]',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]',
          'focus-visible:ring-offset-1 focus-visible:ring-offset-[hsl(var(--background))]',
        )}
      />
      {local.length > 0 && (
        <button
          type="button"
          onClick={handleClear}
          aria-label="검색어 지우기"
          className={cn(
            'absolute top-1/2 right-2 grid size-6 -translate-y-1/2 place-items-center rounded',
            'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]',
            'hover:bg-[hsl(var(--accent))] focus-visible:outline-none',
            'focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]',
          )}
        >
          <X aria-hidden="true" className="size-3.5" />
        </button>
      )}
    </div>
  );
}
