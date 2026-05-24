"""Phase 3 — IBM Quantum Shor 실험.

Roetteler 2017 / Willsch 2023 의 인용 체인을 본인 실측으로 확장.

모듈:
- shor_circuit.py: Shor 회로 빌더 (N=15 textbook + N=21 generic)
- analyze.py: 측정값 → 주기 r → factor 복원
- shor_experiment.py: Aer + 노이즈 모델 + 실 HW 실행 오케스트레이션

표준 인용:
- Shor, P. W. (1994). Algorithms for quantum computation.
- Vandersypen et al. (2001). Experimental realization of Shor's algorithm. Nature.
- Willsch et al. (2023). Large-Scale Simulation. Mathematics 11, 4222.
- IBM Qiskit Textbook — Shor's algorithm chapter
"""

__version__ = "0.1.0"
