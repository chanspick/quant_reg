import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MethodologyPage } from '@/pages/MethodologyPage';

// SPEC-PQC-001 §3.6 REQ-MTH-001~009 smoke test
// 4축 측정 모델, Roetteler 공식, 시나리오 카드, 참고 문헌 표시 확인

describe('MethodologyPage', () => {
  it('renders the four-axis table covering TLS / KEM / certOps / quantumThreat', () => {
    render(<MethodologyPage />);
    expect(screen.getByText('TLS 위생')).toBeInTheDocument();
    expect(screen.getByText('하이브리드 KEM')).toBeInTheDocument();
    expect(screen.getByText('인증서 운영')).toBeInTheDocument();
    expect(screen.getByText('양자 위협 정량')).toBeInTheDocument();
  });

  it('renders Roetteler formulas as typographically distinct callouts (REQ-MTH-007)', () => {
    render(<MethodologyPage />);
    expect(screen.getByText(/RSA-n 인수분해 필요 logical qubit 수 ≈ 2n \+ 3/)).toBeInTheDocument();
    expect(
      screen.getByText(/ECC-n discrete log 필요 logical qubit 수 ≈ 9n \+ 2/),
    ).toBeInTheDocument();
  });

  it('renders both 보수 and 실증 scenario cards side-by-side (REQ-MTH-008)', () => {
    render(<MethodologyPage />);
    expect(screen.getByText('보수 시나리오')).toBeInTheDocument();
    expect(screen.getByText('실증 시나리오')).toBeInTheDocument();
    expect(screen.getByText(/Shor 1994 \(이론\)/)).toBeInTheDocument();
    expect(screen.getByText(/Willsch 2023 \(실증 시뮬레이션, 60,000회\)/)).toBeInTheDocument();
  });

  it('renders the reference list with all three citations (REQ-MTH-009)', () => {
    render(<MethodologyPage />);
    expect(screen.getByText(/김의결, 안혁/)).toBeInTheDocument();
    expect(screen.getByText(/arXiv:1706\.06752/)).toBeInTheDocument();
    expect(screen.getByText(/Mathematics 11\(19\), 4222/)).toBeInTheDocument();
  });

  it('renders the synthetic-data limitation disclosure (REQ-MTH-004)', () => {
    render(<MethodologyPage />);
    expect(
      screen.getByText(/본 데모의 도메인 점수·소견·인증서·규제 매핑 정보는 합성 데이터/),
    ).toBeInTheDocument();
  });
});
