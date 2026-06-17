import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import type {
  RuleTrace,
  ScanResponse,
} from '@/data/schema';
import { ScoreBar } from './shared/ScoreBar';
import { SourceChip } from './shared/SourceChip';
import { scoreBandClasses } from './shared/scoreBand';
import { GradeHeader } from './report/GradeHeader';
import { BenchmarkPosition } from './report/BenchmarkPosition';
import { KeyFindings } from './report/KeyFindings';
import { HndlExposure } from './report/HndlExposure';
import { RegulationMap } from './report/RegulationMap';
import { ActionPlan } from './report/ActionPlan';
import { collectFindings } from '@/lib/findings';
import { computeHndl } from '@/lib/hndl';
import { useBenchmark } from '@/lib/useBenchmark';
import type { Sector } from '@/lib/sector';
import type { ReportTier } from '@/lib/tier';

/**
 * SPEC-PQC-002 REQ-WEB-004/005/006 + REQ-HON-001~004 — 결과 화면.
 *
 * 정직성 표시 정책 ([[feedback_data_source_honesty]]):
 *   - 4축 점수마다 SourceChip 노출 (백엔드 source 필드 그대로)
 *   - narrative 가 있으면 'llm-only' chip 명시 + Sonnet 모델 ID 노출
 *   - 각 축마다 fired=true rule 의 source 인용 표시
 *   - 측정 시각 ISO + 사람 친화 포맷 동시 노출
 *   - cached=true 면 캐시 칩 표시
 *   - quantumThreat 옆 calibration disclosure (REQ-HON-001)
 *   - 헤더 disclaimer (REQ-HON-003)
 *   - footer 측정 시각 + scanner 버전 + GitHub 링크 (REQ-HON-004)
 *
 * 발표 임팩트: 4축 카드 grid (mobile 1열, sm 2열) + 첫 인상 큰 점수 숫자.
 */

interface ResultDohaeProps {
  result: ScanResponse;
  onScanAgain: () => void;
  /** SPEC-PQC-003 — ScanForm 에서 surface 된 사용자 선택 섹터 (③ 비교군). */
  sector: Sector;
  /** SPEC-PQC-003 — reportTier (free | paid), ?tier=paid 토글. */
  tier: ReportTier;
}

const AXIS_META = {
  tls: {
    label: 'TLS 위생',
    description: 'TLS 버전·cipher·취약점·HSTS 점검',
  },
  hybridKem: {
    label: '하이브리드 KEM',
    description: 'X25519MLKEM768 등 PQC 하이브리드 키교환 지원',
  },
  certOps: {
    label: '인증서 운영',
    description: '갱신·OCSP·체인·만료 임박 점검',
  },
  quantumThreat: {
    label: '양자 위협 정량',
    description: 'Shor 알고리즘으로 키 파괴에 필요한 logical qubit 수',
  },
} as const;

function formatMeasuredAt(iso: string): { iso: string; human: string } {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return { iso, human: iso };
    const human = new Intl.DateTimeFormat('ko-KR', {
      dateStyle: 'medium',
      timeStyle: 'medium',
      timeZone: 'Asia/Seoul',
    }).format(d);
    return { iso, human: `${human} (KST)` };
  } catch {
    return { iso, human: iso };
  }
}

function statusBadge(status: ScanResponse['status']): {
  label: string;
  tone: string;
} {
  // 모노크롬: 정상/부분은 무채, 차단/실패만 risk 강조.
  switch (status) {
    case 'ok':
      return { label: 'OK', tone: 'border-edge text-muted' };
    case 'partial':
      return { label: 'PARTIAL', tone: 'border-edge text-muted' };
    case 'blocked':
      return { label: 'BLOCKED', tone: 'border-risk text-risk' };
    case 'error':
      return { label: 'ERROR', tone: 'border-risk text-risk' };
  }
}

