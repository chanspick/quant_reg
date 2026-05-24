"""측정 결과 → 주기 r → factor 복원.

QPE 측정값 m (n_count 비트) → φ = m / 2^n_count ≈ s/r → 연분수 전개 → r 추출.
r 가 짝수이면 gcd(a^(r/2) ± 1, N) 으로 비자명 factor 후보.
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from fractions import Fraction
from typing import Optional


@dataclass
class ShotAnalysis:
    bitstring: str
    count: int
    phase: float        # m / 2^n_count
    r: Optional[int]    # 연분수 denominator
    factors: Optional[tuple[int, int]] = None
    success: bool = False


@dataclass
class ExperimentSummary:
    a: int
    N: int
    n_count: int
    total_shots: int
    successful_shots: int
    successful_unique_outcomes: int
    most_likely_r: Optional[int] = None
    success_rate: float = 0.0
    expected_factors: Optional[tuple[int, int]] = None
    shots: list[ShotAnalysis] = field(default_factory=list)


def measurement_to_period(bitstring: str, n_count: int, N: int) -> Optional[int]:
    """단일 측정 비트열 → 추정 주기 r.

    Qiskit 의 비트 순서는 little-endian (cl[0] 가 LSB) — bitstring[::-1] 로 뒤집어 디코드.
    """
    decimal = int(bitstring, 2)
    if decimal == 0:
        return None
    phase = decimal / (2**n_count)
    # continued fraction with denominator ≤ N (r 는 < N)
    frac = Fraction(phase).limit_denominator(N)
    if frac.denominator <= 1:
        return None
    return frac.denominator


def period_to_factors(a: int, r: int, N: int) -> Optional[tuple[int, int]]:
    """주기 r → 비자명 factor 쌍. r 홀수이거나 trivial 이면 None."""
    if r % 2 != 0:
        return None
    x = pow(a, r // 2, N)
    f1 = math.gcd(x + 1, N)
    f2 = math.gcd(x - 1, N)
    candidates = sorted({f1, f2} - {1, N})
    if len(candidates) < 2:
        # 한쪽만 비자명일 수도 있음 → N/f 로 짝 추정
        if len(candidates) == 1:
            other = N // candidates[0]
            if other != 1 and other != N:
                return (candidates[0], other)
        return None
    return (candidates[0], candidates[1])


def analyze_counts(
    counts: dict[str, int],
    a: int,
    N: int,
    n_count: int,
) -> ExperimentSummary:
    """측정 히스토그램 분석 → ExperimentSummary."""
    total = sum(counts.values())
    shots: list[ShotAnalysis] = []
    successful_shots = 0
    successful_outcomes = 0
    period_votes: dict[int, int] = {}

    for bs, cnt in counts.items():
        phase = int(bs, 2) / (2**n_count)
        r = measurement_to_period(bs, n_count, N)
        factors = period_to_factors(a, r, N) if r else None
        success = bool(factors and factors[0] * factors[1] == N)
        shots.append(ShotAnalysis(
            bitstring=bs, count=cnt, phase=phase, r=r,
            factors=factors, success=success,
        ))
        if success:
            successful_shots += cnt
            successful_outcomes += 1
        if r is not None:
            period_votes[r] = period_votes.get(r, 0) + cnt

    # 가장 많이 등장한 r (보수 후보)
    most_likely_r = max(period_votes, key=period_votes.get) if period_votes else None

    return ExperimentSummary(
        a=a, N=N, n_count=n_count,
        total_shots=total,
        successful_shots=successful_shots,
        successful_unique_outcomes=successful_outcomes,
        most_likely_r=most_likely_r,
        success_rate=successful_shots / total if total else 0.0,
        expected_factors=_canonical_factors(N),
        shots=shots,
    )


def _canonical_factors(N: int) -> Optional[tuple[int, int]]:
    """작은 N 의 기대 factor 쌍."""
    for p in range(2, int(math.isqrt(N)) + 1):
        if N % p == 0:
            return (p, N // p)
    return None


def summary_to_dict(s: ExperimentSummary, top_k_shots: int = 12) -> dict:
    """JSON 직렬화 가능 dict."""
    top_shots = sorted(s.shots, key=lambda x: -x.count)[:top_k_shots]
    return {
        "N": s.N,
        "a": s.a,
        "n_count": s.n_count,
        "total_shots": s.total_shots,
        "successful_shots": s.successful_shots,
        "success_rate": round(s.success_rate, 4),
        "successful_unique_outcomes": s.successful_unique_outcomes,
        "most_likely_r": s.most_likely_r,
        "expected_factors": list(s.expected_factors) if s.expected_factors else None,
        "top_shots": [
            {
                "bitstring": sh.bitstring,
                "count": sh.count,
                "phase": round(sh.phase, 6),
                "r": sh.r,
                "factors": list(sh.factors) if sh.factors else None,
                "success": sh.success,
            }
            for sh in top_shots
        ],
    }
