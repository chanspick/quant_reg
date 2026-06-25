/**
 * SPEC-PQC-003 §3.1 — 섹터 (프론트엔드 폼 상태, 백엔드 미전송).
 *
 * 프론트 드롭다운을 benchmark.json 의 **실제 13개 장르 라벨** 전체로 확장한다.
 * (domains.json 원 라벨: "공공/정부"·"화학/에너지"·"반도체/전자"·"증권"·"은행"·
 *  "IT/플랫폼"·"통신"·"금융지주"·"페이먼트"·"철강/소재"·"자동차"·"바이오"·"게임")
 * 여기에 미지정 의미의 '일반' 을 더해 14개 유니온을 구성.
 *
 * - ScanRequest 에 추가하지 않는다 (백엔드 무변경, INTEG-1).
 * - ③ 비교군 섹터평균/앞선동종사: 이제 **정확 라벨 매칭**(sector === d.sector) 으로 동작.
 * - ⑥ 규제 매핑: 각 장르를 regulationBucket() 으로 coarse 버킷(finance/telecom/public/
 *   healthcare/general) 으로 환산한 뒤 데드라인 테이블을 적용.
 */

export type Sector =
  | '공공/정부'
  | '화학/에너지'
  | '반도체/전자'
  | '증권'
  | '은행'
  | 'IT/플랫폼'
  | '통신'
  | '금융지주'
  | '페이먼트'
  | '철강/소재'
  | '자동차'
  | '바이오'
  | '게임'
  | '일반';

/** ⑥ 규제 데드라인 테이블의 키 (coarse 버킷). */
export type RegulationBucket =
  | 'finance'
  | 'telecom'
  | 'public'
  | 'healthcare'
  | 'general';

export interface SectorOption {
  value: Sector;
  label: string;
}

/**
 * 드롭다운 옵션. '일반' 이 기본/미지정 의미이며 맨 앞에 배치.
 * 나머지 13개는 benchmark.json 의 실제 라벨과 1:1 일치.
 */
export const SECTOR_OPTIONS: readonly SectorOption[] = [
  { value: '일반', label: '일반 / 미지정' },
  { value: '공공/정부', label: '공공/정부' },
  { value: '화학/에너지', label: '화학/에너지' },
  { value: '반도체/전자', label: '반도체/전자' },
  { value: '증권', label: '증권' },
  { value: '은행', label: '은행' },
  { value: 'IT/플랫폼', label: 'IT/플랫폼' },
  { value: '통신', label: '통신' },
  { value: '금융지주', label: '금융지주' },
  { value: '페이먼트', label: '페이먼트' },
  { value: '철강/소재', label: '철강/소재' },
  { value: '자동차', label: '자동차' },
  { value: '바이오', label: '바이오' },
  { value: '게임', label: '게임' },
] as const;

/**
 * 장르(Sector) → 규제 데드라인 버킷 매핑 (⑥).
 *   finance:    은행, 증권, 금융지주, 페이먼트
 *   telecom:    통신
 *   public:     공공/정부
 *   healthcare: 바이오
 *   general:    화학/에너지, 반도체/전자, IT/플랫폼, 철강/소재, 자동차, 게임, 일반
 */
const REGULATION_BUCKET_MAP: Record<Sector, RegulationBucket> = {
  은행: 'finance',
  증권: 'finance',
  금융지주: 'finance',
  페이먼트: 'finance',
  통신: 'telecom',
  '공공/정부': 'public',
  바이오: 'healthcare',
  '화학/에너지': 'general',
  '반도체/전자': 'general',
  'IT/플랫폼': 'general',
  '철강/소재': 'general',
  자동차: 'general',
  게임: 'general',
  일반: 'general',
};

/** 장르(Sector) → 규제 버킷. computeRegulation() 내부에서 데드라인 테이블 키로 사용. */
export function regulationBucket(sector: Sector): RegulationBucket {
  return REGULATION_BUCKET_MAP[sector];
}

/** 섹터의 한국어 표시명 (라벨 자체가 표시명). */
export function sectorDisplayName(sector: Sector): string {
  const opt = SECTOR_OPTIONS.find((o) => o.value === sector);
  return opt ? opt.label : '일반 / 미지정';
}

/** 알려진 Sector 라벨 집합 (자동 태그 검증용). */
const KNOWN_SECTORS: ReadonlySet<string> = new Set(
  SECTOR_OPTIONS.map((o) => o.value),
);

/**
 * benchmark.json 의 원 라벨 → Sector (자동 태그).
 * 라벨이 13개 장르 중 하나면 그대로, 아니면 '일반'.
 */
export function sectorFromLabel(label: string): Sector {
  return KNOWN_SECTORS.has(label) ? (label as Sector) : '일반';
}

/**
 * ③ 섹터 평균/앞선 동종사 계산용 라벨 집합.
 * 이제 **정확 라벨 1개**({sector}) 로 매칭한다. '일반'(미지정) 이면 null →
 * 섹터 평균/앞선 동종사 항목 unmount (REQ-BENCH-002).
 */
export function sectorMatchLabels(sector: Sector): ReadonlySet<string> | null {
  if (sector === '일반') return null;
  return new Set([sector]);
}
