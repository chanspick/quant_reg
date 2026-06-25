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
  // 모노크롬 매핑: 위험밴드만 risk(#ff8a80), 나머지는 ink/muted 농담.
  // 다색 금지 — 채움/텍스트/보더는 무채(크림/웜그레이)로 위계만 표현한다.
  switch (band) {
    case '위험':
      // 위험: 유일한 강조색
      return {
        fill: 'bg-risk',
        text: 'text-risk',
        border: 'border-risk',
        ringSoft: 'bg-risk/15',
      };
    case '주의':
      // 주의: 어두운 웜그레이 농담 (강조 아님)
      return {
        fill: 'bg-muted',
        text: 'text-muted',
        border: 'border-edge',
        ringSoft: 'bg-muted/15',
      };
    case '양호':
      // 양호: 밝은 크림 채움 + 보조 텍스트
      return {
        fill: 'bg-ink',
        text: 'text-muted',
        border: 'border-edge',
        ringSoft: 'bg-ink/10',
      };
    case '우수':
      // 우수: 가장 밝은 크림 (최상위 위계)
      return {
        fill: 'bg-ink',
        text: 'text-ink',
        border: 'border-edge',
        ringSoft: 'bg-ink/15',
      };
  }
}
