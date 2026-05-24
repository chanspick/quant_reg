import { describe, expect, it } from 'vitest';
import {
  DomainSchema,
  DataSourceSchema,
  isPlaceholderText,
  parseDomainsEnvelope,
} from '@/data/schema';
import type { Domain, QuantumThreatDetail } from '@/data/schema';

// SPEC-PQC-001 §3.4 — zod 스키마 sanity 테스트 (4축 + 양자 위협 정량 통합).
// 정직성 원칙: 모든 점수·분석·정책 매핑 항목은 source 가 필수.

const quantumThreatDetail: QuantumThreatDetail = {
  keyAlgorithm: 'RSA-2048',
  keyBits: 2048,
  estimates: {
    conservative: {
      logicalQubits: 4099,
      toffoliGates: 549755813888,
      score: 34,
      successRate: 0.04,
      basis: 'Shor 1994 + Roetteler 2017',
    },
    empirical: {
      logicalQubits: 4099,
      toffoliGates: 549755813888,
      score: 23,
      successRate: 0.5,
      basis: 'Willsch 2023 + Ekerå post-processing',
      note: 'Ekerå 적용 시 ~100%.',
    },
  },
  citations: ['Roetteler-2017', 'Willsch-2023'],
  source: 'automated',
};

const validDomain: Domain = {
  name: '테스트 도메인',
  url: 'https://example.com',
  sector: 'IT/플랫폼',
  scores: {
    tls: { value: 80, source: 'automated' },
    hybridKem: { value: 50, source: 'automated' },
    certOps: { value: 75, source: 'automated' },
    quantumThreat: { value: 23, source: 'automated' },
  },
  certificate: {
    renewal: '자동 갱신',
    ca: 'Let’s Encrypt',
    keyAlgorithm: 'RSA',
    keyBits: 2048,
  },
  pqc: {
    keyExchange: '활성화',
    hybrid: '하이브리드',
    maturity: '베타 적용',
  },
  regulatoryGaps: [
    { refName: '가이드라인', note: '테스트', source: 'llm+verified' },
  ],
  findings: [{ text: 'finding A', source: 'automated' }],
  recommendations: [{ text: 'rec A', source: 'llm-only' }],
  narrative: { text: '합성 데이터 narrative.', source: 'llm+verified' },
  supplyChainNotes: { text: '단일 CDN 의존.', source: 'manual' },
  quantumThreatDetail,
};

describe('DataSourceSchema', () => {
  it('accepts all four source modes', () => {
    expect(DataSourceSchema.parse('automated')).toBe('automated');
    expect(DataSourceSchema.parse('manual')).toBe('manual');
    expect(DataSourceSchema.parse('llm+verified')).toBe('llm+verified');
    expect(DataSourceSchema.parse('llm-only')).toBe('llm-only');
  });

  it('rejects an unknown source mode', () => {
    expect(() => DataSourceSchema.parse('guessed')).toThrow();
  });
});

