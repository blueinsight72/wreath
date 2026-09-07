"use client";

import { useMemo, useState } from "react";
import { FUNERAL_VENUES } from "@zeno/core/lib/mock-data";
import type { FuneralVenue } from "@zeno/core/lib/types";
import { Badge } from "@zeno/core/components/ui";

/** 반입 규정 상태 배지 — 미검증 정보는 확정 사실로 표기하지 않는다 (F8-5) */
export function VenueStatusBadge({ venue }: { venue: FuneralVenue }) {
  if (venue.wreathAllowed === false) {
    return <Badge tone="danger">화환 반입 불가</Badge>;
  }
  if (venue.verification === "NEEDS_CHECK" || venue.wreathAllowed === null) {
    return <Badge tone="warn">반입 규정 확인 필요</Badge>;
  }
  if (venue.restrictionReason) {
    return <Badge tone="warn">반입 제한 있음</Badge>;
  }
  return <Badge tone="ok">반입 가능</Badge>;
}

export function VenuePicker({
  selected,
  manualName,
  onSelect,
  onManualChange,
}: {
  selected: FuneralVenue | null;
  manualName: string;
  onSelect: (venue: FuneralVenue | null) => void;
  onManualChange: (name: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [manual, setManual] = useState(Boolean(manualName));

  const results = useMemo(() => {
    const q = query.trim();
    if (!q) return [];
    return FUNERAL_VENUES.filter(
      (v) => v.name.includes(q) || v.address.includes(q) || v.region.includes(q)
    ).slice(0, 6);
  }, [query]);

  if (selected) {
    return (
      <div className="rounded-lg border border-line bg-surface-2 p-3.5">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[15px] font-bold text-ink">{selected.name}</p>
              <VenueStatusBadge venue={selected} />
            </div>
            <p className="mt-0.5 text-[12.5px] text-ink-2">{selected.address}</p>
            <p className="mt-0.5 text-[12px] text-ink-3">
              {selected.phone}
              {selected.entryHours ? ` · 반입 ${selected.entryHours}` : ""}
              {selected.entryFee > 0
                ? ` · 반입료 ${selected.entryFee.toLocaleString("ko-KR")}원`
                : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onSelect(null)}
            className="shrink-0 text-[12.5px] font-semibold text-brand-2 underline underline-offset-2"
          >
            변경
          </button>
        </div>
      </div>
    );
  }

  if (manual) {
    return (
      <div className="rounded-lg border border-line bg-surface-2 p-3.5">
        <div className="flex items-start gap-3">
          <input
            className="control"
            placeholder="장례식장 명칭 · 주소"
            value={manualName}
            onChange={(e) => onManualChange(e.target.value)}
          />
          <button
            type="button"
            onClick={() => {
              setManual(false);
              onManualChange("");
            }}
            className="shrink-0 pt-3 text-[12.5px] font-semibold text-brand-2 underline underline-offset-2"
          >
            검색
          </button>
        </div>
        <p className="mt-2 text-[12px] leading-relaxed text-ink-3">
          마스터에 없는 장소는 반입 규정을 확인할 수 없어 총무 담당자 확인 후
          발주됩니다.
        </p>
      </div>
    );
  }

  return (
    <div>
      <input
        className="control"
        placeholder="장례식장명 또는 지역으로 검색"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {query.trim() &&
        (results.length === 0 ? (
          <p className="mt-2 rounded-lg border border-line bg-surface-2 px-3.5 py-3 text-[12.5px] text-ink-3">
            일치하는 장례식장이 없습니다.
          </p>
        ) : (
          <div className="mt-2 overflow-hidden rounded-lg border border-line bg-surface">
            {results.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => {
                  onSelect(v);
                  setQuery("");
                }}
                className="flex w-full items-center gap-2 border-b border-line-2 px-3.5 py-3 text-left transition last:border-b-0 hover:bg-surface-2"
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-[14px] font-semibold text-ink">
                    {v.name}
                  </span>
                  <span className="block truncate text-[12px] text-ink-3">
                    {v.address}
                  </span>
                </span>
                <VenueStatusBadge venue={v} />
              </button>
            ))}
          </div>
        ))}

      <button
        type="button"
        onClick={() => setManual(true)}
        className="mt-2 text-[12.5px] font-semibold text-brand-2 underline underline-offset-2"
      >
        목록에 없는 장소 직접 입력
      </button>
    </div>
  );
}
