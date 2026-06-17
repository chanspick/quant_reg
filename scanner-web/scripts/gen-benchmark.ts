/**
 * SPEC-PQC-003 §3.4 / §7-B.04 — benchmark.json 생성 스크립트 (P0 선행).
 *
 * ROOT 앱(`pqc-readiness-scanner`)의 정적 데이터 `public/data/domains.json` 을 읽어
 * scanner-web 번들용 `scanner-web/public/benchmark.json` 을 결정적으로 생성한다.
 *
 * 두 앱은 분리되어 있으므로(§0) 이 스크립트는 cross-app 추출 1회용이며,
 * 산출물(benchmark.json)은 git 커밋되어 Railway 빌드 컨텍스트에 포함된다(INTEG-5c).
 *
 * 실행:
 *   npx tsx scanner-web/scripts/gen-benchmark.ts
 *   (tsx 는 ROOT 앱의 dev 의존성 — repo 루트 node_modules/.bin/tsx)
 *
 * 입력 도메인 shape (domains.json):
 *   { name, url, sector, scores: { tls:{value}, hybridKem:{value}, certOps:{value}, quantumThreat:{value} } }
 *
 * 출력 shape (benchmark.json):
 *   { version, generatedFrom, domains: [
 *       { hostname, name, sector, axes:{tls,hybridKem,certOps,quantumThreat}, overall } ] }
 *
 * 주의: 절대로 백엔드/응답 스키마를 건드리지 않는다. 순수 정적 데이터 변환만 수행.
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// --- 경로 (scanner-web/scripts/ 기준 상대) --------------------------------
const __dirname = path.dirname(fileURLToPath(import.meta.url));
// scanner-web/scripts → repo 루트는 두 단계 위
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const SOURCE = path.join(REPO_ROOT, 'public', 'data', 'domains.json');
const OUT_DIR = path.join(REPO_ROOT, 'scanner-web', 'public');
const OUT = path.join(OUT_DIR, 'benchmark.json');

// --- 입력 타입 (domains.json 의 부분 집합만 신뢰) -------------------------
interface RawScore {
  value: number;
}
interface RawDomain {
  name: string;
  url: string;
  sector: string;
  scores: {
    tls: RawScore;
    hybridKem: RawScore;
    certOps: RawScore;
    quantumThreat: RawScore;
  };
}
interface RawFile {
  version?: string;
  domains: RawDomain[];
}

// --- 출력 타입 ------------------------------------------------------------
interface BenchmarkAxes {
  tls: number;
  hybridKem: number;
  certOps: number;
  quantumThreat: number;
}
interface BenchmarkDomain {
  hostname: string;
  name: string;
  sector: string;
  axes: BenchmarkAxes;
  overall: number;
}
interface BenchmarkFile {
  version: string;
  generatedFrom: string;
  domains: BenchmarkDomain[];
}

// --- 헬퍼 -----------------------------------------------------------------

/** "https://www.samsung.com/" → "www.samsung.com" (scheme·trailing slash 제거). */
function toHostname(url: string): string {
  let h = url.trim();
  h = h.replace(/^https?:\/\//i, '');
  h = h.replace(/\/+$/, '');
  return h.toLowerCase();
}

/** 4축 균등 가중 평균을 반올림 (lib/grade.ts 와 동일 공식). */
function computeOverall(axes: BenchmarkAxes): number {
  const mean =
    (axes.tls + axes.hybridKem + axes.certOps + axes.quantumThreat) / 4;
  return Math.round(mean);
}

// --- 메인 -----------------------------------------------------------------

function main(): void {
  const rawText = readFileSync(SOURCE, 'utf-8');
  const raw = JSON.parse(rawText) as RawFile;

  const domains: BenchmarkDomain[] = raw.domains.map((d) => {
    const axes: BenchmarkAxes = {
      tls: d.scores.tls.value,
      hybridKem: d.scores.hybridKem.value,
      certOps: d.scores.certOps.value,
      quantumThreat: d.scores.quantumThreat.value,
    };
    return {
      hostname: toHostname(d.url),
      name: d.name,
      sector: d.sector,
      axes,
      overall: computeOverall(axes),
    };
  });

  const out: BenchmarkFile = {
    version: '1.0.0',
    generatedFrom: 'public/data/domains.json',
    domains,
  };

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n', 'utf-8');

  // eslint-disable-next-line no-console
  console.log(
    `benchmark.json written: ${out.domains.length} domains → ${OUT}`,
  );
}

main();
