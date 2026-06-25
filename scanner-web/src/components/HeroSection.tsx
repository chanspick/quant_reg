import { useState } from 'react';
import { cn } from '@/lib/utils';

/**
 * 앱 진입 컨텍스트 — 신규 사용자를 위한 PQC 개념 소개 + 제작자 의도.
 *
 * 역할:
 *  - 왜 이 앱이 존재하는지 (양자 위협 컨텍스트 — HNDL · Q-Day · NIST PQC)
 *  - 무엇을 측정하는지 (4축 스캔 미리보기)
 *  - 어떻게 사용하는지 (예시 도메인 빠른 실행)
 *  - 제작자 의도 (양자컴퓨팅 강의 개념 → 실측 연결)
 *  - 용어집 (신규 사용자를 위한 핵심 용어 정의)
 */

interface HeroSectionProps {
  onQuickScan: (hostname: string) => void;
  disabled: boolean;
}

const QUICK_DOMAINS = [
  'cloudflare.com',
  'google.com',
  'naver.com',
  'kakao.com',
  'kbstar.com',
] as const;

const GLOSSARY_TERMS = [
  {
    term: 'CRQC',
    full: 'Cryptographically Relevant Quantum Computer',
    definition:
      '충분히 큰 양자컴퓨터로 현재 RSA·ECC 암호를 분 단위에 파괴할 수 있는 수준. 전문가들은 2028~2033년 등장을 예측합니다.',
  },
  {
    term: 'HNDL',
    full: 'Harvest Now, Decrypt Later',
    definition:
      '국가급 공격자가 지금 암호화된 트래픽을 수집하고, Q-Day 이후 복호화하는 공격 전략. 10년 이상 기밀이 필요한 데이터는 지금 이미 위험합니다.',
  },
  {
    term: 'Q-Day',
    full: 'Quantum Day',
    definition:
      'CRQC가 실질적으로 등장하는 시점. RAND 2023·Gidney 2025 등 기관 추정 기준 2028~2033년 (ODNI). 단일 날짜가 아닌 범위 추정입니다.',
  },
  {
    term: 'Shor 알고리즘',
    full: "Shor's Algorithm (1994)",
    definition:
      'RSA·ECC의 수학적 근거(소인수분해·이산로그)를 다항 시간에 풀 수 있는 양자 알고리즘. QFT(양자 푸리에 변환)로 주기를 찾아 키를 파괴합니다. RSA-2048 파괴에 logical qubit ≈ 4,099개 필요.',
  },
  {
    term: 'Grover 알고리즘',
    full: "Grover's Algorithm (1996)",
    definition:
      '대칭키(AES) 암호에 √N 속도 개선을 주는 양자 알고리즘. 이론상 AES-128 보안을 64-bit 수준으로 약화시킵니다. 진폭 증폭(amplitude amplification) 기반.',
  },
  {
    term: 'ML-KEM',
    full: 'Module Lattice-based Key Encapsulation Mechanism',
    definition:
      'NIST FIPS 203 (2024) 표준. 격자 문제(LWE)를 기반으로 한 양자내성 키교환 알고리즘. Kyber에서 발전.',
  },
  {
    term: 'X25519MLKEM768',
    full: 'Hybrid KEM (X25519 + ML-KEM-768)',
    definition:
      '고전 X25519와 ML-KEM-768을 결합한 하이브리드 KEM. 브라우저·서버에서 실험적 지원 중이며, 이 스캐너가 감지하는 핵심 PQC 지원 지표입니다.',
  },
  {
    term: 'Mosca 부등식',
    full: "Mosca's Inequality",
    definition:
      'X(데이터 보존 기간) + Y(마이그레이션 소요) > Z(Q-Day 잔여) 이면 즉시 전환 필요. 보안 전환 시급성을 수식화한 모델. 이 앱에서는 X=7년, Y=12년, Z=10년을 사용합니다.',
  },
  {
    term: 'logical qubit',
    full: 'Logical Qubit',
    definition:
      '물리 큐비트 오류를 교정한 이상적 큐비트. RSA-2048 분해에는 약 4,099 logical qubits 필요 (Beauregard 2003; Gidney-Ekerå 2019). 현재 CRQC는 존재하지 않습니다.',
  },
] as const;

