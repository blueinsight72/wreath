"use client";

// 장례식장 반입 규정 DB 접근 계층 (S11).
//
// 이 표는 고객사 귀속이 아니라 ZENO 공통 자산이다. 반입 거부 정보는 모든
// 고객사의 실제 배송에서 함께 쌓일 때 가장 정확해지므로 테넌트로 나누지 않는다.
// 따라서 tenant_id 조건도, slug→uuid 해석도 필요 없다.
import { FUNERAL_VENUES } from "../mock-data";
import { getSupabase, type DataSource } from "../supabase";
import type { FuneralVenue } from "../types";

export interface VenueBundle {
  source: DataSource;
  venues: FuneralVenue[];
  error: string | null;
}

interface VenueRow {
  id: string;
  name: string;
  address: string | null;
  region: string | null;
  phone: string | null;
  wreath_allowed: boolean | null;
  restriction_reason: string | null;
  entry_fee: number;
  entry_hours: string | null;
  verification: FuneralVenue["verification"];
  issue_reports: number;
  updated_at: string | null;
}

function toVenue(row: VenueRow): FuneralVenue {
  return {
    id: row.id,
    name: row.name,
    address: row.address ?? "",
    region: row.region ?? "",
    phone: row.phone ?? "",
    wreathAllowed: row.wreath_allowed,
    restrictionReason: row.restriction_reason,
    entryFee: row.entry_fee,
    entryHours: row.entry_hours,
    verification: row.verification,
    issueReports: row.issue_reports,
    updatedAt: row.updated_at ?? "—",
  };
}

export async function loadVenues(): Promise<VenueBundle> {
  const supabase = getSupabase();
  if (!supabase) return { source: "MOCK", venues: FUNERAL_VENUES, error: null };

  const { data, error } = await supabase
    .from("funeral_venue")
    .select("*")
    .order("name");

  if (error) {
    return {
      source: "MOCK",
      venues: FUNERAL_VENUES,
      error: `Supabase 조회 실패 — ${error.message}`,
    };
  }

  return { source: "SUPABASE", venues: (data as VenueRow[]).map(toVenue), error: null };
}

export interface VenueRuleInput {
  wreathAllowed: boolean | null;
  restrictionReason: string | null;
  /** 반입 여부를 확정하지 못했으면 확정 사실로 안내하지 않는다 (F8-5) */
  verification: FuneralVenue["verification"];
  updatedAt: string;
}

/** Supabase 미설정 시 null 을 돌려주고, 화면은 로컬 상태만 갱신한다. */
export async function saveVenueRule(
  id: string,
  input: VenueRuleInput,
): Promise<string | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { error } = await supabase
    .from("funeral_venue")
    .update({
      wreath_allowed: input.wreathAllowed,
      restriction_reason: input.restrictionReason,
      verification: input.verification,
      updated_at: input.updatedAt,
    })
    .eq("id", id);

  return error ? error.message : null;
}
