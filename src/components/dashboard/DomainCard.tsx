import { useId } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { ko } from '@/i18n/ko';
import { cn } from '@/lib/utils';
import { ScoreBar } from '@/components/shared/ScoreBar';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { scoreBandClasses } from '@/components/shared/scoreBand';
import { DomainDetailPanel } from './DomainDetailPanel';
import type { Domain } from '@/data/schema';

/**
 * SPEC-PQC-001 §3.5:
 * - REQ-DSH-001/005/006: 4축 ScoreBar + StatusBadge
 * - REQ-DSH-007/012: 인라인 expand (URL 변경 없음)
 * - REQ-DSH-020: SourceChip 인접 (ScoreBar/DetailPanel 내부에서 처리)
 * - REQ-DSH-021: quantumThreat dual-scenario 마커
 * - REQ-A11Y-002/003/004/007: 키보드 toggle, aria-expanded, label
 */

interface DomainCardProps {
  domain: Domain;
  isExpanded: boolean;
  onToggle: () => void;
  className?: string;
}

export function DomainCard({
  domain,
  isExpanded,
  onToggle,
  className,
}: DomainCardProps): React.JSX.Element {
  const detailId = useId();
  const { name, url, sector, scores, certificate, pqc, quantumThreatDetail } = domain;

  // 헤드라인 점수: 4축 평균 (REQ-DSH-005 시각화 일관성)
  const headline = Math.round(
    (scores.tls.value +
      scores.hybridKem.value +
      scores.certOps.value +
      scores.quantumThreat.value) /
      4,
  );
  const headlineBands = scoreBandClasses(headline);

  // dual-scenario 보조 마커 — quantumThreat 의 conservative
  const conservativeScore = quantumThreatDetail.estimates.conservative.score;
  const empiricalScore = scores.quantumThreat.value;

  return (
    <article
      aria-labelledby={`${detailId}-title`}
      className={cn(
        'flex flex-col gap-3 rounded-xl border border-[hsl(var(--border))]',
        'bg-[hsl(var(--card))] p-4 text-[hsl(var(--card-foreground))]',
        'transition-shadow hover:shadow-sm',
        isExpanded && 'ring-1 ring-[hsl(var(--ring))]/40',
        className,
      )}
    >
      {/* Header */}
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3
            id={`${detailId}-title`}
            className="truncate text-base font-semibold sm:text-lg"
            title={name}
          >
            {name}
          </h3>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              'mt-0.5 inline-block max-w-full truncate text-xs',
              'text-[hsl(var(--muted-foreground))] underline-offset-2 hover:underline',
            )}
            title={url}
          >
            {url}
          </a>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span
            className={cn(
              'rounded-full border px-2 py-0.5 text-[10px] font-medium',
              'border-[hsl(var(--border))] bg-[hsl(var(--background))]',
            )}
          >
            {sector}
          </span>
          <span
            aria-label={`종합 점수 ${headline}`}
            className={cn(
              // 큰 종합 점수 — 워밍 모노크롬 리스타일에서 serif 로 위계 강조.
              'font-serif text-lg font-bold tabular-nums sm:text-xl',
              headlineBands.text,
            )}
          >
            {headline}
          </span>
        </div>
      </header>

      {/* 4축 ScoreBars */}
      <div className="flex flex-col gap-1.5">
        <ScoreBar
          label={ko.axisLabel.tls}
          value={scores.tls.value}
          source={scores.tls.source}
        />
        <ScoreBar
          label={ko.axisLabel.hybridKem}
          value={scores.hybridKem.value}
          source={scores.hybridKem.source}
        />
        <ScoreBar
          label={ko.axisLabel.certOps}
          value={scores.certOps.value}
          source={scores.certOps.source}
        />
        <ScoreBar
          label={ko.axisLabel.quantumThreat}
          value={empiricalScore}
          source={scores.quantumThreat.source}
          secondaryValue={conservativeScore}
          secondaryLabel={`${ko.scenario.conservativeShort} ${conservativeScore}`}
          ariaDescription={`${ko.scenario.empiricalShort} ${empiricalScore}, ${ko.scenario.conservativeShort} ${conservativeScore}`}
        />
      </div>

      {/* StatusBadges */}
      <div className="flex flex-wrap items-center gap-1.5">
        <StatusBadge value={certificate.renewal} />
        <StatusBadge value={pqc.keyExchange} />
        <StatusBadge value={pqc.hybrid} />
        <StatusBadge value={pqc.maturity} />
      </div>

      {/* Toggle */}
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isExpanded}
        aria-controls={detailId}
        className={cn(
          'mt-1 flex w-full items-center justify-center gap-1.5',
          'rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--background))]',
          'px-3 py-1.5 text-xs font-medium text-[hsl(var(--foreground))]',
          'transition-colors hover:bg-[hsl(var(--accent))]',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]',
        )}
      >
        {isExpanded ? (
          <>
            <ChevronUp aria-hidden="true" className="size-3.5" />
            상세 닫기
          </>
        ) : (
          <>
            <ChevronDown aria-hidden="true" className="size-3.5" />
            상세 보기
          </>
        )}
      </button>

      {/* Inline detail panel */}
      {isExpanded && (
        <div id={detailId} role="region" aria-label={`${name} 상세 정보`}>
          <DomainDetailPanel domain={domain} />
        </div>
      )}
    </article>
  );
}
