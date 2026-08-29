// 경조 규정 판정 엔진 — PRD F1 판정 로직의 화면용 구현.
// 실제 시스템에서는 서버에서 판정하고 스냅샷을 불변 저장한다.
import {
  LEGAL_WREATH_LIMIT,
  WREATH_PRODUCTS,
  findEventType,
  findVenue,
} from "./mock-data";
import { dataOf, findBudget, findEmployee, findRecipient } from "./tenant-data";
import { DEFAULT_TENANT_ID, findTenant, rulesOf } from "./tenants";
import {
  RANK_TIER_LABEL,
  REGIME_LABEL,
  type AccountCode,
  type DecisionSnapshot,
  type ExecutionDecision,
  type PolicyDecision,
  type PolicyFlag,
  type PolicyRule,
  type RankTier,
  type Regime,
  type RequestDraft,
  type WreathProduct,
} from "./types";

const EXEC_RANKS = ["대표", "부사장", "전무", "상무", "이사"];
const SENIOR_RANKS = ["수석", "책임", "선임"];

export function rankTierOf(rank: string): RankTier {
  if (EXEC_RANKS.some((r) => rank.includes(r))) return "EXEC";
  if (SENIOR_RANKS.some((r) => rank.includes(r))) return "SENIOR";
  return "STAFF";
}

function fmt(won: number | null) {
  if (won === null) return "미산출";
  return `${won.toLocaleString("ko-KR")}원`;
}

/** 1. 수신자 레짐 판정 */
function resolveRegime(
  draft: RequestDraft,
  tenantId: string
): { regime: Regime; basis: string } {
  if (draft.targetKind === "EMPLOYEE") {
    return {
      regime: "R4",
      basis: "자사 임직원 — 사내 경조 규정 적용, 대외 규제 미적용",
    };
  }
  const recipient = findRecipient(tenantId, draft.targetId);
  if (recipient) {
    return { regime: recipient.regime, basis: recipient.basis };
  }
  return {
    regime: "UNKNOWN",
    basis: "수신자 마스터에 등록되지 않은 직접 입력 건 — 레짐 확인 불가",
  };
}

/** 2. 사내 규정 상한 산출 — 조건이 가장 구체적인 규정 한 줄을 고른다 */
function matchRule(draft: RequestDraft, tenantId: string): PolicyRule | null {
  const employee = findEmployee(tenantId, draft.targetId);
  const tier = employee ? rankTierOf(employee.rank) : null;
  const tenure = employee?.tenureMonths ?? 0;

  const candidates = rulesOf(tenantId).filter(
    (r) =>
      r.eventTypeCode === draft.eventTypeCode &&
      r.targetKind === draft.targetKind &&
      (r.rankTier === null || r.rankTier === tier) &&
      (draft.targetKind === "EXTERNAL" || tenure >= r.minTenureMonths)
  );

  if (candidates.length === 0) return null;

  // 직급이 지정된 규정 우선, 그다음 재직기간 조건이 엄격한 규정 우선
  return candidates.sort((a, b) => {
    if ((a.rankTier === null) !== (b.rankTier === null)) {
      return a.rankTier === null ? 1 : -1;
    }
    return b.minTenureMonths - a.minTenureMonths;
  })[0];
}

/** 동일 경조사 기발송 건수 (F9-1 이벤트키 대용) */
function findDuplicate(draft: RequestDraft, tenantId: string): number | null {
  const hits = dataOf(tenantId).sentRecords.filter(
    (r) => r.targetId === draft.targetId && r.eventTypeCode === draft.eventTypeCode
  );
  return hits.length > 0 ? hits.length : null;
}

