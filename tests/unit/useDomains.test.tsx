import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useDomains } from '@/data/useDomains';

// SPEC-PQC-001 §3.3 (Data Layer)
// REQ-DAT-001/002/003/006/007/011 — fetch + zod + retry + partial-invalid 처리

const validEnvelope = {
  lastUpdated: '2026-05-14',
  version: '0.4.0',
  domains: [
    {
      name: '테스트',
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
        ca: 'DigiCert',
        keyAlgorithm: 'RSA',
        keyBits: 2048,
      },
      pqc: { keyExchange: '활성화', hybrid: '하이브리드', maturity: '베타 적용' },
      regulatoryGaps: [],
      findings: [],
      recommendations: [],
      narrative: { text: 'narrative', source: 'llm+verified' },
      supplyChainNotes: { text: 'note', source: 'manual' },
      quantumThreatDetail: {
        keyAlgorithm: 'RSA-2048',
        keyBits: 2048,
        estimates: {
          conservative: {
            logicalQubits: 4099,
            toffoliGates: 549755813888,
            score: 34,
            successRate: 0.04,
            basis: 'Shor 1994',
          },
          empirical: {
            logicalQubits: 4099,
            toffoliGates: 549755813888,
            score: 23,
            successRate: 0.5,
            basis: 'Willsch 2023',
          },
        },
        citations: ['Roetteler-2017', 'Willsch-2023'],
        source: 'automated',
      },
    },
  ],
};

const fetchOk = (body: unknown): Response =>
  ({
    ok: true,
    status: 200,
    statusText: 'OK',
    json: async () => body,
  }) as unknown as Response;

describe('useDomains', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('starts in loading state and transitions to success on a valid response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(fetchOk(validEnvelope));
    const { result } = renderHook(() => useDomains());

    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBeNull();
    expect(result.current.domains).toHaveLength(1);
    expect(result.current.lastUpdated).toBe('2026-05-14');
  });

  it('exposes an error message when fetch returns a non-OK response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Server Error',
      json: async () => ({}),
    } as unknown as Response);

    const { result } = renderHook(() => useDomains());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toMatch(/HTTP 500/);
    expect(result.current.domains).toHaveLength(0);
  });

  it('exposes an error when fetch rejects', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network down'));
    const { result } = renderHook(() => useDomains());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBe('network down');
  });

  it('retry() resets to loading and refetches', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'fail',
        json: async () => ({}),
      } as unknown as Response)
      .mockResolvedValueOnce(fetchOk(validEnvelope));

    const { result } = renderHook(() => useDomains());
    await waitFor(() => expect(result.current.error).not.toBeNull());

    act(() => {
      result.current.retry();
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.domains).toHaveLength(1);
    });
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it('skips invalid records but keeps the valid ones (REQ-DAT-011)', async () => {
    const mixed = {
      ...validEnvelope,
      domains: [
        validEnvelope.domains[0],
        { ...validEnvelope.domains[0], name: '', /* invalid: empty name */ },
      ],
    };
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(fetchOk(mixed));

    const { result } = renderHook(() => useDomains());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBeNull();
    expect(result.current.domains).toHaveLength(1);
    expect(result.current.data?.invalidCount).toBe(1);
  });
});
