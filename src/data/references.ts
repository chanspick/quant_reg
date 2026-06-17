/**
 * SPEC-PQC-001 §3.14 (양자 위협 정량화) / About · Methodology 페이지.
 * 인용 자료 단일 출처. UI 곳곳에서 `formatCitation(id)` 또는 `REFERENCES[id]` 로 참조한다.
 */

export type CitationId =
  | 'Kim-Ahn-2025'
  | 'Roetteler-2017'
  | 'Willsch-2023'
  | 'Beauregard-2003'
  | 'Gidney-Ekera-2019'
  | 'Gidney-2025';

export interface Citation {
  id: CitationId;
  authors: string;
  year: number;
  title: string;
  venue: string;
  identifier?: string;
  url?: string;
  role: string;
  highlights?: string[];
}

export const REFERENCES: Record<CitationId, Citation> = {
  'Kim-Ahn-2025': {
    id: 'Kim-Ahn-2025',
    authors: '김의결, 안혁',
    year: 2025,
    title: 'Shor 알고리즘의 기존 암호체계에 미치는 영향과 양자내성암호의 대응 전략',
    venue: '한국정보통신학회 2025년 춘계 종합학술대회',
    role: '이론 프레임 — RSA/ECC 구조적 취약점, Shor 알고리즘 원리, PQC 4종(ML-KEM/ML-DSA/SLH-DSA/FALCON) 소개, NIST IR 8547 한국 적용 필요성.',
  },
  'Roetteler-2017': {
    id: 'Roetteler-2017',
    authors: 'Roetteler, M., Naehrig, M., Svore, K. M., Lauter, K.',
    year: 2017,
    title: 'Quantum resource estimates for computing elliptic curve discrete logarithms',
    venue: 'arXiv preprint',
    identifier: 'arXiv:1706.06752',
    url: 'https://arxiv.org/abs/1706.06752',
    role: 'ECC(타원곡선 이산로그) 정량 자원 추정 공식 — 9n + 2⌈log₂(n)⌉ + 10 logical qubit, 약 25·n³ Toffoli. (RSA 아님)',
    highlights: [
      'ECC-n discrete log 필요 logical qubit ~ 9n + 2⌈log₂(n)⌉ + 10',
      'ECC P-256 → 2,330 logical qubit (Table 1)',
      'Toffoli ~ 25·n³ (order-of-magnitude fit)',
    ],
  },
  'Beauregard-2003': {
    id: 'Beauregard-2003',
    authors: 'Beauregard, S.',
    year: 2003,
    title: "Circuit for Shor's algorithm using 2n+3 qubits",
    venue: 'Quantum Information and Computation 3(2)',
    identifier: 'arXiv:quant-ph/0205095',
    url: 'https://arxiv.org/abs/quant-ph/0205095',
    role: 'RSA-n 인수분해 양자회로 — 2n+3 logical qubit 구성(공간효율 Shor 회로). 본 도구 RSA logical-qubit 수치(2n+3)의 출처.',
  },
  'Gidney-Ekera-2019': {
    id: 'Gidney-Ekera-2019',
    authors: 'Gidney, C., Ekerå, M.',
    year: 2019,
    title: 'How to factor 2048 bit RSA integers in 8 hours using 20 million noisy qubits',
    venue: 'Quantum 5, 433 (2021)',
    identifier: 'arXiv:1905.09749',
    url: 'https://arxiv.org/abs/1905.09749',
    role: 'RSA-2048 자원 추정(canonical) — 2천만 noisy 물리큐비트·8시간.',
  },
  'Gidney-2025': {
    id: 'Gidney-2025',
    authors: 'Gidney, C.',
    year: 2025,
    title: 'How to factor 2048 bit RSA integers with less than a million noisy qubits',
    venue: 'arXiv preprint',
    identifier: 'arXiv:2505.15917',
    url: 'https://arxiv.org/abs/2505.15917',
    role: 'RSA-2048 자원 추정 갱신 — 100만 미만 noisy 물리큐비트·1주 미만(2019 대비 약 20배 감소).',
  },
  'Willsch-2023': {
    id: 'Willsch-2023',
    authors: 'Willsch, D., Willsch, M., Jin, F., De Raedt, H., Michielsen, K.',
    year: 2023,
    title: "Large-Scale Simulation of Shor's Quantum Factoring Algorithm",
    venue: 'Mathematics 11(19), 4222 (MDPI)',
    identifier: 'doi:10.3390/math11194222',
    url: 'https://www.mdpi.com/2227-7390/11/19/4222',
    role: '실증 데이터 — GPU 2,048개로 Shor 알고리즘 60,000회 시뮬레이션, 평균 성공률·Lucky 케이스·노이즈 robust·실제 인수분해 한계 측정.',
    highlights: [
      '이론적 성공률 3-4%로 추정되었으나 실제 평균 50% 이상',
      '"Lucky 케이스" 다수 — 조건 미달성에도 인수분해됨',
      'Ekerå post-processing 적용 시 1회 실행으로 ~100% 근접',
      '양자 노이즈에도 일정 수준 robust',
      '실제 인수분해 최대값: 549,755,813,701 (40비트). RSA-2048 까지는 아직 거리 있음.',
    ],
  },
};

export function formatCitation(id: CitationId): string {
  const c = REFERENCES[id];
  const venue = c.identifier ? `${c.venue} (${c.identifier})` : c.venue;
  return `${c.authors} (${c.year}). "${c.title}." ${venue}.`;
}
