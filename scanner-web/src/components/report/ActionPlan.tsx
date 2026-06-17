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
  { key: 'immediate', label: '즉시' },
  { key: 'shortTerm', label: '단기' },
  { key: 'midTerm', label: '중기' },
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
      className="rounded-lg border border-edge bg-surface p-6"
    >
      <h3
        id="action-plan-title"
        className="mb-5 font-serif text-lg text-ink"
      >
        우선순위 액션플랜
      </h3>

      {plan.execSummary && (
        <div className="mb-6 rounded-lg border border-edge bg-surface-2 p-4">
          <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-faint">
            경영진 요약 (LLM)
          </h4>
          <p className="whitespace-pre-line text-sm leading-relaxed text-muted">
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
              <h4 className="mb-2 flex items-center gap-2 font-serif text-sm text-ink">
                <span className="inline-flex items-center rounded border border-edge px-2 py-0.5 text-xs text-muted">
                  {stage.label}
                </span>
                <span className="text-xs font-normal text-faint">
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
        <p className="mt-5 rounded border border-edge bg-surface-2 px-3 py-2 text-xs leading-relaxed text-faint">
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
    <li className="rounded-lg border border-edge bg-surface-2 p-3">
      <p className="text-sm font-medium text-ink">{item.title}</p>
      {tier === 'paid' && (
        <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-faint">
          <span className="rounded border border-edge px-1.5 py-0.5">
            난이도 {LEVEL_LABEL[item.difficulty]}
          </span>
          <span
            className={cn(
              'rounded border border-edge px-1.5 py-0.5',
              item.impact === 'high' && 'border-risk text-risk',
            )}
          >
            영향 {LEVEL_LABEL[item.impact]}
          </span>
          <span className="italic">{item.standardRef}</span>
        </div>
      )}
    </li>
  );
}
