"use client";

// 발주 기록 계층 (F1-5, F1-8).
//
// 신청이 확정될 때 남기는 것은 발주 한 건이 아니라 세 가지다.
//   · condolence_order         — 무엇을 보냈는가
//   · policy_decision_snapshot — 어느 규정으로 그렇게 판정했는가 (생성 후 수정 금지)
//   · blocked_attempt          — 막힌 시도. 발주는 없지만 기록은 남는다
//
// 법정 상한 초과는 발주를 만들지 않는다. 통제가 작동했다는 증거는 발주가 아니라
// 차단 로그이므로, 이 경우 blocked_attempt 만 남기고 order_id 는 비워 둔다.
import { getSupabase } from "@/lib/supabase";
import type { ExecutionDecision, PolicyDecision } from "@/lib/types";
import { resolveTenantUuid } from "./tenant-repo";

export interface OrderInput {
  applicantName: string;
  applicantDept: string;
  targetLabel: string;
  targetOrg: string;
  eventTypeLabel: string;
  venueName: string;
  roomNo: string;
  /** 조문 예정 시각 — 비어 있으면 빈소 미정 */
  visitAt: string | null;
  productName: string;
  amount: number;
  ribbonPhrase: string;
  ribbonSender: string;
}

export interface RecordResult {
  /** 발주가 만들어졌으면 발주번호, 법정 상한 차단이면 null */
  orderId: string | null;
  blocked: boolean;
  /** 실제로 DB 에 기록됐는지 — Supabase 미설정이면 false */
  persisted: boolean;
  error: string | null;
}

/** ZC-2609-0001 — 월 단위로 번호를 매긴다 */
function orderIdFor(seq: number, now = new Date()): string {
  const yymm = `${String(now.getFullYear()).slice(2)}${String(now.getMonth() + 1).padStart(2, "0")}`;
  return `ZC-${yymm}-${String(seq).padStart(4, "0")}`;
}

const UNIQUE_VIOLATION = "23505";

/* ── 차단 로그 (F1-5) ─────────────────────────────────────── */

// 차단은 확정 화면까지 가지 않는다. 판정 화면에서 초과 상품을 고르는 순간
// 발주 버튼이 잠기므로, 시도 기록도 그 시점에 남겨야 한다.
// 같은 시도를 반복해 눌러도 로그가 부풀지 않도록 세션 단위로 한 번만 남긴다.
const BLOCKED_KEY = "zeno-cnd-blocked";

export interface BlockedInput {
  applicantName: string;
  targetLabel: string;
  regime: string;
  attempted: number;
  legalLimit: number;
}

function attemptKey(input: BlockedInput) {
  return `${input.targetLabel}|${input.attempted}|${input.legalLimit}`;
}

function loggedKeys(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.sessionStorage.getItem(BLOCKED_KEY) ?? "[]") as string[];
  } catch {
    return [];
  }
}

function markLogged(key: string) {
  if (typeof window === "undefined") return;
  try {
    const keys = loggedKeys();
    if (!keys.includes(key)) {
      window.sessionStorage.setItem(BLOCKED_KEY, JSON.stringify([...keys, key]));
    }
  } catch {
    // 중복 방지에 실패해도 기록 자체는 남아야 한다 — 막지 않는다.
  }
}

export async function recordBlockedAttempt(
  tenantKey: string,
  input: BlockedInput,
): Promise<{ persisted: boolean; error: string | null }> {
  const supabase = getSupabase();
  if (!supabase) return { persisted: false, error: null };

  const key = attemptKey(input);
  if (loggedKeys().includes(key)) return { persisted: true, error: null };

  let uuid: string;
  try {
    uuid = await resolveTenantUuid(tenantKey);
  } catch (e) {
    return { persisted: false, error: (e as Error).message };
  }

  const { error } = await supabase.from("blocked_attempt").insert({
    tenant_id: uuid,
    order_id: null,
    applicant: input.applicantName,
    target_label: input.targetLabel,
    regime: input.regime,
    attempted: input.attempted,
    legal_limit: input.legalLimit,
  });

  if (!error) markLogged(key);
  return { persisted: !error, error: error ? error.message : null };
}

