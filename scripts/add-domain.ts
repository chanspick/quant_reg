#!/usr/bin/env node
/**
 * 도메인 추가 CLI (SPEC-PQC-001 §3.4 / §3.14).
 *
 * 사용법: `pnpm add-domain`
 *
 * 흐름:
 *   1) 필수 필드(이름·URL·섹터·키 알고리즘 등)를 대화식 prompt 로 수집
 *   2) `summarizeQuantumThreat(algo, bits)` 로 양자 위협 정량을 자동 계산하고
 *      사용자에게 보수/실증 점수를 확인
 *   3) 분석 문구(narrative / findings / recommendations / regulatoryGaps /
 *      supplyChainNotes)는 placeholder 로 비워두거나 직접 입력 선택
 *   4) `DomainSchema.parse` 와 `DomainsEnvelopeSchema.parse` 로 두 단계 검증
 *   5) 최종 envelope 를 pretty-write 로 `public/data/domains.json` 에 기록
 */

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { confirm, input, number, select } from '@inquirer/prompts';
import { z } from 'zod';

import {
  ComplianceRefNameSchema,
  DataSourceSchema,
  DomainSchema,
  DomainsEnvelopeSchema,
  HybridStatusSchema,
  KeyAlgorithmSchema,
  KeyExchangeStatusSchema,
  MaturityStatusSchema,
  RenewalStatusSchema,
  SectorSchema,
} from '../src/data/schema';
import type {
  ComplianceRefName,
  DataSource,
  Domain,
  KeyAlgorithm,
  RegulatoryGap,
  SourcedText,
} from '../src/data/schema';
import { summarizeQuantumThreat } from '../src/data/quantumResources';

/* ============================================================
 * 경로 / 상수
 * ============================================================ */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');
const DATA_FILE = path.join(PROJECT_ROOT, 'public', 'data', 'domains.json');

// ANSI 색상 (선택적 — 의존성 없이 plain ANSI 사용)
const COLOR = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
};

function colorize(text: string, color: keyof typeof COLOR): string {
  // TTY 가 아니면 색상 제거
  if (!process.stdout.isTTY) return text;
  return `${COLOR[color]}${text}${COLOR.reset}`;
}

/* ============================================================
 * Helper: 한국어 분석 문구 placeholder
 * ============================================================ */

const PLACEHOLDER_NARRATIVE: SourcedText = {
  text: 'TODO: 분석 문구를 작성하세요.',
  source: 'llm-only',
};
const PLACEHOLDER_SUPPLY_CHAIN: SourcedText = {
  text: 'TODO: 공급망 메모를 작성하세요.',
  source: 'manual',
};

/* ============================================================
 * Helper: enum 옵션을 inquirer select 모양으로 변환
 * ============================================================ */

function enumChoices<T extends string>(schema: z.ZodEnum<[T, ...T[]]>) {
  return schema.options.map((value) => ({ name: value, value }));
}

const SOURCE_CHOICES = enumChoices(DataSourceSchema);

/* ============================================================
 * Helper: 숫자 점수 prompt (0-100)
 * ============================================================ */

async function askScore(label: string): Promise<number> {
  const value = await number({
    message: `${label} (0-100)`,
    min: 0,
    max: 100,
    required: true,
  });
  // @inquirer/prompts number 는 required:true 면 number 반환
  return value as number;
}

/* ============================================================
 * Helper: 분석 텍스트 N개 수집 (findings / recommendations)
 * ============================================================ */

async function collectSourcedTexts(label: string): Promise<SourcedText[]> {
  const raw = await input({
    message: `${label} (콤마로 구분, 비우면 빈 배열)`,
    default: '',
  });
  const parts = raw
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  if (parts.length === 0) return [];

  const source = (await select({
    message: `${label} 출처`,
    choices: SOURCE_CHOICES,
    default: 'manual' as DataSource,
  })) as DataSource;

  return parts.map((text) => ({ text, source }));
}

/* ============================================================
 * Helper: regulatoryGaps 수집 (N개 entry, 각 entry 는 4 필드)
 * ============================================================ */

