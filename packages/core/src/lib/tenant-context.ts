"use client";

// 현재 보고 있는 고객사.
// ZENO 운영팀 백오피스는 여러 고객사를 오가므로 전환이 필요하고,
// 고객사 사용자는 자기 테넌트에 고정된다 (인증 도입 시 JWT 클레임으로 대체).
import { useSyncExternalStore } from "react";
import { DEFAULT_TENANT_ID, TENANTS, findTenant, type Tenant } from "./tenants";

const KEY = "zeno-cnd-tenant";

const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  return window.localStorage.getItem(KEY) ?? DEFAULT_TENANT_ID;
}

function getServerSnapshot() {
  return DEFAULT_TENANT_ID;
}

export function setCurrentTenant(id: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, id);
  for (const listener of listeners) listener();
}

export function useCurrentTenant(): Tenant {
  const id = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return findTenant(id);
}

export { TENANTS };
