"use client";

// Supabase 클라이언트 — 환경변수가 없으면 null 을 돌려주고, 화면은 목업으로 동작한다.
// 자격증명이 채워지는 즉시 같은 화면이 실제 데이터로 바뀐다.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let cached: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (!url || !anonKey) return null;
  cached ??= createClient(url, anonKey);
  return cached;
}

export const isSupabaseConfigured = Boolean(url && anonKey);

/** 화면에 표시할 연결 상태 */
export type DataSource = "SUPABASE" | "MOCK";
