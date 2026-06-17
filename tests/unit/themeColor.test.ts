import { describe, expect, it } from 'vitest';
import { hslTripletToHex } from '@/lib/themeColor';

// SPEC-PQC-001 §3.2 — REQ-THM-004 (theme_color 동기화) 의 핵심 변환 로직 검증.
// shadcn/ui --background 토큰의 두 가지 형태(공백 구분/콤마 구분)와
// 워밍 모노크롬 리스타일 후 :root / .dark 의 실제 값(`38 25% 94%`, `0 0% 10%`)을
// 대표값으로 검증한다.

describe('hslTripletToHex', () => {
  it('converts the light :root --background (38 25% 94% 워밍 크림) to its hex equivalent', () => {
    // h=38, s=0.25, l=0.94 → 표준 HSL→RGB:
    // c=(1-|2·0.94-1|)·0.25 = 0.12·0.25 = 0.03
    // m=0.94-0.015 = 0.925 → 워밍 크림 (#F4F1EC)
    expect(hslTripletToHex('38 25% 94%')).toBe('#F4F1EC');
  });

  it('converts the dark .dark --background (0 0% 10% coal) to a warm coal hex', () => {
    // h=0, s=0, l=0.10 → 무채(c=0) → r=g=b=round(0.10·255)=26 → #1A1A1A
    expect(hslTripletToHex('0 0% 10%')).toBe('#1A1A1A');
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
