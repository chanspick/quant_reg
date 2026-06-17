import { describe, expect, it } from 'vitest';
import {
  rsaLogicalQubits,
  eccLogicalQubits,
  rsaToffoliGates,
  eccToffoliGates,
  summarizeQuantumThreat,
  headlineQuantumScore,
} from '@/data/quantumResources';

// SPEC-PQC-001 §3.14 — 자원 추정 공식 sanity (RSA=Beauregard/Gidney, ECC=Roetteler) + 시나리오 점수 일관성

describe('logical qubit formulas (RSA=Beauregard 2003, ECC=Roetteler 2017)', () => {
  it('RSA-2048 → 4099 logical qubits', () => {
    expect(rsaLogicalQubits(2048)).toBe(4099);
  });

  it('RSA-3072 → 6147 logical qubits', () => {
    expect(rsaLogicalQubits(3072)).toBe(6147);
  });

  it('ECC P-256 → 2330 logical qubits (Roetteler 2017 Table 1)', () => {
    // 9*256 + 2*ceil(log2(256)) + 10 = 2304 + 16 + 10 = 2330
    expect(eccLogicalQubits(256)).toBe(2330);
  });

  it('ECC P-384 → 3484 logical qubits', () => {
    // 9*384 + 2*ceil(log2(384)) + 10 = 3456 + 18 + 10 = 3484
    expect(eccLogicalQubits(384)).toBe(3484);
  });
});

describe('Toffoli gate fits', () => {
  it('RSA grows as ~64·n³', () => {
    expect(rsaToffoliGates(1024)).toBeGreaterThan(0);
    expect(rsaToffoliGates(2048)).toBeGreaterThan(rsaToffoliGates(1024));
  });

  it('ECC grows as ~25·n³', () => {
    expect(eccToffoliGates(256)).toBeGreaterThan(0);
    expect(eccToffoliGates(384)).toBeGreaterThan(eccToffoliGates(256));
  });
});

describe('summarizeQuantumThreat — PQC', () => {
  it('ML-KEM gets perfect score in both scenarios', () => {
    const s = summarizeQuantumThreat('ML-KEM', 768);
    expect(s.estimates.conservative.score).toBe(100);
    expect(s.estimates.empirical.score).toBe(100);
    expect(headlineQuantumScore(s)).toBe(100);
    expect(s.source).toBe('automated');
  });
});

describe('summarizeQuantumThreat — Hybrid', () => {
  it('Hybrid-ECC-ML-KEM scores high in both scenarios', () => {
    const s = summarizeQuantumThreat('Hybrid-ECC-ML-KEM', 256);
    expect(s.estimates.conservative.score).toBeGreaterThanOrEqual(85);
    expect(s.estimates.empirical.score).toBeGreaterThanOrEqual(80);
    expect(s.estimates.conservative.score).toBeGreaterThan(
      s.estimates.empirical.score,
    );
  });
});

describe('summarizeQuantumThreat — RSA/ECC classical', () => {
  it('RSA-2048 conservative score > empirical score', () => {
    const s = summarizeQuantumThreat('RSA', 2048);
    expect(s.estimates.conservative.score).toBeGreaterThan(
      s.estimates.empirical.score,
    );
  });

  it('RSA-2048 deterministic numbers stay within reasonable bands', () => {
    const s = summarizeQuantumThreat('RSA', 2048);
    expect(s.estimates.conservative.score).toBeGreaterThan(20);
    expect(s.estimates.conservative.score).toBeLessThan(50);
    expect(s.estimates.empirical.score).toBeGreaterThan(10);
    expect(s.estimates.empirical.score).toBeLessThan(40);
  });

  it('RSA cites Beauregard 2003 + Gidney resource estimates, never Roetteler', () => {
    const s = summarizeQuantumThreat('RSA', 2048);
    expect(s.citations).toContain('Beauregard-2003');
    expect(s.citations).toContain('Gidney-Ekera-2019');
    expect(s.citations).toContain('Gidney-2025');
    expect(s.citations).toContain('Willsch-2023');
    expect(s.citations).not.toContain('Roetteler-2017');
  });

  it('ECC cites Roetteler 2017, never Gidney/Beauregard', () => {
    const s = summarizeQuantumThreat('ECC', 256);
    expect(s.citations).toContain('Roetteler-2017');
    expect(s.citations).not.toContain('Gidney-Ekera-2019');
    expect(s.citations).not.toContain('Beauregard-2003');
  });
});
