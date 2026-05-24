#!/usr/bin/env node
/**
 * Mechanical mapping: domains.json features → recommendations 배열.
 *
 * 각 도메인의 findings 텍스트 + certificate/pqc enum 을 읽어 표준 인용
 * (RFC 8996 / Mozilla SSL Config v6.0 / OWASP / NIST PQC) 이 박힌 권고를
 * deterministic 하게 derive 한다. LLM·수동 추론 없으므로 source='automated'.
 *
 * 정직성 컨셉 (SPEC §3.4 REQ-SCH-006):
 *   - findings 와 짝지어 "진단 → 처방" 1:1 매핑
 *   - 표준 인용 출처가 룰 안에 박혀있어 ordering-only 가 아닌 절대 근거 있음
 *   - 중복 방지 — 기존 recommendations 와 같은 텍스트는 추가 안 함
 *
 * 사용:
 *   pnpm regenerate-recommendations          # 47개 in-place 갱신
 *   pnpm regenerate-recommendations --dry    # 변경 사항만 출력, 파일 미수정
 */
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  DomainsEnvelopeSchema,
  type Domain,
  type SourcedText,
} from '../src/data/schema';

/* ============================================================
 * 경로
 * ============================================================ */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');
const DATA_FILE = path.join(PROJECT_ROOT, 'public', 'data', 'domains.json');

/* ============================================================
 * 룰 정의 — finding 텍스트 패턴 또는 enum 매칭 → 권고 텍스트
 *
 * 각 룰의 `text` 끝에는 표준 인용을 명시한다 — Methodology 페이지의 정직성과 호환.
 * ============================================================ */

interface RecRule {
  id: string;
  /** 도메인 1개에 룰이 적용되는지 평가. true 면 `text` 가 권고로 추가됨. */
  matches: (d: Domain, findingTexts: string[]) => boolean;
  text: string;
}

