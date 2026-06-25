import { useMemo } from 'react';
import type { ScanResponse } from '@/data/scannerSchema';
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
      className="rounded-lg border border-edge bg-surface p-6"
    >
      <h3 id="findings-title" className="mb-1 font-serif text-lg text-ink">
        핵심 발견
      </h3>
      <p className="mb-5 text-xs text-faint">
        감점 항목 {findings.length}개 · 영향 큰 순 · source: automated
      </p>

      <ul className="flex flex-col gap-2">
        {findings.map((f) => (
          <li
            key={`${f.axis}-${f.id}`}
            className="rounded-lg border border-edge bg-surface-2 p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded border border-edge px-1.5 py-0.5 text-[10px] text-muted">
                    {AXIS_LABEL[f.axis]}
                  </span>
                  <h4 className="text-sm font-semibold text-ink">{f.label}</h4>
                </div>
                <p className="mt-1 font-mono text-[10px] text-faint">{f.id}</p>
              </div>
              <span className="shrink-0 font-serif text-2xl text-risk tabular-nums">
                −{f.deduction}
              </span>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <SourceChip source="automated" size="sm" />
              <span className="text-[11px] text-faint">근거: {f.source}</span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