export function HeroSection({
  onQuickScan,
  disabled,
}: HeroSectionProps): React.JSX.Element {
  const [glossaryOpen, setGlossaryOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      {/* === 핵심 메시지 블록 === */}
      <section className="rounded-xl border border-edge bg-surface p-6">
        <p className="font-mono text-[10px] uppercase tracking-widest text-faint">
          Post-Quantum Cryptography · 양자컴퓨팅 보안 진단
        </p>
        <h2 className="mt-3 font-serif text-2xl leading-tight text-ink sm:text-3xl">
          양자컴퓨터는
          <br />
          현재의 암호를 해독합니다.
        </h2>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">
          전문가들은 <TermHighlight>CRQC</TermHighlight> (충분히 큰 양자컴퓨터)가
          RSA·ECC 암호를 분 단위에 파괴할 것으로 예측합니다. 문제는 먼 미래가 아닙니다.
          국가급 공격자는 <TermHighlight>HNDL</TermHighlight> 전략으로{' '}
          <span className="font-semibold text-ink">지금 이 순간</span>에도 데이터를
          수집 중입니다.
        </p>

        {/* 3대 개념 카드 */}
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <ConceptCard
            tag="HNDL"
            tagNote="공격 전략"
            title="지금 수집, 나중에 복호화"
            body="암호화 트래픽을 지금 저장하고 Q-Day 이후 해독합니다. 의료·금융·국가기밀 데이터는 보존 기간(7년+) 고려 시 이미 위험 구간입니다."
            urgent
          />
          <ConceptCard
            tag="Q-Day"
            tagNote="2028~2033 예상"
            title="CRQC 등장 예측 시점"
            body="RAND 2023·Gidney 2025·ODNI 기준. 마이그레이션 소요(대기업 12~15년)를 고려하면 지금 전환을 시작해야 합니다."
            urgent
          />
          <ConceptCard
            tag="NIST PQC"
            tagNote="2024년 표준화"
            title="ML-KEM · ML-DSA · SLH-DSA"
            body="FIPS 203·204·205 (2024년 8월). 브라우저의 X25519MLKEM768 하이브리드 KEM 지원이 시작되었습니다."
            urgent={false}
          />
        </div>
      </section>

      {/* === 이 스캐너가 측정하는 것 === */}
      <section className="rounded-xl border border-edge bg-surface p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="font-serif text-sm text-ink">이 스캐너가 측정하는 것</h3>
          <span className="font-mono text-[10px] text-faint">
            sslyze · pqc_probe · Claude Sonnet 4.6
          </span>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {AXIS_META.map((axis) => (
            <AxisCard key={axis.code} {...axis} />
          ))}
        </div>

        <div className="mt-4 flex flex-col gap-1.5 border-t border-edge pt-4">
          <ProcessStep n={1} label="Phase 1 — sslyze" detail="TLS 핸드셰이크 전수 측정 (5-20s)" />
          <ProcessStep n={2} label="Phase 2 — PQC probe" detail="하이브리드 KEM 실제 지원 여부 확인 (2-10s)" />
          <ProcessStep n={3} label="LLM 분석" detail="Claude Sonnet 4.6 narrative + 권고 생성" />
          <ProcessStep n={4} label="등급 산출" detail="4축 균등 평균 → A~F + 우선순위 액션플랜" />
        </div>
      </section>

      {/* === 예시 도메인 + 도구 버튼 === */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-faint">예시 도메인:</span>
          {QUICK_DOMAINS.map((domain) => (
            <button
              key={domain}
              type="button"
              onClick={() => onQuickScan(domain)}
              disabled={disabled}
              className={cn(
                'rounded border border-edge bg-surface-2 px-2.5 py-1',
                'font-mono text-xs text-muted',
                'transition-colors hover:border-muted hover:text-ink',
                'disabled:cursor-not-allowed disabled:opacity-40',
              )}
            >
              {domain}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <ToggleButton
            open={glossaryOpen}
            onToggle={() => setGlossaryOpen((v) => !v)}
            label="용어집"
          />
          <ToggleButton
            open={aboutOpen}
            onToggle={() => setAboutOpen((v) => !v)}
            label="제작 의도"
          />
        </div>
      </div>

      {/* === 용어집 패널 === */}
      {glossaryOpen && (
        <section className="rounded-xl border border-edge bg-surface p-5">
          <h3 className="mb-4 font-serif text-sm text-ink">핵심 용어 정의</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {GLOSSARY_TERMS.map((entry) => (
              <div
                key={entry.term}
                className="rounded-lg border border-edge bg-surface-2 p-3"
              >
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="font-mono text-xs font-semibold text-ink">
                    {entry.term}
                  </span>
                  <span className="text-[10px] text-faint">{entry.full}</span>
                </div>
                <p className="mt-1.5 text-[11px] leading-relaxed text-muted">
                  {entry.definition}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* === 제작 의도 패널 === */}
      {aboutOpen && <AboutPanel />}
    </div>
  );
}

// === Sub-components ===========================================================

function ConceptCard({
  tag,
  tagNote,
  title,
  body,
  urgent,
}: {
  tag: string;
  tagNote: string;
  title: string;
  body: string;
  urgent: boolean;
}): React.JSX.Element {
  return (
    <div
      className={cn(
        'rounded-lg border p-4',
        urgent
          ? 'border-edge bg-surface-2'
          : 'border-edge bg-surface-2',
      )}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <span
          className={cn(
            'rounded border px-1.5 py-0.5 font-mono text-[10px] font-semibold',
            urgent ? 'border-risk text-risk' : 'border-edge text-faint',
          )}
        >
          {tag}
        </span>
        <span className="text-[10px] text-faint">{tagNote}</span>
      </div>
      <p className="mt-2 font-serif text-sm text-ink">{title}</p>
      <p className="mt-1.5 text-[11px] leading-relaxed text-muted">{body}</p>
    </div>
  );
}

const AXIS_META = [
  {
    code: 'TLS',
    label: 'TLS 위생',
    sub: 'TLS 버전·cipher·HSTS·취약점',
  },
  {
    code: 'KEM',
    label: '하이브리드 KEM',
    sub: 'X25519MLKEM768 실제 지원',
  },
  {
    code: 'CERT',
    label: '인증서 운영',
    sub: '갱신·OCSP·체인·만료 임박',
  },
  {
    code: 'QT',
    label: '양자 위협 정량',
    sub: 'Shor logical qubit 수',
  },
] as const;

function AxisCard({
  code,
  label,
  sub,
}: (typeof AXIS_META)[number]): React.JSX.Element {
  return (
    <div className="rounded-lg border border-edge bg-surface-2 p-3">
      <p className="font-mono text-[10px] text-faint">{code}</p>
      <p className="mt-0.5 text-sm font-semibold text-ink">{label}</p>
      <p className="mt-0.5 text-[11px] leading-relaxed text-muted">{sub}</p>
    </div>
  );
}

function ProcessStep({
  n,
  label,
  detail,
}: {
  n: number;
  label: string;
  detail: string;
}): React.JSX.Element {
  return (
    <div className="flex items-start gap-2.5">
      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-surface-2 font-mono text-[10px] text-faint">
        {n}
      </span>
      <div>
        <span className="text-xs font-semibold text-ink">{label}</span>
        <span className="ml-2 text-[11px] text-muted">{detail}</span>
      </div>
    </div>
  );
}

function TermHighlight({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <span className="border-b border-dashed border-muted font-semibold text-ink">
      {children}
    </span>
  );
}

function ToggleButton({
  open,
  onToggle,
  label,
}: {
  open: boolean;
  onToggle: () => void;
  label: string;
}): React.JSX.Element {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="rounded border border-edge bg-surface-2 px-2.5 py-1 text-xs text-muted transition-colors hover:border-muted hover:text-ink"
    >
      {open ? `${label} 닫기` : label}
    </button>
  );
}

function AboutPanel(): React.JSX.Element {
  return (
    <section className="rounded-xl border border-edge bg-surface p-5">
      <h3 className="mb-1 font-serif text-sm text-ink">제작 의도</h3>
      <p className="mb-4 text-[11px] text-faint">양자컴퓨팅 강의 기말 프로젝트</p>

      <div className="flex flex-col gap-4 text-sm leading-relaxed text-muted">
        <div>
          <h4 className="mb-1 font-serif text-xs text-ink">
            왜 이 도구를 만들었나
          </h4>
          <p className="text-[12px] leading-relaxed">
            양자컴퓨팅 강의에서 Shor 알고리즘(L4)·Grover 알고리즘(L3·L5)·
            NISQ→FTQC 로드맵(워크숍)을 배우면서, 이 개념들이 실제 인터넷
            보안에 구체적으로 어떤 영향을 미치는지 직접 확인하고 싶었습니다.
            주요 인터넷 서비스들이 PQC 전환에 얼마나 준비되어 있는지 —
            혹은 준비되지 않았는지 — 를 측정 데이터로 보여주는 것이 목표였습니다.
          </p>
        </div>

        <div>
          <h4 className="mb-2 font-serif text-xs text-ink">강의 개념 → 실측 연결</h4>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[11px]">
              <thead>
                <tr className="border-b border-edge">
                  <th className="py-1.5 pr-4 text-left font-semibold text-ink">
                    강의 개념
                  </th>
                  <th className="py-1.5 pr-4 text-left font-semibold text-ink">
                    측정 연결
                  </th>
                  <th className="py-1.5 text-left font-semibold text-ink">
                    발화 조건
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-edge">
                {CONCEPT_MAP.map((row) => (
                  <tr key={row.concept}>
                    <td className="py-2 pr-4 text-ink">{row.concept}</td>
                    <td className="py-2 pr-4 text-muted">{row.measurement}</td>
                    <td className="py-2 text-faint">{row.trigger}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <h4 className="mb-1 font-serif text-xs text-ink">방법론</h4>
          <p className="text-[12px] leading-relaxed">
            도메인 → sslyze(TLS 전수 측정) + 커스텀 PQC probe(실제 하이브리드 KEM
            핸드셰이크) + Claude Sonnet 4.6(LLM narrative 생성). 4축 점수(0–100)를
            균등 평균해 A~F 등급을 산출하고, 규정·Mosca 부등식 기반 액션플랜을
            자동 생성합니다. 측정 데이터와 LLM 분석은 명확히 구분(SourceChip)하여
            정직성을 유지합니다.
          </p>
        </div>

        <div>
          <h4 className="mb-1 font-serif text-xs text-ink">주요 참고 문헌</h4>
          <ul className="flex flex-col gap-1 text-[11px] text-faint">
            <li>
              Beauregard 2003 — Circuit for Shor using 2n+3 qubits (arXiv:quant-ph/0205095)
            </li>
            <li>
              Gidney &amp; Ekerå 2019 / Gidney 2025 — RSA-2048 자원 추정 (arXiv:1905.09749 / 2505.15917)
            </li>
            <li>
              Roetteler et al. 2017 — ECC 양자 자원 추정 (arXiv:1706.06752)
            </li>
            <li>
              NIST FIPS 203·204·205 (2024) — ML-KEM·ML-DSA·SLH-DSA 표준
            </li>
            <li>
              RAND 2023 / ODNI 2023 — Q-Day 확률 분포 및 정보기관 평가
            </li>
            <li>
              김의결·안혁 (2025) — 한국 PQC 대응 현황 (한국정보통신학회 2025 춘계)
            </li>
          </ul>
        </div>

        <div className="rounded-lg border border-edge bg-surface-2 px-3 py-2.5">
          <p className="text-[11px] leading-relaxed text-faint">
            발표 시연용 데모입니다. 진단·감사·구매 의사결정의 근거로 사용하지 마십시오.
            LLM 분석은 통계적 업계 표준이 아닙니다.
          </p>
        </div>
      </div>
    </section>
  );
}

const CONCEPT_MAP = [
  {
    concept: 'Shor 알고리즘 (L4)',
    measurement: '양자 위협 정량 축 · HNDL 섹션',
    trigger: 'RSA/ECC 인증서 (거의 모든 도메인)',
  },
  {
    concept: 'QFT · 위상 추정 (L4)',
    measurement: 'logical qubit 수 산출 근거',
    trigger: 'RSA-N / ECC-N 키 파싱 성공 시',
  },
  {
    concept: 'Grover 진폭 증폭 (L3·L5)',
    measurement: 'AES cipher 위협 맥락',
    trigger: '모든 도메인 (TLS 표준 cipher)',
  },
  {
    concept: 'NISQ→FTQC 로드맵 (워크숍)',
    measurement: 'Mosca 부등식 시간축 컨텍스트',
    trigger: '전체 컨텍스트 (시간축)',
  },
  {
    concept: 'PQC 표준화 (워크숍)',
    measurement: '하이브리드 KEM 축 · NIST 규제 매핑',
    trigger: 'X25519MLKEM768 지원 여부',
  },
] as const;
