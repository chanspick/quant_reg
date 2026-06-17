#!/usr/bin/env node
/**
 * quantumThreatDetail 재생성 (SPEC-PQC-001 §3.14).
 *
 * 귀속 교정(2026-06-17) 이후, 각 도메인의 `quantumThreatDetail` 을
 * `summarizeQuantumThreat(keyAlgorithm, keyBits)` 결과로 다시 채운다.
 *   - citations / basis / note 문자열만 갱신된다 (숫자·점수 로직 불변).
 *   - 그 외 모든 필드(scores / certificate / pqc / findings / ... )와
 *     envelope (lastUpdated / version / domains 순서)는 그대로 보존한다.
 *
 * 사용:
 *   pnpm tsx scripts/regenerate-quantum-threat.ts
 *
 * 출력 형식: 2-space JSON indent + trailing newline (add-domain.ts 와 동일).
 */

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { z } from 'zod';

import { summarizeQuantumThreat } from '../src/data/quantumResources';
import type { KeyAlgorithm } from '../src/data/quantumResources';

/* ============================================================
 * 경로 / 상수
 * ============================================================ */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');
const DATA_FILE = path.join(PROJECT_ROOT, 'public', 'data', 'domains.json');

/* ============================================================
 * Envelope 읽기 — 기존 도메인은 그대로 보존(재검증하지 않음).
 * ============================================================ */

interface DomainRecord {
  certificate: { keyAlgorithm: string; keyBits: number };
  quantumThreatDetail: unknown;
  [key: string]: unknown;
}

interface Envelope {
  lastUpdated: string;
  version: string;
  domains: DomainRecord[];
  [key: string]: unknown;
}

async function loadEnvelope(): Promise<Envelope> {
  const raw = await readFile(DATA_FILE, 'utf-8');
  const json = JSON.parse(raw) as unknown;
  const shape = z.object({
    lastUpdated: z.string(),
    version: z.string(),
    domains: z.array(z.unknown()),
  });
  shape.parse(json); // envelope 골격 검증 (도메인 내부는 보존)
  return json as Envelope;
}

/* ============================================================
 * Main
 * ============================================================ */

async function main(): Promise<void> {
  const envelope = await loadEnvelope();

  let updated = 0;
  for (const domain of envelope.domains) {
    const algo = domain.certificate.keyAlgorithm as KeyAlgorithm;
    const bits = domain.certificate.keyBits;
    domain.quantumThreatDetail = summarizeQuantumThreat(algo, bits);
    updated += 1;
  }

  await writeFile(DATA_FILE, `${JSON.stringify(envelope, null, 2)}\n`, 'utf-8');

  console.log(
    `[regenerate-quantum-threat] ${updated}/${envelope.domains.length} domains 의 quantumThreatDetail 재생성 완료`,
  );
  console.log(`  파일: ${DATA_FILE}`);
}

main().catch((err: unknown) => {
  console.error('[regenerate-quantum-threat] 오류:', err);
  process.exit(1);
});