async function collectRegulatoryGaps(): Promise<RegulatoryGap[]> {
  const count = (await number({
    message: '규제 갭 항목 개수 (0 이상)',
    min: 0,
    max: 10,
    default: 0,
    required: true,
  })) as number;

  const gaps: RegulatoryGap[] = [];
  for (let i = 0; i < count; i += 1) {
    console.log(colorize(`\n  [규제 갭 ${i + 1}/${count}]`, 'dim'));
    const refName = (await select({
      message: '  참조 규정',
      choices: enumChoices(ComplianceRefNameSchema),
    })) as ComplianceRefName;
    const article = await input({
      message: '  조항 (선택, 비우면 생략)',
      default: '',
    });
    const note = await input({
      message: '  비고',
      required: true,
    });
    const source = (await select({
      message: '  출처',
      choices: SOURCE_CHOICES,
      default: 'manual' as DataSource,
    })) as DataSource;

    const entry: RegulatoryGap = { refName, note, source };
    if (article.trim().length > 0) entry.article = article.trim();
    gaps.push(entry);
  }
  return gaps;
}

/* ============================================================
 * 메인 인터랙션
 * ============================================================ */

async function loadEnvelope(): Promise<{
  lastUpdated: string;
  version: string;
  domains: Domain[];
}> {
  const raw = await readFile(DATA_FILE, 'utf-8');
  const json = JSON.parse(raw) as unknown;
  // 기존 envelope 자체는 신뢰 (도메인 배열이 비었거나 합법적인 레코드).
  const schema = z.object({
    lastUpdated: z.string(),
    version: z.string(),
    domains: z.array(z.unknown()),
  });
  const parsed = schema.parse(json);
  // 기존 도메인은 그대로 보존 (다시 검증하지 않는다 — 추가만 검증).
  return {
    lastUpdated: parsed.lastUpdated,
    version: parsed.version,
    domains: parsed.domains as Domain[],
  };
}

