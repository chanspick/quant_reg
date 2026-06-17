/**
 * SPEC-PQC-003 §3.1 — 섹터 (프론트엔드 폼 상태, 백엔드 미전송).
 *
 * 프론트 드롭다운의 coarse 섹터(finance/telecom/public/healthcare/general)와
 * benchmark.json 의 fine-grained 라벨(domains.json 원 라벨: "은행"·"증권"·"통신"…)을 매핑한다.
 *
 * - ScanRequest 에 추가하지 않는다 (백엔드 무변경, INTEG-1).
 * - 섹터 평균/앞선 동종사 계산은 coarse → 라벨 집합 매핑으로 수행.
 */

export type Sector =
  | 'finance'
  | 'telecom'
  | 'public'
  | 'healthcare'
  | 'general';

export interface SectorOption {
  value: Sector;
  label: string;
}

/** 드롭다운 옵션 (한국어 라벨). 'general' 이 기본/미지정 의미. */
export const SECTOR_OPTIONS: readonly SectorOption[] = [
  { value: 'general', label: '일반 / 미지정' },
  { value: 'finance', label: '금융' },
  { value: 'telecom', label: '통신' },
  { value: 'public', label: '공공' },
  { value: 'healthcare', label: '의료' },
] as const;

/** coarse 섹터 → benchmark.json 의 sector 라벨 매핑 (domains.json 원 라벨 기준). */
const SECTOR_LABEL_MAP: Record<Sector, readonly string[]> = {
  finance: ['금융지주', '은행', '증권', '페이먼트'],
  telecom: ['통신'],
  public: ['공공/정부'],
  healthcare: ['바이오'],
  general: [], // 매칭 라벨 없음 → 섹터 평균 unmount, 전체 비교군 대비만
};

/** coarse 섹터의 한국어 표시명. */
export function sectorDisplayName(sector: Sector): string {
  const opt = SECTOR_OPTIONS.find((o) => o.value === sector);
  return opt ? opt.label : '일반 / 미지정';
}

/**
 * coarse 섹터 → benchmark sector 라벨 집합. 매핑이 없으면(general 등) null
 * 반환 → 섹터 평균/앞선 동종사 항목 unmount (REQ-BENCH-002).
 */
export function sectorMatchLabels(sector: Sector): ReadonlySet<string> | null {
  const labels = SECTOR_LABEL_MAP[sector];
  if (labels.length === 0) return null;
  return new Set(labels);
}

/**
 * benchmark.json 의 원 라벨 → coarse 섹터 (자동 태그 역매핑).
 * 매칭 없으면 'general'.
 */
export function coarseSectorFromLabel(label: string): Sector {
  for (const [sector, labels] of Object.entries(SECTOR_LABEL_MAP) as [
    Sector,
    readonly string[],
  ][]) {
    if (labels.includes(label)) return sector;
  }
  return 'general';
}
