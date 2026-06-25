import { useMemo, useState } from 'react';
import { AlertTriangle, BookOpen, ChevronDown, ChevronUp, Clock, ExternalLink, Radio, Shield, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Domain } from '@/data/schema';

interface DashboardHeroProps {
  domains: readonly Domain[];
}

interface LiveStats {
  total: number;
  kemAdopted: number;        // KEM score >= 50
  tlsPerfect: number;        // TLS score === 100
  avgKem: number;
  avgTls: number;
  avgQt: number;
  kemAdoptedPct: number;
}

function computeStats(domains: readonly Domain[]): LiveStats {
  if (!domains.length) return { total: 0, kemAdopted: 0, tlsPerfect: 0, avgKem: 0, avgTls: 0, avgQt: 0, kemAdoptedPct: 0 };
  const total = domains.length;
  const kemAdopted = domains.filter(d => d.scores.hybridKem.value >= 50).length;
  const tlsPerfect = domains.filter(d => d.scores.tls.value === 100).length;
  const avg = (k: 'tls' | 'hybridKem' | 'certOps' | 'quantumThreat') =>
    Math.round(domains.reduce((a, d) => a + d.scores[k].value, 0) / total);
  return {
    total,
    kemAdopted,
    tlsPerfect,
    avgKem: avg('hybridKem'),
    avgTls: avg('tls'),
    avgQt: avg('quantumThreat'),
    kemAdoptedPct: Math.round((kemAdopted / total) * 100),
  };
}

const GLOSSARY: { term: string; en: string; def: string; cite?: string }[] = [
  {
    term: 'HNDL',
    en: 'Harvest Now, Decrypt Later',
    def: '국가 행위자들이 현재 암호화된 트래픽을 저장해두고, 양자컴퓨터가 충분히 강력해지는 Q-Day에 일괄 해독하는 장기 공격 전략. 지금 수집한 데이터가 10년 후에 해독됩니다.',
  },
  {
    term: 'Q-Day',
    en: 'Quantum Day',
    def: 'RSA·ECC 같은 현재 공개키 암호를 실시간 파괴할 수 있는 CRQC(암호 관련 양자컴퓨터)가 등장하는 날. RAND 2023·ODNI 추정: 2028~2033년.',
    cite: 'RAND 2023; ODNI 2023',
  },
  {
    term: 'CRQC',
    en: 'Cryptographically Relevant Quantum Computer',
    def: 'RSA-2048 인수분해에 필요한 수백만 물리 큐비트 규모의 내결함성 양자컴퓨터. 현재 최고 수준(Google Willow, 105 큐비트)은 아직 CRQC가 아닙니다.',
  },
  {
    term: "Shor's Algorithm",
    en: 'Shor 알고리즘',
    def: '1994년 Peter Shor가 고안. RSA·ECC 기반 공개키 암호를 다항시간(O(n³))에 해독. RSA-2048 파괴에 필요한 논리 큐비트: ~4,099개 (Gidney-Ekerå 2019).',
    cite: 'Beauregard 2003; Gidney-Ekerå 2019',
  },
  {
    term: "Grover's Algorithm",
    en: 'Grover 알고리즘',
    def: '대칭키 암호(AES)에 제곱근 속도 향상(√N). AES-128을 사실상 AES-64 수준으로 약화. AES-256은 여전히 안전.',
  },
  {
    term: 'ML-KEM',
    en: 'Module-Lattice Key Encapsulation',
    def: 'NIST FIPS 203 (2024) 표준화. 격자 기반 수학으로 Shor 공격 면역. 기존 X25519와 결합한 X25519MLKEM768이 현재 Chrome·Cloudflare 기본값.',
    cite: 'NIST FIPS 203, 2024',
  },
  {
    term: "Mosca's Inequality",
    en: '모스카 부등식',
    def: 'X(데이터 보호 기간) + Y(마이그레이션 소요 시간) > Z(Q-Day까지 남은 시간)이면 지금 당장 행동해야 함. X=7년, Y=12년, Z=10년이면 위험.',
  },
  {
    term: '논리 큐비트',
    en: 'Logical Qubit',
    def: '오류 정정 코드로 보호된 안정적 큐비트. 물리 큐비트 수천~수만 개로 논리 큐비트 1개를 구성. RSA-2048 파괴에 ~4,099 논리 큐비트 필요.',
  },
];