function todayUtcIso(): string {
  // YYYY-MM-DD UTC
  const d = new Date();
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

async function main(): Promise<void> {
  console.log(colorize('\n=== PQC 도메인 추가 CLI ===\n', 'bold'));

  const envelope = await loadEnvelope();
  console.log(
    colorize(
      `현재 envelope: lastUpdated=${envelope.lastUpdated}, version=${envelope.version}, domains=${envelope.domains.length}개\n`,
      'dim',
    ),
  );

  // 1) name
  const name = await input({
    message: '도메인 이름',
    required: true,
    validate: (v) => (v.trim().length > 0 ? true : '필수입니다.'),
  });

  // 2) url
  const url = await input({
    message: 'URL (https://...)',
    required: true,
    validate: (v) => {
      try {
        new URL(v);
        return true;
      } catch {
        return 'URL 형식이 올바르지 않습니다.';
      }
    },
  });

  // 3) sector
  const sector = (await select({
    message: '섹터',
    choices: enumChoices(SectorSchema),
  })) as z.infer<typeof SectorSchema>;

  // 4) keyAlgorithm
  const keyAlgorithm = (await select({
    message: '인증서 키 알고리즘',
    choices: enumChoices(KeyAlgorithmSchema),
  })) as KeyAlgorithm;

  // 5) keyBits
  const keyBits = (await number({
    message: '키 길이 (bits, 양의 정수)',
    min: 1,
    required: true,
    validate: (v) =>
      Number.isInteger(v) && (v as number) > 0
        ? true
        : '양의 정수만 허용됩니다.',
  })) as number;

  // 6) quantumThreatDetail 자동 계산
  const quantumThreatDetail = summarizeQuantumThreat(keyAlgorithm, keyBits);
  console.log(
    colorize('\n[자동 계산] 양자 위협 정량 (Roetteler 2017 + Willsch 2023)', 'cyan'),
  );
  console.log(
    `  conservative: ${colorize(
      String(quantumThreatDetail.estimates.conservative.score),
      'green',
    )} / 100 (logicalQubits=${quantumThreatDetail.estimates.conservative.logicalQubits}, successRate=${quantumThreatDetail.estimates.conservative.successRate})`,
  );
  console.log(
    `  empirical   : ${colorize(
      String(quantumThreatDetail.estimates.empirical.score),
      'green',
    )} / 100 (successRate=${quantumThreatDetail.estimates.empirical.successRate})`,
  );
  const ok = await confirm({
    message: '이 양자 위협 점수를 사용하시겠습니까?',
    default: true,
  });
  if (!ok) {
    console.log(colorize('취소되었습니다.', 'yellow'));
    return;
  }

  // 7-10) 4축 점수 (quantumThreat 은 자동)
  console.log(colorize('\n[4축 점수 입력]', 'cyan'));
  const tls = await askScore('tls');
  const hybridKem = await askScore('hybridKem');
  const certOps = await askScore('certOps');
  const quantumThreatScore = quantumThreatDetail.estimates.empirical.score;
  console.log(
    colorize(
      `  scores.quantumThreat.value = ${quantumThreatScore} (자동, empirical 점수)`,
      'dim',
    ),
  );

  // 11-12) 인증서 메타
  console.log(colorize('\n[인증서 정보]', 'cyan'));
  const renewal = (await select({
    message: '인증서 갱신 상태',
    choices: enumChoices(RenewalStatusSchema),
  })) as z.infer<typeof RenewalStatusSchema>;
  const ca = await input({
    message: '발급 CA',
    required: true,
  });
  const chain = await input({
    message: '인증서 체인 (선택, 비우면 생략)',
    default: '',
  });

  // 13-15) PQC 상태
  console.log(colorize('\n[PQC 상태]', 'cyan'));
  const pqcKeyExchange = (await select({
    message: 'PQC 키 교환 상태',
    choices: enumChoices(KeyExchangeStatusSchema),
  })) as z.infer<typeof KeyExchangeStatusSchema>;
  const pqcHybrid = (await select({
    message: 'PQC 하이브리드 상태',
    choices: enumChoices(HybridStatusSchema),
  })) as z.infer<typeof HybridStatusSchema>;
  const pqcMaturity = (await select({
    message: 'PQC 성숙도',
    choices: enumChoices(MaturityStatusSchema),
  })) as z.infer<typeof MaturityStatusSchema>;

  // 16) 분석 필드 — 스킵 옵션
  console.log(colorize('\n[분석 필드]', 'cyan'));
  const fillAnalytical = await confirm({
    message:
      '분석 문구 (narrative / findings / recommendations / regulatoryGaps / supplyChainNotes) 를 지금 입력하시겠습니까? (No 선택 시 placeholder 사용)',
    default: false,
  });

  let narrative: SourcedText = PLACEHOLDER_NARRATIVE;
  let supplyChainNotes: SourcedText = PLACEHOLDER_SUPPLY_CHAIN;
  let findings: SourcedText[] = [];
  let recommendations: SourcedText[] = [];
  let regulatoryGaps: RegulatoryGap[] = [];

  if (fillAnalytical) {
    const narrativeText = await input({
      message: 'narrative 텍스트',
      required: true,
    });
    const narrativeSource = (await select({
      message: 'narrative 출처',
      choices: SOURCE_CHOICES,
      default: 'llm+verified' as DataSource,
    })) as DataSource;
    narrative = { text: narrativeText, source: narrativeSource };

    findings = await collectSourcedTexts('findings');
    recommendations = await collectSourcedTexts('recommendations');
    regulatoryGaps = await collectRegulatoryGaps();

    const supplyText = await input({
      message: 'supplyChainNotes 텍스트',
      required: true,
    });
    const supplySource = (await select({
      message: 'supplyChainNotes 출처',
      choices: SOURCE_CHOICES,
      default: 'manual' as DataSource,
    })) as DataSource;
    supplyChainNotes = { text: supplyText, source: supplySource };
  }

  // 새 레코드 조립
  const newRecord: Domain = {
    name: name.trim(),
    url: url.trim(),
    sector,
    scores: {
      tls: { value: tls, source: 'automated' },
      hybridKem: { value: hybridKem, source: 'automated' },
      certOps: { value: certOps, source: 'automated' },
      quantumThreat: { value: quantumThreatScore, source: 'automated' },
    },
    certificate: {
      renewal,
      ca: ca.trim(),
      keyAlgorithm,
      keyBits,
      ...(chain.trim().length > 0 ? { chain: chain.trim() } : {}),
    },
    pqc: {
      keyExchange: pqcKeyExchange,
      hybrid: pqcHybrid,
      maturity: pqcMaturity,
    },
    regulatoryGaps,
    findings,
    recommendations,
    narrative,
    supplyChainNotes,
    quantumThreatDetail,
  };

  // 1단계 검증: 단일 레코드
  try {
    DomainSchema.parse(newRecord);
  } catch (err) {
    console.error(colorize('\n[검증 실패] DomainSchema:', 'red'));
    if (err instanceof z.ZodError) {
      for (const issue of err.issues) {
        console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
      }
    } else {
      console.error(err);
    }
    process.exitCode = 1;
    return;
  }

  // 요약 출력
  console.log(colorize('\n[요약]', 'bold'));
  console.log(`  이름  : ${newRecord.name}`);
  console.log(`  URL   : ${newRecord.url}`);
  console.log(`  섹터  : ${newRecord.sector}`);
  console.log(
    `  점수  : tls=${tls}, hybridKem=${hybridKem}, certOps=${certOps}, quantumThreat=${quantumThreatScore}`,
  );
  console.log(`  키    : ${keyAlgorithm}-${keyBits}`);

  const proceed = await confirm({
    message: '위 내용으로 저장하시겠습니까?',
    default: true,
  });
  if (!proceed) {
    console.log(colorize('저장 취소.', 'yellow'));
    return;
  }

  // 2단계 검증: envelope 통째로
  const nextEnvelope = {
    lastUpdated: todayUtcIso(),
    version: envelope.version,
    domains: [...envelope.domains, newRecord],
  };
  try {
    DomainsEnvelopeSchema.parse(nextEnvelope);
  } catch (err) {
    console.error(colorize('\n[검증 실패] DomainsEnvelopeSchema:', 'red'));
    if (err instanceof z.ZodError) {
      for (const issue of err.issues) {
        console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
      }
    } else {
      console.error(err);
    }
    process.exitCode = 1;
    return;
  }

  // 디스크 기록
  const beforeCount = envelope.domains.length;
  const afterCount = nextEnvelope.domains.length;
  await writeFile(
    DATA_FILE,
    `${JSON.stringify(nextEnvelope, null, 2)}\n`,
    'utf-8',
  );

  console.log(
    colorize(
      `\n[저장 완료] 도메인 ${beforeCount} → ${afterCount}개 (저장됨)`,
      'green',
    ),
  );
  console.log(colorize(`  파일: ${DATA_FILE}`, 'dim'));
  console.log(colorize(`  lastUpdated 자동 갱신: ${nextEnvelope.lastUpdated}`, 'dim'));
}

// ESM 환경에서 직접 실행 시에만 main() 호출
const isDirectRun = (() => {
  const entryArg = process.argv[1];
  if (!entryArg) return false;
  try {
    const entryUrl = new URL(`file://${path.resolve(entryArg)}`).href;
    return import.meta.url === entryUrl;
  } catch {
    return false;
  }
})();

if (isDirectRun) {
  main().catch((err: unknown) => {
    // inquirer 가 SIGINT(Ctrl+C) 를 throw 하므로 친절한 메시지로 종료
    if (
      err instanceof Error &&
      (err.name === 'ExitPromptError' || err.message.includes('User force closed'))
    ) {
      console.log(colorize('\n중단되었습니다.', 'yellow'));
      process.exit(130);
    }
    console.error(colorize('\n[오류]', 'red'), err);
    process.exit(1);
  });
}

// 테스트용 export (dry-run / smoke test 에서 import 가능)
export { main, loadEnvelope, todayUtcIso };
