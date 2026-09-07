"use client";

// 규정 데이터 접근 계층.
// Supabase 가 설정되어 있으면 실제 테이블을, 아니면 목업을 돌려준다.
// 화면은 어느 쪽인지 신경 쓰지 않고 같은 타입만 다룬다.
import { WREATH_PRODUCTS } from "@/lib/mock-data";
import { findTenant, rulesOf } from "@/lib/tenants";
import { getSupabase, type DataSource } from "@/lib/supabase";
import { resolveTenantUuid } from "./tenant-repo";
import type { PolicyRule, RankTier, TargetKind, WreathProduct } from "@/lib/types";

export type VersionStatus = "DRAFT" | "PENDING" | "ACTIVE" | "ARCHIVED";

export const VERSION_STATUS_LABEL: Record<VersionStatus, string> = {
  DRAFT: "작성 중",
  PENDING: "결재 대기",
  ACTIVE: "시행 중",
  ARCHIVED: "종료",
};

export interface PolicyVersion {
  id: string;
  label: string;
  status: VersionStatus;
  effectiveFrom: string | null;
  approvedAt: string | null;
  approvedBy: string | null;
  note: string | null;
}

export interface PolicyBundle {
  source: DataSource;
  tenantId: string;
  versions: PolicyVersion[];
  /** versionId → 규정표 */
  rulesByVersion: Record<string, PolicyRule[]>;
  products: WreathProduct[];
  error: string | null;
}

/* ── 목업 ─────────────────────────────────────────────────── */

function mockBundle(tenantId: string, error: string | null = null): PolicyBundle {
  const tenant = findTenant(tenantId);
  const activeId = `${tenantId}-active`;
  const draftId = `${tenantId}-draft`;

  const versions: PolicyVersion[] = [
    {
      id: activeId,
      label: tenant.policyVersion,
      status: "ACTIVE",
      effectiveFrom: tenant.policyApprovedAt,
      approvedAt: tenant.policyApprovedAt,
      approvedBy: tenant.policyApprovedBy,
      note: tenant.note,
    },
    {
      id: draftId,
      label: nextLabel(tenant.policyVersion),
      status: "DRAFT",
      effectiveFrom: null,
      approvedAt: null,
      approvedBy: null,
      note: "개정 작업 중",
    },
  ];

  return {
    source: "MOCK",
    tenantId,
    versions,
    rulesByVersion: {
      [activeId]: rulesOf(tenantId),
      [draftId]: [],
    },
    products: WREATH_PRODUCTS,
    error,
  };
}

/** v3.2 → v3.3 */
function nextLabel(label: string) {
  const m = label.match(/^v(\d+)\.(\d+)$/);
  return m ? `v${m[1]}.${Number(m[2]) + 1}` : `${label}-next`;
}

/* ── Supabase 행 → 도메인 타입 ────────────────────────────── */

interface VersionRow {
  id: string;
  label: string;
  status: VersionStatus;
  effective_from: string | null;
  approved_at: string | null;
  approved_by: string | null;
  note: string | null;
}

interface RuleRow {
  id: string;
  version_id: string;
  code: string;
  event_type_code: string;
  target_kind: TargetKind;
  rank_tier: RankTier | null;
  min_tenure_months: number;
  grade: string;
  wreath_limit: number;
}

interface ProductRow {
  id: string;
  name: string;
  grade: string;
  price: number;
  kind: "WREATH" | "ALT";
  fresh_guarantee: boolean;
  lead_time_hours: number;
  description: string | null;
}

function toVersion(row: VersionRow): PolicyVersion {
  return {
    id: row.id,
    label: row.label,
    status: row.status,
    effectiveFrom: row.effective_from,
    approvedAt: row.approved_at,
    approvedBy: row.approved_by,
    note: row.note,
  };
}

function toRule(row: RuleRow): PolicyRule {
  return {
    id: row.code,
    eventTypeCode: row.event_type_code,
    targetKind: row.target_kind,
    rankTier: row.rank_tier,
    minTenureMonths: row.min_tenure_months,
    grade: row.grade,
    wreathLimit: row.wreath_limit,
  };
}

function toProduct(row: ProductRow): WreathProduct {
  return {
    id: row.id,
    name: row.name,
    grade: row.grade,
    price: row.price,
    kind: row.kind,
    freshGuarantee: row.fresh_guarantee,
    leadTimeHours: row.lead_time_hours,
    desc: row.description ?? "",
  };
}

/* ── 조회 ─────────────────────────────────────────────────── */

