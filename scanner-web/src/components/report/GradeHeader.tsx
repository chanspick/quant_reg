import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import type { ScanResponse } from '@/data/schema';
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

const GRADE_TONE: Record<Grade, { ring: string; text: string; bg: string }> = {
  A: {
    ring: 'border-emerald-500/40',
    text: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-500/10',
  },
  B: {
    ring: 'border-sky-500/40',
    text: 'text-sky-600 dark:text-sky-400',
    bg: 'bg-sky-500/10',
  },
  C: {
    ring: 'border-amber-500/40',
    text: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-500/10',
  },
  D: {
    ring: 'border-orange-500/40',
    text: 'text-orange-600 dark:text-orange-400',
    bg: 'bg-orange-500/10',
  },
  F: {
    ring: 'border-red-500/40',
    text: 'text-red-600 dark:text-red-400',
    bg: 'bg-red-500/10',
  },
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
  const tone = GRADE_TONE[grade];

  return (
    <section
      aria-labelledby="grade-header-title"
      className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"
    >
      <div className="flex flex-wrap items-center justify-between gap-6">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
            PQC 컴플라이언스 종합 판정
          </p>
          <h2
            id="grade-header-title"
            className="mt-1 truncate text-2xl font-bold text-slate-900 dark:text-slate-100"
          >
            {result.hostname}
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            측정 시각: <time dateTime={result.measuredAt}>{measured}</time>
          </p>
        </div>

        <div
          className={cn(
            'flex shrink-0 flex-col items-center justify-center rounded-2xl border px-6 py-4',
            tone.ring,
            tone.bg,
          )}
        >
          <span className={cn('font-mono text-6xl font-black leading-none', tone.text)}>
            {grade}
          </span>
          <span className="mt-1 font-mono text-xs text-slate-500 dark:text-slate-400">
            {overall} / 100
          </span>
        </div>
      </div>

      <p className="mt-5 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
        {verdict}
      </p>

      {capped && (
        <p className="mt-3 rounded bg-amber-500/10 px-3 py-2 text-xs leading-relaxed text-amber-800 dark:text-amber-200">
          TLS 1.0/1.1 이 활성화되어 종합 등급이 최대 B 로 제한되었습니다 (RFC 8996).
        </p>
      )}

      <p className="mt-4 text-[11px] leading-relaxed text-slate-400 dark:text-slate-500">
        등급은 4축 점수의 균등 평균(A≥85·B70-84·C55-69·D40-54·F&lt;40)으로 산출한
        추정 지표이며, 진단·감사·구매 의사결정 근거가 아닙니다.
      </p>
    </section>
  );
}
