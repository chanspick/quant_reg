import { Download } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useInstallPrompt } from '@/lib/pwa';
import { ko } from '@/i18n/ko';
import { REFERENCES, type CitationId } from '@/data/references';
import { cn } from '@/lib/utils';

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

      <DeploymentsSection />

      <ProblemSection />

      {/* 주요 발견 — stat boxes */}
      <KeyDiscoveries />

      <FindingsSection />

      <Section title="강의 컨텍스트">
        <p>{ko.about.context}</p>
        <LectureMappingTable />
        <CrossLink to="/methodology" label="측정 원리 탭에서 강의 개념별 인터랙티브 계산기 →" />
      </Section>

      <ChallengesSection />

      <RetrospectSection />

      <Section title="정직성 고지">
        <p>{ko.about.honesty}</p>
        <HonestyDetails />
      </Section>

      <Section title="논문 인용 체인">
        <p className="text-[hsl(var(--muted-foreground))]">
          강의에서 다룬 Shor·Grover 알고리즘의 자원 추정 공식을 코드로 직접 구현했습니다.
          아래는 본 프로젝트가 인용한 논문들의 지적 계보입니다.
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

      <Section title="개발 마일스톤">
        <p className="text-[hsl(var(--muted-foreground))]">
          이 프로젝트가 실제로 어떤 과정을 거쳐 만들어졌는지 — git 커밋 기록 기반.
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

// ─── 크로스링크 ──────────────────────────────────────────────────────────────

function CrossLink({ to, label }: { to: string; label: string }): React.JSX.Element {
  return (
    <Link
      to={to}
      className="inline-block text-xs text-[hsl(var(--muted-foreground))] underline decoration-dotted underline-offset-2 hover:text-[hsl(var(--foreground))]"
    >
      {label}
    </Link>
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
        — 본 프로젝트의 핵심 주장. 강의 개념(Shor·Grover) → 자원 추정 공식 직접 구현 → 한국 인프라 실측.
      </p>
    </div>
  );
}

// ─── 결과물 ────────────────────────────────────────────────────────────────

function DeploymentsSection(): React.JSX.Element {
  return (
    <Section title="결과물">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-[hsl(var(--muted-foreground))]">
              정적 대시보드
            </span>
            <span className="rounded bg-blue-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-blue-600 dark:text-blue-400">
              PWA
            </span>
          </div>
          <p className="font-mono text-xs text-[hsl(var(--muted-foreground))]">
            quant-reg.vercel.app
          </p>
          <ul className="space-y-1 text-xs text-[hsl(var(--foreground))]/80">
            <li>React 19 + Vite + Tailwind v4, 13개 섹터 47개 도메인</li>
            <li>4축 준비도 시각화, 섹터별 요약</li>
            <li>검색·필터·정렬, 데이터 출처 라벨 전수 표기</li>
            <li>PWA 설치 가능, 모바일 최적화</li>
          </ul>
          <CrossLink to="/dashboard" label="대시보드에서 직접 탐색 →" />
        </div>

        <div className="space-y-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-[hsl(var(--muted-foreground))]">
              동적 스캐너
            </span>
            <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
              Railway
            </span>
          </div>
          <p className="font-mono text-xs text-[hsl(var(--muted-foreground))]">
            quantreg-production.up.railway.app
          </p>
          <ul className="space-y-1 text-xs text-[hsl(var(--foreground))]/80">
            <li>FastAPI 백엔드, Docker single image</li>
            <li>임의 도메인 입력 → sslyze + raw TLS probe</li>
            <li>Claude Sonnet 4.6 narrative (최대 60초)</li>
            <li>정직성 메타데이터 + 진단 금지 경고 명시</li>
          </ul>
          <CrossLink to="/scan" label="스캐너 사용해보기 →" />
        </div>
      </div>

      <div className="rounded-md border border-[hsl(var(--border))]/60 bg-[hsl(var(--muted))]/30 p-3 font-mono text-xs">
        <span className="text-[hsl(var(--muted-foreground))]">실측 예시 (www.google.com, 2026-06-15): </span>
        <span className="font-semibold">TLS 15 / KEM 30 / CertOps 85 / Quantum 20</span>
        <span className="text-[hsl(var(--muted-foreground))]">
          {' '}— google.com조차 TLS 위생 15점. PQC 협상과 클래식 TLS 위생은 별개로 관리됨.
        </span>
      </div>
    </Section>
  );
}

