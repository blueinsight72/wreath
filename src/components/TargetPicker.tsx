"use client";

import { useMemo, useState } from "react";
import { dataOf } from "@/lib/tenant-data";
import { useCurrentTenant } from "@/lib/tenant-context";
import { REGIME_LABEL, type Employee, type ExternalRecipient } from "@/lib/types";
import { Badge } from "./ui";

const REGIME_TONE = {
  R1: "danger",
  R2: "warn",
  R3: "info",
  R4: "ok",
  UNKNOWN: "neutral",
} as const;

export function EmployeePicker({
  selected,
  onSelect,
}: {
  selected: Employee | null;
  onSelect: (employee: Employee | null) => void;
}) {
  const tenant = useCurrentTenant();
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    const q = query.trim();
    if (!q) return [];
    return dataOf(tenant.id).employees.filter(
      (e) =>
        e.name.includes(q) ||
        e.empNo.includes(q) ||
        e.dept.includes(q) ||
        e.rank.includes(q)
    ).slice(0, 6);
  }, [query, tenant.id]);

  if (selected) {
    return (
      <SelectedCard onClear={() => onSelect(null)}>
        <p className="text-[15px] font-bold text-ink">
          {selected.name} {selected.rank}
        </p>
        <p className="mt-0.5 text-[12.5px] text-ink-2">
          {selected.company} · {selected.dept} · 사번 {selected.empNo}
        </p>
        <p className="mt-0.5 text-[12px] text-ink-3">
          재직 {Math.floor(selected.tenureMonths / 12)}년 {selected.tenureMonths % 12}개월
          · 코스트센터 {selected.costCenter}
        </p>
      </SelectedCard>
    );
  }

  return (
    <div>
      <input
        className="control"
        placeholder="성명 또는 사번으로 검색"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <ResultList
        query={query}
        empty="일치하는 임직원이 없습니다."
        count={results.length}
      >
        {results.map((e) => (
          <button
            key={e.id}
            type="button"
            onClick={() => {
              onSelect(e);
              setQuery("");
            }}
            className="flex w-full flex-col items-start gap-0.5 border-b border-line-2 px-3.5 py-3 text-left transition last:border-b-0 hover:bg-surface-2"
          >
            <span className="text-[14px] font-semibold text-ink">
              {e.name} {e.rank}
            </span>
            <span className="text-[12px] text-ink-3">
              {e.dept} · {e.empNo}
            </span>
          </button>
        ))}
      </ResultList>
    </div>
  );
}

export function RecipientPicker({
  selected,
  manualName,
  manualOrg,
  onSelect,
  onManualChange,
}: {
  selected: ExternalRecipient | null;
  manualName: string;
  manualOrg: string;
  onSelect: (recipient: ExternalRecipient | null) => void;
  onManualChange: (name: string, org: string) => void;
}) {
  const tenant = useCurrentTenant();
  const [query, setQuery] = useState("");
  const [manual, setManual] = useState(Boolean(manualName));

  const results = useMemo(() => {
    const q = query.trim();
    if (!q) return [];
    return dataOf(tenant.id).recipients.filter(
      (r) => r.name.includes(q) || r.org.includes(q) || r.position.includes(q)
    ).slice(0, 6);
  }, [query, tenant.id]);

  if (selected) {
    return (
      <SelectedCard onClear={() => onSelect(null)}>
        <div className="flex items-center gap-2">
          <p className="text-[15px] font-bold text-ink">{selected.name}</p>
          <Badge tone={REGIME_TONE[selected.regime]}>
            {selected.regime === "UNKNOWN" ? "미확인" : selected.regime} ·{" "}
            {REGIME_LABEL[selected.regime]}
          </Badge>
        </div>
        <p className="mt-0.5 text-[12.5px] text-ink-2">
          {selected.org} · {selected.position}
        </p>
        <p className="mt-1 text-[12px] leading-relaxed text-ink-3">
          판정 근거: {selected.basis}
          {selected.confirmedAt
            ? ` (${selected.confirmedAt} ${selected.confirmedBy} 확인)`
            : ""}
        </p>
      </SelectedCard>
    );
  }

  if (manual) {
    return (
      <SelectedCard
        onClear={() => {
          setManual(false);
          onManualChange("", "");
        }}
        clearLabel="마스터에서 다시 검색"
      >
        <div className="space-y-2.5">
          <input
            className="control"
            placeholder="수신자 성명"
            value={manualName}
            onChange={(e) => onManualChange(e.target.value, manualOrg)}
          />
          <input
            className="control"
            placeholder="소속 기관 · 직위"
            value={manualOrg}
            onChange={(e) => onManualChange(manualName, e.target.value)}
          />
        </div>
      </SelectedCard>
    );
  }

  return (
    <div>
      <input
        className="control"
        placeholder="성명 또는 거래처명으로 검색"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <ResultList
        query={query}
        empty="수신자 마스터에 등록되어 있지 않습니다."
        count={results.length}
      >
        {results.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => {
              onSelect(r);
              setQuery("");
            }}
            className="flex w-full items-center gap-2 border-b border-line-2 px-3.5 py-3 text-left transition last:border-b-0 hover:bg-surface-2"
          >
            <span className="min-w-0 flex-1">
              <span className="block text-[14px] font-semibold text-ink">
                {r.name}
              </span>
              <span className="block truncate text-[12px] text-ink-3">
                {r.org} · {r.position}
              </span>
            </span>
            <Badge tone={REGIME_TONE[r.regime]}>
              {r.regime === "UNKNOWN" ? "미확인" : r.regime}
            </Badge>
          </button>
        ))}
      </ResultList>

      <button
        type="button"
        onClick={() => setManual(true)}
        className="mt-2 text-[12.5px] font-semibold text-brand-2 underline underline-offset-2"
      >
        마스터에 없는 수신자 직접 입력
      </button>
    </div>
  );
}

function SelectedCard({
  children,
  onClear,
  clearLabel = "변경",
}: {
  children: React.ReactNode;
  onClear: () => void;
  clearLabel?: string;
}) {
  return (
    <div className="rounded-lg border border-line bg-surface-2 p-3.5">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">{children}</div>
        <button
          type="button"
          onClick={onClear}
          className="shrink-0 text-[12.5px] font-semibold text-brand-2 underline underline-offset-2"
        >
          {clearLabel}
        </button>
      </div>
    </div>
  );
}

function ResultList({
  query,
  count,
  empty,
  children,
}: {
  query: string;
  count: number;
  empty: string;
  children: React.ReactNode;
}) {
  if (!query.trim()) return null;
  if (count === 0) {
    return (
      <p className="mt-2 rounded-lg border border-line bg-surface-2 px-3.5 py-3 text-[12.5px] text-ink-3">
        {empty}
      </p>
    );
  }
  return (
    <div className="mt-2 overflow-hidden rounded-lg border border-line bg-surface">
      {children}
    </div>
  );
}
