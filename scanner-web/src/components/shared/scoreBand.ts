/**
 * SPEC-PQC-001 §4.7 점수 밴드. SPEC-PQC-001 src/components/shared/scoreBand.ts 의 복제.
 * 발표 시연 격리 빌드라 워크스페이스 패키지 분리 대신 copy & adapt 정책 (지시 §디렉토리 결정).
 */

export type ScoreBandName = '위험' | '주의' | '양호' | '우수';

export interface ScoreBandClasses {
  fill: string;
  text: string;
  border: string;
  ringSoft: string;
}

function clampRound(value: number): number {
  if (Number.isNaN(value)) return 0;
  if (value < 0) return 0;
  if (value > 100) return 100;
  return Math.round(value);
}

export function clampScore(value: number): number {
  return clampRound(value);
}

export function scoreBand(value: number): ScoreBandName {
  const v = clampRound(value);
  if (v <= 30) return '위험';
  if (v <= 60) return '주의';
  if (v <= 80) return '양호';
  return '우수';
}

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
