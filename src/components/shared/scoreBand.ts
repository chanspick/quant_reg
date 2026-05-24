/**
 * SPEC-PQC-001 §4.7 점수 시각화 배지 사양:
 *   0~30  → 위험 (red)
 *   31~60 → 주의 (amber)
 *   61~80 → 양호 (sky)
 *   81~100 → 우수 (emerald)
 *
 * 순수 함수만 export 한다 (의존성 없음).
 */

export type ScoreBandName = '위험' | '주의' | '양호' | '우수';

export interface ScoreBandClasses {
  /** 진행 바 fill 색 (불투명). */
  fill: string;
  /** 텍스트 컬러 (light + dark variant 포함). */
  text: string;
  /** 보더 컬러. */
  border: string;
  /** /15 알파 배경 — chip / badge 용. */
  ringSoft: string;
}

/**
 * 점수(0~100)를 정수 밴드 이름으로 매핑한다.
 * - 입력은 NaN/음수/100 초과를 허용하지 않는다고 가정 (REQ-DAT-003 / REQ-SCH-004 로 사전 검증됨).
 * - 안전을 위해 내부적으로 clamp 후 round 한다.
 */
export function scoreBand(value: number): ScoreBandName {
  const v = clampRound(value);
  if (v <= 30) return '위험';
  if (v <= 60) return '주의';
  if (v <= 80) return '양호';
  return '우수';
}

/**
 * 밴드별 Tailwind 클래스 묶음.
 * - dark 모드 대비를 위해 fill 은 -500 톤을 사용한다 (밝기 충분).
 * - text 는 light: -700, dark: -300 으로 4.5:1 이상을 만족하도록 조합.
 * - ringSoft 는 /15 알파로 카드/칩 배경에 사용.
 */
export function scoreBandClasses(value: number): ScoreBandClasses {
  const band = scoreBand(value);
  switch (band) {
    case '위험':
      return {
        fill: 'bg-red-500',
        text: 'text-red-700 dark:text-red-300',
        border: 'border-red-500',
        ringSoft: 'bg-red-500/15',
      };
    case '주의':
      return {
        fill: 'bg-amber-500',
        text: 'text-amber-700 dark:text-amber-300',
        border: 'border-amber-500',
        ringSoft: 'bg-amber-500/15',
      };
    case '양호':
      return {
        fill: 'bg-sky-500',
        text: 'text-sky-700 dark:text-sky-300',
        border: 'border-sky-500',
        ringSoft: 'bg-sky-500/15',
      };
    case '우수':
      return {
        fill: 'bg-emerald-500',
        text: 'text-emerald-700 dark:text-emerald-300',
        border: 'border-emerald-500',
        ringSoft: 'bg-emerald-500/15',
      };
  }
}

function clampRound(value: number): number {
  if (Number.isNaN(value)) return 0;
  if (value < 0) return 0;
  if (value > 100) return 100;
  return Math.round(value);
}

/** Re-export helper — 시각화 컴포넌트에서 동일 clamp 가 필요할 때 사용. */
export function clampScore(value: number): number {
  return clampRound(value);
}
