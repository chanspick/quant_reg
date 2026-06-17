/**
 * SPEC-PQC-001 §4.7 점수 시각화 배지 사양 (모노크롬 리스타일):
 *   0~30  → 위험 (destructive/risk 강조 1색)
 *   31~60 → 주의 (ink 농담 — 진한 무채)
 *   61~80 → 양호 (foreground 무채)
 *   81~100 → 우수 (muted-foreground 옅은 무채)
 *
 * 시그니처·임계값(scoreBand 분기)은 불변. 색 문자열만 워밍 모노크롬으로 교체한다.
 * 위험만 강조색(destructive=라이트 머티드레드/다크 risk #ff8a80), 나머지는 무채 농담.
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
 * 밴드별 Tailwind 클래스 묶음 (워밍 모노크롬).
 * - 위험: 강조 1색(destructive). 라이트=머티드레드, 다크=risk #ff8a80 — 토큰으로 자동 전파.
 * - 주의/양호/우수: 무채 농담. fill 은 foreground/muted-foreground 농담으로 위계 표현.
 * - text 는 시맨틱 토큰으로 light/dark 양쪽 대비를 자동 확보 (별도 dark: variant 불필요).
 * - ringSoft 는 /15 알파로 카드/칩 배경에 사용.
 */
export function scoreBandClasses(value: number): ScoreBandClasses {
  const band = scoreBand(value);
  switch (band) {
    case '위험':
      // 강조 1색 — 위험만 destructive(risk) 로 시선 집중.
      return {
        fill: 'bg-destructive',
        text: 'text-destructive',
        border: 'border-destructive',
        ringSoft: 'bg-destructive/15',
      };
    case '주의':
      // 진한 무채 — foreground 불투명도 농담으로 "주의" 위계.
      return {
        fill: 'bg-foreground/70',
        text: 'text-foreground',
        border: 'border-foreground/50',
        ringSoft: 'bg-foreground/10',
      };
    case '양호':
      // 중간 무채 — foreground 옅게.
      return {
        fill: 'bg-foreground/45',
        text: 'text-foreground/80',
        border: 'border-foreground/30',
        ringSoft: 'bg-foreground/[0.07]',
      };
    case '우수':
      // 옅은 무채 — muted-foreground 톤(차분/안정).
      return {
        fill: 'bg-muted-foreground',
        text: 'text-muted-foreground',
        border: 'border-muted-foreground/40',
        ringSoft: 'bg-muted-foreground/15',
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