/** 신청 초안에 대한 규정 판정 (상품 선택 이전 단계) */
export function decidePolicy(
  draft: RequestDraft,
  applicantCostCenter: string,
  tenantId: string = DEFAULT_TENANT_ID
): PolicyDecision {
  const tenant = findTenant(tenantId);
  const { regime, basis } = resolveRegime(draft, tenantId);
  const rule = matchRule(draft, tenantId);
  const employee = findEmployee(tenantId, draft.targetId);
  const budget = findBudget(tenantId, applicantCostCenter);

  const internalLimit = rule?.wreathLimit ?? null;
  const legalLimit = regime === "R1" ? LEGAL_WREATH_LIMIT : null;
  const finalLimit =
    internalLimit === null
      ? legalLimit
      : legalLimit === null
        ? internalLimit
        : Math.min(internalLimit, legalLimit);

  const account: AccountCode = regime === "R4" ? "WELFARE" : "ENTERTAINMENT";

  const flags: PolicyFlag[] = [];

  if (regime === "UNKNOWN") {
    flags.push({
      code: "REGIME_UNKNOWN",
      label: "수신자 레짐 미확인",
      detail:
        "청탁금지법 적용 대상 여부가 확인되지 않아 자동승인 대상이 아닙니다. 총무팀 승인 후 발주됩니다.",
      tone: "warn",
    });
  }
  if (regime === "R1") {
    flags.push({
      code: "LEGAL_CAP",
      label: "청탁금지법 가액범위 적용",
      detail:
        "화환 10만원 상한이 적용되며 초과 발주는 관리자도 해제할 수 없습니다. 현금 경조금을 함께 보내는 경우 합산 10만원·현금 5만원 한도를 별도로 확인하십시오.",
      tone: "danger",
    });
  }
  if (regime === "R2") {
    flags.push({
      code: "HEALTHCARE",
      label: "보건의료인 대상 건",
      detail:
        "약사법·의료기기법상 경제적 이익 제공 규제 검토가 완료되기 전까지 자동승인 없이 승인 경로로 처리됩니다.",
      tone: "warn",
    });
  }
  if (!rule) {
    flags.push({
      code: "NO_RULE",
      label: "규정에 정의되지 않은 경조 유형",
      detail:
        "현재 사내 규정표에 해당 조건이 없어 승인권자 판단이 필요합니다. 처리 후 규정 추가가 제안됩니다.",
      tone: "warn",
    });
  }

  const duplicate = findDuplicate(draft, tenantId);
  if (duplicate) {
    flags.push({
      code: "DUPLICATE",
      label: "동일 경조사 기발송 건 존재",
      detail: `동일 경조사에 기발송 건이 있습니다(${duplicate}건). 그대로 진행하면 사유 기록 후 승인 경로로 전환됩니다.`,
      tone: "warn",
    });
  }

  const venue = findVenue(draft.venueId);
  if (venue?.wreathAllowed === false) {
    flags.push({
      code: "VENUE_BLOCKED",
      label: "화환 반입 거부 장소",
      detail: `${venue.restrictionReason ?? "반입 불가"} — 쌀화환·조화 바구니 등 대체 상품을 권장합니다.`,
      tone: "danger",
    });
  }
  if (draft.venueUndecided) {
    flags.push({
      code: "VENUE_PENDING",
      label: "빈소 미정",
      detail:
        "빈소가 확정될 때까지 발주가 보류되며, 장소 입력 즉시 자동 재개됩니다.",
      tone: "info",
    });
  }

  const conditions = [
    {
      label: "경조 유형",
      value: findEventType(draft.eventTypeCode)?.label ?? "미선택",
    },
    {
      label: "대상 구분",
      value: draft.targetKind === "EMPLOYEE" ? "자사 임직원" : "거래처 · 외부",
    },
    {
      label: "직급 등급",
      value: employee
        ? `${RANK_TIER_LABEL[rankTierOf(employee.rank)]} (${employee.rank})`
        : "해당 없음",
    },
    {
      label: "재직 기간",
      value: employee
        ? `${Math.floor(employee.tenureMonths / 12)}년 ${employee.tenureMonths % 12}개월`
        : "해당 없음",
    },
    {
      label: "수신자 레짐",
      value:
        regime === "UNKNOWN" ? "미확인" : `${regime} · ${REGIME_LABEL[regime]}`,
    },
  ];

  const limitFormula =
    legalLimit === null
      ? `사내 규정 상한 ${fmt(internalLimit)} (규정 ${rule?.id ?? "해당 없음"})`
      : `MIN(사내 ${fmt(internalLimit)}, 법정 ${fmt(legalLimit)}) = ${fmt(finalLimit)}`;

  const snapshot: DecisionSnapshot = {
    policyVersion: `${tenant.name} ${tenant.policyVersion}`,
    policyApprovedAt: tenant.policyApprovedAt,
    policyApprovedBy: tenant.policyApprovedBy,
    matchedRuleId: rule?.id ?? null,
    conditions,
    limitFormula,
    regimeBasis: basis,
    decidedAt: "판정 시각은 발주 시점에 확정됩니다",
  };

  const autoApprovable =
    regime !== "UNKNOWN" &&
    regime !== "R2" &&
    Boolean(rule) &&
    !duplicate &&
    !draft.venueUndecided;

  return {
    regime,
    internalLimit,
    legalLimit,
    finalLimit,
    grade: rule?.grade ?? null,
    account,
    budget,
    autoApprovable,
    flags,
    snapshot,
  };
}