// ─── 문제 설정 ────────────────────────────────────────────────────────────

function ProblemSection(): React.JSX.Element {
  return (
    <Section title="문제 설정">
      <p className="leading-relaxed">
        수업에서 다룬 Shor 알고리즘과 Grover 알고리즘은 현재 인터넷 보안의 근간인 공개키 암호(RSA,
        ECC)와 대칭키 암호의 안전성을 정량적으로 위협한다. 양자컴퓨터의 발전이 충분히 진행되면
        현재 신뢰하는 TLS 통신은 사실상 무력화되며, 특히{' '}
        <strong>HNDL(Harvest Now, Decrypt Later)</strong> — 지금 암호화된 통신을 저장해두었다가
        미래에 복호화하는 공격 — 은 이미 진행 중일 가능성이 있다.
      </p>
      <p className="leading-relaxed">
        이에 대응하여 NIST는 2024년 ML-KEM·ML-DSA·SLH-DSA를 PQC 표준으로 확정하였고, 글로벌
        빅테크는 X25519MLKEM768 같은 하이브리드 KEM으로 전환을 시작하였다. 그러나{' '}
        <strong>한국 웹이 지금 어디까지 와 있는지 측정한 자료는 없었다.</strong>
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 space-y-1.5">
          <span className="font-mono text-[10px] font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wide">
            연구 질문 Q1
          </span>
          <p className="text-sm leading-relaxed">
            한국 주요 도메인의 PQC 전환 준비도를 4개 축으로 측정하고, 실제 신호와 표준 측정
            도구의 사각지대를 동시에 드러낼 수 있는가?
          </p>
        </div>
        <div className="rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 space-y-1.5">
          <span className="font-mono text-[10px] font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wide">
            연구 질문 Q2
          </span>
          <p className="text-sm leading-relaxed">
            양자 위협을 정성적 경고가 아니라 Shor 알고리즘의 리소스 추정(필요 logical qubits)으로
            정량화할 수 있는가?
          </p>
        </div>
      </div>
    </Section>
  );
}

// ─── 주요 발견 stat boxes ──────────────────────────────────────────────────

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

// ─── 핵심 발견 서술 ────────────────────────────────────────────────────────

function FindingsSection(): React.JSX.Element {
  return (
    <Section title="핵심 발견">
      <FindingCard
        label="발견 A"
        title='"0%가 아니라 24%" — 측정 방법이 결과를 바꾼다'
        accent="emerald"
      >
        <p className="leading-relaxed">
          sslyze 표준 측정으로는 PQC 응답이 <strong>0건</strong>이었지만, raw TLS 1.3
          ClientHello로 X25519MLKEM768을 직접 제안하자 51개 중 12개(24%)가 응답하였다. 네이버는
          ClientHello에서 우선 협상하지는 않지만 HelloRetryRequest로 받아주는 상태였다.
          &ldquo;한국 웹은 PQC를 안 쓴다&rdquo;는 통념을 직접 반증하는 결과로,{' '}
          <strong>측정 방법론 자체가 결과를 좌우함</strong>을 보여준다.
        </p>
        <div className="rounded-md border border-[hsl(var(--border))]/60 bg-[hsl(var(--muted))]/30 p-3 text-xs">
          <span className="font-medium">활성화 12개 도메인: </span>
          <span className="text-[hsl(var(--muted-foreground))]">
            LG화학, LG U+, LG이노텍, 현대자동차, 미래에셋, 크래프톤, 한국전력공사, 두산,
            삼성SDI, 삼성바이오로직스, 네이버, 기아
          </span>
        </div>
        <CrossLink to="/methodology" label="측정 원리 탭에서 Phase 2 발견 과정 →" />
      </FindingCard>

      <FindingCard
        label="발견 B"
        title="CDN/edge 레이어가 PQC 채택을 주도한다"
        accent="amber"
      >
        <p className="leading-relaxed">
          동일 그룹·섹터 내에서도 격차가 컸다. 삼성전자(미지원) ↔ 삼성SDI·삼성바이오로직스(활성화),
          SK텔레콤·KT(미지원) ↔ LG U+(활성화). 서비스 본체가 아니라{' '}
          <strong>CDN/edge 레이어가 PQC 채택의 실질적 게이트키퍼</strong>임을 시사한다. 또한 PQC
          협상과 TLS 위생은 별개였다 — 네이버는 KEM 100점이지만 TLS 위생 10점(TLS 1.0/1.1·CBC
          잔존).
        </p>
      </FindingCard>

      <FindingCard
        label="발견 C"
        title="섹터별 준비도 격차"
        accent="red"
      >
        <p className="leading-relaxed">
          통신 TLS 평균 <strong>87점(최고)</strong> vs 도메인 최다(9개)인 공공/정부 TLS 평균{' '}
          <strong>16점(최저)</strong>. 자동차는 KEM 평균 100으로 채택 선두. 전체 47개 중 TLS
          위생 0점이 <strong>17개</strong> — 양자 위협 이전에 클래식 TLS 위생부터 시급하다.
        </p>
      </FindingCard>

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-[hsl(var(--muted-foreground))]">
          데모 큐레이션 — 3개 대표 도메인
        </p>
        <DemoCurationTable />
        <CrossLink to="/dashboard" label="대시보드에서 47개 전체 도메인 탐색 →" />
      </div>
    </Section>
  );
}

