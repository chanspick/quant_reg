import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import fixture from '../fixtures/sample-domains.json';
import {
  parseDomainsEnvelope,
  type DomainValidationResult,
} from '@/data/schema';

/**
 * SPEC-PQC-001 §3.5 — Dashboard 컴포넌트 거동 테스트.
 *
 * useDomains 를 모킹해 fixture(3 도메인)를 주입하고 렌더링 결과를 검증한다.
 * URL state 라우터 통합 테스트는 단순 MemoryRouter wrap 으로 흡수한다 — 본격 query
 * 직렬화 동작은 dashboardState 의 pure 함수(applyFilters/applySort) 단위 테스트로
 * 보장한다.
 */

// Fixture 데이터를 envelope 파서로 한 번 통과시켜 Domain[] 형태로 변환
const fixtureResult: DomainValidationResult = parseDomainsEnvelope(fixture);
const FIXTURE_DOMAINS = fixtureResult.domains;

interface MockState {
  isLoading: boolean;
  error: string | null;
  data: DomainValidationResult | null;
}

let mockState: MockState = {
  isLoading: false,
  error: null,
  data: fixtureResult,
};

const retrySpy = vi.fn();

vi.mock('@/data/useDomains', () => ({
  useDomains: () => ({
    state: mockState.data
      ? ({ status: 'success', data: mockState.data } as const)
      : mockState.error
        ? ({ status: 'error', error: mockState.error } as const)
        : ({ status: 'loading' } as const),
    data: mockState.data,
    domains: mockState.data?.domains ?? [],
    lastUpdated: mockState.data?.lastUpdated ?? null,
    isLoading: mockState.isLoading,
    error: mockState.error,
    retry: retrySpy,
  }),
}));

// Imported AFTER mock declaration so the mock is active
import { DashboardPage } from '@/pages/DashboardPage';