export async function recordOrder(
  tenantKey: string,
  input: OrderInput,
  decision: PolicyDecision,
  execution: ExecutionDecision,
): Promise<RecordResult> {
  const blocked = execution.result === "BLOCKED";

  const supabase = getSupabase();
  if (!supabase) {
    return { orderId: null, blocked, persisted: false, error: null };
  }

  let uuid: string;
  try {
    uuid = await resolveTenantUuid(tenantKey);
  } catch (e) {
    return { orderId: null, blocked, persisted: false, error: (e as Error).message };
  }

  // 법정 상한 초과 — 발주는 만들지 않고 시도만 기록한다.
  // 보통은 판정 화면에서 이미 기록되어 여기까지 오지 않지만,
  // 차단된 초안을 들고 확정 화면으로 직접 들어오는 경로가 있어 남겨 둔다.
  if (blocked) {
    const result = await recordBlockedAttempt(tenantKey, {
      applicantName: input.applicantName,
      targetLabel: input.targetLabel,
      regime: decision.regime,
      attempted: input.amount,
      legalLimit: decision.legalLimit ?? 0,
    });
    return {
      orderId: null,
      blocked: true,
      persisted: result.persisted,
      error: result.error,
    };
  }

  const row = {
    tenant_id: uuid,
    applicant_name: input.applicantName,
    applicant_dept: input.applicantDept,
    target_label: input.targetLabel,
    target_org: input.targetOrg,
    regime: decision.regime,
    event_type_label: input.eventTypeLabel,
    venue_name: input.venueName,
    room_no: input.roomNo,
    visit_at: input.visitAt,
    product_name: input.productName,
    amount: input.amount,
    account: decision.account,
    internal_limit: decision.internalLimit,
    legal_limit: decision.legalLimit,
    ribbon_phrase: input.ribbonPhrase,
    ribbon_sender: input.ribbonSender,
    status: execution.result === "AUTO_APPROVE" ? "ORDERED" : "APPROVAL_PENDING",
    // 증빙 필수 여부(F7-2)와 승인 SLA 는 아직 규정으로 정의된 바가 없어
    // DB 기본값(false / 0)을 그대로 둔다. 규칙이 생기면 여기서 채운다.
  };

  // 발주번호는 월 단위 연번이라 동시 신청 시 부딪힐 수 있다. 몇 번 물러서며 다시 잡는다.
  let orderId: string | null = null;
  let lastError: string | null = null;

  for (let attempt = 0; attempt < 5; attempt++) {
    const { count, error: countError } = await supabase
      .from("condolence_order")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", uuid);
    if (countError) return { orderId: null, blocked: false, persisted: false, error: countError.message };

    const candidate = orderIdFor((count ?? 0) + 1 + attempt);
    const { error } = await supabase.from("condolence_order").insert({ ...row, id: candidate });

    if (!error) {
      orderId = candidate;
      break;
    }
    if (error.code !== UNIQUE_VIOLATION) {
      return { orderId: null, blocked: false, persisted: false, error: error.message };
    }
    lastError = error.message;
  }

  if (!orderId) {
    return { orderId: null, blocked: false, persisted: false, error: lastError };
  }

  // 판정 근거 — 이게 없으면 발주만 남고 왜 그렇게 판정했는지가 사라진다
  const { snapshot } = decision;
  const { error: snapshotError } = await supabase.from("policy_decision_snapshot").insert({
    tenant_id: uuid,
    order_id: orderId,
    version_label: snapshot.policyVersion,
    rule_code: snapshot.matchedRuleId,
    conditions: Object.fromEntries(snapshot.conditions.map((c) => [c.label, c.value])),
    limit_formula: snapshot.limitFormula,
    regime_basis: snapshot.regimeBasis,
    decision: execution.result,
  });

  // 사내 상한 초과 승인 건도 통제 리포트가 세는 대상이므로 발주와 함께 남긴다
  return {
    orderId,
    blocked: false,
    persisted: true,
    error: snapshotError ? `판정 근거 기록 실패 — ${snapshotError.message}` : null,
  };
}
