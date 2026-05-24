import { ko } from '@/i18n/ko';
import { REFERENCES, type CitationId } from '@/data/references';

/**
 * SPEC-PQC-001 §3.6 (Methodology Page).
 * 4축 측정 모델 + 양자 위협 정량화 + 보수 vs 실증 시나리오 + 점수 정규화 + 한계.
 * Roetteler 2017, Willsch 2023, 김의결·안혁 2025 인용.
 */
export function MethodologyPage(): React.JSX.Element {
  return (
    <article
      aria-labelledby="methodology-title"
      className="container mx-auto max-w-3xl space-y-10 px-4 py-10 leading-relaxed"
    >
      <header className="space-y-3">
        <h1 id="methodology-title" className="text-3xl font-bold tracking-tight">
          {ko.pages.methodology.title}
        </h1>
        <p className="text-[hsl(var(--muted-foreground))]">
          {ko.pages.methodology.subtitle}
        </p>
        <p className="text-sm">{ko.methodology.intro}</p>
      </header>

      <Section title={`1. ${ko.methodology.sectionAxes}`}>
        <AxisTable />
      </Section>

      <Section title={`2. ${ko.methodology.sectionQuantum}`}>
        <p>
          각 도메인의 인증서 키 알고리즘·길이를 추출하고, Roetteler 2017의 자원 추정
          공식을 적용해 필요 logical qubit 수와 Toffoli gate 수를 계산합니다. 이후
          Willsch 2023의 실증 시뮬레이션 결과를 시나리오로 결합하여 점수화합니다.
        </p>
        <FormulaCallout
          lines={[
            ko.methodology.roettelerFormulaRsa,
            ko.methodology.roettelerFormulaEcc,
          ]}
        />
        <CitationInline ids={['Roetteler-2017']} />
      </Section>

      <Section title={`3. ${ko.methodology.sectionScenarios}`}>
        <ScenarioTable />
        <CitationInline ids={['Roetteler-2017', 'Willsch-2023']} />
      </Section>

      <Section title={`4. ${ko.methodology.sectionScoring}`}>
        <FormulaCallout lines={[ko.methodology.scoringFormula]} />
        <p className="text-sm text-[hsl(var(--muted-foreground))]">
          {ko.methodology.scoringNote}
        </p>
        <ul className="list-disc space-y-1 pl-6 text-sm">
          <li>{ko.methodology.pqcNote}</li>
          <li>{ko.methodology.hybridNote}</li>
        </ul>
      </Section>

      <Section title={`5. ${ko.methodology.sectionLimits}`}>
        <p>{ko.methodology.limitsBody}</p>
      </Section>

      <ReferenceList ids={['Kim-Ahn-2025', 'Roetteler-2017', 'Willsch-2023']} />
    </article>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      <div className="space-y-3 text-sm sm:text-[0.95rem]">{children}</div>
    </section>
  );
}

function FormulaCallout({ lines }: { lines: string[] }): React.JSX.Element {
  return (
    <div className="rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--muted))]/40 p-4 font-mono text-xs sm:text-sm">
      {lines.map((line) => (
        <p key={line} className="whitespace-pre-wrap">
          {line}
        </p>
      ))}
    </div>
  );
}

function AxisTable(): React.JSX.Element {
  const rows: Array<{ axis: string; source: string; method: string }> = [
    {
      axis: ko.axisLabel.tls,
      source: ko.sourceLabel.automated,
      method: 'sslyze 기반 TLS 위생 측정 (TLS 버전, cipher suite, HSTS, OCSP)',
    },
    {
      axis: ko.axisLabel.hybridKem,
      source: ko.sourceLabel.automated,
      method: 'ClientHello 협상 그룹에서 ML-KEM 등 PQC KEM 신호 감지',
    },
    {
      axis: ko.axisLabel.certOps,
      source: ko.sourceLabel.automated,
      method: '인증서 갱신 자동화·체인·OCSP Stapling 점검',
    },
    {
      axis: ko.axisLabel.quantumThreat,
      source: ko.sourceLabel.automated,
      method: 'Roetteler 2017 공식 → 보수·실증 두 시나리오 점수',
    },
  ];
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-[hsl(var(--border))] text-left">
            <th className="py-2 pr-4 font-medium">축</th>
            <th className="py-2 pr-4 font-medium">출처</th>
            <th className="py-2 font-medium">측정 방식</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.axis} className="border-b border-[hsl(var(--border))]/60">
              <td className="py-2 pr-4 font-medium">{r.axis}</td>
              <td className="py-2 pr-4 text-[hsl(var(--muted-foreground))]">{r.source}</td>
              <td className="py-2">{r.method}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ScenarioTable(): React.JSX.Element {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <ScenarioCard
        title={ko.scenario.conservative}
        basis={ko.scenario.conservativeBasis}
        meaning={ko.scenario.conservativeMeaning}
        accent="sky"
      />
      <ScenarioCard
        title={ko.scenario.empirical}
        basis={ko.scenario.empiricalBasis}
        meaning={ko.scenario.empiricalMeaning}
        accent="violet"
      />
    </div>
  );
}

function ScenarioCard({
  title,
  basis,
  meaning,
  accent,
}: {
  title: string;
  basis: string;
  meaning: string;
  accent: 'sky' | 'violet';
}): React.JSX.Element {
  const border = accent === 'sky' ? 'border-sky-500/40' : 'border-violet-500/40';
  const bg = accent === 'sky' ? 'bg-sky-500/5' : 'bg-violet-500/5';
  return (
    <div className={`rounded-md border ${border} ${bg} p-4`}>
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="mt-2 text-xs text-[hsl(var(--muted-foreground))]">{basis}</p>
      <p className="mt-3 text-sm">{meaning}</p>
    </div>
  );
}

function CitationInline({ ids }: { ids: CitationId[] }): React.JSX.Element {
  return (
    <p className="text-xs text-[hsl(var(--muted-foreground))]">
      {ko.citations.label}:{' '}
      {ids
        .map((id) => {
          const c = REFERENCES[id];
          const firstAuthor = c.authors.split(',')[0]?.trim() ?? c.authors;
          return `${firstAuthor} ${c.year}`;
        })
        .join(' · ')}
    </p>
  );
}

function ReferenceList({ ids }: { ids: CitationId[] }): React.JSX.Element {
  return (
    <section className="space-y-3 border-t border-[hsl(var(--border))] pt-6">
      <h2 className="text-xl font-semibold tracking-tight">참고 문헌</h2>
      <ol className="list-decimal space-y-3 pl-6 text-sm">
        {ids.map((id) => {
          const c = REFERENCES[id];
          return (
            <li key={id} className="space-y-1">
              <div>
                <span className="font-medium">{c.authors}</span> ({c.year}).{' '}
                <span className="italic">{c.title}</span>.{' '}
                {c.identifier ? (
                  <span>
                    {c.venue} (
                    {c.url ? (
                      <a
                        href={c.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline decoration-dotted underline-offset-2"
                      >
                        {c.identifier}
                      </a>
                    ) : (
                      c.identifier
                    )}
                    ).
                  </span>
                ) : (
                  <span>{c.venue}.</span>
                )}
              </div>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">{c.role}</p>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
