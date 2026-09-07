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
//
// 파일 아래쪽은 남긴 기록을 다시 꺼내 고치고 지우는 경로다 (총무 신청 내역 화면).
import { formatTimestamp } from "@/lib/format";
import { ORDERS, type Order, type OrderStatus } from "@/lib/ops-data";
import { getSupabase, type DataSource } from "@/lib/supabase";
import type { AccountCode, ExecutionDecision, PolicyDecision, Regime } from "@/lib/types";
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

/* ── 조회 · 수정 · 삭제 (총무 신청 내역 화면) ──────────────── */

// 여기부터는 남긴 기록을 다시 꺼내 고치는 경로다. 기록을 만드는 위쪽과 달리
// 사람이 손으로 건드리는 자리이므로, 무엇이 함께 바뀌는지가 중요하다.
//
//   · 수정 — condolence_order 만 바꾼다. 판정 근거 스냅샷은 다시 쓰지 않는다.
//            "그때 그 규정으로 그렇게 판정했다"는 사실은 지금 값과 무관하다.
//   · 삭제 — 발주가 사라지면 판정 근거와 승인 이력도 함께 사라진다(on delete
//            cascade). 차단 로그만 order_id 가 비워진 채 남는다. 감사 증거가
//            같이 지워지는 일이므로 화면에서 그 사실을 알리고 확인을 받는다.

interface OrderRow {
  id: string;
  created_at: string;
  applicant_name: string;
  applicant_dept: string | null;
  target_label: string;
  target_org: string | null;
  regime: string;
  event_type_label: string | null;
  venue_name: string | null;
  room_no: string | null;
  visit_at: string | null;
  product_name: string | null;
  amount: number;
  account: AccountCode;
  internal_limit: number | null;
  legal_limit: number | null;
  ribbon_phrase: string | null;
  ribbon_sender: string | null;
  status: string;
  supplier_ref: string | null;
  supplier_name: string | null;
  sla_remaining_min: number;
  proof_required: boolean;
  proof_photo: boolean;
  venue_issue: boolean;
  supplier_report_at: string | null;
  supplier_report_reason: string | null;
  accepted_in_min: number | null;
  off_system: boolean;
}

/** 발주와 함께 남은 판정 근거 (F1-8) — 읽기 전용이다 */
export interface DecisionRecord {
  orderId: string;
  versionLabel: string;
  ruleCode: string | null;
  conditions: Record<string, string>;
  limitFormula: string | null;
  regimeBasis: string | null;
  decision: string;
  decidedAt: string;
}

interface SnapshotRow {
  order_id: string;
  version_label: string;
  rule_code: string | null;
  conditions: Record<string, string> | null;
  limit_formula: string | null;
  regime_basis: string | null;
  decision: string;
  decided_at: string;
}

export interface OrderBundle {
  source: DataSource;
  /** 어느 고객사로 불러온 결과인지 — 전환 중 이전 응답이 늦게 도착해도 구분된다 */
  tenantId: string;
  orders: Order[];
  /** 발주번호 → 판정 근거 */
  snapshots: Record<string, DecisionRecord>;
  error: string | null;
}

function toOrder(row: OrderRow): Order {
  return {
    id: row.id,
    createdAt: formatTimestamp(row.created_at),
    applicantName: row.applicant_name,
    applicantDept: row.applicant_dept ?? "",
    targetLabel: row.target_label,
    targetOrg: row.target_org ?? "",
    regime: row.regime as Regime,
    eventTypeLabel: row.event_type_label ?? "",
    venueName: row.venue_name || "빈소 미정",
    roomNo: row.room_no ?? "",
    visitAt: row.visit_at ?? "",
    productName: row.product_name ?? "",
    amount: row.amount,
    account: row.account,
    internalLimit: row.internal_limit,
    legalLimit: row.legal_limit,
    ribbonPhrase: row.ribbon_phrase ?? "",
    ribbonSender: row.ribbon_sender ?? "",
    status: row.status as OrderStatus,
    supplierRef: row.supplier_ref,
    supplierName: row.supplier_name,
    // 승인 경로로 넘어간 사유는 판정 시점의 계산 결과라 표에 없다.
    // 왜 그렇게 판정했는지는 판정 근거 스냅샷에서 읽는다.
    approvalReasons: [],
    slaRemainingMin: row.sla_remaining_min,
    proofRequired: row.proof_required,
    proofPhoto: row.proof_photo,
    venueIssue: row.venue_issue,
    supplierReport: row.supplier_report_at
      ? {
          reportedAt: formatTimestamp(row.supplier_report_at),
          supplierName: row.supplier_name ?? "공급사",
          reason: row.supplier_report_reason ?? "사유 미기재",
        }
      : null,
    acceptedInMin: row.accepted_in_min,
    offSystem: row.off_system,
  };
}

