import { useMemo } from 'react';
import type { ScanResponse } from '@/data/schema';
import { collectFindings, type FindingAxis } from '@/lib/findings';
import { SourceChip } from '../shared/SourceChip';

/**
 * SPEC-PQC-003 ④ 핵심 발견 — fired tls/certOps 룰 (감점 + 인용).
 *
 * 데이터: lib/findings.ts (meta.scoring.{tls,certOps}.rules where fired).
 * SourceChip 으로 데이터 출처(automated) 라벨 + 룰별 표준 인용(source 텍스트) 표기.
 * 빈 배열이면 호출부에서 unmount (INTEG-3) — 이 컴포넌트는 비지 않은 입력만 받는다.
 */

interface KeyFindingsProps {
  result: ScanResponse;
}

const AXIS_LABEL: Record<FindingAxis, string> = {
  tls: 'TLS',
  certOps: '인증서 운영',
};

export function KeyFindings({ result }: KeyFindingsProps): React.JSX.Element {
  const findings = useMemo(() => collectFindings(result), [result]);

  return (
    <section
      aria-labelledby="findings-title"
      className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"
    >
      <h3
        id="findings-title"
        className="mb-1 text-lg font-semibold text-slate-900 dark:text-slate-100"
      >
        핵심 발견
      </h3>
      <p className="mb-5 text-xs text-slate-500 dark:text-slate-400">
        감점이 발생한 {findings.length}개 항목 (영향 큰 순). 모든 측정은{' '}
        <code className="font-mono">source: automated</code> 입니다.
      </p>

      <ul className="flex flex-col gap-3">
        {findings.map((f) => (
          <li
            key={`${f.axis}-${f.id}`}
            className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/50"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                    {AXIS_LABEL[f.axis]}
                  </span>
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {f.label}
                  </h4>
                </div>
                <p className="mt-1 font-mono text-[10px] text-slate-400 dark:text-slate-500">
                  {f.id}
                </p>
              </div>
              <span className="shrink-0 rounded bg-red-500/15 px-2 py-0.5 font-mono text-[11px] font-semibold text-red-700 dark:text-red-300">
                −{f.deduction}
              </span>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <SourceChip source="automated" size="sm" />
              <span className="text-[11px] italic text-slate-600 dark:text-slate-400">
                근거: {f.source}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