const CONCEPTS = [
  {
    icon: Radio,
    accent: 'border-[hsl(var(--destructive))] bg-[hsl(var(--destructive))]/5',
    iconColor: 'text-[hsl(var(--destructive))]',
    pulse: true,
    title: 'HNDL 공격 — 지금 진행 중',
    body: '국가 행위자들은 현재의 암호화 트래픽을 대규모 수집 중입니다. 오늘 암호화된 당신의 금융 거래, 통신, 국가 기밀은 Q-Day에 일괄 해독될 수 있습니다. "지금 안전하면 된다"는 논리가 통하지 않는 위협입니다.',
    cite: 'NSA·CISA 2022; ODNI 2023',
  },
  {
    icon: Clock,
    accent: 'border-amber-500/60 bg-amber-500/5',
    iconColor: 'text-amber-600 dark:text-amber-400',
    pulse: false,
    title: 'Q-Day — 2028~2033년',
    body: 'RAND 2023는 2033년 이전 CRQC 등장 확률을 50%로 추정. Gidney-Ekerå 2025는 Google Willow 급 확장 시 2030±3년 예측. 마이그레이션엔 최소 수년 필요 — 지금 시작해도 늦을 수 있습니다.',
    cite: 'RAND 2023; Gidney-Ekerå 2025',
  },
  {
    icon: Shield,
    accent: 'border-emerald-500/60 bg-emerald-500/5',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    pulse: false,
    title: 'NIST PQC — 2024년 표준화',
    body: 'ML-KEM (FIPS 203), ML-DSA (FIPS 204), SLH-DSA (FIPS 205). Shor 공격에 면역인 격자/해시 기반 알고리즘. Chrome, Cloudflare는 이미 X25519MLKEM768 기본 배포 중.',
    cite: 'NIST FIPS 203/204/205, 2024',
  },
] as const;

function ConceptCard({
  icon: Icon,
  accent,
  iconColor,
  pulse,
  title,
  body,
  cite,
}: (typeof CONCEPTS)[number]): React.JSX.Element {
  return (
    <div className={cn('rounded-xl border-l-4 p-4', accent)}>
      <div className="mb-2 flex items-center gap-2">
        <div className="relative">
          <Icon aria-hidden="true" className={cn('size-4', iconColor)} />
          {pulse && (
            <span className="absolute -right-0.5 -top-0.5 flex size-2">
              <span className={cn('absolute inline-flex h-full w-full animate-ping rounded-full opacity-75', iconColor.replace('text-', 'bg-'))} />
              <span className={cn('relative inline-flex size-2 rounded-full', iconColor.replace('text-', 'bg-'))} />
            </span>
          )}
        </div>
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      <p className="text-sm leading-relaxed text-[hsl(var(--muted-foreground))]">{body}</p>
      {cite && (
        <p className="mt-2 font-mono text-[10px] text-[hsl(var(--muted-foreground))]/60">
          출처: {cite}
        </p>
      )}
    </div>
  );
}

