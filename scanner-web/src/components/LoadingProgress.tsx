import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

/**
 * SPEC-PQC-002 REQ-WEB-003 — 4 단계 진행 인디케이터.
 *
 * 단계 전이 트리거 (지시 §2 / §6):
 *   - polling 없음. SSE 없음 (REQ-API-001 단순 sequential await 선택)
 *   - 시간 기반 추정 + 서버 응답 시 강제 종료
 *   - startedAt 으로부터 경과 시간을 setInterval 로 추적
 *   - 각 단계의 기대 길이 누적치를 넘으면 다음 단계로 advance
 *   - 부모가 useScan.status='success'/'error' 가 되면 본 컴포넌트 unmount → 강제 종료
 *
 * 단계 (SPEC §2.1 — sslyze 5-20s, probe 2-10s, scoring <1s, LLM 3-8s):
 *   0: 입력 정규화 (즉시, ~0.2s)
 *   1: Phase1 sslyze 측정 중 (5-20s, 평균 12s)
 *   2: Phase2 PQC probe 중 (2-10s, 평균 6s)
 *   3: LLM narrative 생성 중 (3-8s, 평균 5s)
 *
 * 발표 임팩트: 활성 단계만 펄스 애니메이션(ink). 완료 단계는 muted 체크.
 */

interface LoadingProgressProps {
  startedAt: number;
  hostname: string;
}

interface Stage {
  id: string;
  title: string;
  detail: string;
  /** 본 단계의 기대 소요 시간 (ms). 누적 cutoff 계산용. */
  expectedMs: number;
}

// 단계별 기대 시간 — SPEC §2.1 평균치 기준 보수적 추정
const STAGES: Stage[] = [
  {
    id: 'normalize',
    title: '입력 정규화',
    detail: 'hostname 검증 및 ASCII 변환',
    expectedMs: 200,
  },
  {
    id: 'sslyze',
    title: 'Phase 1: TLS 측정 (sslyze)',
    detail: 'TLS 버전 · cipher · 인증서 · ALPN 수집 중',
    expectedMs: 12_000,
  },
  {
    id: 'probe',
    title: 'Phase 2: PQC probe',
    detail: 'X25519MLKEM768 하이브리드 KEM 지원 여부 측정',
    expectedMs: 6_000,
  },
  {
    id: 'llm',
    title: 'LLM 분석 생성',
    detail: 'Claude Sonnet 4.6 narrative + 권고 생성',
    expectedMs: 5_000,
  },
];

// 단계별 누적 cutoff (ms). 경과 시간이 이 값을 넘으면 다음 단계로.
const CUMULATIVE_CUTOFFS = STAGES.reduce<number[]>((acc, stage, idx) => {
  const prev = idx === 0 ? 0 : (acc[idx - 1] ?? 0);
  acc.push(prev + stage.expectedMs);
  return acc;
}, []);

function computeActiveIndex(elapsedMs: number): number {
  for (let i = 0; i < CUMULATIVE_CUTOFFS.length; i += 1) {
    const cutoff = CUMULATIVE_CUTOFFS[i] ?? 0;
    if (elapsedMs < cutoff) return i;
  }
  // 마지막 단계 cutoff 초과 — 마지막 단계 유지 (LLM 끝까지 펄스)
  return STAGES.length - 1;
}

export function LoadingProgress({
  startedAt,
  hostname,
}: LoadingProgressProps): React.JSX.Element {
  const [elapsed, setElapsed] = useState(() => Date.now() - startedAt);

  useEffect(() => {
    const tick = (): void => setElapsed(Date.now() - startedAt);
    tick();
    const id = window.setInterval(tick, 250);
    return () => {
      window.clearInterval(id);
    };
  }, [startedAt]);

  const activeIndex = computeActiveIndex(elapsed);
  const elapsedSec = (elapsed / 1000).toFixed(1);

  return (
    <section
      aria-busy="true"
      aria-live="polite"
      className="rounded-lg border border-edge bg-surface p-6"
    >
      <header className="mb-5 flex items-baseline justify-between gap-2">
        <h2 className="font-serif text-lg font-semibold text-ink">
          측정 진행 중
        </h2>
        <span className="font-mono text-sm tabular-nums text-faint">
          {elapsedSec}s
        </span>
      </header>

      <p className="mb-5 font-sans text-sm text-muted">
        <code className="rounded border border-edge bg-surface-2 px-1.5 py-0.5 font-mono text-xs">
          {hostname}
        </code>{' '}
        — sslyze · pqc_probe · LLM 순차 호출
      </p>

      <ol className="flex flex-col gap-3">
        {STAGES.map((stage, idx) => {
          const state =
            idx < activeIndex ? 'done' : idx === activeIndex ? 'active' : 'pending';
          return (
            <li
              key={stage.id}
              className={cn(
                'flex items-start gap-3 rounded-lg border p-3 transition-colors',
                state === 'done' && 'border-edge bg-surface-2',
                state === 'active' && 'border-muted bg-surface-2',
                state === 'pending' && 'border-edge bg-surface',
              )}
            >
              <span
                className={cn(
                  'mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                  state === 'done' && 'bg-ink text-coal',
                  state === 'active' && 'animate-stage-active bg-ink text-coal',
                  state === 'pending' && 'bg-surface-2 text-faint',
                )}
                aria-hidden="true"
              >
                {state === 'done' ? '✓' : idx + 1}
              </span>
              <div className="flex-1">
                <div
                  className={cn(
                    'font-sans text-sm font-medium',
                    state === 'done' && 'text-muted',
                    state === 'active' && 'text-ink',
                    state === 'pending' && 'text-faint',
                  )}
                >
                  {stage.title}
                </div>
                <div className="font-sans text-xs text-faint">
                  {stage.detail}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
