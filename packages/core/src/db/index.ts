// Drizzle 클라이언트 — 서버 전용.
//
// 브라우저에서 쓰는 @supabase/supabase-js (src/lib/supabase.ts) 와 역할이 다르다.
//   · supabase.ts : 브라우저 · anon 키 · RLS 로 격리
//   · 이 파일     : 서버(Server Component · Route Handler) · DB 자격증명 · RLS 우회
// DATABASE_URL 은 DB 비밀번호를 담고 있으므로 절대 NEXT_PUBLIC_ 로 노출하지 않는다.
//
// supabase.ts 와 같은 규약을 따른다 — 환경변수가 없으면 null 을 돌려주고,
// 화면은 목업으로 계속 동작한다.
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

export * as schema from "./schema";

type Db = ReturnType<typeof drizzle<typeof schema>>;

let cached: Db | null = null;

export function getDb(): Db | null {
  if (typeof window !== "undefined") {
    throw new Error("getDb() 는 서버에서만 호출할 수 있습니다 (DB 자격증명 노출).");
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) return null;

  // Supabase 트랜잭션 모드 풀러(6543)는 prepared statement 를 지원하지 않는다.
  cached ??= drizzle(postgres(connectionString, { prepare: false }), { schema });
  return cached;
}

/** 자격증명이 없으면 목업으로 내려가는 대신 실패시켜야 하는 자리에서 쓴다. */
export function requireDb(): Db {
  const db = getDb();
  if (!db) throw new Error("DATABASE_URL 이 설정되지 않았습니다.");
  return db;
}

export const isDbConfigured = Boolean(process.env.DATABASE_URL);