const RULES: readonly RecRule[] = [
  {
    id: 'tls_1_0_or_1_1',
    matches: (_d, findings) =>
      findings.some((t) => /TLS 1\.0 활성|TLS 1\.1 활성/.test(t)),
    text: 'TLS 1.0 / 1.1 비활성화 후 TLS 1.2+ 만 허용 (RFC 8996, Mozilla SSL Config v6.0 intermediate).',
  },
  {
    id: 'tls_1_3_missing',
    matches: (_d, findings) =>
      findings.some((t) => /TLS 1\.3 미지원/.test(t)),
    text: 'TLS 1.3 활성화 — 최신 cipher suite·0-RTT·forward secrecy 기본 지원 (Mozilla intermediate v6.0).',
  },
  {
    id: 'cbc_ciphers',
    matches: (_d, findings) =>
      findings.some((t) => /CBC 모드 cipher/.test(t)),
    text: 'TLS 1.2 cipher suite 를 AEAD (AES-GCM, ChaCha20-Poly1305) 만 허용하도록 제한 (OWASP TLS Cheat Sheet, Mozilla intermediate).',
  },
  {
    id: 'non_ecdhe',
    matches: (_d, findings) =>
      findings.some((t) => /Non-ECDHE\/DHE cipher/.test(t)),
    text: 'Forward Secrecy 미적용 cipher (RSA key transport 등) 제거, ECDHE/DHE 기반 cipher 만 허용 (Mozilla v6.0).',
  },
  {
    id: 'compression_crime',
    matches: (_d, findings) =>
      findings.some((t) => /TLS Compression 활성/.test(t)),
    text: 'TLS Compression 비활성화 — CRIME 공격 차단 (OWASP must-disable).',
  },
  {
    id: 'heartbleed',
    matches: (_d, findings) =>
      findings.some((t) => /Heartbleed/.test(t)),
    text: 'OpenSSL 즉시 패치 — Heartbleed (CVE-2014-0160) 영향 차단.',
  },
  {
    id: 'robot',
    matches: (_d, findings) => findings.some((t) => /ROBOT/.test(t)),
    text: 'RSA key transport cipher 비활성화 — ROBOT 공격 (2017) 차단. PFS cipher 만 허용.',
  },
  {
    id: 'chain_sha1',
    matches: (_d, findings) =>
      findings.some((t) => /체인에 SHA-1/.test(t)),
    text: '인증서 체인을 SHA-256 이상 서명으로 재발급 — SHA-1 은 OWASP·NIST 폐기 (TLS 신뢰 저하).',
  },
  {
    id: 'ocsp_missing',
    matches: (_d, findings) =>
      findings.some((t) => /OCSP Stapling 미설정/.test(t)),
    text: 'OCSP Stapling 활성화 — 인증서 폐기 확인 지연 완화 및 프라이버시 보호 (Mozilla recommended).',
  },
  {
    id: 'ocsp_untrusted',
    matches: (_d, findings) =>
      findings.some((t) => /OCSP Stapling 응답이 신뢰되지 않음/.test(t)),
    text: 'OCSP responder URL 및 인증서 신뢰 체인 점검 — stapled response 검증 실패 원인 분석.',
  },
  {
    id: 'rsa_weak',
    matches: (_d, findings) =>
      findings.some((t) => /^RSA 키 \d+ bit/.test(t)),
    text: 'RSA-2048 이상 또는 ECC P-256 이상으로 키 교체 — Mozilla minimum 요구.',
  },
  {
    id: 'pqc_not_advertised',
    // Phase 2 SUPPORTED 도메인은 이미 X25519MLKEM768 활성화되어 있으므로 제외.
    // findings 텍스트는 Phase 1 잔재가 남아있을 수 있어 enum 으로 정확히 판별.
    matches: (d) =>
      d.pqc.keyExchange === '미지원' || d.pqc.keyExchange === '미설정',
    text: 'X25519MLKEM768 (0x11EC) 협상 활성화 검토 — Mozilla SSL Config v6.0 intermediate 등재, draft-ietf-tls-ecdhe-mlkem 표준화 진행 중. CDN/load balancer 단에서 우선 시범 적용 권장.',
  },
  {
    id: 'phase2_blocked',
    matches: (_d, findings) =>
      findings.some((t) => /Phase 2 직접 TLS 1\.3 probe 차단/.test(t)),
    text: '외부 TLS 1.3 직접 probe 차단 정책 재검토 — 보안 감사·PQC 전환 평가·CT log 모니터링이 외부에서 검증 불가능해짐.',
  },
  {
    // Phase 2 SUPPORTED 도메인은 이미 PQC 시작한 것이므로 'unstarted' fact 와 충돌.
    // keyExchange === '활성화' 인 도메인은 pqc_supported_followup 권고로만 다루고
    // 본 룰에서 제외해 권고 모순(로드맵 수립 ↔ 운영 안정화) 회피.
    id: 'pqc_roadmap_required',
    matches: (d) =>
      (d.pqc.maturity === '준비 미착수' || d.pqc.maturity === '전환 미실시') &&
      d.pqc.keyExchange !== '활성화',
    text: 'PQC 전환 로드맵 수립 — NIST PQC 표준 FIPS 203 (ML-KEM) / 204 (ML-DSA) / 205 (SLH-DSA) 기준, 김의결·안혁 2025 의 한국 적용 권고 참조.',
  },
  {
    id: 'cert_manual_renewal',
    matches: (d) => d.certificate.renewal === '수동 갱신',
    text: 'ACME 등 자동 갱신 파이프라인 도입 — 운영 위생 + 만료 임박 위험 차단 (Mozilla, Let’s Encrypt).',
  },
  {
    id: 'cert_expiring_soon',
    matches: (d) => d.certificate.renewal === '만료 임박',
    text: '인증서 즉시 갱신 + 갱신 자동화 구축 — 만료 시 서비스 중단 위험.',
  },
  {
    id: 'pqc_supported_followup',
    matches: (d) =>
      d.pqc.keyExchange === '활성화' && d.pqc.hybrid === '하이브리드',
    text: 'Hybrid KEM (X25519+ML-KEM-768) 운영 안정화 — 클라이언트 호환성 모니터링·핸드셰이크 latency 측정·PQC-only 마이그레이션 일정 수립. HNDL 위협 모델상 선도 사례.',
  },
];

/* ============================================================
 * Derive
 * ============================================================ */

function deriveRecommendations(d: Domain): SourcedText[] {
  const findingTexts = d.findings.map((f) => f.text);
  const out: SourcedText[] = [];
  for (const rule of RULES) {
    if (rule.matches(d, findingTexts)) {
      out.push({ text: rule.text, source: 'automated' });
    }
  }
  return out;
}

