"""Shor 알고리즘 회로 빌더.

N=15: Vandersypen 2001 의 compact decomposition (IBM Qiskit textbook).
N=21: 일반 UnitaryGate 합성 (회로 깊이 큼 — 시뮬레이터/적당히 강한 HW 권장).

회로 구조 (RFC 가 아닌 표준 QPE):
    counting register (n_count qubits) ─── H ─── ctrl ─── QFT⁻¹ ─── measure
    work register (n_work qubits)      ─── |1⟩ ── U^(2^k)
"""

from __future__ import annotations

import math
import numpy as np
from qiskit import QuantumCircuit
from qiskit.circuit.library import QFT, UnitaryGate


# ─── N=15 (Vandersypen 2001 / Qiskit textbook) ────────────────────────────

def _c_amod15(a: int, power: int) -> QuantumCircuit:
    """Controlled multiplication by a^power mod 15 on 4-qubit work register.

    Coprimes to 15: {2, 4, 7, 8, 11, 13}. 본 데모는 a=7 (period 4) 사용.
    """
    if a not in (2, 4, 7, 8, 11, 13):
        raise ValueError(f"a must be coprime to 15; got {a}")
    U = QuantumCircuit(4, name=f"{a}^{power} mod 15")
    for _ in range(power):
        if a in (2, 13):
            U.swap(0, 1); U.swap(1, 2); U.swap(2, 3)
        if a in (7, 8):
            U.swap(2, 3); U.swap(1, 2); U.swap(0, 1)
        if a in (4, 11):
            U.swap(1, 3); U.swap(0, 2)
        if a in (7, 11, 13):
            for q in range(4):
                U.x(q)
    gate = U.to_gate(label=f"{a}^{power} mod 15")
    return gate.control(1)


def build_shor_15(a: int = 7, n_count: int = 8) -> QuantumCircuit:
    """Shor 회로 — N=15.

    Args:
        a: coprime to 15 (default 7, period 4).
        n_count: counting register 크기. 클수록 phase 해상도 ↑.
    """
    n_work = 4
    qc = QuantumCircuit(n_count + n_work, n_count)
    # work register 를 |1⟩ 로 초기화 (qubit 위치 = n_count + 0)
    qc.x(n_count)

    # counting register Hadamard
    for q in range(n_count):
        qc.h(q)

    # controlled modular exponentiation
    for q in range(n_count):
        ctrl_U = _c_amod15(a, 2**q)
        qc.append(ctrl_U, [q] + list(range(n_count, n_count + n_work)))

    # inverse QFT on counting register
    qc.append(QFT(n_count, do_swaps=True, inverse=True).to_gate(label="QFT⁻¹"),
              range(n_count))

    qc.measure(range(n_count), range(n_count))
    return qc


# ─── 일반 N (UnitaryGate 합성) ─────────────────────────────────────────────

def _modmult_unitary(a: int, N: int, n_work: int) -> UnitaryGate:
    """|x⟩ → |a·x mod N⟩ permutation matrix → UnitaryGate.

    n_work 비트 register 에서 x < N 이고 gcd(x, N) = 1 인 상태만 permute,
    나머지는 identity. 회로 깊이는 합성 후 4^n_work 정도.
    """
    dim = 2**n_work
    mat = np.zeros((dim, dim), dtype=complex)
    for x in range(dim):
        if x < N and math.gcd(x, N) == 1:
            mat[(a * x) % N, x] = 1.0
        else:
            mat[x, x] = 1.0
    return UnitaryGate(mat, label=f"x·{a} mod {N}")


def build_shor_generic(N: int, a: int, n_count: int = 8) -> QuantumCircuit:
    """Generic Shor 회로 — UnitaryGate 합성 사용 (N=21 등).

    n_work = ceil(log2(N)).
    """
    n_work = math.ceil(math.log2(N))
    qc = QuantumCircuit(n_count + n_work, n_count)
    qc.x(n_count)  # work register |1⟩

    for q in range(n_count):
        qc.h(q)

    # 반복 제곱: U^(2^k) = U·U^(2^(k-1)) — 매 단계 a^(2^k) mod N
    for q in range(n_count):
        a_pow = pow(a, 2**q, N)
        U = _modmult_unitary(a_pow, N, n_work).control(1)
        qc.append(U, [q] + list(range(n_count, n_count + n_work)))

    qc.append(QFT(n_count, do_swaps=True, inverse=True).to_gate(label="QFT⁻¹"),
              range(n_count))
    qc.measure(range(n_count), range(n_count))
    return qc


# ─── 헬퍼 ──────────────────────────────────────────────────────────────────

def expected_period(a: int, N: int) -> int:
    """a^r ≡ 1 (mod N) 인 최소 r. 검증·기대값 계산용."""
    r = 1
    val = a % N
    while val != 1:
        val = (val * a) % N
        r += 1
        if r > N:
            raise ValueError(f"period not found for a={a}, N={N}")
    return r


if __name__ == "__main__":
    # sanity: 회로 빌드만 확인
    qc15 = build_shor_15(a=7, n_count=4)
    print(f"N=15, a=7, n_count=4 → qubits={qc15.num_qubits}, depth={qc15.depth()}")
    qc21 = build_shor_generic(N=21, a=4, n_count=5)
    print(f"N=21, a=4, n_count=5 → qubits={qc21.num_qubits}, depth={qc21.depth()}")
    print(f"expected period(7, 15) = {expected_period(7, 15)}  (=4)")
    print(f"expected period(4, 21) = {expected_period(4, 21)}  (=3)")