function FindingCard({
  label,
  title,
  accent,
  children,
}: {
  label: string;
  title: string;
  accent: 'emerald' | 'amber' | 'red';
  children: React.ReactNode;
}): React.JSX.Element {
  const accentMap = {
    emerald: {
      badge: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
      border: 'border-emerald-500/30',
      bg: 'bg-emerald-500/5',
    },
    amber: {
      badge: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
      border: 'border-amber-500/30',
      bg: 'bg-amber-500/5',
    },
    red: {
      badge: 'bg-red-500/15 text-red-600 dark:text-red-400',
      border: 'border-red-500/30',
      bg: 'bg-red-500/5',
    },
  }[accent];

  return (
    <div className={cn('rounded-lg border p-4 space-y-3', accentMap.border, accentMap.bg)}>
      <div className="space-y-1">
        <span className={cn('rounded px-1.5 py-0.5 text-[10px] font-semibold', accentMap.badge)}>
          {label}
        </span>
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      <div className="space-y-2 text-sm">{children}</div>
    </div>
  );
}

type DemoRow = {
  domain: string;
  tls: number;
  kem: number;
  certOps: number;
  quantum: number;
  message: string;
};

const DEMO_ROWS: DemoRow[] = [
  { domain: 'LG화학', tls: 92, kem: 100, certOps: 100, quantum: 23, message: '모범 사례 — 4축 중 3축 90+' },
  { domain: '네이버', tls: 10, kem: 100, certOps: 85, quantum: 20, message: '엇갈림 — PQC는 켰지만 TLS 위생 미흡' },
  { domain: '카카오', tls: 0, kem: 15, certOps: 65, quantum: 23, message: '전 영역 미흡 — 같은 섹터 1위 포털과 대조' },
];

