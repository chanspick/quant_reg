# scanner-web 디자인 토큰 (phase1)

워밍 다크 모노크롬, **dark-only** (라이트모드 없음). 레퍼런스 = autax.
모든 컴포넌트는 아래 유틸리티 클래스**만** 사용한다. slate/blue/brand/emerald/amber/violet/sky/red + 모든 `dark:` 변형은 **전면 폐기**.

## 색 토큰 (Tailwind v4 `@theme`, `src/index.css`)

| 토큰 변수          | HEX       | 유틸 클래스                  | 용도                                  |
| ------------------ | --------- | ---------------------------- | ------------------------------------- |
| `--color-coal`     | `#1a1a1a` | `bg-coal`                    | 페이지 배경                           |
| `--color-surface`  | `#221f1b` | `bg-surface`                 | 카드 면                               |
| `--color-surface-2`| `#2a2620` | `bg-surface-2`               | 카드 내 강조면 / 점수바 트랙          |
| `--color-ink`      | `#efe9df` | `text-ink` / `bg-ink`        | 주 텍스트, 제목, 큰 숫자 (밝은 크림)  |
| `--color-muted`    | `#a9a294` | `text-muted` / `bg-muted`    | 보조 텍스트, 라벨 (웜그레이)          |
| `--color-faint`    | `#6f6a60` | `text-faint`                 | 캡션, 메타, 출처                      |
| `--color-edge`     | `#3a3530` | `border-edge`                | **모든** 보더                         |
| `--color-risk`     | `#ff8a80` | `text-risk` / `bg-risk` / `border-risk` | **유일한 강조색** — 위험/경고/미달/at-risk/fail/낮은점수 전용 |

## 타이포 토큰

| 토큰 변수      | 값                                                | 유틸 클래스  | 용도                                |
| -------------- | ------------------------------------------------- | ------------ | ----------------------------------- |
| `--font-serif` | `'Noto Serif KR', serif`                          | `font-serif` | 제목, 등급 A~F, 큰 점수 숫자        |
| `--font-sans`  | `'Pretendard Variable', Pretendard, sans-serif`   | `font-sans`  | 본문, 라벨                          |
| (기존 mono)    | Tailwind 기본 mono                                | `font-mono`  | 코드, 모노 수치                     |

- 폰트 로드: `index.html` `<head>` — Noto Serif KR(400/600/700) Google Fonts, Pretendard jsDelivr CDN.
- `html`/`body`에 `bg-coal text-ink font-sans` 기본 적용 (FOUC 방지). `h1~h6`는 `font-serif` 기본.

## 색 사용 규칙 (HARD)

- **다색 금지.** 무채(먹색/크림/웜그레이)만. 강조는 오직 `text-risk`/`bg-risk`(#ff8a80) 하나.
- **카드**: `bg-surface border border-edge rounded`. 그림자 대신 보더로 구분 (다크라 그림자 약함).
- **점수 바**: 트랙 `bg-surface-2`, 채움 `bg-ink`; 값<40 이면 채움 `bg-risk`.
- **등급 A~F** (큰 `font-serif`): A·B = `text-ink`, C = `text-muted`, D·F = `text-risk`.
- **SourceChip 등 정직성 칩**: 색 구분 금지 → `text-faint` + `border border-edge`로 통일, 라벨 텍스트로 구분.

## scoreBand 매핑 (`src/components/shared/scoreBand.ts`)

함수 시그니처 · 밴드 임계값 · export API 불변. 색 문자열만 모노크롬으로 교체됨.

| 밴드   | 점수 범위 | `fill`    | `text`       | `border`      | `ringSoft`     |
| ------ | --------- | --------- | ------------ | ------------- | -------------- |
| 위험   | ≤ 30      | `bg-risk` | `text-risk`  | `border-risk` | `bg-risk/15`   |
| 주의   | 31–60     | `bg-muted`| `text-muted` | `border-edge` | `bg-muted/15`  |
| 양호   | 61–80     | `bg-ink`  | `text-muted` | `border-edge` | `bg-ink/10`    |
| 우수   | > 80      | `bg-ink`  | `text-ink`   | `border-edge` | `bg-ink/15`    |

위험밴드만 강조색(risk), 나머지는 ink/muted 농담으로 위계만 표현.

## 텍스트 다이어트 규칙 (phase2 적용 예정)

- 반복 disclaimer 제거 → 전역 disclaimer는 **footer 1곳만**.
- 긴 설명 문단 → 짧은 라벨 + 핵심 수치. 부연은 `text-faint` 한 줄 또는 "자세히" 토글.
- 각 섹션: 명확한 제목 + 핵심 숫자/판정 1개를 크게(`text-3xl`~`6xl` `font-serif text-ink`).
- **삭제 금지(축약만)** 정직성 필수 요소: SourceChip(source 라벨), calibration disclosure, "추정"+출처,
  "통계적 업계표준 아님", measuredAt → 작은 칩/캡션으로 압축하되 의미 보존.

## 유틸 클래스 사용 예시

### 카드

```tsx
<article className="rounded-lg border border-edge bg-surface p-4">
  <h4 className="font-serif text-ink">제목</h4>
  <p className="font-sans text-sm text-muted">보조 설명</p>
  <p className="text-xs text-faint">measuredAt 2026-06-17 · source: live</p>
</article>
```

### 큰 점수 숫자 (시인성 최우선)

```tsx
<span className="font-serif text-5xl text-ink tabular-nums">87</span>
<span className="text-sm text-faint">/ 100</span>
```

### 등급 A~F

```tsx
<span className="font-serif text-6xl text-ink">A</span>   {/* A·B */}
<span className="font-serif text-6xl text-muted">C</span> {/* C   */}
<span className="font-serif text-6xl text-risk">F</span>  {/* D·F */}
```

### 점수 바 (값<40 → risk)

```tsx
<div className="h-3 overflow-hidden rounded-full bg-surface-2">
  <div
    className={value < 40 ? 'h-full bg-risk' : 'h-full bg-ink'}
    style={{ width: `${value}%` }}
  />
</div>
```

### 정직성 칩 (SourceChip)

```tsx
<span className="rounded border border-edge px-1.5 py-0.5 text-[11px] text-faint">
  추정 · source: heuristic
</span>
```
