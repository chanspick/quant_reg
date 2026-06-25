import { useState } from 'react';
import { ChevronDown, ChevronRight, Calculator } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ko } from '@/i18n/ko';
import { REFERENCES, type CitationId } from '@/data/references';
import { cn } from '@/lib/utils';

/**
 * SPEC-PQC-001 §3.6 (Methodology Page).
 * 4축 측정 모델 + 강의 개념 연결 + 인터랙티브 qubit 계산기 + 시나리오 + 캘리브레이션 고지.
 * RSA=Beauregard 2003·Gidney-Ekerå, ECC=Roetteler 2017, 실증=Willsch 2023, 이론=김의결·안혁 2025.
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

      {/* 0. 강의 기반 개념 연결 — 이 프로젝트가 강의 어느 부분과 연결되는지 */}
      <Section title="강의 → 측정 매핑">
        <p className="text-sm text-[hsl(var(--muted-foreground))]">
          본 프로젝트의 4축 측정이 강의의 어느 개념과 연결되는지를 아래에 정리했습니다.
          각 카드를 펼치면 수식·정량·논문 인용을 확인할 수 있습니다.
        </p>
        <LectureConceptCards />
      </Section>

      <Section title={`1. ${ko.methodology.sectionAxes}`}>
        <AxisTable />
      </Section>

      <Phase2Discovery />

      <Section title={`2. ${ko.methodology.sectionQuantum}`}>
        <p>
          각 도메인의 인증서 키 알고리즘·길이를 추출하고, 키 종류별 자원 추정
          공식(RSA는 Beauregard 2003 회로 + Gidney-Ekerå 자원 추정, ECC는 Roetteler
          2017)을 적용해 필요 logical qubit 수와 Toffoli gate 수를 계산합니다. 이후
          Willsch 2023의 실증 시뮬레이션 결과를 시나리오로 결합하여 점수화합니다.
        </p>
        <FormulaCallout
          lines={[
            ko.methodology.roettelerFormulaRsa,
            ko.methodology.roettelerFormulaEcc,
          ]}
        />
        <CitationInline
          ids={['Beauregard-2003', 'Gidney-Ekera-2019', 'Gidney-2025', 'Roetteler-2017']}
        />
        {/* 인터랙티브 계산기 */}
        <QuantumCalculator />
        <Link
          to="/"
          className="inline-block text-xs text-[hsl(var(--muted-foreground))] underline decoration-dotted underline-offset-2 hover:text-[hsl(var(--foreground))]"
        >
          대시보드에서 실제 도메인 점수 확인 →
        </Link>
      </Section>

      <Section title={`3. ${ko.methodology.sectionScenarios}`}>
        <ScenarioTable />
        <CitationInline
          ids={['Beauregard-2003', 'Gidney-Ekera-2019', 'Roetteler-2017', 'Willsch-2023']}
        />
      </Section>

      <Section title={`4. ${ko.methodology.sectionScoring}`}>
        <FormulaCallout lines={[ko.methodology.scoringFormula]} />
        <p className="text-sm text-[hsl(var(--muted-foreground))]">
          {ko.methodology.scoringNote}
        </p>
        <CalibrationCaveat
          title={ko.methodology.scoringCaveatTitle}
          body={ko.methodology.scoringCaveat}
        />
        <ul className="list-disc space-y-1 pl-6 text-sm">
          <li>{ko.methodology.pqcNote}</li>
          <li>{ko.methodology.hybridNote}</li>
        </ul>
      </Section>

      <Section title={`5. ${ko.methodology.sectionLimits}`}>
        <p>{ko.methodology.limitsBody}</p>
      </Section>

      <ReferenceList
        ids={[
          'Kim-Ahn-2025',
          'Beauregard-2003',
          'Gidney-Ekera-2019',
          'Gidney-2025',
          'Roetteler-2017',
          'Willsch-2023',
        ]}
      />
    </article>
  );
}

// ─── Phase 2 발견 스토리 ─────────────────────────────────────────────────────