function QdayTimeline(): React.JSX.Element {
  const currentYear = 2026;
  const minQ = 2028;
  const maxQ = 2033;
  const rangeStart = 2024;
  const rangeEnd = 2035;
  const toPercent = (y: number) => ((y - rangeStart) / (rangeEnd - rangeStart)) * 100;

  return (
    <div
      aria-label="Q-Day 예측 타임라인 (2024~2035)"
      className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4"
    >
      <div className="mb-3 flex items-center gap-2">
        <Zap aria-hidden="true" className="size-4 text-amber-500" />
        <h3 className="text-sm font-semibold">Q-Day 예측 타임라인</h3>
        <span className="ml-auto font-mono text-[10px] text-[hsl(var(--muted-foreground))]">
          RAND 2023 · Gidney-Ekerå 2025
        </span>
      </div>
      <div className="relative h-8">
        {/* 배경 트랙 */}
        <div className="absolute left-0 right-0 top-3.5 h-1.5 rounded-full bg-[hsl(var(--muted))]" />
        {/* Q-Day 위험 구간 */}
        <div
          className="absolute top-3.5 h-1.5 rounded-full bg-amber-400/60"
          style={{ left: `${toPercent(minQ)}%`, width: `${toPercent(maxQ) - toPercent(minQ)}%` }}
        />
        {/* 현재 */}
        <div
          className="absolute -top-0 flex flex-col items-center"
          style={{ left: `${toPercent(currentYear)}%`, transform: 'translateX(-50%)' }}
        >
          <span className="mb-0.5 font-mono text-[10px] font-semibold text-[hsl(var(--foreground))]">지금</span>
          <div className="h-8 w-0.5 bg-[hsl(var(--foreground))]" />
        </div>
        {/* Q-Day 최소 */}
        <div
          className="absolute -top-0 flex flex-col items-center"
          style={{ left: `${toPercent(minQ)}%`, transform: 'translateX(-50%)' }}
        >
          <span className="mb-0.5 font-mono text-[10px] text-amber-600 dark:text-amber-400">{minQ}</span>
          <div className="h-8 w-0.5 bg-amber-400" />
        </div>
        {/* Q-Day 최대 */}
        <div
          className="absolute -top-0 flex flex-col items-center"
          style={{ left: `${toPercent(maxQ)}%`, transform: 'translateX(-50%)' }}
        >
          <span className="mb-0.5 font-mono text-[10px] text-amber-600 dark:text-amber-400">{maxQ}</span>
          <div className="h-8 w-0.5 bg-amber-400" />
        </div>
      </div>
      <div className="mt-5 flex justify-between font-mono text-[10px] text-[hsl(var(--muted-foreground))]">
        <span>{rangeStart}</span>
        <span className="text-amber-600 dark:text-amber-400">Q-Day 위험 구간</span>
        <span>{rangeEnd}</span>
      </div>
    </div>
  );
}

