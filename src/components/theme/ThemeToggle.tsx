import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { Laptop, Moon, Sun } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ko } from '@/i18n/ko';

/**
 * SPEC-PQC-001 §3.2:
 * - REQ-THM-001~007: 3-way Light/Dark/System segmented control
 * - REQ-A11Y-004: 접근 가능한 이름 (aria-label)
 * - REQ-THM-012: aria-pressed 로 현재 선택 상태 노출
 */

type ThemeOption = 'light' | 'dark' | 'system';

interface Option {
  value: ThemeOption;
  label: string;
  Icon: typeof Sun;
}

const OPTIONS: readonly Option[] = [
  { value: 'light', label: ko.theme.light, Icon: Sun },
  { value: 'dark', label: ko.theme.dark, Icon: Moon },
  { value: 'system', label: ko.theme.system, Icon: Laptop },
] as const;

export function ThemeToggle(): React.JSX.Element {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // SSR/hydration 안전성 — next-themes 권장 패턴.
  // 브라우저 mount 시점을 React state 로 동기화 (외부 시스템 → React).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  // mount 전엔 hydration mismatch 회피용 placeholder
  const current: ThemeOption = mounted ? ((theme as ThemeOption) ?? 'system') : 'system';

  return (
    <div
      role="group"
      aria-label={ko.theme.label}
      className="inline-flex items-center gap-0.5 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--secondary))] p-0.5"
    >
      {OPTIONS.map(({ value, label, Icon }) => {
        const isActive = current === value;
        return (
          <button
            key={value}
            type="button"
            onClick={() => setTheme(value)}
            aria-label={label}
            aria-pressed={isActive}
            className={cn(
              'inline-flex h-7 w-7 items-center justify-center rounded text-xs transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]',
              isActive
                ? 'bg-[hsl(var(--background))] text-[hsl(var(--foreground))] shadow-sm'
                : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]',
            )}
          >
            <Icon aria-hidden="true" className="h-4 w-4" />
          </button>
        );
      })}
    </div>
  );
}