function Phase2Discovery(): React.JSX.Element {
  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold tracking-tight">표준 도구의 사각지대 — Phase 2 발견</h2>
      <div className="space-y-3 text-sm sm:text-[0.95rem]">
        <aside className="rounded-md border-l-4 border-blue-500/60 bg-blue-500/5 p-4 space-y-3">
          <p className="font-semibold text-blue-700 dark:text-blue-400">
            측정 방법이 결과를 결정한다
          </p>
          <div className="space-y-2 text-sm">
            <p>
              처음에는 sslyze로 모든 측정을 끝낼 수 있을 것이라 예상했으나, sslyze가 협상한 cipher
              suite에서 X25519MLKEM768이 나온 도메인은 <strong>0건</strong>이었다.
            </p>
            <p>
              원인 확인 결과, sslyze의 ClientHello supported_groups에 PQC 그룹이 포함되어 있지
              않았다 — 서버가 PQC를 지원해도 클라이언트가 제안하지 않으면 협상되지 않는 구조였다.
            </p>
            <p>
              이에 Python의 <code className="rounded bg-[hsl(var(--muted))]/60 px-1 font-mono text-xs">socket</code>·
              <code className="rounded bg-[hsl(var(--muted))]/60 px-1 font-mono text-xs">struct</code>로
              TLS 1.3 ClientHello를 직접 조립하고 X25519MLKEM768(0x11ec)을 명시적으로 제안하는
              raw probe를 별도 구현하였다 (외부 PQC 라이브러리 의존성 0).
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-md border border-[hsl(var(--border))]/60 bg-[hsl(var(--background))]/60 p-3 space-y-1">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[hsl(var(--muted-foreground))]">
                Phase 1 (sslyze)
              </p>
              <p className="font-mono text-lg font-bold text-red-600 dark:text-red-400">0건</p>
              <p className="text-[10px] text-[hsl(var(--muted-foreground))]">
                X25519MLKEM768 협상 없음
              </p>
            </div>
            <div className="flex items-center justify-center text-[hsl(var(--muted-foreground))]">
              <span className="text-lg">→</span>
            </div>
            <div className="rounded-md border border-emerald-500/40 bg-emerald-500/5 p-3 space-y-1">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
                Phase 2 (raw probe)
              </p>
              <p className="font-mono text-lg font-bold text-emerald-600 dark:text-emerald-400">
                12 / 51
              </p>
              <p className="text-[10px] text-[hsl(var(--muted-foreground))]">24% 응답</p>
            </div>
          </div>

          <p className="text-xs text-[hsl(var(--muted-foreground))]">
            네이버 특이 케이스: ClientHello 우선 협상 아님 → HelloRetryRequest로 수용. 지원하지만
            우선순위가 낮음.
          </p>
        </aside>

        <Link
          to="/about"
          className="inline-block text-xs text-[hsl(var(--muted-foreground))] underline decoration-dotted underline-offset-2 hover:text-[hsl(var(--foreground))]"
        >
          어바웃 탭에서 데모 큐레이션 및 핵심 발견 전체 →
        </Link>
      </div>
    </section>
  );
}

// ─── 강의 개념 카드 ──────────────────────────────────────────────────────────

type ConceptInfo = {
  id: string;
  badge: string;
  lecture: string;
  title: string;
  trigger: string;
  summary: string;
  bullets: string[];
  borderColor: string;
  bgColor: string;
  badgeColor: string;
};