describe('DomainSchema', () => {
  it('accepts a valid sourced domain record (4-axis model)', () => {
    const parsed = DomainSchema.parse(validDomain);
    expect(parsed.scores.tls.value).toBe(80);
    expect(parsed.scores.quantumThreat.value).toBe(23);
    expect(parsed.quantumThreatDetail.keyAlgorithm).toBe('RSA-2048');
    expect(parsed.supplyChainNotes.source).toBe('manual');
    expect(parsed.narrative.source).toBe('llm+verified');
  });

  it('rejects score value out of range (REQ-SCH-004)', () => {
    const bad = {
      ...validDomain,
      scores: {
        ...validDomain.scores,
        tls: { value: 150, source: 'automated' as const },
      },
    };
    expect(() => DomainSchema.parse(bad)).toThrow();
  });

  it('rejects a score missing its source field (REQ-SCH-006)', () => {
    const bad = {
      ...validDomain,
      scores: { ...validDomain.scores, tls: { value: 80 } },
    };
    expect(() => DomainSchema.parse(bad)).toThrow();
  });

  it('rejects unknown maturity enum (REQ-SCH-005)', () => {
    const bad = {
      ...validDomain,
      pqc: { ...validDomain.pqc, maturity: '운영 안정' as never },
    };
    expect(() => DomainSchema.parse(bad)).toThrow();
  });

  it('rejects unknown source on regulatoryGaps', () => {
    const bad = {
      ...validDomain,
      regulatoryGaps: [
        {
          refName: '가이드라인' as const,
          note: '테스트',
          source: 'guess' as never,
        },
      ],
    };
    expect(() => DomainSchema.parse(bad)).toThrow();
  });

  it('rejects an unknown keyAlgorithm on certificate', () => {
    const bad = {
      ...validDomain,
      certificate: {
        ...validDomain.certificate,
        keyAlgorithm: 'DSA' as never,
      },
    };
    expect(() => DomainSchema.parse(bad)).toThrow();
  });

  it('rejects an invalid citation id in quantumThreatDetail', () => {
    const bad = {
      ...validDomain,
      quantumThreatDetail: {
        ...validDomain.quantumThreatDetail,
        citations: ['BogusCite'] as never,
      },
    };
    expect(() => DomainSchema.parse(bad)).toThrow();
  });
});

describe('isPlaceholderText', () => {
  it('detects scanner-generated TODO narrative placeholder', () => {
    expect(
      isPlaceholderText({
        text: 'TODO: 삼성전자 분석 narrative 를 작성하세요.',
        source: 'llm-only',
      }),
    ).toBe(true);
  });

  it('detects scanner-generated TODO supplyChain placeholder', () => {
    expect(
      isPlaceholderText({
        text: 'TODO: 네이버 공급망(CA·CDN·WAF) 종속성 메모를 작성하세요.',
        source: 'manual',
      }),
    ).toBe(true);
  });

  it('returns false for genuine analysis text regardless of source mode', () => {
    expect(
      isPlaceholderText({
        text: '글로벌 전자 기업의 대표 도메인답게 TLS 위생은 안정적이지만...',
        source: 'llm+verified',
      }),
    ).toBe(false);
    expect(
      isPlaceholderText({ text: '단일 CDN 의존.', source: 'manual' }),
    ).toBe(false);
  });

  it('does not false-positive on text that merely contains TODO somewhere', () => {
    // "TODO" 가 문장 중간에 있는 경우는 placeholder 가 아닌 실제 텍스트로 본다
    expect(
      isPlaceholderText({
        text: '운영팀 TODO 리스트에 따라 분기별 갱신이 이루어집니다.',
        source: 'manual',
      }),
    ).toBe(false);
  });
});

describe('parseDomainsEnvelope', () => {
  it('parses a well-formed envelope with all-valid records', () => {
    const raw = {
      lastUpdated: '2026-05-14',
      version: '0.3.0',
      domains: [validDomain],
    };
    const result = parseDomainsEnvelope(raw);
    expect(result.domains).toHaveLength(1);
    expect(result.invalidCount).toBe(0);
    expect(result.lastUpdated).toBe('2026-05-14');
    expect(result.domains[0]!.quantumThreatDetail.keyBits).toBe(2048);
  });

  it('skips invalid records but keeps valid ones (REQ-DAT-011)', () => {
    const bad = {
      ...validDomain,
      scores: {
        ...validDomain.scores,
        tls: { value: -5, source: 'automated' as const },
      },
    };
    const raw = {
      lastUpdated: '2026-05-14',
      version: '0.3.0',
      domains: [validDomain, bad],
    };
    const result = parseDomainsEnvelope(raw);
    expect(result.domains).toHaveLength(1);
    expect(result.invalidCount).toBe(1);
    expect(result.invalidReasons[0]?.index).toBe(1);
  });
});
