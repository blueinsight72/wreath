"use client";

// 고객사 식별자 해석.
//
// 화면과 목업은 로컬 id (`tn-zeno`) 로 고객사를 가리키지만, DB 의 tenant.id 는
// gen_random_uuid() 로 만든 UUID 다. 둘을 잇는 건 slug 뿐이므로, Supabase 에
// 질의하기 직전에 여기서 한 번 바꿔 준다.
//
// 이 해석을 화면까지 올리지 않는 이유: tenant.id 는 dataOf · rulesOf 같은 목업
// 조회 키로 40여 곳에서 쓰인다. 화면이 UUID 를 들고 다니기 시작하면 Supabase 가
// 꺼졌을 때 목업 조회가 전부 빗나간다. 경계는 리포지토리에 둔다.
import { findTenant } from "../tenants";
import { getSupabase } from "../supabase";

/** slug → DB uuid. 고객사 목록은 세션 중 바뀌지 않으므로 캐시해 둔다. */
const cache = new Map<string, string>();

export class TenantNotInDbError extends Error {
  constructor(slug: string) {
    super(`고객사 '${slug}' 가 DB 에 없습니다 — seed.sql 을 실행했는지 확인하십시오.`);
    this.name = "TenantNotInDbError";
  }
}

/**
 * 로컬 id 또는 slug 를 DB 의 tenant.id (UUID) 로 바꾼다.
 * Supabase 가 꺼져 있거나 해당 고객사가 DB 에 없으면 throw 한다 —
 * 부르는 쪽은 목업으로 내려가면 된다.
 */
export async function resolveTenantUuid(key: string): Promise<string> {
  const { slug } = findTenant(key);

  const hit = cache.get(slug);
  if (hit) return hit;

  const supabase = getSupabase();
  if (!supabase) throw new TenantNotInDbError(slug);

  const { data, error } = await supabase
    .from("tenant")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (error) throw new Error(`고객사 조회 실패 — ${error.message}`);
  if (!data) throw new TenantNotInDbError(slug);

  cache.set(slug, data.id as string);
  return data.id as string;
}