const LECTURE_CONCEPTS: ConceptInfo[] = [
  {
    id: 'shor',
    badge: 'L4 · L3',
    lecture: 'Lecture 4 QFT·위상추정·주기찾기 (메인), L3 Simon 영감',
    title: 'Shor 알고리즘 — RSA/ECC 다항시간 분해',
    trigger: 'RSA/ECC 인증서 도메인 (본 데이터셋의 90%+)',
    summary:
      'modular exponentiation f(x) = aˣ mod N의 주기 r을 QFT 기반 위상 추정으로 찾아 RSA/ECC를 다항시간에 분해합니다. gcd(a^(r/2) ± 1, N)으로 약수 복원 (확장 유클리드). Simon 알고리즘(L3)이 숨은 주기 찾기의 영감.',
    bullets: [
      'RSA-2048: 2n+3 = 4,099 logical qubits (Beauregard 2003)',
      'ECC P-256: 9n+2⌈log₂n⌉+10 = 2,330 logical qubits (Roetteler 2017)',
      'RSA-2048 분해: Gidney 2025 기준 100만 미만 noisy 물리큐비트 · 1주 미만',
      '고전 지수시간 → 양자 다항시간 (지수 가속)',
    ],
    borderColor: 'border-red-500/40',
    bgColor: 'bg-red-500/5',
    badgeColor: 'bg-red-500/15 text-red-600 dark:text-red-400',
  },
  {
    id: 'grover',
    badge: 'L3 · L5',
    lecture: 'Lecture 3 진폭 증폭·평균 반전, Lecture 5 KLM 일반화',
    title: 'Grover 진폭 증폭 — 대칭키 √N 가속',
    trigger: 'TLS AES cipher (TLS 표준 → 사실상 전 도메인)',
    summary:
      '오라클로 정답에 위상 부여 → 평균에 대한 반전(inversion about the mean) 반복 → O(√N)번 만에 탐색 완료. Shor가 주기 구조를 활용한다면, Grover는 일반 탐색을 제곱근으로 단축합니다 (Bennett 1997 lower bound).',
    bullets: [
      'AES-128: 고전 2¹²⁸ → 양자 2⁶⁴ (실효 64-bit 보안 수준)',
      'AES-256: 2¹²⁸ 잔여 (현재 안전)',
      '대응책: 키 길이 두 배 (AES-128 → AES-256 마이그레이션)',
      '비대칭: Shor는 즉각 위험, Grover는 키 길이로 충분히 대응 가능',
    ],
    borderColor: 'border-amber-500/40',
    bgColor: 'bg-amber-500/5',
    badgeColor: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
  },
  {
    id: 'hndl',
    badge: '워크숍',
    lecture: '워크숍 시간축 · 김의결·안혁 2025 한국 PQC 동기',
    title: 'HNDL — Harvest Now, Decrypt Later',
    trigger: 'TLS 1.0/1.1 활성 · non-PFS cipher 검출 도메인',
    summary:
      '양자 시대 이전에 암호문을 수집해 두고 양자 컴퓨터 등장 후 해독하는 위협 모델. 데이터의 수명(X)이 Q-Day까지 남은 시간(Z)보다 길면 즉시 위험 (Mosca 부등식: X+Y>Z → 지금 행동).',
    bullets: [
      'PFS 미적용 = 단일 장기 키 노출 = 과거·미래 트래픽 모두 위험',
      '의료·금융·외교 장수명 데이터가 우선 표적',
      'TLS 위생 축 감점 원인: TLS 1.0(−30점), TLS 1.1(−20점), non-ECDHE(−3점/개)',
      'Q-Day 추정: 2028–2033 (RAND 2023) — NIST FIPS 203 확정(2024-08) 이후 지금이 전환 시작점',
    ],
    borderColor: 'border-red-500/40',
    bgColor: 'bg-red-500/5',
    badgeColor: 'bg-red-500/15 text-red-600 dark:text-red-400',
  },
  {
    id: 'hybrid-kem',
    badge: '워크숍',
    lecture: '워크숍 PQC 표준화 · NIST FIPS 203',
    title: 'Hybrid KEM — X25519 × ML-KEM-768',
    trigger: 'Phase 2 X25519MLKEM768 협상 응답 도메인 (12/51, 24%)',
    summary:
      'ECDHE(고전 안전성) × ML-KEM-768(격자 Module-LWE)를 HKDF로 결합합니다. 한쪽이 깨져도 나머지가 보호(defense in depth). ML-KEM은 Shor/Grover 모두 다항 가속이 발견되지 않아 양자 안전.',
    bullets: [
      '0x11EC = IANA TLS Named Groups (X25519MLKEM768)',
      '한국 인프라 24% 협상 응답 — Phase 1(sslyze) "0건" 결론을 raw 프로브로 뒤집음',
      '글로벌 기준: 2026-02 상위 100만 도메인 41% 지원 (한국 인프라 격차 확인)',
      'Chrome 124(2024-04) · Firefox 132(2024-10) 기본 활성화',
    ],
    borderColor: 'border-emerald-500/40',
    bgColor: 'bg-emerald-500/5',
    badgeColor: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
  },
];