export function ResultDohae({
  result,
  onScanAgain,
  sector,
  tier,
}: ResultDohaeProps): React.JSX.Element {
  const measured = useMemo(
    () => formatMeasuredAt(result.measuredAt),
    [result.measuredAt],
  );
  const badge = useMemo(() => statusBadge(result.status), [result.status]);

  // SPEC-PQC-003 ③ — benchmark.json 비동기 로드 (실패 시 null → ③ unmount).
  const benchmark = useBenchmark();

  // SPEC-PQC-003 ④ — fired 룰 존재 여부 (truthy+비어있지않음 → 아니면 unmount, INTEG-3).
  const hasFindings = useMemo(
    () => collectFindings(result).length > 0,
    [result],
  );

  // SPEC-PQC-003 ⑤ — keyAlgorithm 파싱 가능 여부 (null → ⑤ unmount, INTEG-3).
  const hndl = useMemo(() => computeHndl(result), [result]);

  return (
    <section className="flex flex-col gap-6">
      {/* === Header === */}
      <header className="rounded-xl border border-edge bg-surface p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-serif text-2xl text-ink">{result.hostname}</h2>
            <p className="mt-1 text-xs text-faint">
              <time dateTime={measured.iso}>{measured.human}</time>
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                'inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold',
                badge.tone,
              )}
            >
              {badge.label}
            </span>
            {result.cached && (
              <span className="inline-flex items-center rounded-full border border-edge px-3 py-1 text-xs text-faint">
                캐시
              </span>
            )}
            <button
              type="button"
              onClick={onScanAgain}
              className="rounded-md border border-edge bg-surface-2 px-3 py-1.5 text-xs font-semibold text-ink hover:bg-coal"
            >
              다른 도메인 측정
            </button>
          </div>
        </div>
      </header>

      {/* === 에러 패널 (status==='blocked'/'error'/'partial' or errors[]) === */}
      {result.errors && result.errors.length > 0 && (
        <section
          aria-labelledby="errors-title"
          className="rounded-xl border border-edge bg-surface p-5"
        >
          <h3
            id="errors-title"
            className="mb-3 font-serif text-sm text-ink"
          >
            측정 이벤트
          </h3>
          <ul className="flex flex-col gap-2 text-sm text-muted">
            {result.errors.map((err, i) => (
              <li key={`${err.stage}-${i}`} className="flex flex-col gap-0.5">
                <span className="font-mono text-xs text-faint">
                  [{err.stage}] {err.code}
                </span>
                <span>{err.message}</span>
              </li>
            ))}
          </ul>
          {result.status === 'blocked' && (
            <p className="mt-3 rounded border border-risk px-2 py-1.5 text-xs text-risk">
              외부 TLS 스캔 차단 — 차단 자체가 발견입니다.
            </p>
          )}
        </section>
      )}

      {/* === ① 종합 판정 헤더 (등급 A~F + verdict) — SPEC-PQC-003 === */}
      <GradeHeader result={result} />

      {/* === Section 1 / ② 4축 점수 도해 === */}
      <section
        aria-labelledby="scores-title"
        className="rounded-xl border border-edge bg-surface p-6"
      >
        <div className="mb-5 flex items-baseline justify-between gap-2">
          <h3 id="scores-title" className="font-serif text-lg text-ink">
            4축 점수
          </h3>
          <span className="text-[11px] text-faint">source: automated · 0–100</span>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <ScoreCard
            label={AXIS_META.tls.label}
            description={AXIS_META.tls.description}
            value={result.scores.tls.value}
            source={result.scores.tls.source}
          />
          <ScoreCard
            label={AXIS_META.hybridKem.label}
            description={AXIS_META.hybridKem.description}
            value={result.scores.hybridKem.value}
            source={result.scores.hybridKem.source}
          />
          <ScoreCard
            label={AXIS_META.certOps.label}
            description={AXIS_META.certOps.description}
            value={result.scores.certOps.value}
            source={result.scores.certOps.source}
          />
          <ScoreCard
            label={AXIS_META.quantumThreat.label}
            description={AXIS_META.quantumThreat.description}
            value={result.scores.quantumThreat.value}
            source={result.scores.quantumThreat.source}
            disclosure="ordering-preserving 만 의미 · 절대값 매핑 없음"
          />
        </div>

        {/* 보조: 가로 ScoreBar 묶음 — 비교용 */}
        <div className="mt-6 flex flex-col gap-2 border-t border-edge pt-5">
          <ScoreBar
            label="TLS"
            value={result.scores.tls.value}
            source={result.scores.tls.source}
          />
          <ScoreBar
            label="하이브리드 KEM"
            value={result.scores.hybridKem.value}
            source={result.scores.hybridKem.source}
          />
          <ScoreBar
            label="인증서 운영"
            value={result.scores.certOps.value}
            source={result.scores.certOps.source}
          />
          <ScoreBar
            label="양자 위협"
            value={result.scores.quantumThreat.value}
            source={result.scores.quantumThreat.source}
          />
        </div>
      </section>

      {/* === ③ 비교군 위치 — benchmark 로드 성공 시에만 mount (INTEG-3) === */}
      {benchmark && (
        <BenchmarkPosition
          result={result}
          benchmark={benchmark}
          selectedSector={sector}
        />
      )}

      {/* === ④ 핵심 발견 — fired 룰이 있을 때만 mount (INTEG-3) === */}
      {hasFindings && <KeyFindings result={result} />}

      {/* === ⑤ HNDL 양자위협 노출 — keyAlgorithm 파싱 성공 시에만 mount (INTEG-3) === */}
      {hndl && <HndlExposure result={result} />}

      {/* === ⑥ 규제 컴플라이언스 매핑 — 항상 mount (정적 테이블), 섹터 인지 텍스트 === */}
      <RegulationMap result={result} sector={sector} />

      {/* === Section 2: 점수 근거 (rule trace) === */}
      <ScoreTraceSection result={result} />

      {/* === Section 3: LLM narrative === */}
      {result.narrative && (
        <NarrativeSection narrative={result.narrative} />
      )}

      {/* === ⑦ 우선순위 액션플랜 — SPEC-PQC-003 === */}
      <ActionPlan result={result} tier={tier} />

      {/* === Footer 정직성 메타 + 전역 disclaimer (REQ-HON-004) === */}
      <footer className="rounded-xl border border-edge bg-surface p-5 text-xs text-faint">
        <dl className="grid grid-cols-2 gap-1 font-mono text-[11px] sm:grid-cols-4">
          <div>
            <dt className="inline">measuredAt</dt>{' '}
            <dd className="inline text-muted">{measured.iso}</dd>
          </div>
          <div>
            <dt className="inline">status</dt>{' '}
            <dd className="inline text-muted">{result.status}</dd>
          </div>
          <div>
            <dt className="inline">cached</dt>{' '}
            <dd className="inline text-muted">{String(result.cached ?? false)}</dd>
          </div>
          <div>
            <dt className="inline">phase2</dt>{' '}
            <dd className="inline text-muted">{result.meta.phase2.status}</dd>
          </div>
        </dl>
        <p className="mt-3 text-[11px] leading-relaxed">
          강의 발표 시연용 데모. 진단·감사·구매 의사결정 근거가 아닙니다. LLM 분석은 통계적
          업계표준이 아닙니다. SPEC-PQC-002 · scanner-api · scanner-web.
        </p>
      </footer>
    </section>
  );
}

