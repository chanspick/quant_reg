/**
 * SPEC-PQC-001 §3.12 (i18n: 한국어 단일 로케일).
 * 모든 UI 문자열은 본 모듈 단일 출처에서 관리한다 (REQ-I18N-002).
 */
export const ko = {
  brand: {
    short: '준비도 스캐너',
    full: 'PQC 준비도 스캐너',
  },

  nav: {
    dashboard: '대시보드',
    methodology: '측정 방법론',
    about: '프로젝트 소개',
  },

  meta: {
    lastUpdatedPrefix: '최종 갱신',
    course: '양자컴퓨팅 강의 기말 프로젝트 데모',
  },

  banner: {
    body: 'TLS·KEM·인증서: 자동 측정 / 공급망·정책: 수동 리서치 / 규제 매핑: LLM + 샘플 검증. 데이터 소스별 표시 참고.',
    legendSuffix: '데이터 소스별 표시 참고.',
    dismiss: '닫기',
  },

  sourceLabel: {
    automated: '자동 측정',
    manual: '수동 리서치',
    llmVerified: 'LLM + 샘플 검증',
    llmOnly: 'LLM (미검증)',
  },

  axisLabel: {
    tls: 'TLS 위생',
    hybridKem: '하이브리드 KEM',
    certOps: '인증서 운영',
    quantumThreat: '양자 위협 정량',
  },

  axisShort: {
    tls: 'TLS',
    hybridKem: 'KEM',
    certOps: 'CertOps',
    quantumThreat: 'Quantum',
  },

  scenario: {
    conservative: '보수 시나리오',
    empirical: '실증 시나리오',
    conservativeShort: '보수',
    empiricalShort: '실증',
    conservativeBasis: 'Shor 1994 (이론) + 자원 추정(RSA: Beauregard 2003·Gidney-Ekerå, ECC: Roetteler 2017). 성공률 3~4% 가정.',
    empiricalBasis:
      'Willsch 2023 (실증 시뮬레이션, 60,000회) + Ekerå post-processing. 성공률 50%+ 관측, Ekerå 적용 시 ~100% 근접.',
    conservativeMeaning: '깨지는 데 더 오래 걸리는 시나리오. 학계 보수 관점.',
    empiricalMeaning: '실측 기반 더 빠르게 깨질 수 있는 시나리오. 실무 위협 평가에 사용.',
  },

  theme: {
    label: '테마 전환',
    light: '라이트',
    dark: '다크',
    system: '시스템',
  },

  pwa: {
    install: '앱 설치',
    update: '새 버전 적용',
    updateAction: '지금 적용',
    updateDismiss: '나중에',
    offline: '오프라인 모드',
    offlineHint: '캐시된 데이터로 동작 중',
  },

  data: {
    loading: '데이터를 불러오는 중...',
    error: '데이터를 불러오지 못했습니다.',
    retry: '다시 시도',
    empty: '표시할 도메인이 없습니다.',
    invalidWarning: '일부 레코드가 스키마 검증에 실패하여 제외되었습니다.',
  },

  methodology: {
    sectionAxes: '4축 측정 모델',
    sectionTls: 'TLS 위생 (자동 측정)',
    sectionKem: '하이브리드 KEM 채택 (자동 측정)',
    sectionCertOps: '인증서 운영 (자동 측정)',
    sectionQuantum: '양자 위협 정량화 (자동 계산)',
    sectionScenarios: '보수 vs 실증 시나리오',
    sectionScoring: '점수 정규화 (0~100)',
    sectionLimits: '한계와 합성 데이터 고지',
    intro:
      '본 프로젝트는 한국 주요 50개 도메인의 양자내성암호 전환 준비도를 4축으로 측정합니다. 4축 중 3축(TLS·KEM·CertOps)은 자동 측정 결과이며, 양자 위협 정량은 인증서 키 정보로부터 계산됩니다. 공급망·정책 영역은 수동 리서치 디스크립터로 별도 보존됩니다.',
    roettelerFormulaRsa:
      'RSA-n 인수분해 필요 logical qubit 수 ≈ 2n + 3 (Beauregard 2003; 자원추정 Gidney-Ekerå 2019/2025)',
    roettelerFormulaEcc:
      'ECC-n discrete log 필요 logical qubit 수 ≈ 9n + 2⌈log₂(n)⌉ + 10 (Roetteler 2017, Table 1)',
    scoringFormula:
      '점수 = clip(0, 100, log₁₀(필요 qubit / 가용 qubit) × 22 × (1 − 성공률 × 0.7))',
    scoringNote:
      '본 점수는 도메인 간 상대 비교(ordering)를 위한 정규화 값입니다. 절대값에 정량적 의미를 부여하지 않으며, 가용 qubit 기준은 Willow-class 2026 추정(100 logical qubit)을 사용합니다.',
    scoringCaveatTitle: '점수 정규화의 한계 (Calibration Disclosure)',
    scoringCaveat:
      '공식의 계수 22 와 0.7 은 정당화된 출처가 없는 calibration scalar 입니다. 사전 가정값 부근에 도메인 점수가 위치하도록 눈으로 보정한 값으로, 자원 추정 논문(ECC=Roetteler 2017, RSA=Beauregard 2003·Gidney-Ekerå)의 인용 범위는 logical qubit · Toffoli gate 계산까지이며 0-100 정규화 자체에는 별도 출처가 없습니다. 따라서 본 점수는 ordering-preserving 측정으로만 해석해야 합니다 — 두 도메인의 점수 차이는 상대 순위 차이만 의미하고, 절대값은 양자 깨짐까지의 시간·자원·확률 어느 것과도 직접 매핑되지 않습니다. HNDL(Harvest Now Decrypt Later) 시간축 모델로의 교체는 Future Work 입니다.',
    pqcNote: 'PQC 알고리즘(ML-KEM, ML-DSA, SLH-DSA, FALCON)은 Shor 공격으로 다항시간 내 깨지지 않으므로 두 시나리오 모두 점수 100.',
    hybridNote: 'Hybrid (예: X25519+ML-KEM-768)는 PQC 백업이 존재하므로 고전 알고리즘 단독 대비 점수 가산.',
    limitsBody:
      '본 데모의 도메인 점수·소견·인증서·규제 매핑 정보는 합성 데이터(synthetic)이며 실측 결과가 아닙니다. 진단·감사·구매 의사결정에 사용하지 마십시오. 데이터 소스별 표시(자동 측정 / 수동 리서치 / LLM + 샘플 검증 / LLM 미검증)를 참고하시기 바랍니다.',
  },

  citations: {
    label: '인용 자료',
  },

  about: {
    keystone:
      '교수님 논문(김의결·안혁 2025)이 양자 위협의 이론적 측면을 다뤘다면, 본 프로젝트는 자원 추정 공식(RSA: Beauregard 2003·Gidney-Ekerå, ECC: Roetteler 2017)과 Willsch 2023의 최신 시뮬레이션 결과(평균 성공률 50%+)를 한국 50개 실제 인프라에 적용하여, 도메인별 양자 깨짐 비용을 보수·실증 두 시나리오로 정량화한다.',
    context:
      '본 데모는 양자컴퓨팅 강의 기말 프로젝트로 진행되었습니다. 한국 주요 50개 도메인의 PQC 전환 준비도를 4축으로 측정·시각화합니다.',
    honesty:
      '모든 데이터는 출처(자동 측정 / 수동 리서치 / LLM + 샘플 검증 / LLM 미검증)를 명시합니다. 도메인은 실명이지만 점수·소견·인증서 정보는 데모용 합성 데이터입니다.',
    rolesHeader: '논문별 역할',
    techHeader: '기술 스택',
    techList: 'React 19, Vite 6, TypeScript 5.9, Tailwind v4, shadcn/ui, Radix Primitives, vite-plugin-pwa, zod.',
  },

  pages: {
    dashboard: {
      title: '대시보드',
      subtitle: '한국 주요 50개 도메인의 양자내성암호(PQC) 전환 준비도',
    },
    methodology: {
      title: '측정 방법론',
      subtitle: '4축 준비도 측정 + 양자 위협 정량화 (RSA: Beauregard·Gidney-Ekerå, ECC: Roetteler 2017, 실증: Willsch 2023)',
    },
    about: {
      title: '프로젝트 소개',
      subtitle: '양자컴퓨팅 강의 기말 프로젝트',
    },
    notFound: {
      code: '404',
      title: '페이지를 찾을 수 없습니다',
      body: '요청하신 경로가 존재하지 않습니다. 대시보드로 돌아가 주세요.',
      cta: '대시보드로 돌아가기',
    },
  },

  footer: {
    disclaimer:
      '본 데이터는 합성(synthetic)이며 실 측정 결과가 아닙니다. 진단·감사·구매 의사결정에 사용하지 마십시오.',
    course: '양자컴퓨팅 강의 기말 프로젝트 데모',
  },
} as const;

export type Messages = typeof ko;
