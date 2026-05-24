"""Roetteler 2017 자원 추정 + Willsch 2023 시나리오.

src/data/quantumResources.ts 와 결정적(deterministic)으로 동일한 결과를 산출한다.
공식·계수는 TS 모듈과 1:1 일치.

References:
  - Roetteler, M., Naehrig, M., Svore, K. M., Lauter, K. (2017).
    "Quantum resource estimates for computing elliptic curve discrete logarithms."
    arXiv:1706.06752.
  - Willsch, D., Willsch, M., Jin, F., De Raedt, H., Michielsen, K. (2023).
    "Large-Scale Simulation of Shor's Quantum Factoring Algorithm."
    Mathematics 11(19), 4222. doi:10.3390/math11194222
"""

from __future__ import annotations

import math
from typing import Literal, TypedDict

KeyAlgorithm = Literal[
    "RSA",
    "ECC",
    "ML-KEM",
    "Hybrid-ECC-ML-KEM",
    "Hybrid-RSA-ML-KEM",
    "Unknown",
]
Scenario = Literal["conservative", "empirical"]
CitationId = Literal["Kim-Ahn-2025", "Roetteler-2017", "Willsch-2023"]

# Willow-class 2026 logical qubit headline (illustrative gap reference value).
QUANTUM_HARDWARE_2026_LOGICAL = 100

_BASIS_CONSERVATIVE = (
    "Shor 1994 (이론) + Roetteler 2017 (자원 추정). 성공률 3~4% 가정."
)
_BASIS_EMPIRICAL = (
    "Willsch 2023 (실증 시뮬레이션, 60,000회) + Ekerå post-processing. "
    "성공률 50%+ 관측, Ekerå 적용 시 ~100% 근접."
)
_PQC_NOTE = "PQC 알고리즘은 Shor 공격으로 다항시간 내 깨지지 않는다 (NIST PQC 표준)."


class QuantumEstimate(TypedDict, total=False):
    logicalQubits: float
    toffoliGates: float
    score: int
    successRate: float
    basis: str
    note: str


class QuantumThreatDetail(TypedDict):
    keyAlgorithm: str
    keyBits: int
    estimates: dict  # {"conservative": QuantumEstimate, "empirical": QuantumEstimate}
    citations: list  # [CitationId, ...]
    source: str  # always "automated"


# --- Roetteler 2017, Table 1 ---------------------------------------------------

def rsa_logical_qubits(bits: int) -> int:
    """RSA-n 인수분해 필요 logical qubit 수 ≈ 2n + 3 (Roetteler 2017, Table 1)."""
    return 2 * bits + 3


def ecc_logical_qubits(bits: int) -> int:
    """ECC-n discrete log 필요 logical qubit 수 ≈ 9n + 2⌈log₂(n)⌉ + 10."""
    return 9 * bits + 2 * math.ceil(math.log2(bits)) + 10


def rsa_toffoli_gates(bits: int) -> int:
    """Order-of-magnitude fit: RSA ≈ 64·n³ Toffoli (Roetteler 2017 §6)."""
    return round(64 * bits**3)


def ecc_toffoli_gates(bits: int) -> int:
    """Order-of-magnitude fit: ECC ≈ 25·n³ Toffoli (Roetteler 2017 §6)."""
    return round(25 * bits**3)


# --- 점수 정규화 ----------------------------------------------------------------

def classical_score(qubits: int, scenario: Scenario) -> int:
    """0-100 정규화. 점수 = clip(0, 100, log10(필요/가용) × 22 × (1 − 성공률 × 0.7)).

    높을수록 양자 저항. 가용 qubit 기준은 QUANTUM_HARDWARE_2026_LOGICAL.
    """
    if qubits <= 0 or not math.isfinite(qubits):
        return 0
    gap = math.log10(qubits / QUANTUM_HARDWARE_2026_LOGICAL)
    if gap <= 0:
        return 0
    success_rate = 0.04 if scenario == "conservative" else 0.5
    score = gap * 22 * (1 - success_rate * 0.7)
    return max(0, min(100, round(score)))


# --- 최상위 요약 ---------------------------------------------------------------

