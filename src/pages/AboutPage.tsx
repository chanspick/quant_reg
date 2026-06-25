import { Download } from 'lucide-react';
import { useInstallPrompt } from '@/lib/pwa';
import { ko } from '@/i18n/ko';
import { REFERENCES, type CitationId } from '@/data/references';
import { cn } from '@/lib/utils';

/**
 * SPEC-PQC-001 §3.7 (About Page).
 * 핵심 한 줄 + 주요 발견 + 강의 개념 매핑 + 인용 체인 + 논문 역할 + 개발 마일스톤 + 기술 스택.
 */
export function AboutPage(): React.JSX.Element {
  const { canInstall, promptInstall } = useInstallPrompt();

  return (
    <article
      aria-labelledby="about-title"
      className="container mx-auto max-w-3xl space-y-10 px-4 py-10 leading-relaxed"
    >
      <header className="space-y-3">
        <h1 id="about-title" className="text-3xl font-bold tracking-tight">
          {ko.pages.about.title}
        </h1>
        <p className="text-[hsl(var(--muted-foreground))]">
          {ko.pages.about.subtitle}
        </p>
      </header>

      <Keystone />

      {/* 주요 발견 — 프로젝트의 핵심 측정 결과 */}
      <KeyDiscoveries />

      <Section title="강의 컨텍스트">
        <p>{ko.about.context}</p>
        <LectureMappingTable />
      </Section>

      <Section title="정직성 고지">
        <p>{ko.about.honesty}</p>
        <HonestyDetails />
      </Section>

      <Section title="논문 인용 체인">
        <p className="text-[hsl(var(--muted-foreground))]">
          이 프로젝트는 교수님 논문을 이론 프레임으로 삼고, 그 논문이 인용하는 자원 추정
          논문들을 직접 적용했습니다. 아래 체인이 그 지적 계보입니다.
        </p>
        <CitationChain />
      </Section>

      <Section title={ko.about.rolesHeader}>
        <ol className="list-decimal space-y-4 pl-6 text-sm">
          {(
            [
              'Kim-Ahn-2025',
              'Beauregard-2003',
              'Gidney-Ekera-2019',
              'Gidney-2025',
              'Roetteler-2017',
              'Willsch-2023',
            ] as CitationId[]
          ).map((id) => {
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
                <p className="text-[hsl(var(--muted-foreground))]">{c.role}</p>
                {c.highlights && c.highlights.length > 0 ? (
                  <ul className="list-disc space-y-0.5 pl-5 text-xs text-[hsl(var(--muted-foreground))]">
                    {c.highlights.map((h) => (
                      <li key={h}>{h}</li>
                    ))}
                  </ul>
                ) : null}
              </li>
            );
          })}
        </ol>
      </Section>

      {/* 개발 마일스톤 */}
      <Section title="개발 마일스톤">
        <p className="text-[hsl(var(--muted-foreground))]">
          이 프로젝트가 실제로 어떤 과정을 거쳐 만들어졌는지 — 버그 발견, 결론 뒤집기,
          인용 오류 교정까지 모두 포함합니다.
        </p>
        <MakingMilestones />
      </Section>

      <Section title={ko.about.techHeader}>
        <TechStack />
      </Section>

      {canInstall ? (
        <section className="border-t border-[hsl(var(--border))] pt-6">
          <button
            type="button"
            onClick={() => void promptInstall()}
            className={cn(
              'inline-flex items-center gap-2 rounded-md border border-[hsl(var(--border))] px-3 py-1.5 text-sm font-medium',
              'hover:bg-[hsl(var(--accent))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]',
            )}
          >
            <Download aria-hidden="true" className="h-4 w-4" />
            <span>{ko.pwa.install}</span>
          </button>
        </section>
      ) : null}
    </article>
  );
}

// ─── Keystone ──────────────────────────────────────────────────────────────

