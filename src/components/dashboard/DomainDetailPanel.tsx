import { ko } from '@/i18n/ko';
import { SourceChip } from '@/components/shared/SourceChip';
import { scoreBandClasses } from '@/components/shared/scoreBand';
import { cn } from '@/lib/utils';
import { isPlaceholderText, type Domain, type QuantumEstimate } from '@/data/schema';

/**
 * SPEC-PQC-001 §3.5 / §3.14:
 * - REQ-DSH-007: findings, recommendations, regulatoryGaps, narrative,
 *                supplyChainNotes, quantumThreatDetail 인라인 노출
 * - REQ-DSH-021: 보수 / 실증 시나리오 side-by-side + citations
 * - REQ-DSH-020: 모든 SourcedText / score 옆 SourceChip
 */

interface DomainDetailPanelProps {
  domain: Domain;
}

const numberFmt = new Intl.NumberFormat('ko-KR');

function formatToffoli(n: number): string {
  // 큰 값은 1e9 단위로 축약 — 4099 RSA 의 경우 ~5.5e11 정도. 사용자 가독성 우선.
  if (n >= 1_000_000_000) {
    return `${(n / 1_000_000_000).toFixed(2)} ×10⁹`;
  }
  return numberFmt.format(Math.round(n));
}

function formatSuccessRate(rate: number): string {
  return `${(rate * 100).toFixed(0)}%`;
}

function ScenarioCard({
  variant,
  title,
  estimate,
  citationIndex,
}: {
  variant: 'conservative' | 'empirical';
  title: string;
  estimate: QuantumEstimate;
  citationIndex: string;
}): React.JSX.Element {
  const bands = scoreBandClasses(estimate.score);
  return (
    <article
      aria-label={title}
      className={cn(
        'flex flex-col gap-2 rounded-lg border border-[hsl(var(--border))]',
        'bg-[hsl(var(--background))] p-3 text-xs',
      )}
    >
      <header className="flex items-baseline justify-between gap-2">
        <h4 className="text-sm font-semibold">{title}</h4>
        <span
          className={cn(
            'rounded-full px-2 py-0.5 text-[10px] font-medium',
            // 워밍 모노크롬 — 보수/실증을 무채 농담으로 구분(보수=진함, 실증=옅음).
            variant === 'conservative'
              ? 'bg-foreground/[0.08] text-foreground'
              : 'bg-muted text-muted-foreground',
          )}
        >
          {variant === 'conservative'
            ? ko.scenario.conservativeShort
            : ko.scenario.empiricalShort}
        </span>
      </header>
      <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5">
        <dt className="text-[hsl(var(--muted-foreground))]">Logical qubit</dt>
        <dd className="font-mono tabular-nums">
          {numberFmt.format(estimate.logicalQubits)}
        </dd>
        <dt className="text-[hsl(var(--muted-foreground))]">Toffoli gate</dt>
        <dd className="font-mono tabular-nums">{formatToffoli(estimate.toffoliGates)}</dd>
        <dt className="text-[hsl(var(--muted-foreground))]">성공률</dt>
        <dd className="font-mono tabular-nums">{formatSuccessRate(estimate.successRate)}</dd>
        <dt className="text-[hsl(var(--muted-foreground))]">정규화 점수</dt>
        <dd className={cn('font-mono font-semibold tabular-nums', bands.text)}>
          {estimate.score}
        </dd>
      </dl>
      <p className="border-t border-[hsl(var(--border))] pt-2 text-[11px] leading-relaxed text-[hsl(var(--muted-foreground))]">
        {estimate.basis} <sup>{citationIndex}</sup>
        {estimate.note && <span className="mt-1 block">※ {estimate.note}</span>}
      </p>
    </article>
  );
}

