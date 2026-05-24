import { ThemeProvider as NextThemesProvider } from 'next-themes';
import type { ReactNode } from 'react';
import { useSyncManifestThemeColor } from '@/lib/themeColor';

/**
 * SPEC-PQC-001 §3.2 (Theme System):
 * - REQ-THM-001/002: Light / Dark / System 3-way, 기본 System
 * - REQ-THM-004: meta `theme-color` 동기화 (ManifestThemeColorSync 가 담당)
 * - REQ-THM-005/006/007: 100ms 내 적용, localStorage 영속화, System 선택 시 override 제거
 * - REQ-THM-011: localStorage 사용 불가 시 graceful fallback (next-themes 가 처리)
 */
export interface ThemeProviderProps {
  children: ReactNode;
}

/**
 * NextThemesProvider 내부에서만 useTheme() 가 동작하므로 별도 컴포넌트로 분리한다.
 * 자식 트리에 마운트되어 활성 테마가 바뀔 때마다 `<meta name="theme-color">` 를 갱신한다.
 */
function ManifestThemeColorSync(): null {
  useSyncManifestThemeColor();
  return null;
}

export function ThemeProvider({ children }: ThemeProviderProps): React.JSX.Element {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      storageKey="pqc-scanner:theme"
      disableTransitionOnChange
    >
      <ManifestThemeColorSync />
      {children}
    </NextThemesProvider>
  );
}
