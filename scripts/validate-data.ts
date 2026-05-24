/**
 * public/data/domains.json 을 zod DomainsEnvelopeSchema 로 검증.
 *
 * 빌드·테스트는 코드만 검증하므로, 측정 엔진(Python)과 스키마(TS) 간
 * enum 정합성 버그 같은 것은 런타임에서만 드러난다. 이 스크립트는 그 갭을 메운다.
 *
 * 사용:
 *   pnpm validate-data            # 한 번 검증, 실패하면 exit 1
 *   pnpm validate-data --verbose  # 상세 trace
 */
import { readFileSync } from 'node:fs';
import { parseDomainsEnvelope } from '../src/data/schema';

const verbose = process.argv.includes('--verbose');
const path = 'public/data/domains.json';

let raw: { domains?: unknown[] };
try {
  raw = JSON.parse(readFileSync(path, 'utf-8'));
} catch (e) {
  console.error(`[validate-data] ${path} 읽기 실패:`, e);
  process.exit(2);
}

const result = parseDomainsEnvelope(raw);
const total = (raw.domains ?? []).length;

console.log(
  `[validate-data] ${path}: valid=${result.domains.length}/${total}` +
    (result.invalidCount > 0 ? ` (invalid=${result.invalidCount})` : ''),
);

if (result.invalidCount === 0) {
  process.exit(0);
}

console.error('');
console.error('--- 검증 실패 목록 ---');
const recs = (raw.domains ?? []) as Array<Record<string, unknown>>;
const limit = verbose ? result.invalidReasons.length : Math.min(10, result.invalidReasons.length);
result.invalidReasons.slice(0, limit).forEach((r) => {
  const rec = recs[r.index];
  const name = (rec?.name as string) ?? '?';
  const url = (rec?.url as string) ?? '?';
  console.error(`  [${r.index.toString().padStart(2)}] ${name} (${url})`);
  console.error(`       ${r.reason}`);
});
if (!verbose && result.invalidCount > limit) {
  console.error(`  ... ${result.invalidCount - limit} more (--verbose 로 전체 보기)`);
}

process.exit(1);