export function DomainDetailPanel({
  domain,
}: DomainDetailPanelProps): React.JSX.Element {
  const { quantumThreatDetail, narrative, findings, recommendations, regulatoryGaps, supplyChainNotes, certificate } =
    domain;

  // citations 배열을 사용해 인라인 reference 인덱스 매핑
  const citationsList = quantumThreatDetail.citations;
  const conservativeIdx = `[${citationsList.indexOf('Roetteler-2017') + 1 || 1}]`;
  const empiricalIdx = `[${citationsList.indexOf('Willsch-2023') + 1 || 2}]`;

  return (
    <div className="mt-4 flex flex-col gap-4 border-t border-[hsl(var(--border))] pt-4 text-sm">
      {/* 분석 요약 — scanner placeholder 면 섹션 자체를 숨김 (정직성: TODO 노출 차단) */}
      {!isPlaceholderText(narrative) && (
        <section aria-labelledby={`narrative-${domain.name}`} className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <h3
              id={`narrative-${domain.name}`}
              className="text-sm font-semibold text-[hsl(var(--foreground))]"
            >
              분석 요약
            </h3>
            <SourceChip source={narrative.source} size="sm" />
          </div>
          <p className="text-sm leading-relaxed text-[hsl(var(--muted-foreground))]">
            {narrative.text}
          </p>
        </section>
      )}

      {/* 양자 위협 정량 상세 — 보수 vs 실증 side-by-side */}
      <section aria-labelledby={`qt-${domain.name}`} className="flex flex-col gap-2">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div className="flex items-center gap-2">
            <h3
              id={`qt-${domain.name}`}
              className="text-sm font-semibold text-[hsl(var(--foreground))]"
            >
              양자 위협 정량 상세
            </h3>
            <SourceChip source={quantumThreatDetail.source} size="sm" />
          </div>
          <span className="font-mono text-xs text-[hsl(var(--muted-foreground))]">
            {quantumThreatDetail.keyAlgorithm} · {quantumThreatDetail.keyBits} bit
          </span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <ScenarioCard
            variant="conservative"
            title={ko.scenario.conservative}
            estimate={quantumThreatDetail.estimates.conservative}
            citationIndex={conservativeIdx}
          />
          <ScenarioCard
            variant="empirical"
            title={ko.scenario.empirical}
            estimate={quantumThreatDetail.estimates.empirical}
            citationIndex={empiricalIdx}
          />
        </div>
        <p className="text-[11px] text-[hsl(var(--muted-foreground))]">
          <sup>[1]</sup>{' '}
          <a
            href="/methodology#roetteler-2017"
            className="underline underline-offset-2 hover:text-[hsl(var(--primary))]"
          >
            Roetteler 2017
          </a>{' '}
          · <sup>[2]</sup>{' '}
          <a
            href="/methodology#willsch-2023"
            className="underline underline-offset-2 hover:text-[hsl(var(--primary))]"
          >
            Willsch 2023
          </a>
        </p>
      </section>

      {/* 소견 */}
      {findings.length > 0 && (
        <section aria-labelledby={`find-${domain.name}`} className="flex flex-col gap-1.5">
          <h3
            id={`find-${domain.name}`}
            className="text-sm font-semibold text-[hsl(var(--foreground))]"
          >
            소견
          </h3>
          <ul className="flex flex-col gap-1.5 text-sm">
            {findings.map((f, i) => (
              <li key={i} className="flex items-start gap-2">
                <span aria-hidden="true" className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[hsl(var(--primary))]" />
                <span className="flex-1 leading-relaxed text-[hsl(var(--muted-foreground))]">
                  {f.text}
                </span>
                <SourceChip source={f.source} size="sm" />
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* 권고 */}
      {recommendations.length > 0 && (
        <section aria-labelledby={`rec-${domain.name}`} className="flex flex-col gap-1.5">
          <h3
            id={`rec-${domain.name}`}
            className="text-sm font-semibold text-[hsl(var(--foreground))]"
          >
            권고
          </h3>
          <ul className="flex flex-col gap-1.5 text-sm">
            {recommendations.map((r, i) => (
              <li key={i} className="flex items-start gap-2">
                <span aria-hidden="true" className="mt-1.5 size-1.5 shrink-0 rounded-full bg-muted-foreground" />
                <span className="flex-1 leading-relaxed text-[hsl(var(--muted-foreground))]">
                  {r.text}
                </span>
                <SourceChip source={r.source} size="sm" />
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* 규제 갭 */}
      {regulatoryGaps.length > 0 && (
        <section aria-labelledby={`reg-${domain.name}`} className="flex flex-col gap-1.5">
          <h3
            id={`reg-${domain.name}`}
            className="text-sm font-semibold text-[hsl(var(--foreground))]"
          >
            규제 갭
          </h3>
          <ul className="flex flex-col gap-2 text-sm">
            {regulatoryGaps.map((g, i) => (
              <li
                key={i}
                className="flex flex-col gap-1 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--background))] p-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold">
                    {g.refName}
                    {g.article && (
                      <span className="ml-1 text-[hsl(var(--muted-foreground))]">
                        ({g.article})
                      </span>
                    )}
                  </span>
                  <SourceChip source={g.source} size="sm" />
                </div>
                <p className="text-xs leading-relaxed text-[hsl(var(--muted-foreground))]">
                  {g.note}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* 공급망 메모 — scanner placeholder 면 섹션 자체를 숨김 (정직성: TODO 노출 차단) */}
      {!isPlaceholderText(supplyChainNotes) && (
        <section aria-labelledby={`sup-${domain.name}`} className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <h3
              id={`sup-${domain.name}`}
              className="text-sm font-semibold text-[hsl(var(--foreground))]"
            >
              공급망 메모
            </h3>
            <SourceChip source={supplyChainNotes.source} size="sm" />
          </div>
          <p className="text-sm leading-relaxed text-[hsl(var(--muted-foreground))]">
            {supplyChainNotes.text}
          </p>
        </section>
      )}

      {/* 인증서 정보 */}
      <section aria-labelledby={`cert-${domain.name}`} className="flex flex-col gap-1.5">
        <h3
          id={`cert-${domain.name}`}
          className="text-sm font-semibold text-[hsl(var(--foreground))]"
        >
          인증서 정보
        </h3>
        <dl className="grid grid-cols-[6rem_1fr] gap-x-3 gap-y-1 text-xs sm:grid-cols-[8rem_1fr]">
          <dt className="text-[hsl(var(--muted-foreground))]">키 알고리즘</dt>
          <dd className="font-mono">{certificate.keyAlgorithm}</dd>
          <dt className="text-[hsl(var(--muted-foreground))]">키 길이</dt>
          <dd className="font-mono tabular-nums">{certificate.keyBits} bit</dd>
          <dt className="text-[hsl(var(--muted-foreground))]">CA</dt>
          <dd>{certificate.ca}</dd>
          {certificate.chain && (
            <>
              <dt className="text-[hsl(var(--muted-foreground))]">체인</dt>
              <dd className="break-words">{certificate.chain}</dd>
            </>
          )}
          <dt className="text-[hsl(var(--muted-foreground))]">갱신 정책</dt>
          <dd>{certificate.renewal}</dd>
        </dl>
      </section>
    </div>
  );
}
