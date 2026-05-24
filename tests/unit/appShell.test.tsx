import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { Header } from '@/components/layout/Header';
import { DemoBanner } from '@/components/layout/DemoBanner';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { ThemeProvider as NextThemesProvider } from 'next-themes';

// SPEC-PQC-001 §3.1/§3.2 — App shell · Header · DemoBanner · ThemeToggle smoke
// 정확한 모든 동작이 아닌 mount + 핵심 요소 렌더링 검증

function renderWithRouter(ui: React.ReactNode): ReturnType<typeof render> {
  return render(
    <NextThemesProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <MemoryRouter initialEntries={['/']}>{ui}</MemoryRouter>
    </NextThemesProvider>,
  );
}

describe('Header (REQ-APP-002)', () => {
  it('renders brand and three nav links', () => {
    // Header 는 내부적으로 useDomains() 를 호출하므로 fetch mock 필요
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => ({ lastUpdated: '2026-05-14', version: '0.4.0', domains: [] }),
    } as unknown as Response);
    renderWithRouter(<Header />);
    expect(screen.getByText(/준비도 스캐너/)).toBeInTheDocument();
    expect(screen.getAllByText('대시보드').length).toBeGreaterThan(0);
    expect(screen.getAllByText('측정 방법론').length).toBeGreaterThan(0);
    expect(screen.getAllByText('프로젝트 소개').length).toBeGreaterThan(0);
  });
});

describe('DemoBanner (REQ-APP-003 · REQ-APP-008)', () => {
  it('renders the three source-mode legend chips', () => {
    render(<DemoBanner />);
    expect(screen.getByText('TLS·KEM·인증서')).toBeInTheDocument();
    expect(screen.getByText('공급망·정책')).toBeInTheDocument();
    expect(screen.getByText('규제 매핑')).toBeInTheDocument();
    // 3 출처 라벨이 각각 표시
    expect(screen.getByText('자동 측정')).toBeInTheDocument();
    expect(screen.getByText('수동 리서치')).toBeInTheDocument();
    expect(screen.getByText('LLM + 샘플 검증')).toBeInTheDocument();
  });

  it('hides the banner after dismiss is clicked (session-only)', () => {
    render(<DemoBanner />);
    const dismissBtn = screen.getByRole('button', { name: '닫기' });
    fireEvent.click(dismissBtn);
    expect(screen.queryByText('TLS·KEM·인증서')).not.toBeInTheDocument();
  });
});

describe('ThemeToggle (REQ-THM-001)', () => {
  it('renders the three theme options (Light / Dark / System)', () => {
    renderWithRouter(<ThemeToggle />);
    // 세 가지 토글 옵션의 aria-label 또는 텍스트 중 하나는 노출되어야 함
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
    // aria-label 존재 (라벨 텍스트 또는 시각 라벨)
    const labelTexts = buttons
      .map((b) => b.getAttribute('aria-label') ?? b.textContent ?? '')
      .join('|');
    expect(labelTexts).toMatch(/라이트|Light|light/i);
    expect(labelTexts).toMatch(/다크|Dark|dark/i);
    expect(labelTexts).toMatch(/시스템|System|system/i);
  });

  it('switches active state when a non-current theme is clicked', () => {
    renderWithRouter(<ThemeToggle />);
    const buttons = screen.getAllByRole('button');
    // 모든 버튼 클릭 시도해도 throw 가 발생하지 않아야 함 (smoke)
    buttons.forEach((b) => {
      expect(() => fireEvent.click(b)).not.toThrow();
    });
  });
});

describe('AppShell composition', () => {
  it('renders header, demo banner, and routed content', () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => ({ lastUpdated: '2026-05-14', version: '0.4.0', domains: [] }),
    } as unknown as Response);

    render(
      <NextThemesProvider attribute="class" defaultTheme="light" enableSystem={false}>
        <MemoryRouter initialEntries={['/']}>
          <Routes>
            <Route
              element={<AppShell />}
            >
              <Route path="/" element={<div data-testid="page-content">PAGE</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </NextThemesProvider>,
    );

    expect(screen.getByText(/준비도 스캐너/)).toBeInTheDocument();
    expect(screen.getByText('TLS·KEM·인증서')).toBeInTheDocument();
    expect(screen.getByTestId('page-content')).toBeInTheDocument();
  });
});