function mockBundle(tenantId: string, error: string | null = null): OrderBundle {
  // 발주 이력 목업은 제노㈜ 기준이라, 다른 고객사는 아직 집계 대상이 없다
  return {
    source: "MOCK",
    tenantId,
    orders: tenantId === "tn-zeno" ? ORDERS : [],
    snapshots: {},
    error,
  };
}

export async function loadOrders(tenantKey: string): Promise<OrderBundle> {
  const supabase = getSupabase();
  if (!supabase) return mockBundle(tenantKey);

  let uuid: string;
  try {
    uuid = await resolveTenantUuid(tenantKey);
  } catch (e) {
    return mockBundle(tenantKey, (e as Error).message);
  }

  const [orderRes, snapshotRes] = await Promise.all([
    supabase
      .from("condolence_order")
      .select("*")
      .eq("tenant_id", uuid)
      .order("created_at", { ascending: false }),
    supabase.from("policy_decision_snapshot").select("*").eq("tenant_id", uuid),
  ]);

  const failure = orderRes.error ?? snapshotRes.error;
  if (failure) return mockBundle(tenantKey, `Supabase 조회 실패 — ${failure.message}`);

  const snapshots: Record<string, DecisionRecord> = {};
  for (const r of snapshotRes.data as SnapshotRow[]) {
    snapshots[r.order_id] = {
      orderId: r.order_id,
      versionLabel: r.version_label,
      ruleCode: r.rule_code,
      conditions: r.conditions ?? {},
      limitFormula: r.limit_formula,
      regimeBasis: r.regime_basis,
      decision: r.decision,
      decidedAt: formatTimestamp(r.decided_at),
    };
  }

  return {
    source: "SUPABASE",
    tenantId: tenantKey,
    orders: (orderRes.data as OrderRow[]).map(toOrder),
    snapshots,
    error: null,
  };
}

/** 화면에서 고칠 수 있는 값만 모은 것 — 금액 · 상태처럼 사람이 판단하는 항목이다 */
export interface OrderPatch {
  applicantName: string;
  applicantDept: string;
  targetLabel: string;
  targetOrg: string;
  regime: Regime;
  eventTypeLabel: string;
  venueName: string;
  roomNo: string;
  /** 조문 예정 시각 (timestamptz) — 비어 있으면 빈소 미정 */
  visitAt: string | null;
  productName: string;
  amount: number;
  status: OrderStatus;
  ribbonPhrase: string;
  ribbonSender: string;
}

export interface WriteResult {
  ok: boolean;
  error: string | null;
}

/** Supabase 가 없으면 고칠 대상 자체가 없다 — 성공한 척하지 않는다 */
const NO_DB: WriteResult = {
  ok: false,
  error: "Supabase 가 설정되지 않아 목업을 보고 있습니다 — 수정 · 삭제할 대상이 없습니다.",
};

export async function updateOrder(
  tenantKey: string,
  orderId: string,
  patch: OrderPatch,
): Promise<WriteResult> {
  const supabase = getSupabase();
  if (!supabase) return NO_DB;

  let uuid: string;
  try {
    uuid = await resolveTenantUuid(tenantKey);
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }

  const { error } = await supabase
    .from("condolence_order")
    .update({
      applicant_name: patch.applicantName,
      applicant_dept: patch.applicantDept || null,
      target_label: patch.targetLabel,
      target_org: patch.targetOrg || null,
      regime: patch.regime,
      event_type_label: patch.eventTypeLabel || null,
      venue_name: patch.venueName || null,
      room_no: patch.roomNo || null,
      visit_at: patch.visitAt,
      product_name: patch.productName || null,
      amount: patch.amount,
      status: patch.status,
      ribbon_phrase: patch.ribbonPhrase || null,
      ribbon_sender: patch.ribbonSender || null,
    })
    .eq("id", orderId)
    // 발주번호는 고객사마다 따로 매겨지므로 tenant_id 를 함께 건다.
    // RLS 를 켜기 전까지 경계는 이 조건뿐이다.
    .eq("tenant_id", uuid);

  return { ok: !error, error: error ? error.message : null };
}

export async function deleteOrder(
  tenantKey: string,
  orderId: string,
): Promise<WriteResult> {
  const supabase = getSupabase();
  if (!supabase) return NO_DB;

  let uuid: string;
  try {
    uuid = await resolveTenantUuid(tenantKey);
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }

  // 판정 근거 · 승인 이력은 cascade 로 함께 지워진다. 부르기 전에 확인을 받는다.
  const { error } = await supabase
    .from("condolence_order")
    .delete()
    .eq("id", orderId)
    .eq("tenant_id", uuid);

  return { ok: !error, error: error ? error.message : null };
}