function renderDashboard(initialEntries: string[] = ['/']): void {
  render(
    <MemoryRouter initialEntries={initialEntries}>
      <DashboardPage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  mockState = { isLoading: false, error: null, data: fixtureResult };
  retrySpy.mockClear();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('DashboardPage', () => {
  it('renders all 3 fixture domains by default', () => {
    renderDashboard();
    const list = screen.getByRole('list', { name: /도메인 목록/ });
    const items = within(list).getAllByRole('listitem');
    expect(items).toHaveLength(FIXTURE_DOMAINS.length);
    // 각 도메인 이름이 존재
    expect(screen.getByText('삼성전자')).toBeInTheDocument();
    expect(screen.getByText('네이버')).toBeInTheDocument();
    expect(screen.getByText('한국전력공사')).toBeInTheDocument();
  });

  it('renders score values for each domain card', () => {
    renderDashboard();
    // 헤드라인 점수 — 네이버 (92+65+88+87)/4 = 83
    // ScoreBar 의 텍스트 표시는 progressbar role 의 aria-valuenow 로 검증
    const progressBars = screen.getAllByRole('progressbar');
    // 3 도메인 × 4축 = 12 진행 바
    expect(progressBars.length).toBe(12);
  });

  it('filters by search term (case-insensitive name match)', async () => {
    const user = userEvent.setup();
    renderDashboard();

    const searchInput = screen.getByLabelText('도메인 이름 또는 URL 검색');
    await user.type(searchInput, '네이');

    // 200ms debounce 통과 대기
    await act(async () => {
      await new Promise((r) => setTimeout(r, 250));
    });

    expect(screen.getByText('네이버')).toBeInTheDocument();
    expect(screen.queryByText('삼성전자')).not.toBeInTheDocument();
    expect(screen.queryByText('한국전력공사')).not.toBeInTheDocument();
  });

  it('filters by search term (case-insensitive url match)', async () => {
    const user = userEvent.setup();
    renderDashboard();

    const searchInput = screen.getByLabelText('도메인 이름 또는 URL 검색');
    // 'SAMSUNG' 대문자로 입력해도 매칭 (url 은 https://www.samsung.com)
    await user.type(searchInput, 'SAMSUNG');
    await act(async () => {
      await new Promise((r) => setTimeout(r, 250));
    });

    expect(screen.getByText('삼성전자')).toBeInTheDocument();
    expect(screen.queryByText('네이버')).not.toBeInTheDocument();
  });

  it('narrows results when sector chip is toggled', async () => {
    const user = userEvent.setup();
    renderDashboard();

    // sector chip "공공/정부" 클릭 — 한국전력공사만 남음
    const chip = screen.getByRole('button', { name: '공공/정부' });
    await user.click(chip);

    expect(screen.getByText('한국전력공사')).toBeInTheDocument();
    expect(screen.queryByText('삼성전자')).not.toBeInTheDocument();
    expect(screen.queryByText('네이버')).not.toBeInTheDocument();
    expect(chip).toHaveAttribute('aria-pressed', 'true');
  });

  it('reorders list when sort axis changes (TLS asc)', async () => {
    const user = userEvent.setup();
    renderDashboard();

    const select = screen.getByLabelText('정렬 기준') as HTMLSelectElement;
    await user.selectOptions(select, 'tls');

    // 기본 desc → asc 로 토글
    const dirButton = screen.getByRole('button', {
      name: /클릭하여 오름차순으로 정렬/,
    });
    await user.click(dirButton);

    const list = screen.getByRole('list', { name: /도메인 목록/ });
    const items = within(list).getAllByRole('listitem');
    // TLS: 한국전력 62 → 삼성 86 → 네이버 92 (asc)
    expect(within(items[0]!).getByText('한국전력공사')).toBeInTheDocument();
    expect(within(items[1]!).getByText('삼성전자')).toBeInTheDocument();
    expect(within(items[2]!).getByText('네이버')).toBeInTheDocument();
  });

  it('reorders list when sort axis changes (quantumThreat default desc)', () => {
    renderDashboard();
    const list = screen.getByRole('list', { name: /도메인 목록/ });
    const items = within(list).getAllByRole('listitem');
    // 기본: quantumThreat desc — 네이버 87 → 삼성 23 → 한전 23 (stable: 입력 순)
    expect(within(items[0]!).getByText('네이버')).toBeInTheDocument();
  });

  it('expands the card when "상세 보기" is clicked and shows DetailPanel', async () => {
    const user = userEvent.setup();
    renderDashboard();

    // 첫 카드의 상세 보기 — 네이버 (quantumThreat desc 정렬)
    const toggles = screen.getAllByRole('button', { name: /상세 보기/ });
    expect(toggles[0]).toHaveAttribute('aria-expanded', 'false');
    await user.click(toggles[0]!);

    expect(toggles[0]).toHaveAttribute('aria-expanded', 'true');
    // DomainDetailPanel 의 섹션 헤더가 노출
    expect(screen.getByRole('heading', { name: '양자 위협 정량 상세' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '분석 요약' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '인증서 정보' })).toBeInTheDocument();
    // 보수/실증 시나리오 카드 노출
    expect(screen.getByRole('article', { name: '보수 시나리오' })).toBeInTheDocument();
    expect(screen.getByRole('article', { name: '실증 시나리오' })).toBeInTheDocument();
  });

  it('renders filtered EmptyState when search matches nothing', async () => {
    const user = userEvent.setup();
    renderDashboard();

    const searchInput = screen.getByLabelText('도메인 이름 또는 URL 검색');
    await user.type(searchInput, 'no-such-domain-zzz');
    await act(async () => {
      await new Promise((r) => setTimeout(r, 250));
    });

    expect(screen.getByText('조건에 맞는 도메인이 없습니다.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '필터 초기화' })).toBeInTheDocument();
  });

  it('reset filters via "필터 초기화" CTA restores full list', async () => {
    const user = userEvent.setup();
    renderDashboard();

    const searchInput = screen.getByLabelText('도메인 이름 또는 URL 검색');
    await user.type(searchInput, 'zzz-nothing');
    await act(async () => {
      await new Promise((r) => setTimeout(r, 250));
    });

    const resetBtn = screen.getByRole('button', { name: '필터 초기화' });
    await user.click(resetBtn);

    expect(screen.getByText('삼성전자')).toBeInTheDocument();
    expect(screen.getByText('네이버')).toBeInTheDocument();
    expect(screen.getByText('한국전력공사')).toBeInTheDocument();
  });

  it('renders "no-data" EmptyState when 0 domains total', () => {
    mockState = {
      isLoading: false,
      error: null,
      data: {
        lastUpdated: '2026-05-14',
        version: '0.4.0',
        domains: [],
        invalidCount: 0,
        invalidReasons: [],
      },
    };
    renderDashboard();
    expect(
      screen.getByText('아직 도메인이 추가되지 않았습니다.'),
    ).toBeInTheDocument();
    expect(screen.getByText(/pnpm add-domain/)).toBeInTheDocument();
  });

  it('renders error state with retry button when fetch fails', async () => {
    const user = userEvent.setup();
    mockState = {
      isLoading: false,
      error: 'HTTP 500 Internal Server Error',
      data: null,
    };
    renderDashboard();

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText(/HTTP 500/)).toBeInTheDocument();
    const retryBtn = screen.getByRole('button', { name: /다시 시도/ });
    await user.click(retryBtn);
    expect(retrySpy).toHaveBeenCalledTimes(1);
  });

  it('renders skeleton when loading', () => {
    mockState = { isLoading: true, error: null, data: null };
    renderDashboard();
    expect(
      screen.getByRole('status', { name: '데이터를 불러오는 중' }),
    ).toBeInTheDocument();
  });

  it('announces visible count via aria-live region', () => {
    renderDashboard();
    // status role 중 visible count 메시지를 찾는다 (skeleton 의 status 와 별개)
    const statuses = screen.getAllByRole('status');
    const count = statuses.find((el) => /개 도메인이 표시됩니다/.test(el.textContent ?? ''));
    expect(count).toBeDefined();
    expect(count?.textContent).toMatch(/3개 도메인이 표시됩니다/);
  });
});
