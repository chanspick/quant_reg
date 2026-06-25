import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import type { ScanResponse } from '@/data/scannerSchema';
import { computeGrade, type Grade } from '@/lib/grade';

/**
 * SPEC-PQC-003 ① 종합 판정 헤더 — 도메인·측정시각·등급(A~F)·한 줄 평·정직성 배지.
 *
 * 등급은 lib/grade.ts (4축 균등평균 + TLS 1.0/1.1 캡) 로 클라이언트 파생.
 * REQ-CP-001 / REQ-CP-002.
 */

interface GradeHeaderProps {
  result: ScanResponse;
}

// 등급 색: A·B = ink(밝은 크림), C = muted, D·F = risk(강조 1색). 다색 금지.
const GRADE_TEXT: Record<Grade, string> = {
  A: 'text-ink',
  B: 'text-ink',
  C: 'text-muted',
  D: 'text-risk',
  F: 'text-risk',
};

function formatMeasuredAt(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    const human = new Intl.DateTimeFormat('ko-KR', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'Asia/Seoul',
    }).format(d);
    return `${human} (KST)`;
  } catch {
    return iso;
  }
}

export function GradeHeader({ result }: GradeHeaderProps): React.JSX.Element {
  const { grade, overall, verdict, capped } = useMemo(
    () => computeGrade(result),
    [result],
  );
  const measured = useMemo(
    () => formatMeasuredAt(result.measuredAt),
    [result.measuredAt],
  );

  return (
    <section
      aria-labelledby="grade-header-title"
      className="rounded-lg border border-edge bg-surface p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-6">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wide text-faint">
            PQC 컴플라이언스 종합 판정
          </p>
          <h2
            id="grade-header-title"
            className="mt-1 truncate font-serif text-2xl text-ink"
          >
            {result.hostname}
          </h2>
          <p className="mt-1 text-xs text-faint">
            <time dateTime={result.measuredAt}>{measured}</time>
          </p>
        </div>

        <div className="flex shrink-0 flex-col items-center justify-center">
          <span
            className={cn('font-serif text-7xl leading-none', GRADE_TEXT[grade])}
          >
            {grade}
          </span>
          <span className="mt-1 font-mono text-xs text-faint tabular-nums">
            {overall} / 100
          </span>
        </div>
      </div>

      <p className="mt-5 font-serif text-lg leading-snug text-ink">{verdict}</p>

      {capped && (
        <p className="mt-3 text-xs leading-relaxed text-risk">
          TLS 1.0/1.1 활성 — 종합 등급 최대 B 제한 (RFC 8996).
        </p>
      )}
    </section>
  );
}
