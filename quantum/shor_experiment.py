"""Shor 알고리즘 실험 오케스트레이션.

3단계 비교:
    1) Aer 노이즈 없음 (이론 baseline)
    2) Aer + 실제 디바이스 noise model (HW 예측)
    3) IBM 실 HW (실측) — IBM API token 필요

사용:
    python -m quantum.shor_experiment --N 15 --a 7 --backend aer
    python -m quantum.shor_experiment --N 21 --a 4 --backend aer --shots 4096
    python -m quantum.shor_experiment --N 15 --a 7 --backend ibm --device ibm_brisbane
"""

from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

from qiskit import QuantumCircuit, transpile
from qiskit_aer import AerSimulator

from quantum.analyze import analyze_counts, summary_to_dict
from quantum.shor_circuit import (
    build_shor_15,
    build_shor_generic,
    expected_period,
)


# ─── 회로 빌더 디스패치 ──────────────────────────────────────────────────────

def build_circuit(N: int, a: int, n_count: int) -> QuantumCircuit:
    if N == 15:
        return build_shor_15(a=a, n_count=n_count)
    return build_shor_generic(N=N, a=a, n_count=n_count)


# ─── Aer 실행 ──────────────────────────────────────────────────────────────

def run_aer(qc: QuantumCircuit, shots: int, noise_model=None) -> dict[str, int]:
    sim = AerSimulator(noise_model=noise_model) if noise_model else AerSimulator()
    tqc = transpile(qc, sim, optimization_level=1)
    result = sim.run(tqc, shots=shots).result()
    return dict(result.get_counts())


# ─── IBM 실 HW 실행 (자격 증명 필요) ───────────────────────────────────────

def run_ibm(qc: QuantumCircuit, shots: int, device: str) -> dict[str, int]:
    from qiskit_ibm_runtime import QiskitRuntimeService, SamplerV2

    service = QiskitRuntimeService()  # 기본 saved credentials 사용
    backend = service.backend(device)
    print(f"[ibm] device: {backend.name}, queue: {backend.status().pending_jobs}",
          file=sys.stderr)

    tqc = transpile(qc, backend, optimization_level=2)
    print(f"[ibm] transpiled depth: {tqc.depth()}, qubits: {tqc.num_qubits}",
          file=sys.stderr)

    sampler = SamplerV2(mode=backend)
    job = sampler.run([tqc], shots=shots)
    print(f"[ibm] job id: {job.job_id()}", file=sys.stderr)
    result = job.result()
    counts = result[0].data.c.get_counts()
    return dict(counts)


# ─── 노이즈 모델 (Aer에 실제 device 노이즈 적용) ───────────────────────────

def device_noise_model(device: str):
    """qiskit-ibm-runtime 으로 device backend 가져와서 노이즈 모델 추출.

    토큰이 저장되어 있어야 함 — 없으면 None 반환 (그러면 noiseless 와 동일).
    """
    try:
        from qiskit_ibm_runtime import QiskitRuntimeService
        from qiskit_aer.noise import NoiseModel

        service = QiskitRuntimeService()
        backend = service.backend(device)
        noise_model = NoiseModel.from_backend(backend)
        return noise_model, backend.name
    except Exception as e:  # noqa: BLE001
        print(f"[noise-model] skip (credential / network issue): {e}", file=sys.stderr)
        return None, None


# ─── 메인 ──────────────────────────────────────────────────────────────────

def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(prog="quantum.shor_experiment")
    p.add_argument("--N", type=int, required=True, choices=[15, 21],
                   help="인수분해 대상 (15 또는 21)")
    p.add_argument("--a", type=int, default=None,
                   help="coprime to N (생략 시 N=15→7, N=21→4)")
    p.add_argument("--n-count", type=int, default=8,
                   help="counting register 크기 (default 8)")
    p.add_argument("--shots", type=int, default=4096)
    p.add_argument("--backend", choices=["aer", "aer-noise", "ibm"], default="aer")
    p.add_argument("--device", default="ibm_brisbane",
                   help="--backend ibm 또는 aer-noise 일 때 사용할 IBM device")
    p.add_argument("--out", type=Path, default=None)
    args = p.parse_args(argv if argv is not None else sys.argv[1:])

    a = args.a or (7 if args.N == 15 else 4)
    expected_r = expected_period(a, args.N)
    print(f"[shor] N={args.N}, a={a}, n_count={args.n_count}, "
          f"expected period r={expected_r}", file=sys.stderr)

    qc = build_circuit(args.N, a, args.n_count)
    print(f"[circuit] qubits={qc.num_qubits}, depth={qc.depth()}", file=sys.stderr)

    backend_label: str
    if args.backend == "aer":
        counts = run_aer(qc, args.shots)
        backend_label = "aer-noiseless"
    elif args.backend == "aer-noise":
        nm, device_used = device_noise_model(args.device)
        counts = run_aer(qc, args.shots, noise_model=nm)
        backend_label = f"aer+noise({device_used or args.device})"
    else:
        counts = run_ibm(qc, args.shots, args.device)
        backend_label = f"ibm-{args.device}"

    summary = analyze_counts(counts, a=a, N=args.N, n_count=args.n_count)

    envelope = {
        "measured_at": datetime.now(timezone.utc).isoformat(),
        "backend": backend_label,
        "circuit": {
            "N": args.N,
            "a": a,
            "n_count": args.n_count,
            "n_work": qc.num_qubits - args.n_count,
            "depth": qc.depth(),
            "expected_period": expected_r,
        },
        "result": summary_to_dict(summary, top_k_shots=12),
    }

    out_path = args.out or Path(
        f"quantum/out/shor-N{args.N}-{backend_label.replace('+','-').replace('(','').replace(')','')}.json"
    )
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(envelope, ensure_ascii=False, indent=2),
                        encoding="utf-8")

    print()
    print(f"=== Shor N={args.N}, a={a} on {backend_label} ===")
    print(f"  total shots : {summary.total_shots}")
    print(f"  success rate: {summary.success_rate:.2%}")
    print(f"  most likely r: {summary.most_likely_r}  (expected {expected_r})")
    print(f"  expected factors: {summary.expected_factors}")
    print(f"  → saved: {out_path}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