export async function loadPolicies(tenantId: string): Promise<PolicyBundle> {
  const supabase = getSupabase();
  if (!supabase) return mockBundle(tenantId);

  let uuid: string;
  try {
    uuid = await resolveTenantUuid(tenantId);
  } catch (e) {
    return mockBundle(tenantId, (e as Error).message);
  }

  const [versionsRes, rulesRes, productsRes] = await Promise.all([
    supabase
      .from("policy_version")
      .select("*")
      .eq("tenant_id", uuid)
      .order("created_at", { ascending: false }),
    supabase
      .from("policy_rule")
      .select("*")
      .eq("tenant_id", uuid)
      .order("code"),
    supabase
      .from("wreath_product")
      .select("*")
      .eq("active", true)
      .order("price", { ascending: false }),
  ]);

  const failure = versionsRes.error ?? rulesRes.error ?? productsRes.error;
  if (failure) {
    return mockBundle(tenantId, `Supabase 조회 실패 — ${failure.message}`);
  }

  const versions = (versionsRes.data as VersionRow[]).map(toVersion);
  const rulesByVersion: Record<string, PolicyRule[]> = {};
  for (const version of versions) rulesByVersion[version.id] = [];
  for (const row of rulesRes.data as RuleRow[]) {
    (rulesByVersion[row.version_id] ??= []).push(toRule(row));
  }

  return {
    source: "SUPABASE",
    tenantId,
    versions,
    rulesByVersion,
    products: (productsRes.data as ProductRow[]).map(toProduct),
    error: null,
  };
}

/* ── 저장 ─────────────────────────────────────────────────── */

export interface RuleInput {
  code: string;
  eventTypeCode: string;
  targetKind: TargetKind;
  rankTier: RankTier | null;
  minTenureMonths: number;
  grade: string;
  wreathLimit: number;
}

/** Supabase 미설정 시 null 을 돌려주고, 화면은 로컬 상태만 갱신한다. */
export async function saveRule(
  tenantId: string,
  versionId: string,
  input: RuleInput
): Promise<string | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  let uuid: string;
  try {
    uuid = await resolveTenantUuid(tenantId);
  } catch (e) {
    return (e as Error).message;
  }

  const { error } = await supabase.from("policy_rule").upsert(
    {
      tenant_id: uuid,
      version_id: versionId,
      code: input.code,
      event_type_code: input.eventTypeCode,
      target_kind: input.targetKind,
      rank_tier: input.rankTier,
      min_tenure_months: input.minTenureMonths,
      grade: input.grade,
      wreath_limit: input.wreathLimit,
    },
    { onConflict: "version_id,code" }
  );

  return error ? error.message : null;
}

export async function deleteRule(
  tenantId: string,
  versionId: string,
  code: string
): Promise<string | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  let uuid: string;
  try {
    uuid = await resolveTenantUuid(tenantId);
  } catch (e) {
    return (e as Error).message;
  }

  const { error } = await supabase
    .from("policy_rule")
    .delete()
    .eq("tenant_id", uuid)
    .eq("version_id", versionId)
    .eq("code", code);

  return error ? error.message : null;
}

/**
 * 규정 시행 — 이전 시행 규정을 종료 처리한 뒤 새 버전을 시행한다.
 * 시행 중 규정이 둘 이상이면 어느 기준으로 판정했는지 확정할 수 없다.
 */
export async function activateVersion(
  tenantId: string,
  versionId: string,
  approvedBy: string,
  approvedAt: string
): Promise<string | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  let uuid: string;
  try {
    uuid = await resolveTenantUuid(tenantId);
  } catch (e) {
    return (e as Error).message;
  }

  // 종료 처리는 반드시 같은 고객사 안에서만 일어나야 한다
  const archived = await supabase
    .from("policy_version")
    .update({ status: "ARCHIVED" })
    .eq("tenant_id", uuid)
    .eq("status", "ACTIVE")
    .neq("id", versionId);
  if (archived.error) return archived.error.message;

  return updateVersionStatus(tenantId, versionId, "ACTIVE", approvedBy, approvedAt);
}

/** 규정 결재 — 이 결재가 개별 건 자동승인의 사전 결재 근거가 된다 (F1-9) */
export async function updateVersionStatus(
  tenantId: string,
  versionId: string,
  status: VersionStatus,
  approvedBy?: string,
  approvedAt?: string
): Promise<string | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  let uuid: string;
  try {
    uuid = await resolveTenantUuid(tenantId);
  } catch (e) {
    return (e as Error).message;
  }

  const patch: Record<string, unknown> = { status };
  if (approvedBy) patch.approved_by = approvedBy;
  if (approvedAt) patch.approved_at = approvedAt;

  const { error } = await supabase
    .from("policy_version")
    .update(patch)
    .eq("tenant_id", uuid)
    .eq("id", versionId);

  return error ? error.message : null;
}
