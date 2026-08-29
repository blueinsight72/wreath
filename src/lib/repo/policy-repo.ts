"use client";

// 규정 데이터 접근 계층.
// Supabase 가 설정되어 있으면 실제 테이블을, 아니면 목업을 돌려준다.
// 화면은 어느 쪽인지 신경 쓰지 않고 같은 타입만 다룬다.
import {
  POLICY_APPROVED_AT,
  POLICY_APPROVED_BY,
  POLICY_RULES,
  POLICY_VERSION,
  WREATH_PRODUCTS,
} from "@/lib/mock-data";
import { getSupabase, type DataSource } from "@/lib/supabase";
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
  versions: PolicyVersion[];
  /** versionId → 규정표 */
  rulesByVersion: Record<string, PolicyRule[]>;
  products: WreathProduct[];
  error: string | null;
}

/* ── 목업 ─────────────────────────────────────────────────── */

const MOCK_ACTIVE_ID = "mock-v32";

function mockBundle(error: string | null = null): PolicyBundle {
  const versions: PolicyVersion[] = [
    {
      id: MOCK_ACTIVE_ID,
      label: POLICY_VERSION.replace(/\s*\(.*\)$/, ""),
      status: "ACTIVE",
      effectiveFrom: "2026-03-01",
      approvedAt: POLICY_APPROVED_AT,
      approvedBy: POLICY_APPROVED_BY,
      note: "거래처 상한 신설",
    },
    {
      id: "mock-v31",
      label: "v3.1",
      status: "ARCHIVED",
      effectiveFrom: "2025-07-01",
      approvedAt: "2025-06-18",
      approvedBy: "CFO 한지수",
      note: "임원 등급 상향",
    },
    {
      id: "mock-v40",
      label: "v4.0",
      status: "DRAFT",
      effectiveFrom: null,
      approvedAt: null,
      approvedBy: null,
      note: "보건의료인(R2) 규칙 반영 예정",
    },
  ];

  return {
    source: "MOCK",
    versions,
    rulesByVersion: {
      [MOCK_ACTIVE_ID]: POLICY_RULES,
      "mock-v31": [],
      "mock-v40": [],
    },
    products: WREATH_PRODUCTS,
    error,
  };
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

export async function loadPolicies(): Promise<PolicyBundle> {
  const supabase = getSupabase();
  if (!supabase) return mockBundle();

  const [versionsRes, rulesRes, productsRes] = await Promise.all([
    supabase
      .from("policy_version")
      .select("*")
      .order("created_at", { ascending: false }),
    supabase.from("policy_rule").select("*").order("code"),
    supabase
      .from("wreath_product")
      .select("*")
      .eq("active", true)
      .order("price", { ascending: false }),
  ]);

  const failure = versionsRes.error ?? rulesRes.error ?? productsRes.error;
  if (failure) {
    return mockBundle(`Supabase 조회 실패 — ${failure.message}`);
  }

  const versions = (versionsRes.data as VersionRow[]).map(toVersion);
  const rulesByVersion: Record<string, PolicyRule[]> = {};
  for (const version of versions) rulesByVersion[version.id] = [];
  for (const row of rulesRes.data as RuleRow[]) {
    (rulesByVersion[row.version_id] ??= []).push(toRule(row));
  }

  return {
    source: "SUPABASE",
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
  versionId: string,
  input: RuleInput
): Promise<string | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { error } = await supabase.from("policy_rule").upsert(
    {
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
  versionId: string,
  code: string
): Promise<string | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { error } = await supabase
    .from("policy_rule")
    .delete()
    .eq("version_id", versionId)
    .eq("code", code);

  return error ? error.message : null;
}

/**
 * 규정 시행 — 이전 시행 규정을 종료 처리한 뒤 새 버전을 시행한다.
 * 시행 중 규정이 둘 이상이면 어느 기준으로 판정했는지 확정할 수 없다.
 */
export async function activateVersion(
  versionId: string,
  approvedBy: string,
  approvedAt: string
): Promise<string | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const archived = await supabase
    .from("policy_version")
    .update({ status: "ARCHIVED" })
    .eq("status", "ACTIVE")
    .neq("id", versionId);
  if (archived.error) return archived.error.message;

  return updateVersionStatus(versionId, "ACTIVE", approvedBy, approvedAt);
}

/** 규정 결재 — 이 결재가 개별 건 자동승인의 사전 결재 근거가 된다 (F1-9) */
export async function updateVersionStatus(
  versionId: string,
  status: VersionStatus,
  approvedBy?: string,
  approvedAt?: string
): Promise<string | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const patch: Record<string, unknown> = { status };
  if (approvedBy) patch.approved_by = approvedBy;
  if (approvedAt) patch.approved_at = approvedAt;

  const { error } = await supabase
    .from("policy_version")
    .update(patch)
    .eq("id", versionId);

  return error ? error.message : null;
}