/** 상품 추천 — 규정 등급 매칭 상품을 기본값으로 제시 (F3-1) */
export function recommendProducts(
  decision: PolicyDecision,
  draft: RequestDraft
): { products: WreathProduct[]; defaultId: string | null } {
  const venue = findVenue(draft.venueId);
  const venueBlocked = venue?.wreathAllowed === false;

  // 반입 거부 장소면 대체 상품을 앞에 세운다
  const products = [...WREATH_PRODUCTS].sort((a, b) => {
    if (a.kind !== b.kind) {
      if (venueBlocked) return a.kind === "ALT" ? -1 : 1;
      return a.kind === "WREATH" ? -1 : 1;
    }
    return b.price - a.price;
  });

  const preferredKind = venueBlocked ? "ALT" : "WREATH";
  const withinLimit = products.filter(
    (p) =>
      p.kind === preferredKind &&
      (decision.finalLimit === null || p.price <= decision.finalLimit)
  );

  const byGrade = withinLimit.find((p) => p.grade === decision.grade);
  const defaultId = byGrade?.id ?? withinLimit[0]?.id ?? null;

  return { products, defaultId };
}

/** 상품 선택까지 반영한 최종 실행 판정 (F1 판정 로직 5단계) */
export function decideExecution(
  decision: PolicyDecision,
  product: WreathProduct | null
): ExecutionDecision {
  if (!product) {
    return {
      result: "NEED_APPROVAL",
      reasons: [
        {
          code: "NO_PRODUCT",
          label: "상품 미선택",
          detail: "발송할 상품을 선택해 주세요.",
          tone: "warn",
        },
      ],
    };
  }

  // 법정 하드리밋 초과 — 관리자도 해제 불가, 시도 로그 기록
  if (decision.legalLimit !== null && product.price > decision.legalLimit) {
    return {
      result: "BLOCKED",
      reasons: [
        {
          code: "LEGAL_BLOCK",
          label: "법정 상한 초과로 발주가 차단되었습니다",
          detail: `청탁금지법 적용 대상 수신자에게는 ${fmt(decision.legalLimit)}을 초과하는 화환을 발주할 수 없습니다. 이 시도는 통제 리포트에 기록됩니다.`,
          tone: "danger",
        },
      ],
    };
  }

  const reasons: PolicyFlag[] = [];

  if (decision.internalLimit !== null && product.price > decision.internalLimit) {
    reasons.push({
      code: "OVER_INTERNAL",
      label: "사내 규정 상한 초과",
      detail: `사내 상한 ${fmt(decision.internalLimit)}을 ${fmt(
        product.price - decision.internalLimit
      )} 초과하여 자동승인 대상에서 제외됩니다.`,
      tone: "warn",
    });
  }

  const remaining = decision.budget.allocated - decision.budget.used;
  if (product.price > remaining) {
    reasons.push({
      code: "OVER_BUDGET",
      label: "부서 예산 잔액 부족",
      detail: `${decision.budget.deptName} 잔액 ${fmt(remaining)} 대비 ${fmt(
        product.price - remaining
      )} 초과합니다. 예산관리자 승인선이 추가됩니다.`,
      tone: "warn",
    });
  }

  reasons.push(...decision.flags.filter((f) => f.code !== "LEGAL_CAP"));

  // 안내성(info) 플래그는 표시만 하고 자동승인 판정에는 관여하지 않는다
  const blocking = reasons.filter((f) => f.tone !== "info");
  const result =
    decision.autoApprovable && blocking.length === 0
      ? "AUTO_APPROVE"
      : "NEED_APPROVAL";

  return { result, reasons };
}
