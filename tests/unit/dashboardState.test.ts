import { describe, expect, it } from 'vitest';
import { applyFilters, applySort } from '@/lib/dashboardState';
import { parseDomainsEnvelope } from '@/data/schema';
import fixture from '../fixtures/sample-domains.json';

/**
 * SPEC-PQC-001 §3.5 — dashboardState 순수 함수 테스트.
 *   applyFilters · applySort 가 useDomains/useSearchParams 의존 없이 검증 가능하도록
 *   순수 함수로 분리되어 있다는 점이 본 테스트의 전제이다.
 */

const { domains } = parseDomainsEnvelope(fixture);

describe('applyFilters', () => {
  it('returns all when no filters applied', () => {
    expect(applyFilters(domains, { search: '', sectors: [] })).toHaveLength(3);
  });

  it('matches name substring case-insensitive', () => {
    const out = applyFilters(domains, { search: '네이', sectors: [] });
    expect(out).toHaveLength(1);
    expect(out[0]!.name).toBe('네이버');
  });

  it('matches url substring case-insensitive', () => {
    const out = applyFilters(domains, { search: 'SAMSUNG', sectors: [] });
    expect(out).toHaveLength(1);
    expect(out[0]!.name).toBe('삼성전자');
  });

  it('returns empty when no match', () => {
    expect(
      applyFilters(domains, { search: 'no-match-zzz', sectors: [] }),
    ).toHaveLength(0);
  });

  it('intersects multiple sectors (OR within sectors)', () => {
    const out = applyFilters(domains, {
      search: '',
      sectors: ['IT/플랫폼', '공공/정부'],
    });
    expect(out).toHaveLength(2);
    expect(out.map((d) => d.name).sort()).toEqual(['네이버', '한국전력공사']);
  });

  it('combines search and sector filters', () => {
    const out = applyFilters(domains, {
      search: '네이',
      sectors: ['IT/플랫폼'],
    });
    expect(out).toHaveLength(1);
  });
});

describe('applySort', () => {
  it('sorts by tls desc', () => {
    const out = applySort(domains, 'tls', 'desc');
    // 네이버 92, 삼성 86, 한전 62
    expect(out.map((d) => d.name)).toEqual(['네이버', '삼성전자', '한국전력공사']);
  });

  it('sorts by tls asc', () => {
    const out = applySort(domains, 'tls', 'asc');
    expect(out.map((d) => d.name)).toEqual(['한국전력공사', '삼성전자', '네이버']);
  });

  it('sorts by quantumThreat desc (default)', () => {
    const out = applySort(domains, 'quantumThreat', 'desc');
    // 네이버 87, 삼성 23, 한전 23 — 동률은 stable (입력 순서 유지)
    expect(out[0]!.name).toBe('네이버');
  });

  it('sorts by name (가나다 asc)', () => {
    const out = applySort(domains, 'name', 'asc');
    // ko locale 정렬: 네이버 < 삼성전자 < 한국전력공사
    expect(out.map((d) => d.name)).toEqual(['네이버', '삼성전자', '한국전력공사']);
  });

  it('sort is stable for ties', () => {
    const out = applySort(domains, 'quantumThreat', 'desc');
    // 삼성/한전 모두 23이지만 fixture 순서 유지 (삼성 → 한전)
    expect(out[1]!.name).toBe('삼성전자');
    expect(out[2]!.name).toBe('한국전력공사');
  });
});
