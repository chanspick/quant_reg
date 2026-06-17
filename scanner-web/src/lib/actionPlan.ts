/**
 * SPEC-PQC-003 §3.2 / REQ-CP (⑦ 우선순위 액션플랜) — 클라이언트 파생.
 *
 * fired tls/certOps 룰 id → 단계별(즉시/단기/중기) 액션 정적 매핑.
 * execSummary = narrative?.text (없으면 undefined → 요약부 unmount, INTEG-3).
 *
 * 룰 id 는 scoring.py `_TLS_RULES` / `_CERTOPS_RULES` 의 id 와 정확히 일치.
 * 순수 함수 — 응답 스키마 무변경 (INTEG-2/7). 16-룰 ROOT 스크립트 재사용 불가 → 신규 작성(§1.2).
 */

import type { ScanResponse } from '@/data/schema';

export type Difficulty = 'low' | 'med' | 'high';
export type Impact = 'low' | 'med' | 'high';
export type ActionStage = 'immediate' | 'shortTerm' | 'midTerm';

export interface ActionItem {
  title: string;
  difficulty: Difficulty;
  impact: Impact;
  standardRef: string;
}

export interface ActionPlan {
  immediate: ActionItem[];
  shortTerm: ActionItem[];
  midTerm: ActionItem[];
  execSummary?: string;
}

interface ActionTableEntry {
  stage: ActionStage;
  item: ActionItem;
}

/**
 * 룰 id → 단계별 액션. 작지만 의미 있는 표 (§1.2).
 * 같은 단계 중복 액션은 dedupe (title 기준).
 */
const ACTION_TABLE: Record<string, ActionTableEntry> = {
  // --- TLS 룰 ---
  tls_1_0_active: {
    stage: 'immediate',
    item: {
      title: 'TLS 1.0 비활성화 (TLS 1.2+ 만 허용)',
      difficulty: 'low',
      impact: 'high',
      standardRef: 'RFC 8996 / Mozilla SSL Config v6.0',
    },
  },
  tls_1_1_active: {
    stage: 'immediate',
    item: {
      title: 'TLS 1.1 비활성화 (TLS 1.2+ 만 허용)',
      difficulty: 'low',
      impact: 'high',
      standardRef: 'RFC 8996 / Mozilla SSL Config v6.0',
    },
  },
  tls_1_3_missing: {
    stage: 'shortTerm',
    item: {
      title: 'TLS 1.3 활성화 (forward secrecy·0-RTT 기본)',
      difficulty: 'med',
      impact: 'high',
      standardRef: 'Mozilla intermediate v6.0 / NIST SP 800-52r2',
    },
  },
  tls_1_2_missing: {
    stage: 'immediate',
    item: {
      title: 'TLS 1.2 활성화 (최소 권고 버전)',
      difficulty: 'low',
      impact: 'high',
      standardRef: 'Mozilla intermediate v6.0 minimum',
    },
  },
  compression: {
    stage: 'immediate',
    item: {
      title: 'TLS Compression 비활성화 (CRIME 차단)',
      difficulty: 'low',
      impact: 'med',
      standardRef: 'OWASP TLS Cheat Sheet',
    },
  },
  fallback_scsv: {
    stage: 'shortTerm',
    item: {
      title: 'TLS_FALLBACK_SCSV 활성화 (다운그레이드 방어)',
      difficulty: 'low',
      impact: 'low',
      standardRef: 'OWASP TLS Cheat Sheet',
    },
  },
  heartbleed: {
    stage: 'immediate',
    item: {
      title: 'OpenSSL 즉시 패치 (Heartbleed 차단)',
      difficulty: 'med',
      impact: 'high',
      standardRef: 'CVE-2014-0160',
    },
  },
  robot: {
    stage: 'immediate',
    item: {
      title: 'RSA key transport cipher 비활성화 (ROBOT 차단)',
      difficulty: 'med',
      impact: 'high',
      standardRef: 'ROBOT attack 2017',
    },
  },
  ccs_injection: {
    stage: 'immediate',
    item: {
      title: 'OpenSSL 패치 (CCS Injection 차단)',
      difficulty: 'med',
      impact: 'high',
      standardRef: 'CVE-2014-0224',
    },
  },
  insecure_reneg: {
    stage: 'shortTerm',
    item: {
      title: 'Secure Renegotiation 강제 (불안전 재협상 차단)',
      difficulty: 'med',
      impact: 'med',
      standardRef: 'CVE-2009-3555',
    },
  },
  // --- CertOps 룰 ---
  expired: {
    stage: 'immediate',
    item: {
      title: '만료된 인증서 즉시 재발급',
      difficulty: 'low',
      impact: 'high',
      standardRef: '운영 위생',
    },
  },
  expiring_soon: {
    stage: 'immediate',
    item: {
      title: '만료 임박 인증서 갱신 (≤30일)',
      difficulty: 'low',
      impact: 'high',
      standardRef: '운영 위생',
    },
  },
  lifetime_too_long: {
    stage: 'shortTerm',
    item: {
      title: '인증서 수명 366일 이하로 단축 + 자동 갱신',
      difficulty: 'med',
      impact: 'med',
      standardRef: 'Mozilla SSL Config v6.0 (max 366d)',
    },
  },
  chain_sha1: {
    stage: 'shortTerm',
    item: {
      title: '체인 SHA-256+ 서명으로 재발급 (SHA-1 제거)',
      difficulty: 'med',
      impact: 'high',
      standardRef: 'OWASP / NIST SHA-1 폐기',
    },
  },
  leaf_sha1: {
    stage: 'shortTerm',
    item: {
      title: 'Leaf 인증서 SHA-256+ 서명으로 재발급',
      difficulty: 'med',
      impact: 'high',
      standardRef: 'OWASP / NIST SHA-1 폐기',
    },
  },
  leaf_md5: {
    stage: 'immediate',
    item: {
      title: 'MD5 서명 인증서 즉시 재발급',
      difficulty: 'med',
      impact: 'high',
      standardRef: 'OWASP must-not',
    },
  },
  chain_incomplete: {
    stage: 'shortTerm',
    item: {
      title: '중간 인증서 포함하여 체인 완성',
      difficulty: 'low',
      impact: 'med',
      standardRef: 'TLS 신뢰 체인',
    },
  },
  chain_too_long: {
    stage: 'midTerm',
    item: {
      title: '인증서 체인 길이 최적화 (≤4)',
      difficulty: 'low',
      impact: 'low',
      standardRef: '성능 / 위생',
    },
  },
  ocsp_missing: {
    stage: 'shortTerm',
    item: {
      title: 'OCSP Stapling 활성화 (폐기 확인 지연 완화)',
      difficulty: 'med',
      impact: 'med',
      standardRef: 'Mozilla recommended',
    },
  },
  rsa_weak: {
    stage: 'immediate',
    item: {
      title: 'RSA-2048+ 또는 ECC P-256+ 로 키 교체',
      difficulty: 'med',
      impact: 'high',
      standardRef: 'Mozilla intermediate minimum',
    },
  },
  ecc_nonstandard: {
    stage: 'midTerm',
    item: {
      title: '표준 ECDH 곡선으로 전환 (X25519/P-256/P-384)',
      difficulty: 'med',
      impact: 'low',
      standardRef: 'Mozilla intermediate v6.0 ECDH curves',
    },
  },
};