function Keystone(): React.JSX.Element {
  return (
    <div className="space-y-2">
      <blockquote
        className="rounded-md border-l-4 border-[hsl(var(--primary))] bg-[hsl(var(--primary))]/5 p-5 text-sm leading-relaxed sm:text-base"
        aria-label="프로젝트 핵심 한 줄"
      >
        <p>{ko.about.keystone}</p>
      </blockquote>
      <p className="px-1 text-xs text-[hsl(var(--muted-foreground))]">
        — 본 프로젝트의 핵심 주장. 이론(교수님 논문) → 공식 직접 적용 → 실측 데이터.
      </p>
    </div>
  );
}

// ─── 주요 발견 ─────────────────────────────────────────────────────────────

type Discovery = {
  number: string;
  unit: string;
  label: string;
  detail: string;
};

const DISCOVERIES: Discovery[] = [
  {
    number: '24%',
    unit: '(12 / 51)',
    label: 'X25519MLKEM768 지원',
    detail: 'Phase 2 raw TLS 1.3 프로브 결과. sslyze "0건" 결론을 뒤집은 핵심 발견.',
  },
  {
    number: '4,099',
    unit: 'logical qubits',
    label: 'RSA-2048 분해 필요',
    detail: 'Beauregard 2003 공식 2n+3. Gidney 2025 기준 100만 noisy 물리큐비트.',
  },
  {
    number: '47',
    unit: '개 도메인',
    label: '4축 자동 측정 완료',
    detail: '4개 도메인 연결 불가 (금융권 WAF/보안 정책). 측정 불가 자체가 정보.',
  },
  {
    number: '2028',
    unit: '– 2033',
    label: 'Q-Day 추정 범위',
    detail: 'RAND 2023. HNDL 위협: 데이터 수명이 Q-Day 넘으면 지금 수집도 위험.',
  },
];

function KeyDiscoveries(): React.JSX.Element {
  return (
    <section aria-label="주요 측정 결과" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {DISCOVERIES.map((d) => (
        <div
          key={d.label}
          className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 space-y-1"
        >
          <div className="flex items-baseline gap-1">
            <span className="font-mono text-2xl font-bold tabular-nums">{d.number}</span>
            <span className="text-[10px] text-[hsl(var(--muted-foreground))]">{d.unit}</span>
          </div>
          <p className="text-xs font-semibold">{d.label}</p>
          <p className="text-[10px] text-[hsl(var(--muted-foreground))] leading-relaxed">
            {d.detail}
          </p>
        </div>
      ))}
    </section>
  );
}

// ─── 강의 개념 매핑 테이블 ──────────────────────────────────────────────────

type LectureRow = {
  lecture: string;
  concept: string;
  measurement: string;
  paper: string;
};

const LECTURE_ROWS: LectureRow[] = [
  {
    lecture: 'L3',
    concept: 'Grover 진폭 증폭, Simon 알고리즘, 평균 반전',
    measurement: 'AES cipher → √N 가속 (Grover)\nShor 영감 (Simon → 주기 찾기)',
    paper: 'Grover 1996',
  },
  {
    lecture: 'L4',
    concept: 'QFT, 위상 추정, Shor 인수분해, 확장 유클리드',
    measurement: 'RSA-N / ECC-N 인증서\n→ Shor 다항시간 분해',
    paper: 'Beauregard 2003\nGidney-Ekerå 2019/2025',
  },
  {
    lecture: 'L5',
    concept: 'Grover 일반화, 양자 카운팅, KLM',
    measurement: 'AES-128/256 키 길이 평가\n(실효 보안 비트 수)',
    paper: '—',
  },
  {
    lecture: 'L6',
    concept: '충실도(Fidelity), 축약 밀도연산자',
    measurement: 'Calibration 한계 비유\n(절대값 ≠ 보안 수준)',
    paper: 'Willsch 2023 (noise model)',
  },
  {
    lecture: '워크숍',
    concept: 'NISQ→FTQC, PQC 표준화, 물리/논리 큐비트',
    measurement: '전체 도메인 시간축 컨텍스트\nX25519MLKEM768 지원 여부',
    paper: 'Roetteler 2017\nWillsch 2023\nNIST FIPS 203',
  },
];

