# PWA 아이콘 (TODO — run phase에서 교체)

현재 디렉터리의 `pwa-192.png`, `pwa-512.png`, `apple-touch-icon.png` 는
브랜드 색(#1e3a8a) 단색으로 채워진 **placeholder PNG** 입니다.
빌드 / Lighthouse PWA 감사 통과를 위한 최소 자산이며, 실제 로고/아이콘으로 교체해야 합니다.

## 교체 가이드

- `pwa-192.png`: 192×192 PNG, 일반 아이콘
- `pwa-512.png`: 512×512 PNG, 일반 + maskable 겸용 (manifest 에서 `purpose: 'maskable'` 로도 등록됨)
- `apple-touch-icon.png`: 180×180 PNG, iOS 홈 화면 아이콘
- `favicon.svg`: 단순 모노그램 SVG (현재는 "PQC" 모노그램)

## 권장

- Maskable 아이콘은 `safe area` (중앙 80%) 안에 핵심 그래픽을 배치할 것
- 512×512 와 별도로 maskable 전용 자산(`pwa-512-maskable.png`)을 둘 수도 있음
- 디자인 마무리 후 SPEC-PQC-001 §4.5 manifest 사양과 정렬할 것
