import { useEffect } from 'react';
import { useTheme } from 'next-themes';

/**
 * SPEC-PQC-001 §3.2 — Theme System
 * - REQ-THM-004: Web App Manifest `theme_color` 및 meta `theme-color` 를 현재 렌더된 테마에 동기화.
 *
 * 활성 테마(resolvedTheme)가 바뀌거나 mount 시점에 `--background` HSL 토큰을 hex 로
 * 변환하여 `<meta name="theme-color">` 의 content 를 갱신한다. 이 값은 PWA 가 설치된
 * 환경(특히 모바일/Android Chrome)에서 OS 상태표시줄·브라우저 chrome 색상에 반영된다.
 */
export function useSyncManifestThemeColor(): void {
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }
    // 다음 paint 까지 대기 — CSS 변수가 새 .dark / :root 토큰을 반영한 뒤 읽어야 한다.
    const rafId = window.requestAnimationFrame(() => {
      const root = document.documentElement;
      const bg = getComputedStyle(root).getPropertyValue('--background').trim();
      const hex = hslTripletToHex(bg);
      if (!hex) return;
      let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute('name', 'theme-color');
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', hex);
    });

    return () => window.cancelAnimationFrame(rafId);
  }, [resolvedTheme]);
}

/**
 * `--background` 토큰은 shadcn/ui 컨벤션에 따라 단위 없는 HSL triplet 으로 저장된다.
 * 예: `210 20% 98%` (또는 콤마 변형 `210, 20%, 98%`). 이를 sRGB hex `#RRGGBB` 로 변환한다.
 *
 * 알고리즘: 표준 HSL→RGB (CSS Color Module Level 3). 각 채널을 가까운 정수로 반올림하고
 * 대문자 hex 2자리로 출력한다. 입력 형식이 어긋나면 `null` 을 반환해 호출 측이 무시할 수 있게 한다.
 */
export function hslTripletToHex(triplet: string): string | null {
  const match = triplet.match(
    /^(\d+(?:\.\d+)?)\s*[, ]\s*(\d+(?:\.\d+)?)%\s*[, ]\s*(\d+(?:\.\d+)?)%$/,
  );
  if (!match) return null;

  const hStr = match[1];
  const sStr = match[2];
  const lStr = match[3];
  if (hStr === undefined || sStr === undefined || lStr === undefined) return null;

  const h = parseFloat(hStr);
  const s = parseFloat(sStr) / 100;
  const l = parseFloat(lStr) / 100;
  if (!Number.isFinite(h) || !Number.isFinite(s) || !Number.isFinite(l)) return null;

  // 표준 HSL→RGB (chroma 기반). hue 는 0~360 범위로 normalize.
  const hue = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = l - c / 2;

  let r1 = 0;
  let g1 = 0;
  let b1 = 0;
  if (hue < 60) {
    r1 = c;
    g1 = x;
    b1 = 0;
  } else if (hue < 120) {
    r1 = x;
    g1 = c;
    b1 = 0;
  } else if (hue < 180) {
    r1 = 0;
    g1 = c;
    b1 = x;
  } else if (hue < 240) {
    r1 = 0;
    g1 = x;
    b1 = c;
  } else if (hue < 300) {
    r1 = x;
    g1 = 0;
    b1 = c;
  } else {
    r1 = c;
    g1 = 0;
    b1 = x;
  }

  const r = Math.round((r1 + m) * 255);
  const g = Math.round((g1 + m) * 255);
  const b = Math.round((b1 + m) * 255);

  return `#${toHexByte(r)}${toHexByte(g)}${toHexByte(b)}`;
}

function toHexByte(value: number): string {
  const clamped = Math.max(0, Math.min(255, value));
  return clamped.toString(16).padStart(2, '0').toUpperCase();
}