function LectureMappingTable(): React.JSX.Element {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr className="border-b border-[hsl(var(--border))] text-left">
            <th className="py-2 pr-3 font-semibold whitespace-nowrap">강의</th>
            <th className="py-2 pr-3 font-semibold">핵심 개념</th>
            <th className="py-2 pr-3 font-semibold">본 프로젝트 측정 매핑</th>
            <th className="py-2 font-semibold whitespace-nowrap">논문</th>
          </tr>
        </thead>
        <tbody>
          {LECTURE_ROWS.map((r) => (
            <tr key={r.lecture} className="border-b border-[hsl(var(--border))]/60">
              <td className="py-2 pr-3 font-mono font-semibold text-[hsl(var(--muted-foreground))]">
                {r.lecture}
              </td>
              <td className="py-2 pr-3 leading-relaxed">{r.concept}</td>
              <td className="py-2 pr-3 text-[hsl(var(--muted-foreground))] leading-relaxed whitespace-pre-line">
                {r.measurement}
              </td>
              <td className="py-2 text-[hsl(var(--muted-foreground))] whitespace-pre-line">
                {r.paper}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── 정직성 세부 ──────────────────────────────────────────────────────────

function HonestyDetails(): React.JSX.Element {
  const items = [
    {
      label: '자동 측정 (Automated)',
      color: 'bg-blue-500/15 text-blue-700 dark:text-blue-400',
      detail: 'sslyze TLS 스캔 + raw socket Phase 2 프로브. 실측값.',
    },
    {
      label: '수동 리서치 (Manual)',
      color: 'bg-orange-500/15 text-orange-700 dark:text-orange-400',
      detail: '공급망·정책 디스크립터. 연구자 판단 포함.',
    },
    {
      label: 'LLM + 샘플 검증',
      color: 'bg-purple-500/15 text-purple-700 dark:text-purple-400',
      detail: '규제 매핑. LLM 초안 + 수동 교차검증.',
    },
    {
      label: 'LLM (미검증)',
      color: 'bg-slate-500/15 text-slate-700 dark:text-slate-400',
      detail: '일부 분석 텍스트. 사실 주장 아님.',
    },
  ];
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {items.map((item) => (
        <div
          key={item.label}
          className="flex items-start gap-2 rounded-md border border-[hsl(var(--border))] p-3"
        >
          <span
            className={cn(
              'mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold',
              item.color,
            )}
          >
            {item.label}
          </span>
          <p className="text-xs text-[hsl(var(--muted-foreground))]">{item.detail}</p>
        </div>
      ))}
    </div>
  );
}

// ─── 논문 인용 체인 ───────────────────────────────────────────────────────

function CitationChain(): React.JSX.Element {
  return (
    <div className="space-y-0">
      {/* 1단계: 이론 프레임 */}
      <ChainNode
        label="이론 프레임"
        title="김의결·안혁 (2025)"
        subtitle="한국정보통신학회 춘계"
        desc="Shor 알고리즘 원리 · RSA/ECC 구조적 취약점 · PQC 4종 소개 · NIST IR 8547 한국 적용 필요성"
        color="primary"
      />
      <ChainArrow label="인용 · 공식 직접 적용" />

      {/* 2단계: 자원 추정 공식 */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <ChainNode
          label="RSA 자원 추정"
          title="Beauregard (2003) + Gidney-Ekerå (2019/2025)"
          subtitle="arXiv:quant-ph/0205095 · arXiv:1905.09749 · arXiv:2505.15917"
          desc="2n+3 logical qubit 회로 (Beauregard) + 실제 자원 추정 (Gidney-Ekerå: 100만 noisy 물리큐비트)"
          color="neutral"
        />
        <ChainNode
          label="ECC 자원 추정"
          title="Roetteler et al. (2017)"
          subtitle="arXiv:1706.06752"
          desc="9n+2⌈log₂n⌉+10 logical qubit (Table 1) · ECC P-256 → 2,330큐비트"
          color="neutral"
        />
      </div>
      <ChainArrow label="결합 · 실증 보정" />

      {/* 3단계: 실증 시뮬레이션 */}
      <ChainNode
        label="실증 시뮬레이션"
        title="Willsch et al. (2023)"
        subtitle="Mathematics 11(19), 4222 · doi:10.3390/math11194222"
        desc="GPU 2,048개로 Shor 60,000회 시뮬레이션 · 평균 성공률 50%+ (이론 3~4% 예측 대비) · Ekerå post-processing 시 ~100%"
        color="neutral"
      />
      <ChainArrow label="한국 인프라 적용" />

      {/* 4단계: 본 프로젝트 */}
      <ChainNode
        label="본 프로젝트"
        title="한국 47개 도메인 정량 분석"
        subtitle="SPEC-PQC-001 · 2026-06-25"
        desc="4축 자동 측정 + 보수·실증 두 시나리오 점수 + 강의 개념 직접 적용"
        color="accent"
      />
    </div>
  );
}

function ChainNode({
  label,
  title,
  subtitle,
  desc,
  color,
}: {
  label: string;
  title: string;
  subtitle: string;
  desc: string;
  color: 'primary' | 'neutral' | 'accent';
}): React.JSX.Element {
  const borderMap = {
    primary: 'border-[hsl(var(--primary))]/60',
    neutral: 'border-[hsl(var(--border))]',
    accent: 'border-[hsl(var(--primary))]/40',
  };
  const bgMap = {
    primary: 'bg-[hsl(var(--primary))]/5',
    neutral: 'bg-[hsl(var(--muted))]/30',
    accent: 'bg-[hsl(var(--primary))]/8',
  };
  return (
    <div className={cn('rounded-md border p-4 space-y-1.5', borderMap[color], bgMap[color])}>
      <span className="text-[10px] font-semibold uppercase tracking-wide text-[hsl(var(--muted-foreground))]">
        {label}
      </span>
      <p className="text-sm font-semibold">{title}</p>
      <p className="font-mono text-[10px] text-[hsl(var(--muted-foreground))]">{subtitle}</p>
      <p className="text-xs text-[hsl(var(--foreground))]/80 leading-relaxed">{desc}</p>
    </div>
  );
}

function ChainArrow({ label }: { label: string }): React.JSX.Element {
  return (
    <div className="flex flex-col items-center py-1">
      <div className="h-4 w-px bg-[hsl(var(--border))]" />
      <span className="px-2 text-[10px] text-[hsl(var(--muted-foreground))]">↓ {label}</span>
      <div className="h-4 w-px bg-[hsl(var(--border))]" />
    </div>
  );
}

// ─── 개발 마일스톤 ────────────────────────────────────────────────────────

type Milestone = {
  date: string;
  phase: string;
  title: string;
  detail: string;
  type: 'normal' | 'discovery' | 'correction';
};

const MILESTONES: Milestone[] = [
  {
    date: '2026-05-14',
    phase: 'Plan',
    title: 'SPEC-PQC-001 작성 완료',
    detail: '4축 측정 모델 확정 — supplyChain 강등 → quantumThreat 신설. EARS 형식 요구사항.',
    type: 'normal',
  },
  {
    date: '2026-05-17~19',
    phase: 'Phase 1',
    title: 'sslyze 47개 도메인 자동 측정',
    detail:
      '4개 도메인 연결 불가 (금융권 WAF 차단). hybridKem 결과: 거의 전 도메인 30점 (ECDHE only).',
    type: 'normal',
  },
  {
    date: '2026-05-19',
    phase: 'Bug',
    title: 'pqc.keyExchange enum 버그 발견',
    detail:
      '47/47 → 46/47 레코드 zod 검증 거부. 측정 엔진(Python) ↔ 스키마(TS) 간 enum 불일치. → validate-data.ts 자동화 추가.',
    type: 'correction',
  },
  {
    date: '2026-05-19',
    phase: 'Phase 2',
    title: '🔑 raw TLS 1.3 프로브 → 24% X25519MLKEM768 발견',
    detail:
      'ClientHello supported_groups=[0x11EC] 전송 → ServerHello 파싱. Phase 1 "ML-KEM 0건" 결론을 완전히 뒤집음. 12/51 응답, 16개 ERROR_NETWORK (공공·금융권 보안 정책).',
    type: 'discovery',
  },
  {
    date: '2026-06-17',
    phase: 'Fix',
    title: 'RSA 인용 귀속 교정',
    detail:
      'Roetteler 2017은 ECC 논문임 — RSA 2n+3의 실제 출처는 Beauregard 2003. RSA 자원 추정은 Gidney-Ekerå 2019/2025. 숫자·공식 불변, 귀속만 교정.',
    type: 'correction',
  },
  {
    date: '2026-06-25',
    phase: 'Now',
    title: '살아있는 보고서 완성',
    detail:
      'DashboardHero (HNDL 위협·Q-Day 타임라인·라이브 메트릭) + /methodology 인터랙티브 계산기 + /about 인용 체인 시각화.',
    type: 'discovery',
  },
];

function MakingMilestones(): React.JSX.Element {
  return (
    <ol className="relative space-y-0 border-l border-[hsl(var(--border))] pl-5">
      {MILESTONES.map((m, i) => {
        const dotColor =
          m.type === 'discovery'
            ? 'bg-emerald-500'
            : m.type === 'correction'
              ? 'bg-amber-500'
              : 'bg-[hsl(var(--muted-foreground))]';
        return (
          <li key={i} className="pb-6 last:pb-0">
            <div
              className={cn(
                'absolute -left-[5px] mt-1.5 size-2.5 rounded-full border-2 border-[hsl(var(--background))]',
                dotColor,
              )}
            />
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-[10px] text-[hsl(var(--muted-foreground))]">
                  {m.date}
                </span>
                <span
                  className={cn(
                    'rounded px-1.5 py-0.5 text-[10px] font-semibold',
                    m.phase === 'Phase 2' || m.phase === 'Now'
                      ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                      : m.type === 'correction'
                        ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400'
                        : 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]',
                  )}
                >
                  {m.phase}
                </span>
              </div>
              <p className="text-sm font-semibold">{m.title}</p>
              <p className="text-xs text-[hsl(var(--muted-foreground))] leading-relaxed">
                {m.detail}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

// ─── 기술 스택 ────────────────────────────────────────────────────────────

type TechItem = { name: string; role: string };

const TECH_ITEMS: TechItem[] = [
  { name: 'React 19 + Vite 6', role: '프론트엔드 빌드 (CSR + PWA)' },
  { name: 'TypeScript 5.9 (strict)', role: '타입 안전성 + zod 런타임 검증' },
  { name: 'Tailwind CSS v4', role: 'CSS-first 토큰 시스템 (@theme)' },
  { name: 'shadcn/ui + Radix', role: '접근성 UI 컴포넌트' },
  { name: 'Python 3.12 + FastAPI', role: '동적 스캐너 API (Railway)' },
  { name: 'sslyze 6.x', role: 'TLS/인증서 자동 측정 (Phase 1)' },
  { name: 'raw socket + struct', role: 'TLS 1.3 ClientHello 직접 조립 (Phase 2)' },
  { name: 'vite-plugin-pwa', role: 'Service Worker + 오프라인 캐싱' },
];

function TechStack(): React.JSX.Element {
  return (
    <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {TECH_ITEMS.map((t) => (
        <div
          key={t.name}
          className="rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--muted))]/30 px-3 py-2"
        >
          <dt className="font-mono text-xs font-semibold">{t.name}</dt>
          <dd className="text-xs text-[hsl(var(--muted-foreground))]">{t.role}</dd>
        </div>
      ))}
    </dl>
  );
}

// ─── 공통 레이아웃 ────────────────────────────────────────────────────────

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      <div className="space-y-4 text-sm sm:text-[0.95rem]">{children}</div>
    </section>
  );
}

