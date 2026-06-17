/**
 * SPEC-PQC-003 §3.5 / REQ-REG-001/002/003 (⑥ 규제 컴플라이언스 매핑) — 클라이언트 파생.
 *
 * 정적 `sector → deadline` 테이블 (spec §3.5 / research.md ⑥) + min().
 *   effectiveDeadline = min(framework years)
 *   각 framework: { framework, year, status, daysLeft }
 *
 * 순수 함수 — `currentYear`/`now` 를 인자로 받는다 (lib 내부에서 Date 호출 안 함).
 * 응답 스키마(schema.ts)와 분리된 view-model 변환 (INTEG-7).
 */

import {
  regulationBucket,
  type RegulationBucket,
  type Sector,
} from '@/lib/sector';

// --- framework 식별자 & 표시명 --------------------------------------------

export type FrameworkKey = 'korea' | 'nist' | 'cnsa' | 'eu';

/** framework 한국어 표시명 (research.md ⑥). */
export const FRAMEWORK_DISPLAY: Record<FrameworkKey, string> = {
  korea: '한국 PQC 마스터플랜',
  nist: 'NIST IR 8547',
  cnsa: 'CNSA 2.0',
  eu: 'EU PQC 로드맵',
};

// --- 정적 sector → deadline 테이블 (spec §3.5 / research.md ⑥) ------------

/**
 * 규제 버킷별 framework 데드라인 연도. spec §3.5 표와 1:1 일치.
 * 13개 장르(Sector)는 regulationBucket() 으로 이 5개 버킷 키로 환산해 조회한다.
 * general 은 korea 데드라인이 없음 (전 국가 인프라 대상 아님) → korea 미포함.
 */
const SECTOR_DEADLINES: Record<
  RegulationBucket,
  Partial<Record<FrameworkKey, number>>
> = {
  finance: { korea: 2027, nist: 2030, cnsa: 2027, eu: 2030 },
  telecom: { korea: 2026, nist: 2030, cnsa: 2026, eu: 2030 },
  healthcare: { korea: 2025, nist: 2030, cnsa: 2030, eu: 2030 },
  public: { korea: 2027, nist: 2030, cnsa: 2030, eu: 2030 },
  general: { nist: 2030, cnsa: 2033, eu: 2030 },
};

// --- 마이그레이션 소요 가정 (research.md ⑦ — 추정 상수) -------------------

/** 평균 마이그레이션 소요 (년). research.md ⑦ "대기업 12~15년 [26][27]". */
export const MIGRATION_YEARS = { min: 12, max: 15 } as const;

// --- 상태 / 결과 타입 -----------------------------------------------------

export type RegulationStatus = 'compliant' | 'at-risk' | 'fail';

export interface FrameworkDeadline {
  framework: FrameworkKey;
  /** 표시명 (한국어). */
  displayName: string;
  /** 데드라인 연도. */
  year: number;
  /** 컴플라이언스 상태. */
  status: RegulationStatus;
  /** 남은 일수 (deadline 연말 기준 - now). 음수면 이미 경과. */
  daysLeft: number;
  /** 남은 연수 (year - currentYear). 음수면 이미 경과. */
  yearsLeft: number;
}

export interface RegulationMap {
  sector: Sector;
  /** 섹터 미지정(general) 여부 — "글로벌 최단 데드라인 기준" 안내. */
  isGeneral: boolean;
  /** framework 별 데드라인 (year 오름차순). */
  frameworks: FrameworkDeadline[];
  /** 가장 이른 데드라인 (min). */
  effectiveDeadline: FrameworkDeadline;
  /** 마이그레이션 갭 한 줄 설명 (REQ-REG-003). */
  migrationGap: string;
}

// --- 상태 휴리스틱 --------------------------------------------------------

