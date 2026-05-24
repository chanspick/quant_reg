import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SectorSchema, type Domain, type Sector } from '@/data/schema';

/**
 * SPEC-PQC-001 §3.5 (Dashboard):
 * - REQ-DSH-002: search 입력 (name/url 부분 일치)
 * - REQ-DSH-003: sector 다중 필터
 * - REQ-DSH-004: 6개 정렬 축
 * - REQ-DSH-016 (OPTIONAL): 필터/정렬/검색 상태를 URL query 로 직렬화.
 *
 * URL 직렬화 형식:
 *   ?search=foo&sectors=금융지주,은행&sort=quantumThreat:desc
 *
 * - replaceState 사용으로 history pollution 회피.
 * - 알 수 없는 sector / sortKey 는 graceful 무시.
 */

export type SortKey =
  | 'tls'
  | 'hybridKem'
  | 'certOps'
  | 'quantumThreat'
  | 'name'
  | 'sector';

export type SortDir = 'asc' | 'desc';

export interface DashboardState {
  search: string;
  sectors: Sector[];
  sortKey: SortKey;
  sortDir: SortDir;
}

export interface DashboardStateActions {
  setSearch: (s: string) => void;
  setSectors: (s: Sector[]) => void;
  toggleSector: (s: Sector) => void;
  setSort: (key: SortKey, dir: SortDir) => void;
  reset: () => void;
}

export type UseDashboardStateReturn = DashboardState & DashboardStateActions;

const DEFAULT_SORT_KEY: SortKey = 'quantumThreat';
const DEFAULT_SORT_DIR: SortDir = 'desc';

const VALID_SORT_KEYS: ReadonlySet<SortKey> = new Set([
  'tls',
  'hybridKem',
  'certOps',
  'quantumThreat',
  'name',
  'sector',
]);

const VALID_SORT_DIRS: ReadonlySet<SortDir> = new Set(['asc', 'desc']);

function parseSectors(raw: string | null): Sector[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .filter((s): s is Sector => SectorSchema.safeParse(s).success);
}

function parseSort(raw: string | null): { key: SortKey; dir: SortDir } {
  if (!raw)
    return { key: DEFAULT_SORT_KEY, dir: DEFAULT_SORT_DIR };
  const [rawKey, rawDir] = raw.split(':');
  const key: SortKey =
    rawKey && VALID_SORT_KEYS.has(rawKey as SortKey)
      ? (rawKey as SortKey)
      : DEFAULT_SORT_KEY;
  const dir: SortDir =
    rawDir && VALID_SORT_DIRS.has(rawDir as SortDir)
      ? (rawDir as SortDir)
      : DEFAULT_SORT_DIR;
  return { key, dir };
}

function serializeSectors(sectors: Sector[]): string | null {
  return sectors.length > 0 ? sectors.join(',') : null;
}

function serializeSort(key: SortKey, dir: SortDir): string | null {
  if (key === DEFAULT_SORT_KEY && dir === DEFAULT_SORT_DIR) return null;
  return `${key}:${dir}`;
}

/**
 * URLSearchParams 헬퍼 — undefined/null 인 key 는 제거한다.
 */
function withParam(
  params: URLSearchParams,
  key: string,
  value: string | null,
): URLSearchParams {
  const next = new URLSearchParams(params);
  if (value === null || value === '') {
    next.delete(key);
  } else {
    next.set(key, value);
  }
  return next;
}

export function useDashboardState(): UseDashboardStateReturn {
  const [searchParams, setSearchParams] = useSearchParams();

  const search = searchParams.get('search') ?? '';
  const sectors = useMemo(
    () => parseSectors(searchParams.get('sectors')),
    [searchParams],
  );
  const { key: sortKey, dir: sortDir } = useMemo(
    () => parseSort(searchParams.get('sort')),
    [searchParams],
  );

  const setSearch = useCallback(
    (value: string) => {
      setSearchParams(
        (prev) =>
          withParam(prev, 'search', value.trim().length > 0 ? value : null),
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const setSectors = useCallback(
    (value: Sector[]) => {
      setSearchParams(
        (prev) => withParam(prev, 'sectors', serializeSectors(value)),
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const toggleSector = useCallback(
    (sector: Sector) => {
      setSearchParams(
        (prev) => {
          const current = parseSectors(prev.get('sectors'));
          const next = current.includes(sector)
            ? current.filter((s) => s !== sector)
            : [...current, sector];
          return withParam(prev, 'sectors', serializeSectors(next));
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const setSort = useCallback(
    (key: SortKey, dir: SortDir) => {
      setSearchParams(
        (prev) => withParam(prev, 'sort', serializeSort(key, dir)),
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const reset = useCallback(() => {
    setSearchParams(new URLSearchParams(), { replace: true });
  }, [setSearchParams]);

  return {
    search,
    sectors,
    sortKey,
    sortDir,
    setSearch,
    setSectors,
    toggleSector,
    setSort,
    reset,
  };
}

/**
 * 필터링 + 정렬 순수 함수. 컴포넌트와 분리해 테스트가 용이하다.
 */
export interface FilterOptions {
  search: string;
  sectors: Sector[];
}

export function applyFilters(
  domains: readonly Domain[],
  { search, sectors }: FilterOptions,
): Domain[] {
  const needle = search.trim().toLowerCase();
  const sectorSet = sectors.length > 0 ? new Set(sectors) : null;

  return domains.filter((d) => {
    if (sectorSet && !sectorSet.has(d.sector)) return false;
    if (needle.length > 0) {
      const name = d.name.toLowerCase();
      const url = d.url.toLowerCase();
      if (!name.includes(needle) && !url.includes(needle)) return false;
    }
    return true;
  });
}

function getSortValue(domain: Domain, key: SortKey): number | string {
  switch (key) {
    case 'tls':
      return domain.scores.tls.value;
    case 'hybridKem':
      return domain.scores.hybridKem.value;
    case 'certOps':
      return domain.scores.certOps.value;
    case 'quantumThreat':
      return domain.scores.quantumThreat.value;
    case 'name':
      return domain.name;
    case 'sector':
      return domain.sector;
  }
}

export function applySort(
  domains: readonly Domain[],
  key: SortKey,
  dir: SortDir,
): Domain[] {
  const sign = dir === 'asc' ? 1 : -1;
  // stable sort: 인덱스 tie-break
  const indexed = domains.map((d, idx) => ({ d, idx }));
  indexed.sort((a, b) => {
    const va = getSortValue(a.d, key);
    const vb = getSortValue(b.d, key);
    let cmp = 0;
    if (typeof va === 'number' && typeof vb === 'number') {
      cmp = va - vb;
    } else {
      cmp = String(va).localeCompare(String(vb), 'ko');
    }
    if (cmp !== 0) return cmp * sign;
    return a.idx - b.idx;
  });
  return indexed.map((x) => x.d);
}
