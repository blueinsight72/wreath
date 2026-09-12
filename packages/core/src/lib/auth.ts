"use client";

// Supabase Auth — 브라우저에서만 쓴다.
//
// 세션은 supabase-js 가 localStorage 에 넣고, 이후 모든 질의에 JWT 를 붙인다.
// DB 는 그 JWT 로 auth.uid() 를 알아내 RLS 정책을 적용한다. 서버를 거치지
// 않으므로 proxy.ts(구 middleware)나 @supabase/ssr 은 필요하지 않다.
//
// 화면 쪽 게이트는 UX 다. 실제 차단은 DB 가 한다 — 로그인 폼을 우회해도
// anon 키로는 RLS 가 아무것도 내주지 않는다. 둘을 헷갈리면 안 된다.
//
// 세션은 모듈 수준에 한 벌만 둔다. 훅마다 구독하면 컴포넌트 수만큼
// getSession 을 부르고 리스너가 쌓인다. tenant-context 와 같은 모양이다.
import { useSyncExternalStore } from "react";
import type { Session } from "@supabase/supabase-js";

import { getSupabase, isSupabaseConfigured } from "./supabase";

export type AuthState =
  /** Supabase 미설정 — 화면은 목업으로 돈다. 로그인시킬 대상이 없다 */
  | { status: "UNCONFIGURED" }
  | { status: "LOADING" }
  | { status: "SIGNED_OUT" }
  | { status: "SIGNED_IN"; email: string };

// 상태가 바뀔 때만 객체를 새로 만든다 — useSyncExternalStore 는 스냅샷의
// 참조가 그대로여야 다시 렌더하지 않는다.
const UNCONFIGURED: AuthState = { status: "UNCONFIGURED" };
const LOADING: AuthState = { status: "LOADING" };
const SIGNED_OUT: AuthState = { status: "SIGNED_OUT" };

// 설정 여부는 환경변수만 보므로 클라이언트를 만들지 않는다. 서버 렌더에서도
// 같은 값이 나와야 첫 화면이 깜빡이지 않는다.
const INITIAL: AuthState = isSupabaseConfigured ? LOADING : UNCONFIGURED;

let state: AuthState = INITIAL;
let started = false;
const listeners = new Set<() => void>();

function toState(session: Session | null): AuthState {
  const user = session?.user;
  if (!user) return SIGNED_OUT;
  return { status: "SIGNED_IN", email: user.email ?? "(이메일 없음)" };
}

function publish(next: AuthState) {
  state = next;
  for (const listener of listeners) listener();
}

/** 첫 구독자가 생길 때 한 번만 붙인다 */
function start() {
  if (started) return;
  started = true;

  const supabase = getSupabase();
  if (!supabase) return;

  // 저장된 세션을 먼저 읽고, 이후 변화는 구독으로 따라간다.
  // 구독만 두면 새로고침 직후 로그인 폼이 한 번 번쩍인다.
  void supabase.auth.getSession().then(({ data }) => publish(toState(data.session)));
  supabase.auth.onAuthStateChange((_event, session) => publish(toState(session)));
}

function subscribe(listener: () => void) {
  start();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  return state;
}

function getServerSnapshot() {
  return INITIAL;
}

export function useAuth(): AuthState {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export async function signIn(
  email: string,
  password: string,
): Promise<{ ok: boolean; error: string | null }> {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, error: "Supabase 가 설정되지 않았습니다." };

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (!error) return { ok: true, error: null };

  // Supabase 는 계정 없음과 비밀번호 틀림을 같은 문구로 돌려준다 — 계정 존재
  // 여부를 흘리지 않으려는 것이므로, 화면에서도 굳이 나누지 않는다.
  const message =
    error.message === "Invalid login credentials"
      ? "이메일 또는 비밀번호가 맞지 않습니다."
      : error.message;
  return { ok: false, error: message };
}

export async function signOut(): Promise<void> {
  await getSupabase()?.auth.signOut();
}