function LectureConceptCards(): React.JSX.Element {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div className="space-y-2">
      {LECTURE_CONCEPTS.map((c) => {
        const isOpen = openId === c.id;
        return (
          <div
            key={c.id}
            className={cn('rounded-md border transition-colors', c.borderColor, c.bgColor)}
          >
            <button
              type="button"
              onClick={() => setOpenId(isOpen ? null : c.id)}
              aria-expanded={isOpen}
              className="flex w-full items-start gap-3 p-4 text-left"
            >
              <span
                className={cn(
                  'mt-0.5 shrink-0 rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold',
                  c.badgeColor,
                )}
              >
                {c.badge}
              </span>
              <span className="flex-1 text-sm font-semibold">{c.title}</span>
              {isOpen ? (
                <ChevronDown aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-[hsl(var(--muted-foreground))]" />
              ) : (
                <ChevronRight aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-[hsl(var(--muted-foreground))]" />
              )}
            </button>

            {isOpen && (
              <div className="border-t border-[hsl(var(--border))]/40 space-y-3 px-4 pb-4 pt-3 text-sm">
                <div className="grid gap-1 sm:grid-cols-2">
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">
                    <span className="font-medium text-[hsl(var(--foreground))]">강의 출처:</span>{' '}
                    {c.lecture}
                  </p>
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">
                    <span className="font-medium text-[hsl(var(--foreground))]">측정 트리거:</span>{' '}
                    {c.trigger}
                  </p>
                </div>
                <p className="leading-relaxed">{c.summary}</p>
                <ul className="list-disc space-y-1 pl-5 text-[hsl(var(--muted-foreground))]">
                  {c.bullets.map((b) => (
                    <li key={b} className="text-xs leading-relaxed">{b}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── 인터랙티브 양자 위협 계산기 ──────────────────────────────────────────

const RSA_BITS = [1024, 2048, 4096, 8192] as const;
const ECC_BITS = [224, 256, 384, 521] as const;

function computeQubits(algo: 'RSA' | 'ECC', bits: number): number {
  if (algo === 'RSA') return 2 * bits + 3;
  return 9 * bits + 2 * Math.ceil(Math.log2(bits)) + 10;
}

function computeToffoli(algo: 'RSA' | 'ECC', bits: number): number {
  const n = BigInt(bits);
  const result = algo === 'RSA' ? 64n * n * n * n : 25n * n * n * n;
  return Number(result);
}

function computeScore(qubits: number, successRate: number): number {
  const raw = Math.log10(qubits / 100) * 22 * (1 - successRate * 0.7);
  return Math.max(0, Math.min(100, raw));
}

function fmtLarge(n: number): string {
  if (n >= 1e15) return `${(n / 1e15).toFixed(1)} P`;
  if (n >= 1e12) return `${(n / 1e12).toFixed(1)} T`;
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)} B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)} M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)} K`;
  return n.toLocaleString();
}

function QuantumCalculator(): React.JSX.Element {
  const [algo, setAlgo] = useState<'RSA' | 'ECC'>('RSA');
  const [bits, setBits] = useState<number>(2048);

  const qubits = computeQubits(algo, bits);
  const toffoli = computeToffoli(algo, bits);
  const conservScore = computeScore(qubits, 0.04);
  const empirScore = computeScore(qubits, 0.5);

  const formulaExpansion =
    algo === 'RSA'
      ? `2n + 3  =  2 × ${bits.toLocaleString()} + 3  =  ${qubits.toLocaleString()}`
      : `9n + 2⌈log₂n⌉ + 10  =  9 × ${bits} + 2 × ${Math.ceil(Math.log2(bits))} + 10  =  ${qubits.toLocaleString()}`;

  const paper =
    algo === 'RSA'
      ? 'Beauregard 2003 (2n+3 회로) · Gidney-Ekerå 2019/2025 (자원 추정)'
      : 'Roetteler 2017, Table 1 (ECC discrete log)';

  return (
    <div
      className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 space-y-5"
      aria-label="인터랙티브 양자 위협 계산기"
    >
      <div className="flex items-center gap-2">
        <Calculator aria-hidden="true" className="size-4 text-[hsl(var(--muted-foreground))]" />
        <h3 className="font-semibold text-sm">인터랙티브 qubit 계산기</h3>
        <span className="ml-auto text-[10px] text-[hsl(var(--muted-foreground))]">
          강의 공식 실시간 적용
        </span>
      </div>

      {/* 알고리즘 선택 */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-[hsl(var(--muted-foreground))] uppercase tracking-wide">
          알고리즘
        </p>
        <div className="flex gap-2">
          {(['RSA', 'ECC'] as const).map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => {
                setAlgo(a);
                setBits(a === 'RSA' ? 2048 : 256);
              }}
              className={cn(
                'rounded border px-4 py-1.5 font-mono text-xs font-semibold transition-colors',
                algo === a
                  ? 'border-[hsl(var(--foreground))] bg-[hsl(var(--foreground))] text-[hsl(var(--background))]'
                  : 'border-[hsl(var(--border))] hover:bg-[hsl(var(--accent))]',
              )}
            >
              {a}
            </button>
          ))}
        </div>
      </div>

      {/* 키 길이 선택 */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-[hsl(var(--muted-foreground))] uppercase tracking-wide">
          키 길이 (bits)
        </p>
        <div className="flex flex-wrap gap-2">
          {(algo === 'RSA' ? RSA_BITS : ECC_BITS).map((b) => (
            <button
              key={b}
              type="button"
              onClick={() => setBits(b)}
              className={cn(
                'rounded border px-3 py-1 font-mono text-xs transition-colors',
                bits === b
                  ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))] font-semibold'
                  : 'border-[hsl(var(--border))] hover:bg-[hsl(var(--accent))]',
              )}
            >
              {b.toLocaleString()}
            </button>
          ))}
        </div>
      </div>

      {/* 공식 전개 */}
      <div className="rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--muted))]/40 p-3 space-y-1">
        <p className="text-[10px] text-[hsl(var(--muted-foreground))] font-medium">
          적용 공식 — {paper}
        </p>
        <p className="font-mono text-sm font-semibold">{formulaExpansion}</p>
      </div>

      {/* 계산 결과 */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <CalcBox
          label="Logical Qubits"
          value={qubits.toLocaleString()}
          sub={`${algo}-${bits}`}
          highlight
        />
        <CalcBox
          label="Toffoli Gates"
          value={fmtLarge(toffoli)}
          sub={algo === 'RSA' ? '≈ 64·n³' : '≈ 25·n³'}
        />
        <CalcBox
          label="보수 점수"
          value={`${conservScore.toFixed(1)}`}
          sub="성공률 3~4% (Shor 이론)"
        />
        <CalcBox
          label="실증 점수"
          value={`${empirScore.toFixed(1)}`}
          sub="성공률 50%+ (Willsch 2023)"
        />
      </div>

      <p className="text-[10px] text-[hsl(var(--muted-foreground))]">
        * 점수 공식: clip(0, 100, log₁₀(qubits/100) × 22 × (1 − 성공률 × 0.7)) — 계수 22·0.7은
        calibration scalar (§4 참조).
      </p>
    </div>
  );
}

function CalcBox({
  label,
  value,
  sub,
  highlight,
}: {
  label: string;
  value: string;
  sub: string;
  highlight?: boolean;
}): React.JSX.Element {
  return (
    <div className="rounded-md border border-[hsl(var(--border))] p-3 space-y-1">
      <p className="text-[10px] uppercase tracking-wide text-[hsl(var(--muted-foreground))]">
        {label}
      </p>
      <p
        className={cn(
          'font-mono text-lg font-bold tabular-nums',
          highlight ? 'text-[hsl(var(--foreground))]' : 'text-[hsl(var(--foreground))]/80',
        )}
      >
        {value}
      </p>
      <p className="text-[10px] text-[hsl(var(--muted-foreground))]">{sub}</p>
    </div>
  );
}

// ─── 공통 레이아웃 컴포넌트 ─────────────────────────────────────────────────

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

/**
 * SPEC-PQC-001 §8-B 23 (calibration scalars 인정).
 */
function CalibrationCaveat({
  title,
  body,
}: {
  title: string;
  body: string;
}): React.JSX.Element {
  return (
    <aside
      aria-label={title}
      className="rounded-md border-l-4 border-destructive bg-destructive/5 p-4 text-sm"
    >
      <p className="mb-2 font-semibold text-destructive">{title}</p>
      <p className="leading-relaxed text-[hsl(var(--foreground))]/90">{body}</p>
    </aside>
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
      method: 'raw TLS 1.3 ClientHello (supported_groups=0x11EC) → ServerHello 파싱',
    },
    {
      axis: ko.axisLabel.certOps,
      source: ko.sourceLabel.automated,
      method: '인증서 갱신 자동화·체인·OCSP Stapling 점검',
    },
    {
      axis: ko.axisLabel.quantumThreat,
      source: ko.sourceLabel.automated,
      method: '자원 추정 공식(RSA=Beauregard/Gidney-Ekerå, ECC=Roetteler 2017) → 보수·실증 두 시나리오',
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
        example="RSA-2048: 성공률 ~4%, 보수 점수 ≈ 34.5"
        accent="strong"
      />
      <ScenarioCard
        title={ko.scenario.empirical}
        basis={ko.scenario.empiricalBasis}
        meaning={ko.scenario.empiricalMeaning}
        example="RSA-2048: 성공률 50%+, 실증 점수 ≈ 23.1 (헤드라인)"
        accent="subtle"
      />
    </div>
  );
}

function ScenarioCard({
  title,
  basis,
  meaning,
  example,
  accent,
}: {
  title: string;
  basis: string;
  meaning: string;
  example: string;
  accent: 'strong' | 'subtle';
}): React.JSX.Element {
  const border = accent === 'strong' ? 'border-foreground/30' : 'border-border';
  const bg = accent === 'strong' ? 'bg-foreground/[0.04]' : 'bg-muted/40';
  return (
    <div className={`rounded-md border ${border} ${bg} p-4 space-y-2`}>
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="text-xs text-[hsl(var(--muted-foreground))]">{basis}</p>
      <p className="text-sm">{meaning}</p>
      <p className="font-mono text-[11px] text-[hsl(var(--muted-foreground))]">{example}</p>
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
