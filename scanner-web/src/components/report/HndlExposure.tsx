import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import type { ScanResponse } from '@/data/schema';
import { computeHndl } from '@/lib/hndl';

/**
 * SPEC-PQC-003 ⑤ HNDL 양자위협 노출 — Harvest Now, Decrypt Later.
 *
 * 데이터: lib/hndl.ts (certificate.keyAlgorithm 파싱 + Mosca 정적 상수).
 * 취약 자산·Mosca 부등식(X+Y>Z)·atRisk 판정·Q-Day 범위+출처·"추정" 라벨 노출.
 * REQ-HNDL-001/002 + REQ-HON-006 (추정 항목 출처 인용 + 추정 라벨).
 *
 * keyAlgorithm 파싱 불가 시 computeHndl 이 null → 이 컴포넌트는 null 렌더 (호출부도 가드).
 */

interface HndlExposureProps {
  result: ScanResponse;
}

export function HndlExposure({ result }: HndlExposureProps): React.JSX.Element | null {
  const hndl = useMemo(() => computeHndl(result), [result]);

  // 파싱 불가 → unmount (INTEG-3). 호출부도 가드하지만 방어적 null 반환.
  if (hndl === null) return null;

  const { key, quantumVulnerable, mosca, qDay, positiveNote } = hndl;
  const assetLabel = key.bits !== null ? `${key.algo}-${key.bits}` : key.raw;

  return (
    <section
      aria-labelledby="hndl-title"
      className="rounded-lg border border-edge bg-surface p-6"
    >
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <h3 id="hndl-title" className="font-serif text-lg text-ink">
          양자 위협 노출 (HNDL)
        </h3>
        <span className="rounded border border-edge px-1.5 py-0.5 text-[10px] text-faint">
          추정
        </span>
      </div>

      {/* 취약 자산 / 긍정 노트 */}
      {quantumVulnerable ? (
        <div className="rounded-lg border border-risk bg-risk/10 p-4">
          <p className="text-sm text-ink">
            <span className="font-semibold text-risk">양자 취약 자산:</span>{' '}
            <span className="font-mono">{assetLabel} 인증서</span>
          </p>
          <p className="mt-1 text-xs leading-relaxed text-faint">
            {assetLabel} 키는 Shor 알고리즘으로 파괴 가능 — 지금 수집되면 Q-Day 이후 복호화될 수 있음.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-edge bg-surface-2 p-4">
          <p className="text-sm font-semibold text-ink">
            양자내성 키 — HNDL 위험 낮음
          </p>
          <p className="mt-1 text-xs leading-relaxed text-faint">
            {positiveNote ?? '관측된 키가 PQC 계열입니다.'}{' '}
            <span className="font-mono">({key.raw})</span>
          </p>
        </div>
      )}

      {/* Mosca 부등식 시각화 (핵심 큰 시각) */}
      <div className="mt-5">
        <h4 className="mb-2 font-serif text-sm text-ink">Mosca 부등식</h4>
        <div className="flex flex-wrap items-center justify-center gap-3 rounded-lg border border-edge bg-surface-2 p-5">
          <MoscaTerm label="X 데이터 보존" value={mosca.x} />
          <span className="font-serif text-3xl text-faint">+</span>
          <MoscaTerm label="Y 마이그 소요" value={mosca.y} />
          <span
            className={cn(
              'font-serif text-3xl',
              mosca.atRisk ? 'text-risk' : 'text-muted',
            )}
          >
            {mosca.atRisk ? '>' : '≤'}
          </span>
          <MoscaTerm label="Z Q-Day 잔여" value={mosca.z} atRisk={mosca.atRisk} />
        </div>
        <p className="mt-3 text-sm text-muted">
          <span className="font-mono">
            ({mosca.x} + {mosca.y} = {mosca.sum}) {mosca.atRisk ? '>' : '≤'}{' '}
            {mosca.z}
          </span>{' '}
          →{' '}
          {mosca.atRisk ? (
            <span className="font-semibold text-risk">
              지금 전환을 시작해야 함 (atRisk)
            </span>
          ) : (
            <span className="font-semibold text-ink">현재 여유 구간</span>
          )}
        </p>
        <p className="mt-2 text-[11px] leading-relaxed text-faint">
          추정 상수 출처: {mosca.source}
        </p>
      </div>

      {/* Q-Day 범위 + 출처 */}
      <div className="mt-5 border-t border-edge pt-5">
        <h4 className="mb-2 flex flex-wrap items-center gap-2 font-serif text-sm text-ink">
          Q-Day 추정
          <span className="rounded border border-edge px-1.5 py-0.5 text-[10px] text-faint">
            추정
          </span>
        </h4>
        <p className="text-sm text-muted">
          예상 시점:{' '}
          <span className="font-mono font-semibold text-ink">{qDay.range}</span>
        </p>
        <ul className="mt-2 flex flex-col gap-1 text-[11px] leading-relaxed text-faint">
          <li>1차 출처: {qDay.primarySource}</li>
          <li>보조 출처: {qDay.secondarySource}</li>
        </ul>
      </div>
    </section>
  );
}

function MoscaTerm({
  label,
  value,
  atRisk = false,
}: {
  label: string;
  value: number;
  atRisk?: boolean;
}): React.JSX.Element {
  return (
    <div className="flex flex-col items-center rounded-md border border-edge bg-surface px-4 py-3">
      <span
        className={cn(
          'font-serif text-3xl tabular-nums',
          atRisk ? 'text-risk' : 'text-ink',
        )}
      >
        {value}
        <span className="ml-0.5 text-xs font-normal text-faint">년</span>
      </span>
      <span className="mt-1 text-[10px] text-muted">{label}</span>
    </div>
  );
}