/**
 * 모든 룰의 텍스트 집합 — 도메인 상태가 바뀌어 더 이상 매치 안 되는 룰의 권고를
 * 자동 제거할 때 "룰 출처 권고만 건드린다" 는 판별에 사용.
 *
 * 즉 사용자가 수동으로 추가한 권고(룰 텍스트와 일치하지 않는 것) 는 영향 안 받음.
 * mechanical mapping 의 idempotent 보장 + 사용자 입력 보호 둘 다 성립.
 */
const RULE_TEXTS: ReadonlySet<string> = new Set(RULES.map((r) => r.text));

interface SyncResult {
  added: number;
  removed: number;
  kept: number;
}

/**
 * 도메인의 recommendations 를 룰 집합과 idempotent 하게 동기화.
 *
 * - 매치되는 룰 + 권고 없음 → 추가
 * - 매치 안 하는 룰 + 권고 있음 → 제거 (deprecated cleanup)
 * - 룰 외 텍스트 (사용자 수동) → 그대로 유지
 */
function syncRecommendations(d: Domain): SyncResult {
  const findingTexts = d.findings.map((f) => f.text);
  const matchingTexts = new Set(
    RULES.filter((r) => r.matches(d, findingTexts)).map((r) => r.text),
  );

  let removed = 0;
  const kept: SourcedText[] = [];
  for (const rec of d.recommendations) {
    if (RULE_TEXTS.has(rec.text)) {
      // 룰 출처 권고 — 현재 매치되는 룰만 유지
      if (matchingTexts.has(rec.text)) {
        kept.push(rec);
      } else {
        removed += 1;
      }
    } else {
      // 룰 외 텍스트 (수동 추가) — 보존
      kept.push(rec);
    }
  }

  const existingTexts = new Set(kept.map((r) => r.text));
  let added = 0;
  for (const rule of RULES) {
    if (rule.matches(d, findingTexts) && !existingTexts.has(rule.text)) {
      kept.push({ text: rule.text, source: 'automated' });
      added += 1;
    }
  }

  d.recommendations = kept;
  return { added, removed, kept: kept.length };
}

/* ============================================================
 * Main
 * ============================================================ */

interface PerDomainStat {
  name: string;
  added: number;
  removed: number;
  totalAfter: number;
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes('--dry');

  const raw = JSON.parse(await readFile(DATA_FILE, 'utf-8')) as unknown;
  const env = DomainsEnvelopeSchema.parse(raw); // 사전 검증

  const stats: PerDomainStat[] = [];
  let totalAdded = 0;
  let totalRemoved = 0;

  for (const domain of env.domains) {
    const result = syncRecommendations(domain);
    totalAdded += result.added;
    totalRemoved += result.removed;
    stats.push({
      name: domain.name,
      added: result.added,
      removed: result.removed,
      totalAfter: result.kept,
    });
  }

  // version tag 갱신
  if (!dryRun) {
    if (!env.version.includes('+recs')) {
      env.version = `${env.version}+recs`;
    }
    await writeFile(DATA_FILE, `${JSON.stringify(env, null, 2)}\n`, 'utf-8');
  }

  // 결과 출력
  console.log(
    `[regenerate-recommendations] +${totalAdded} / -${totalRemoved} across ${env.domains.length} domains` +
      (dryRun ? ' (--dry, 파일 미수정)' : ''),
  );
  console.log('');
  console.log('도메인별 변경 (변경 있는 항목만):');
  for (const s of stats) {
    if (s.added === 0 && s.removed === 0) continue;
    const tag = `+${s.added}/-${s.removed}`;
    console.log(`  ${tag.padStart(8)}  ${s.name.padEnd(20)}  → ${s.totalAfter}개`);
  }

  // 룰별 발화 통계
  console.log('');
  console.log('룰별 발화 (47개 중):');
  for (const rule of RULES) {
    const fired = env.domains.filter((d) =>
      rule.matches(d, d.findings.map((f) => f.text)),
    ).length;
    if (fired > 0) {
      console.log(`  ${String(fired).padStart(3)}  ${rule.id}`);
    }
  }
}

main().catch((err: unknown) => {
  console.error('[regenerate-recommendations] 오류:', err);
  process.exit(1);
});