// === Sub-components ===========================================================

function ScoreCard({
  label,
  description,
  value,
  source,
  disclosure,
}: {
  label: string;
  description: string;
  value: number;
  source: ScanResponse['scores']['tls']['source'];
  disclosure?: string;
}): React.JSX.Element {
  const band = scoreBandClasses(value);
  const clamped = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <article className="flex flex-col rounded-lg border border-edge bg-surface-2 p-4">
      <header className="mb-2 flex items-start justify-between gap-2">
        <h4 className="font-serif text-sm text-ink">{label}</h4>
        <SourceChip source={source} size="sm" />
      </header>
      <div className="mt-1 flex items-baseline gap-1">
        {/* 큰 점수 숫자: 시인성 최우선. 위험밴드만 risk, 나머지 ink/muted. */}
        <span
          className={cn('font-serif text-5xl tabular-nums', band.text)}
        >
          {clamped}
        </span>
        <span className="text-sm text-faint">/ 100</span>
      </div>
      <p className="mt-1 text-[11px] leading-relaxed text-faint">{description}</p>
      {disclosure && (
        <p className="mt-2 text-[11px] leading-relaxed text-faint">
          calibration: {disclosure}
        </p>
      )}
    </article>
  );
}

function ScoreTraceSection({
  result,
}: {
  result: ScanResponse;
}): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const tlsRules = result.meta.scoring.tls.rules;
  const certOpsRules = result.meta.scoring.certOps.rules;
  const firedTls = tlsRules.filter((r) => r.fired);
  const firedCertOps = certOpsRules.filter((r) => r.fired);
  const hybridKem = result.meta.scoring.hybridKem;
  const quantumThreat = result.meta.scoring.quantumThreat;

  return (
    <section
      aria-labelledby="trace-title"
      className="rounded-xl border border-edge bg-surface p-6"
    >
      <header className="mb-3 flex items-center justify-between">
        <h3 id="trace-title" className="font-serif text-lg text-ink">
          점수 근거
        </h3>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="rounded border border-edge bg-surface-2 px-3 py-1 text-xs font-semibold text-ink hover:bg-coal"
        >
          {open ? '접기' : `자세히 (fired ${firedTls.length + firedCertOps.length})`}
        </button>
      </header>

      {/* 핵심 1-2개 발췌 — 접힘 상태일 때도 노출 ([[feedback_data_source_honesty]]) */}
      <div className="mb-4 flex flex-col gap-2">
        <RuleSummary
          axisLabel="TLS"
          fired={firedTls.length}
          final={result.meta.scoring.tls.final}
        />
        <RuleSummary
          axisLabel="CertOps"
          fired={firedCertOps.length}
          final={result.meta.scoring.certOps.final}
        />
        <p className="text-xs text-muted">
          <span className="font-semibold text-ink">하이브리드 KEM</span>{' '}
          <span className="font-mono tabular-nums text-ink">{hybridKem.value}</span>
          <span className="text-faint"> · {hybridKem.basis}</span>
        </p>
        {quantumThreat && (
          <p className="text-xs text-muted">
            <span className="font-semibold text-ink">양자 위협</span> logical qubits{' '}
            <span className="font-mono tabular-nums text-ink">
              {quantumThreat.qubits}
            </span>
            {quantumThreat.qubits === 0 && (
              <span className="text-faint"> · PQC Shor 무력</span>
            )}
          </p>
        )}
      </div>

      {open && (
        <div className="flex flex-col gap-5 border-t border-edge pt-5">
          <RuleList
            title={`TLS rule trace (final=${result.meta.scoring.tls.final})`}
            rules={firedTls}
          />
          <RuleList
            title={`인증서 운영 rule trace (final=${result.meta.scoring.certOps.final})`}
            rules={firedCertOps}
          />
        </div>
      )}
    </section>
  );
}