/**
 * 상태 판정 규칙 (단순·명시적):
 *   - 남은 연수 < 0 (데드라인 경과)                         → 'fail'
 *   - 점수 강함(overall ≥ 70) AND 남은 연수 ≥ 평균 마이그(12) → 'compliant'
 *   - 남은 연수 < 평균 마이그(12)                            → 'fail'  (마이그 소요 > 잔여 → 구조적 미달)
 *   - 그 외 (잔여 ≥ 12 이나 점수 부족)                       → 'at-risk'
 *
 * 핵심 직관: 평균 마이그레이션(12~15년)보다 잔여가 짧으면 점수와 무관하게 이미 지연(fail),
 * 잔여가 충분해도 현재 위생(점수)이 약하면 at-risk.
 */
function deriveStatus(yearsLeft: number, overall: number): RegulationStatus {
  if (yearsLeft < 0) return 'fail';
  if (yearsLeft < MIGRATION_YEARS.min) return 'fail';
  if (overall >= 70) return 'compliant';
  return 'at-risk';
}

// --- 메인 ---------------------------------------------------------------

/**
 * genre(Sector) + overall 점수 + 현재 연도 → 규제 매핑.
 * REQ-REG-001/002/003.
 *
 * 13개 장르(Sector)를 내부에서 regulationBucket() 으로 coarse 버킷
 * (finance/telecom/public/healthcare/general) 으로 환산한 뒤 데드라인 테이블을 적용한다.
 *
 * @param sector        프론트 선택/태그 장르 (13개 라벨 또는 '일반')
 * @param overall       도메인 종합 점수 (grade.ts computeOverall 결과)
 * @param currentYear   현재 연도 (컴포넌트가 new Date().getFullYear() 전달 — lib 는 순수)
 * @param now           현재 시각 (daysLeft 계산용; 컴포넌트가 new Date() 전달)
 */
export function computeRegulation(
  sector: Sector,
  overall: number,
  currentYear: number,
  now: Date,
): RegulationMap {
  const bucket = regulationBucket(sector);
  const table = SECTOR_DEADLINES[bucket];
  const nowMs = now.getTime();

  const frameworks: FrameworkDeadline[] = (
    Object.entries(table) as [FrameworkKey, number][]
  )
    .map(([framework, year]): FrameworkDeadline => {
      const yearsLeft = year - currentYear;
      // 데드라인은 해당 연도 말(12-31) 기준으로 잔여 일수 계산.
      const deadlineMs = new Date(year, 11, 31, 23, 59, 59).getTime();
      const daysLeft = Math.round((deadlineMs - nowMs) / (1000 * 60 * 60 * 24));
      return {
        framework,
        displayName: FRAMEWORK_DISPLAY[framework],
        year,
        status: deriveStatus(yearsLeft, overall),
        daysLeft,
        yearsLeft,
      };
    })
    .sort((a, b) => a.year - b.year);

  // effectiveDeadline = min(year). 정렬됐으므로 첫 요소. (테이블이 항상 비어있지 않음.)
  const effectiveDeadline = frameworks[0]!;

  const migrationGap = buildMigrationGap(effectiveDeadline.yearsLeft);

  return {
    sector,
    isGeneral: bucket === 'general',
    frameworks,
    effectiveDeadline,
    migrationGap,
  };
}

/** REQ-REG-003 — "평균 마이그 12~15년 vs 데드라인 잔여 N년" 갭 문구. */
function buildMigrationGap(yearsLeft: number): string {
  const span = `평균 마이그레이션 ${MIGRATION_YEARS.min}~${MIGRATION_YEARS.max}년`;
  if (yearsLeft < 0) {
    return `${span} > 최단 데드라인 이미 경과 → 심각하게 지연 (추정)`;
  }
  if (yearsLeft < MIGRATION_YEARS.min) {
    return `${span} > 데드라인까지 ${yearsLeft}년 → 이미 지연 (추정)`;
  }
  return `${span} ≤ 데드라인까지 ${yearsLeft}년 → 지금 착수하면 가능 (추정)`;
}
