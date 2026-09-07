"use client";

import { TENANTS, setCurrentTenant, useCurrentTenant } from "../lib/tenant-context";

/** 고객사 전환 — ZENO 운영팀 백오피스 전용 */
export function TenantSwitcher() {
  const tenant = useCurrentTenant();

  return (
    <label className="flex items-center gap-2.5 rounded-lg border border-line bg-surface px-3 py-2">
      <span className="shrink-0 text-[12px] font-semibold text-ink-3">고객사</span>
      <select
        className="bg-transparent text-[13.5px] font-bold text-ink outline-none"
        value={tenant.id}
        onChange={(e) => setCurrentTenant(e.target.value)}
      >
        {TENANTS.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
      </select>
    </label>
  );
}