function RuleSummary({
  axisLabel,
  fired,
  final,
}: {
  axisLabel: string;
  fired: number;
  final: number;
}): React.JSX.Element {
  return (
    <p className="text-xs text-muted">
      <span className="font-semibold text-ink">{axisLabel}</span> fired{' '}
      <span className="font-mono tabular-nums text-ink">{fired}</span> · final{' '}
      <span className="font-mono tabular-nums text-ink">{final}</span>
    </p>
  );
}

function RuleList({
  title,
  rules,
}: {
  title: string;
  rules: RuleTrace[];
}): React.JSX.Element {
  return (
    <div>
      <h4 className="mb-2 font-serif text-sm text-ink">{title}</h4>
      {rules.length === 0 ? (
        <p className="text-xs text-faint">fired 룰 없음 (감점 0)</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {rules.map((r) => (
            <li
              key={r.id}
              className="rounded border border-edge bg-surface-2 p-3 text-xs"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-ink">{r.label}</p>
                  <p className="mt-0.5 font-mono text-[10px] text-faint">{r.id}</p>
                </div>
                {/* 감점: risk 강조 (미달 신호) */}
                <span className="shrink-0 rounded border border-risk px-2 py-0.5 font-mono text-[11px] font-semibold text-risk">
                  −{r.deduction}
                </span>
              </div>
              <p className="mt-2 text-[11px] text-faint">근거: {r.source}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function NarrativeSection({
  narrative,
}: {
  narrative: NonNullable<ScanResponse['narrative']>;
}): React.JSX.Element {
  return (
    <section
      aria-labelledby="narrative-title"
      className="rounded-xl border border-edge bg-surface p-6"
    >
      <header className="mb-3 flex items-center justify-between gap-2">
        <h3 id="narrative-title" className="font-serif text-lg text-ink">
          LLM 분석
        </h3>
        <div className="flex items-center gap-2">
          <SourceChip source={narrative.source} size="md" />
          <span className="rounded border border-edge px-2 py-0.5 font-mono text-[11px] text-faint">
            {narrative.model}
          </span>
        </div>
      </header>
      <p className="mb-4 whitespace-pre-line text-sm leading-relaxed text-muted">
        {narrative.text}
      </p>
      {narrative.recommendations.length > 0 && (
        <div>
          <h4 className="mb-2 font-serif text-xs uppercase tracking-wide text-ink">
            권고
          </h4>
          <ul className="flex flex-col gap-1.5 text-sm text-muted">
            {narrative.recommendations.map((rec, i) => (
              <li key={i} className="flex items-start gap-2">
                <span
                  aria-hidden="true"
                  className="mt-2 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-faint"
                />
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
