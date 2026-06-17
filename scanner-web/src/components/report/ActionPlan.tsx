import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import type { ScanResponse } from '@/data/schema';
import {
  buildActionPlan,
  type ActionItem,
  type Difficulty,
  type Impact,
} from '@/lib/actionPlan';

/**
 * SPEC-PQC-003 ⑦ 우선순위 액션플랜 — 즉시 / 단기 / 중기 + 경영진 요약.
 *
 * 데이터: lib/actionPlan.ts (fired tls/certOps 룰 매핑 + narrative?.text).
 * execSummary 가 없으면(narrative=None) 요약부만 unmount, 액션 단계는 표시 (INTEG-3).
 * REQ-CP (⑦) + REQ-CP-004 (free=요약 / paid=상세).
 */

interface ActionPlanProps {
  result: ScanResponse;
  /** 'paid' 면 standardRef·difficulty·impact 상세 노출, 'free' 면 요약. */
  tier: 'free' | 'paid';
}

const STAGE_META = [
  { key: 'immediate', label: '즉시', accent: 'border-red-500/40 bg-red-500/5' },
  { key: 'shortTerm', label: '단기', accent: 'border-amber-500/40 bg-amber-500/5' },
  { key: 'midTerm', label: '중기', accent: 'border-sky-500/40 bg-sky-500/5' },
] as const;

const LEVEL_LABEL: Record<Difficulty | Impact, string> = {
  low: '하',
  med: '중',
  high: '상',
};

export function ActionPlan({ result, tier }: ActionPlanProps): React.JSX.Element {
  const plan = useMemo(() => buildActionPlan(result), [result]);
  const stages = {
    immediate: plan.immediate,
    shortTerm: plan.shortTerm,
    midTerm: plan.midTerm,
  };

  return (
    <section
      aria-labelledby="action-plan-title"
      className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"
    >
      <h3
        id="action-plan-title"
        className="mb-1 text-lg font-semibold text-slate-900 dark:text-slate-100"
      >
        우선순위 액션플랜
      </h3>
      <p className="mb-5 text-xs text-slate-500 dark:text-slate-400">
        측정된 fired 룰과 PQC 전환 상태에 기반한 단계별 조치 (표준 인용 포함).
      </p>

      {plan.execSummary && (
        <div className="mb-6 rounded-lg border border-violet-200 bg-violet-50/40 p-4 dark:border-violet-900/60 dark:bg-violet-950/20">
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-violet-700 dark:text-violet-300">
            경영진 요약 (LLM)
          </h4>
          <p className="whitespace-pre-line text-sm leading-relaxed text-slate-800 dark:text-slate-200">
            {plan.execSummary}
          </p>
        </div>
      )}

      <div className="flex flex-col gap-5">
        {STAGE_META.map((stage) => {
          const items = stages[stage.key];
          if (items.length === 0) return null;
          return (
            <div key={stage.key}>
              <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-200">
                <span
                  className={cn(
                    'inline-flex items-center rounded border px-2 py-0.5 text-xs',
                    stage.accent,
                  )}
                >
                  {stage.label}
                </span>
                <span className="text-xs font-normal text-slate-400 dark:text-slate-500">
                  {items.length}개
                </span>
              </h4>
              <ul className="flex flex-col gap-2">
                {items.map((item) => (
                  <ActionRow key={item.title} item={item} tier={tier} />
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      {tier === 'free' && (
        <p className="mt-5 rounded bg-slate-100 px-3 py-2 text-xs leading-relaxed text-slate-600 dark:bg-slate-800/60 dark:text-slate-400">
          난이도·영향도·CBOM 등 상세 액션플랜은 유료 리포트에서 제공됩니다
          (<code className="font-mono">?tier=paid</code> 미리보기).
        </p>
      )}
    </section>
  );
}

function ActionRow({
  item,
  tier,
}: {
  item: ActionItem;
  tier: 'free' | 'paid';
}): React.JSX.Element {
  return (
    <li className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/50">
      <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
        {item.title}
      </p>
      {tier === 'paid' && (
        <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
          <span className="rounded bg-slate-200 px-1.5 py-0.5 dark:bg-slate-700">
            난이도 {LEVEL_LABEL[item.difficulty]}
          </span>
          <span className="rounded bg-slate-200 px-1.5 py-0.5 dark:bg-slate-700">
            영향 {LEVEL_LABEL[item.impact]}
          </span>
          <span className="italic">{item.standardRef}</span>
        </div>
      )}
    </li>
  );
}
