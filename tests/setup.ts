import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// jsdom 에 없는 브라우저 API 폴리필 (next-themes / theme_color sync 등)
if (typeof window !== 'undefined' && !window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),      // legacy
      removeListener: vi.fn(),   // legacy
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }),
  });
}
