/**
 * SPEC-PQC-003 §2.2 / REQ-CP-004 — reportTier (free | paid).
 *
 * 발표엔 인증·결제 없음 → 쿼리파라미터 `?tier=paid` 토글로 "유료 미리보기" 노출.
 * 기본값 'free'. (§7-B.03)
 */

export type ReportTier = 'free' | 'paid';

/** URL 쿼리파라미터에서 tier 를 읽는다. SSR 없음(SPA) → window 안전 가드. */
export function readTier(): ReportTier {
  if (typeof window === 'undefined') return 'free';
  try {
    const params = new URLSearchParams(window.location.search);
    return params.get('tier') === 'paid' ? 'paid' : 'free';
  } catch {
    return 'free';
  }
}
