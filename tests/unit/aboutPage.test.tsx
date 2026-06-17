import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AboutPage } from '@/pages/AboutPage';

// SPEC-PQC-001 §3.7 REQ-ABT-001~006 smoke test
// 핵심 한 줄(keystone), 3 논문 역할, 정직성 고지가 노출되는지 확인

describe('AboutPage', () => {
  it('renders the keystone blockquote with the project framing line', () => {
    render(<AboutPage />);
    // REQ-ABT-005: keystone 한 줄
    expect(
      screen.getByText(/Beauregard 2003.*Roetteler 2017.*Willsch 2023/),
    ).toBeInTheDocument();
  });

  it('lists all three citations with their roles', () => {
    render(<AboutPage />);
    // REQ-ABT-006: 3 논문이 모두 노출
    expect(screen.getByText(/김의결, 안혁/)).toBeInTheDocument();
    expect(screen.getByText(/Roetteler, M\., Naehrig, M\./)).toBeInTheDocument();
    expect(screen.getByText(/Willsch, D\., Willsch, M\./)).toBeInTheDocument();
  });

  it('renders the honesty disclosure block', () => {
    render(<AboutPage />);
    // REQ-ABT-003: 합성 데이터 고지
    expect(screen.getByText(/도메인은 실명이지만 점수·소견·인증서 정보는 데모용/)).toBeInTheDocument();
  });

  it('shows external links to arXiv and DOI for verifiable citations', () => {
    render(<AboutPage />);
    const arxivLink = screen.getByRole('link', { name: /arXiv:1706\.06752/ });
    expect(arxivLink).toHaveAttribute('href', 'https://arxiv.org/abs/1706.06752');
    expect(arxivLink).toHaveAttribute('target', '_blank');
    expect(arxivLink).toHaveAttribute('rel', 'noopener noreferrer');
  });
});
