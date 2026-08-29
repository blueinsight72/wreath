"use client";

// 통제 작동 리포트(S13) 데이터 접근 계층.
// 법무 · 감사가 보는 것은 "위반이 없었다"가 아니라 "통제가 작동한 기록"이다.
import { ORDERS, type Order } from "@/lib/ops-data";
import { getSupabase, type DataSource } from "@/lib/supabase";
import { findTenant } from "@/lib/tenants";

/** 법정 상한 초과로 차단된 발주 시도 (F1-5) */
export interface BlockedAttempt {
  id: string;
  orderId: string | null;
  applicant: string;
  targetLabel: string;
  regime: string;
  attempted: number;
  legalLimit: number;
  attemptedAt: string;
}

/** 승인 이력 */
export interface ApprovalRecord {
  id: string;
  orderId: string;
  approver: string;
  verdict: "APPROVED" | "REJECTED" | "ESCALATED";
  reason: string | null;
  decidedAt: string;
}

export interface ControlReport {
  source: DataSource;
  tenantId: string;
  error: string | null;
  policyVersion: string;
  policyApprovedAt: string;
  policyApprovedBy: string;
  orders: Order[];
  blocked: BlockedAttempt[];
  approvals: ApprovalRecord[];
}

const MOCK_BLOCKED: BlockedAttempt[] = [
  {
    id: "ba-001",
    orderId: "ZC-2608-0414",
    applicant: "최유진",
    targetLabel: "강태호 · 한국조달공사",
    regime: "R1",
    attempted: 300000,
    legalLimit: 100000,
    attemptedAt: "2026-08-28 16:31",
  },
  {
    id: "ba-002",
    orderId: null,
    applicant: "정민석",
    targetLabel: "문혜린 · 대성일보",
    regime: "R1",
    attempted: 150000,
    legalLimit: 100000,
    attemptedAt: "2026-08-21 10:07",
  },
];

const MOCK_APPROVALS: ApprovalRecord[] = [
  {
    id: "ap-001",
    orderId: "ZC-2608-0416",
    approver: "본부장 한지수",
    verdict: "ESCALATED",
    reason: "SLA 초과로 차상위 자동 에스컬레이션",
    decidedAt: "2026-08-29 12:05",
  },
  {
    id: "ap-002",
    orderId: "ZC-2608-0413",
    approver: "구매팀장 서나연",
    verdict: "APPROVED",
    reason: "반입 거부 장소 대체 상품 승인",
    decidedAt: "2026-08-28 10:22",
  },
  {
    id: "ap-003",
    orderId: "ZC-2608-0412",
    approver: "총무팀장 김재현",
    verdict: "APPROVED",
    reason: "심야 부고 긴급 선발주 사후 승인",
    decidedAt: "2026-08-28 08:40",
  },
];

function mockReport(tenantId: string, error: string | null = null): ControlReport {
  const tenant = findTenant(tenantId);
  // 발주 이력 목업은 제노㈜ 기준이라, 다른 고객사는 아직 집계 대상이 없다
  const isPrimary = tenantId === "tn-zeno";

  return {
    source: "MOCK",
    tenantId,
    error,
    policyVersion: tenant.policyVersion,
    policyApprovedAt: tenant.policyApprovedAt,
    policyApprovedBy: tenant.policyApprovedBy,
    orders: isPrimary ? ORDERS : [],
    blocked: isPrimary ? MOCK_BLOCKED : [],
    approvals: isPrimary ? MOCK_APPROVALS : [],
  };
}

interface BlockedRow {
  id: string;
  order_id: string | null;
  applicant: string | null;
  target_label: string | null;
  regime: string | null;
  attempted: number;
  legal_limit: number;
  attempted_at: string;
}

interface ApprovalRow {
  id: string;
  order_id: string;
  approver: string;
  verdict: ApprovalRecord["verdict"];
  reason: string | null;
  decided_at: string;
}

export async function loadControlReport(
  tenantId: string
): Promise<ControlReport> {
  const supabase = getSupabase();
  if (!supabase) return mockReport(tenantId);

  const [blockedRes, approvalRes, versionRes] = await Promise.all([
    supabase
      .from("blocked_attempt")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("attempted_at", { ascending: false }),
    supabase
      .from("approval_log")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("decided_at", { ascending: false }),
    supabase
      .from("policy_version")
      .select("label, approved_at, approved_by")
      .eq("tenant_id", tenantId)
      .eq("status", "ACTIVE")
      .maybeSingle(),
  ]);

  const failure = blockedRes.error ?? approvalRes.error ?? versionRes.error;
  if (failure) return mockReport(tenantId, `Supabase 조회 실패 — ${failure.message}`);

  const active = versionRes.data as
    | { label: string; approved_at: string | null; approved_by: string | null }
    | null;

  return {
    source: "SUPABASE",
    tenantId,
    error: null,
    policyVersion: active?.label ?? "시행 중 규정 없음",
    policyApprovedAt: active?.approved_at ?? "—",
    policyApprovedBy: active?.approved_by ?? "—",
    // 발주 이력은 아직 목업이다 — 신청 화면이 Supabase 에 쓰기 시작하면 교체된다
    orders: ORDERS,
    blocked: (blockedRes.data as BlockedRow[]).map((r) => ({
      id: r.id,
      orderId: r.order_id,
      applicant: r.applicant ?? "—",
      targetLabel: r.target_label ?? "—",
      regime: r.regime ?? "—",
      attempted: r.attempted,
      legalLimit: r.legal_limit,
      attemptedAt: r.attempted_at,
    })),
    approvals: (approvalRes.data as ApprovalRow[]).map((r) => ({
      id: r.id,
      orderId: r.order_id,
      approver: r.approver,
      verdict: r.verdict,
      reason: r.reason,
      decidedAt: r.decided_at,
    })),
  };
}