/**
 * PQC 전환 권고 — fired 룰과 무관하게, X25519MLKEM768 미관측이면 중기 액션으로 추가.
 * hybridKem 축에 fired 룰이 없으므로(value+basis) 정적 추가가 필요(§1.2).
 */
const PQC_ENABLE_ACTION: ActionItem = {
  title: 'X25519MLKEM768 하이브리드 KEM 활성화 (PQC 전환 착수)',
  difficulty: 'high',
  impact: 'high',
  standardRef: 'Mozilla v6.0 / draft-ietf-tls-ecdhe-mlkem / NIST FIPS 203',
};
const PQC_ROADMAP_ACTION: ActionItem = {
  title: 'PQC 마이그레이션 로드맵 수립 (CBOM·암호 인벤토리)',
  difficulty: 'high',
  impact: 'high',
  standardRef: 'NIST IR 8547 / FIPS 203·204·205',
};

/** hybridKem 점수가 PQC 미적용 수준(<90)이면 PQC 전환을 advertise 안 한 것으로 간주. */
function pqcNotAdvertised(result: ScanResponse): boolean {
  return result.scores.hybridKem.value < 90;
}

function dedupePush(target: ActionItem[], item: ActionItem): void {
  if (!target.some((x) => x.title === item.title)) {
    target.push(item);
  }
}

/**
 * 응답 → 액션플랜. REQ-CP (⑦).
 * 모든 단계가 비어 있으면 호출부에서 ⑦ 섹션 자체 처리 (보통 PQC 액션이 있어 비지 않음).
 */
export function buildActionPlan(result: ScanResponse): ActionPlan {
  const immediate: ActionItem[] = [];
  const shortTerm: ActionItem[] = [];
  const midTerm: ActionItem[] = [];

  const firedTls = result.meta.scoring.tls.rules.filter((r) => r.fired);
  const firedCertOps = result.meta.scoring.certOps.rules.filter((r) => r.fired);

  for (const r of [...firedTls, ...firedCertOps]) {
    const entry = ACTION_TABLE[r.id];
    if (!entry) continue;
    switch (entry.stage) {
      case 'immediate':
        dedupePush(immediate, entry.item);
        break;
      case 'shortTerm':
        dedupePush(shortTerm, entry.item);
        break;
      case 'midTerm':
        dedupePush(midTerm, entry.item);
        break;
    }
  }

  // PQC 전환 권고 (hybridKem 축은 rules 가 없으므로 점수 기반 정적 추가).
  if (pqcNotAdvertised(result)) {
    dedupePush(shortTerm, PQC_ENABLE_ACTION);
    dedupePush(midTerm, PQC_ROADMAP_ACTION);
  }

  const execSummary =
    result.narrative && result.narrative.text.trim().length > 0
      ? result.narrative.text
      : undefined;

  return { immediate, shortTerm, midTerm, execSummary };
}
