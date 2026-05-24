import { describe, expect, it } from 'vitest';
import { hslTripletToHex } from '@/lib/themeColor';

// SPEC-PQC-001 §3.2 — REQ-THM-004 (theme_color 동기화) 의 핵심 변환 로직 검증.
// shadcn/ui --background 토큰의 두 가지 형태(공백 구분/콤마 구분)와
// :root / .dark 의 실제 값(`210 20% 98%`, `215 30% 8%`)을 대표값으로 검증한다.

describe('hslTripletToHex', () => {
  it('converts the light :root --background (210 20% 98%) to its hex equivalent', () => {
    // h=210, s=0.20, l=0.98 → 표준 HSL→RGB:
    // c=(1-|2·0.98-1|)·0.20 = 0.04·0.20 = 0.008
    // x=c·(1-|((210/60) mod 2)-1|) = 0.008·0.5 = 0.004
    // m=0.98-0.004 = 0.976 → (r,g,b) ≈ (0.976, 0.980, 0.984) → (249,250,251)
    expect(hslTripletToHex('210 20% 98%')).toBe('#F9FAFB');
  });

  it('converts the dark .dark --background (215 30% 8%) to a dark blue-grey hex', () => {
    // h=215, s=0.30, l=0.08 → c=0.048, x≈0.02, m=0.056
    // (r,g,b) ≈ (0.056, 0.076, 0.104) → (14, 19, 27)
    expect(hslTripletToHex('215 30% 8%')).toBe('#0E131B');
  });

  it('accepts comma-separated HSL form', () => {
    // CSS 변수가 콤마 변형으로 저장된 경우도 견고하게 파싱한다.
    expect(hslTripletToHex('210, 20%, 98%')).toBe('#F9FAFB');
  });

  it('returns null for malformed input', () => {
    expect(hslTripletToHex('invalid')).toBeNull();
    expect(hslTripletToHex('')).toBeNull();
    expect(hslTripletToHex('210 20 98')).toBeNull(); // 퍼센트 부호 없음
    expect(hslTripletToHex('rgb(0,0,0)')).toBeNull();
  });

  it('handles pure hues at sector boundaries', () => {
    // 100% saturation, 50% lightness → 각 채널이 0 또는 255.
    expect(hslTripletToHex('0 100% 50%')).toBe('#FF0000'); // 순수 red
    expect(hslTripletToHex('120 100% 50%')).toBe('#00FF00'); // 순수 green
    expect(hslTripletToHex('240 100% 50%')).toBe('#0000FF'); // 순수 blue
  });
});