function LiveMetrics({ stats }: { stats: LiveStats }): React.JSX.Element {
  if (!stats.total) return <></>;

  const items = [
    {
      label: '하이브리드 KEM 도입',
      value: `${stats.kemAdopted} / ${stats.total}`,
      sub: `${stats.kemAdoptedPct}% — 나머지 ${stats.total - stats.kemAdopted}개 도메인 미전환`,
      color: stats.kemAdoptedPct < 30 ? 'text-[hsl(var(--destructive))]' : stats.kemAdoptedPct < 60 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600',
    },
    {
      label: 'TLS 위생 만점',
      value: `${stats.tlsPerfect} / ${stats.total}`,
      sub: `${stats.total - stats.tlsPerfect}개 도메인에 취약 TLS 설정 잔존`,
      color: 'text-[hsl(var(--muted-foreground))]',
    },
    {
      label: '평균 양자 위협 점수',
      value: `${stats.avgQt} / 100`,
      sub: 'Mosca 부등식 기준 대부분 위험 노출 상태',
      color: stats.avgQt < 30 ? 'text-[hsl(var(--destructive))]' : 'text-[hsl(var(--muted-foreground))]',
    },
    {
      label: '평균 인증서 운영 점수',
      value: `${stats.avgTls} / 100`,
      sub: 'TLS 위생 · 프로토콜 · 암호 스위트 종합',
      color: 'text-[hsl(var(--muted-foreground))]',
    },
  ];

  return (
    <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4">
      <div className="mb-3 flex items-center gap-2">
        <AlertTriangle aria-hidden="true" className="size-4 text-[hsl(var(--destructive))]" />
        <h3 className="text-sm font-semibold">한국 주요 {stats.total}개 도메인 — 실측 현황</h3>
        <span className="ml-auto font-mono text-[10px] text-[hsl(var(--muted-foreground))]">
          자동 측정 · sslyze + TLS probe
        </span>
      </div>
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {items.map((item) => (
          <li key={item.label} className="flex flex-col gap-0.5 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2">
            <span className="text-xs text-[hsl(var(--muted-foreground))]">{item.label}</span>
            <span className={cn('font-serif text-xl font-bold tabular-nums', item.color)}>{item.value}</span>
            <span className="text-[10px] text-[hsl(var(--muted-foreground))]">{item.sub}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function GlossaryAccordion(): React.JSX.Element {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2 text-sm font-semibold">
          <BookOpen aria-hidden="true" className="size-4 text-[hsl(var(--muted-foreground))]" />
          핵심 용어 사전 — 처음 접하시는 분을 위한 안내
        </span>
        {open ? <ChevronUp aria-hidden="true" className="size-4 shrink-0 text-[hsl(var(--muted-foreground))]" /> : <ChevronDown aria-hidden="true" className="size-4 shrink-0 text-[hsl(var(--muted-foreground))]" />}
      </button>
      {open && (
        <ul className="divide-y divide-[hsl(var(--border))] border-t border-[hsl(var(--border))] px-4">
          {GLOSSARY.map((g) => (
            <li key={g.term} className="py-3">
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="font-mono text-sm font-semibold">{g.term}</span>
                <span className="text-xs text-[hsl(var(--muted-foreground))]">{g.en}</span>
              </div>
              <p className="mt-1 text-sm leading-relaxed text-[hsl(var(--muted-foreground))]">{g.def}</p>
              {g.cite && (
                <p className="mt-0.5 font-mono text-[10px] text-[hsl(var(--muted-foreground))]/60">출처: {g.cite}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function CreatorNote(): React.JSX.Element {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left"
        aria-expanded={open}
      >
        <span className="text-sm font-semibold">이 프로젝트를 만든 이유</span>
        {open ? <ChevronUp aria-hidden="true" className="size-4 shrink-0 text-[hsl(var(--muted-foreground))]" /> : <ChevronDown aria-hidden="true" className="size-4 shrink-0 text-[hsl(var(--muted-foreground))]" />}
      </button>
      {open && (
        <div className="space-y-4 border-t border-[hsl(var(--border))] px-4 pb-4 pt-3 text-sm leading-relaxed text-[hsl(var(--muted-foreground))]">
          <p>
            양자컴퓨팅 강의에서 Shor 알고리즘(L4)·Grover 알고리즘(L3·L5)·NISQ 한계(Workshop)·PQC 표준화(Workshop)를 배우며
            하나의 질문이 생겼습니다: <strong className="text-[hsl(var(--foreground))]">"그렇다면 지금 한국의 실제 인터넷 인프라는 얼마나 준비됐는가?"</strong>
          </p>
          <p>
            교수님 논문(김의결·안혁 2025)이 양자 위협의 이론을 다뤘다면, 본 프로젝트는
            자원 추정 공식(RSA: Beauregard 2003·Gidney-Ekerå 2019/2025, ECC: Roetteler 2017)과
            Willsch 2023의 실증 시뮬레이션(성공률 50%+)을 한국 47개 실제 인프라에 적용해
            도메인별 <em>양자 깨짐 비용</em>을 보수·실증 두 시나리오로 정량화합니다.
          </p>
          <div className="rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--background))] p-3">
            <p className="mb-2 text-xs font-semibold text-[hsl(var(--foreground))]">강의 개념 → 측정 축 매핑</p>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[hsl(var(--border))]">
                  <th className="py-1 text-left font-medium">강의 내용</th>
                  <th className="py-1 text-left font-medium">대시보드 측정 축</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[hsl(var(--border))]">
                {[
                  ['L3 · L5 — Grover 알고리즘', 'TLS 위생 (AES-256 vs 128 구분)'],
                  ['L4 — Shor · QFT', '양자 위협 정량화 (논리 큐비트 계산)'],
                  ['Workshop — NISQ 한계', '하이브리드 KEM (과도기 전략)'],
                  ['Workshop — NIST PQC', '하이브리드 KEM · 인증서 운영'],
                ].map(([l, r]) => (
                  <tr key={l}>
                    <td className="py-1 pr-3">{l}</td>
                    <td className="py-1">{r}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs">
            <strong className="text-[hsl(var(--foreground))]">정직성 고지:</strong>{' '}
            모든 데이터는 출처(자동 측정 / 수동 리서치 / LLM + 검증 / 미검증)를 명시합니다.
            점수 정규화 상수(22, 0.7)는 출처 없는 calibration scalar — ordering(순서) 비교에만 유효하며 절대값은 시간·자원·확률에 직접 매핑되지 않습니다.
          </p>
          <div className="flex flex-wrap gap-3 pt-1">
            {[
              { label: 'NIST FIPS 203', href: 'https://doi.org/10.6028/NIST.FIPS.203' },
              { label: 'Gidney-Ekerå 2019', href: 'https://arxiv.org/abs/1905.09749' },
              { label: 'Roetteler 2017', href: 'https://arxiv.org/abs/1706.06752' },
            ].map(({ label, href }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-mono text-[10px] underline decoration-dotted underline-offset-2 hover:text-[hsl(var(--foreground))]"
              >
                {label}
                <ExternalLink aria-hidden="true" className="size-2.5" />
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function DashboardHero({ domains }: DashboardHeroProps): React.JSX.Element | null {
  const stats = useMemo(() => computeStats(domains), [domains]);

  if (!stats.total) return null;

  return (
    <section aria-labelledby="hero-headline" className="flex flex-col gap-4">
      {/* 1. 드라마틱 헤드라인 */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 rounded-full border border-[hsl(var(--destructive))]/40 bg-[hsl(var(--destructive))]/5 px-2.5 py-0.5 font-mono text-[10px] font-semibold text-[hsl(var(--destructive))]">
            <span className="relative flex size-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[hsl(var(--destructive))] opacity-60" />
              <span className="relative inline-flex size-1.5 rounded-full bg-[hsl(var(--destructive))]" />
            </span>
            HNDL ACTIVE
          </span>
          <span className="font-mono text-[10px] text-[hsl(var(--muted-foreground))]">
            자동 측정 2026-06-25 기준
          </span>
        </div>
        <h2 id="hero-headline" className="text-xl font-bold leading-snug tracking-tight sm:text-2xl">
          양자컴퓨터는 지금 이 순간에도<br />
          <span className="text-[hsl(var(--destructive))]">당신의 암호화 데이터를 겨냥하고 있습니다.</span>
        </h2>
        <p className="max-w-2xl text-sm leading-relaxed text-[hsl(var(--muted-foreground))]">
          국가 행위자들은 현재 암호화된 트래픽을 대규모 수집 중입니다 — Q-Day(2028~2033년 예측)에 일괄 해독하기 위해.
          한국 주요 {stats.total}개 도메인이 얼마나 준비됐는지 지금 바로 확인하세요.
        </p>
      </div>

      {/* 2. Q-Day 타임라인 */}
      <QdayTimeline />

      {/* 3. 3대 위협 개념 카드 */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {CONCEPTS.map((c) => (
          <ConceptCard key={c.title} {...c} />
        ))}
      </div>

      {/* 4. 실측 수치 — 살아있는 데이터 */}
      <LiveMetrics stats={stats} />

      {/* 5. 제작자 의도 + 용어 사전 */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <CreatorNote />
        <GlossaryAccordion />
      </div>
    </section>
  );
}