function DemoCurationTable(): React.JSX.Element {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr className="border-b border-[hsl(var(--border))] text-left">
            <th className="py-2 pr-3 font-semibold">도메인</th>
            <th className="py-2 pr-3 font-semibold text-right">TLS</th>
            <th className="py-2 pr-3 font-semibold text-right">KEM</th>
            <th className="py-2 pr-3 font-semibold text-right">CertOps</th>
            <th className="py-2 pr-3 font-semibold text-right">Quantum</th>
            <th className="py-2 font-semibold">메시지</th>
          </tr>
        </thead>
        <tbody>
          {DEMO_ROWS.map((r) => (
            <tr key={r.domain} className="border-b border-[hsl(var(--border))]/60">
              <td className="py-2 pr-3 font-semibold">{r.domain}</td>
              <td className={cn('py-2 pr-3 text-right font-mono tabular-nums', r.tls >= 80 ? 'text-emerald-600 dark:text-emerald-400' : r.tls >= 40 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400')}>
                {r.tls}
              </td>
              <td className={cn('py-2 pr-3 text-right font-mono tabular-nums', r.kem >= 80 ? 'text-emerald-600 dark:text-emerald-400' : r.kem >= 40 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400')}>
                {r.kem}
              </td>
              <td className={cn('py-2 pr-3 text-right font-mono tabular-nums', r.certOps >= 80 ? 'text-emerald-600 dark:text-emerald-400' : r.certOps >= 40 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400')}>
                {r.certOps}
              </td>
              <td className="py-2 pr-3 text-right font-mono tabular-nums text-[hsl(var(--muted-foreground))]">
                {r.quantum}
              </td>
              <td className="py-2 text-[hsl(var(--muted-foreground))] leading-relaxed">
                {r.message}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
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

// ─── 개발 중 어려움 ────────────────────────────────────────────────────────

type Challenge = {
  num: string;
  title: string;
  detail: string;
};

const CHALLENGES: Challenge[] = [
  {
    num: '1',
    title: 'Calibration scalar의 정직성',
    detail:
      '양자 위협 점수 정규화에 score = log₁₀(필요/가용) × 22 × (1 − 성공률 × 0.7)를 사용했는데, 22와 0.7은 정당화 논문이 없는 self-calibration scalar다. 이를 숨기는 대신 README·슬라이드·CHANGELOG·스캐너 disclosure에 동일하게 명시하고, 정성적 결론에는 ordering-preserving 해석만 사용하도록 제한하였다.',
  },
  {
    num: '2',
    title: '데이터 출처 정직성 게이트',
    detail:
      '모든 데이터에 source 필드를 부여하고 enum 4값(automated/manual/llm+verified/llm-only)으로 검증. TypeScript zod 검증 스크립트(pnpm validate-data)로 빌드 시 자동 검증하여 출처 불명 데이터가 production에 올라가지 못하도록 차단하였다.',
  },
  {
    num: '3',
    title: 'Windows asyncio + uvicorn 호환성',
    detail:
      'asyncio.create_subprocess_exec가 NotImplementedError로 죽는 문제. uvicorn --reload + watchfiles가 SelectorEventLoop로 떨어뜨려 subprocess가 동작하지 않았다. asyncio.to_thread(subprocess.run, ...) 패턴으로 event loop 타입과 무관하게 동작하도록 전환하였다.',
  },
  {
    num: '4',
    title: 'Railway 배포 6차 시도',
    detail:
      '.env.production gitignore 누락, 빈 public/ git 미추적, pnpm 11 supply-chain policy, @types/node 누락, PORT 8080 vs 8000 미스매치를 하나씩 해결하며, 로컬과 production이 얼마나 다른지 체험하였다.',
  },
];

function ChallengesSection(): React.JSX.Element {
  return (
    <Section title="개발 중 어려움과 해결">
      <div className="space-y-3">
        {CHALLENGES.map((c) => (
          <div
            key={c.num}
            className="flex gap-3 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4"
          >
            <span className="shrink-0 font-mono text-sm font-bold text-[hsl(var(--muted-foreground))]">
              {c.num}.
            </span>
            <div className="space-y-1">
              <p className="text-sm font-semibold">{c.title}</p>
              <p className="text-xs leading-relaxed text-[hsl(var(--muted-foreground))]">
                {c.detail}
              </p>
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}

// ─── 회고 및 향후 ─────────────────────────────────────────────────────────

const FUTURE_ITEMS = [
  'Calibration scalar v2: self-calibration(22/0.7) → discrete grade(A/B/C/D) 또는 분위수 정규화(표본 1,000개+ 확장과 병행)',
  'HNDL 시간축 모델링: 데이터 수명 × Q-day 추정 결합, NISQ→FTQC 로드맵 반영',
  'LLM narrative 검증 게이트: 자동 생성 + 사람 검증 → source: llm+verified 격상',
  '공급망 측정 자동화: 인증서 chain·CA 신뢰도·third-party 의존성 자동 측정',
  '다축 분석 인터페이스: 데이터 소스별 신뢰도 가중치 차등 부여',
];

function RetrospectSection(): React.JSX.Element {
  return (
    <Section title="회고 및 향후 발전 방향">
      <p className="leading-relaxed">
        수업에서 배운 양자컴퓨팅 개념(Shor, Grover, 진폭 증폭, 하이브리드 KEM)을 이론이 아니라
        작동 중인 인터넷 인프라에 대한 측정 도구로 변환할 수 있었다. 동시에 정성적 경고를
        ordering-preserving 점수로 정량화하는 과정에서, 측정과 해석의 한계를 정직하게 공개하는
        일이 결과 자체만큼 중요함을 배웠다.
      </p>
      <p className="leading-relaxed">
        AI 도구(Claude Code)를 측정 엔진·정직성 게이트·스캐너 백엔드·배포 디버깅 전 단계에서
        활용했지만, AI 코드를 그대로 쓰는 것만으로는 완성할 수 없었다. sslyze가 PQC를 0건으로
        측정한다는 사실을 확인하고 raw probe를 구현하기로 한 결정, calibration scalar 문제를
        발견하고 v2 계획을 문서화한 것, narrative를 LLM 자동 생성으로 채우지 않고 사람 검증
        게이트를 두기로 한 것 — 모두 측정 데이터를 어떻게 다룰지에 대한 판단이 필요했다.
      </p>
      <div className="space-y-1.5">
        <p className="text-xs font-semibold uppercase tracking-wide text-[hsl(var(--muted-foreground))]">
          향후 발전 방향
        </p>
        <ul className="space-y-1.5 pl-4">
          {FUTURE_ITEMS.map((item) => (
            <li key={item} className="flex gap-2 text-sm">
              <span className="mt-1 shrink-0 text-[hsl(var(--muted-foreground))]">·</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </Section>
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

      <ChainNode
        label="실증 시뮬레이션"
        title="Willsch et al. (2023)"
        subtitle="Mathematics 11(19), 4222 · doi:10.3390/math11194222"
        desc="GPU 2,048개로 Shor 60,000회 시뮬레이션 · 평균 성공률 50%+ (이론 3~4% 예측 대비) · Ekerå post-processing 시 ~100%"
        color="neutral"
      />
      <ChainArrow label="한국 인프라 적용" />

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

// ─── 개발 마일스톤 (실제 git 커밋 기반) ──────────────────────────────────

type Milestone = {
  date: string;
  sha: string;
  phase: string;
  title: string;
  detail: string;
  type: 'normal' | 'discovery' | 'correction';
};

const MILESTONES: Milestone[] = [
  {
    date: '2026-05-24',
    sha: 'f2d1e82',
    phase: '초기 커밋',
    title: 'Phase 1 + Phase 2 완료 → 대시보드 탄생',
    detail:
      'sslyze 47개 도메인 측정 (Phase 1) + raw TLS 1.3 ClientHello 프로브로 X25519MLKEM768 24% 발견 (Phase 2). "ML-KEM 0건"을 뒤집은 결론이 이 커밋 하나에 담겼다.',
    type: 'discovery',
  },
  {
    date: '2026-06-14',
    sha: 'db1896b',
    phase: '발표 준비',
    title: '발표 메이킹 트랙 — 15슬라이드 구성',
    detail: '측정 결과를 발표 구조로 변환. Phase 3·4 계획 명시 (동적 스캐너 + 살아있는 보고서).',
    type: 'normal',
  },
  {
    date: '2026-06-15',
    sha: '5ba940a',
    phase: '동적 스캐너',
    title: 'scanner-api Phase A 완성 — Railway 배포 성공',
    detail:
      'FastAPI + sslyze + raw TLS probe + Claude Sonnet 4.6 narrative 통합. Railway Docker 빌드 6차 시도 끝에 성공. Windows asyncio 버그, pnpm supply-chain 정책, PORT 미스매치 순차 해결.',
    type: 'discovery',
  },
  {
    date: '2026-06-17',
    sha: '585e67e',
    phase: '인용 교정',
    title: 'RSA 인용 귀속 교정 — Beauregard 2003·Gidney-Ekerå',
    detail:
      'Roetteler 2017이 ECC 논문임을 뒤늦게 확인. RSA 2n+3의 실제 출처는 Beauregard 2003. 숫자·공식 불변, 귀속만 교정.',
    type: 'correction',
  },
  {
    date: '2026-06-25',
    sha: 'fca8a4f',
    phase: '통합',
    title: 'Vercel 대시보드 → Railway 단일 사이트 통합',
    detail:
      '/scan 라우트 추가. pnpm@10.33.0 고정 (corepack 11.9.0 fatal 에러 방지). Dockerfile Stage 1을 루트 프로젝트로 전환.',
    type: 'normal',
  },
  {
    date: '2026-06-25',
    sha: '(현재)',
    phase: '지금',
    title: '살아있는 보고서 완성 + 에세이 전체 임베드',
    detail:
      'DashboardHero (HNDL·Q-Day 타임라인·라이브 메트릭) + /methodology 인터랙티브 qubit 계산기 + /about 에세이 전체 임베드 + 탭 간 유기적 크로스링크.',
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
                <span className="font-mono text-[10px] text-[hsl(var(--muted-foreground))]/60">
                  {m.sha}
                </span>
                <span
                  className={cn(
                    'rounded px-1.5 py-0.5 text-[10px] font-semibold',
                    m.type === 'discovery' || m.phase === '지금'
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