def summarize_quantum_threat(algo: str, bits: int) -> QuantumThreatDetail:
    """도메인 1개에 대한 보수·실증 시나리오 QuantumThreatDetail 반환.

    TS src/data/quantumResources.ts:summarizeQuantumThreat 와 동일한 출력 형식.
    """
    citations = ["Roetteler-2017", "Willsch-2023"]

    # PQC: Shor 공격 무효 → 두 시나리오 모두 점수 100
    if algo == "ML-KEM":
        def pqc(sc: Scenario) -> QuantumEstimate:
            e: QuantumEstimate = {
                "logicalQubits": math.inf,
                "toffoliGates": math.inf,
                "score": 100,
                "successRate": 0,
                "basis": _PQC_NOTE,
            }
            if sc == "empirical":
                e["note"] = "Willsch 2023 도 다항시간 내 인수분해 대상 외."
            return e

        return {
            "keyAlgorithm": f"{algo}-{bits}",
            "keyBits": bits,
            "estimates": {
                "conservative": pqc("conservative"),
                "empirical": pqc("empirical"),
            },
            "citations": list(citations),
            "source": "automated",
        }

    # Hybrid: 고전 측이 약점이지만 PQC 백업 가산
    if algo in ("Hybrid-ECC-ML-KEM", "Hybrid-RSA-ML-KEM"):
        is_ecc = algo == "Hybrid-ECC-ML-KEM"
        classical_q = ecc_logical_qubits(bits) if is_ecc else rsa_logical_qubits(bits)
        classical_t = ecc_toffoli_gates(bits) if is_ecc else rsa_toffoli_gates(bits)
        cons_base = 92 if is_ecc else 82
        emp_base = cons_base - 5
        return {
            "keyAlgorithm": f"{algo}-{bits}",
            "keyBits": bits,
            "estimates": {
                "conservative": {
                    "logicalQubits": classical_q,
                    "toffoliGates": classical_t,
                    "score": cons_base,
                    "successRate": 0.04,
                    "basis": _BASIS_CONSERVATIVE + " Hybrid 의 ML-KEM 백업 가산.",
                },
                "empirical": {
                    "logicalQubits": classical_q,
                    "toffoliGates": classical_t,
                    "score": emp_base,
                    "successRate": 0.5,
                    "basis": _BASIS_EMPIRICAL + " Hybrid 의 ML-KEM 백업 가산.",
                },
            },
            "citations": list(citations),
            "source": "automated",
        }

    # RSA / ECC pure classical
    if algo == "RSA":
        q, t = rsa_logical_qubits(bits), rsa_toffoli_gates(bits)
    elif algo == "ECC":
        q, t = ecc_logical_qubits(bits), ecc_toffoli_gates(bits)
    else:
        # Unknown — 자원 추정 불가
        return {
            "keyAlgorithm": f"{algo}-{bits}",
            "keyBits": bits,
            "estimates": {
                "conservative": {
                    "logicalQubits": 0,
                    "toffoliGates": 0,
                    "score": 0,
                    "successRate": 0,
                    "basis": "키 알고리즘 미확인 — 자원 추정 불가.",
                },
                "empirical": {
                    "logicalQubits": 0,
                    "toffoliGates": 0,
                    "score": 0,
                    "successRate": 0,
                    "basis": "키 알고리즘 미확인 — 자원 추정 불가.",
                },
            },
            "citations": list(citations),
            "source": "automated",
        }

    return {
        "keyAlgorithm": f"{algo}-{bits}",
        "keyBits": bits,
        "estimates": {
            "conservative": {
                "logicalQubits": q,
                "toffoliGates": t,
                "score": classical_score(q, "conservative"),
                "successRate": 0.04,
                "basis": _BASIS_CONSERVATIVE,
            },
            "empirical": {
                "logicalQubits": q,
                "toffoliGates": t,
                "score": classical_score(q, "empirical"),
                "successRate": 0.5,
                "basis": _BASIS_EMPIRICAL,
                "note": "Ekerå post-processing 적용 시 단일 실행 성공률이 ~100%에 근접 (Willsch 2023).",
            },
        },
        "citations": list(citations),
        "source": "automated",
    }


def headline_quantum_score(detail: QuantumThreatDetail) -> int:
    """4축 dashboard headline 점수 (default = empirical scenario)."""
    return detail["estimates"]["empirical"]["score"]
