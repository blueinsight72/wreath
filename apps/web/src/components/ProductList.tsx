"use client";

import { formatKRW } from "@zeno/core/lib/format";
import type { WreathProduct } from "@zeno/core/lib/types";
import { Badge } from "@zeno/core/components/ui";

/** 조문 예정 시각까지 배송이 가능한지 (F3-3, F3-6 — 권역 테이블 기반 하드코딩) */
function deliveryNote(visitAt: string, leadTimeHours: number) {
  if (!visitAt) return { ok: true, text: `제작·배송 약 ${leadTimeHours}시간 소요` };
  const visit = new Date(visitAt);
  if (Number.isNaN(visit.getTime())) {
    return { ok: true, text: `제작·배송 약 ${leadTimeHours}시간 소요` };
  }
  const arrive = new Date(Date.parse(visitAt) - leadTimeHours * 3600_000);
  const hh = String(arrive.getHours()).padStart(2, "0");
  const mm = String(arrive.getMinutes()).padStart(2, "0");
  return { ok: true, text: `${hh}:${mm} 이전 발주 시 조문 시각 전 도착` };
}

export function ProductList({
  products,
  selectedId,
  recommendedId,
  internalLimit,
  legalLimit,
  visitAt,
  onSelect,
}: {
  products: WreathProduct[];
  selectedId: string | null;
  recommendedId: string | null;
  internalLimit: number | null;
  legalLimit: number | null;
  visitAt: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="space-y-2.5">
      {products.map((p) => {
        const blocked = legalLimit !== null && p.price > legalLimit;
        const overInternal = internalLimit !== null && p.price > internalLimit;
        const selected = p.id === selectedId;
        const delivery = deliveryNote(visitAt, p.leadTimeHours);

        return (
          <button
            key={p.id}
            type="button"
            onClick={() => onSelect(p.id)}
            className={`block w-full rounded-xl border p-4 text-left transition ${
              blocked && selected
                ? "border-danger bg-danger-soft ring-1 ring-danger"
                : blocked
                  ? "border-line bg-surface-2 opacity-70 hover:border-danger"
                  : selected
                    ? "border-brand bg-brand-soft ring-1 ring-brand"
                    : "border-line bg-surface hover:border-brand-2"
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[14.5px] font-bold text-ink">{p.name}</span>
                  {p.id === recommendedId && !blocked && (
                    <Badge tone="info">규정 등급 추천</Badge>
                  )}
                  {p.kind === "ALT" && <Badge tone="neutral">대체 상품</Badge>}
                </div>
                <p className="mt-1 text-[12.5px] text-ink-2">{p.desc}</p>
                <p className="mt-1 text-[12px] text-ink-3">
                  {p.freshGuarantee ? "생화 · 신품 확약 · " : ""}
                  {delivery.text}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-[15px] font-bold tabular-nums text-ink">
                  {formatKRW(p.price)}
                </p>
                <p className="mt-0.5 text-[11.5px] text-ink-3">{p.grade}등급</p>
              </div>
            </div>

            {blocked && (
              <p className="mt-2.5 rounded-md bg-danger-soft px-2.5 py-1.5 text-[11.5px] font-semibold text-danger">
                법정 상한 초과 — 선택 시 발주가 차단되고 시도가 기록됩니다
              </p>
            )}
            {!blocked && overInternal && (
              <p className="mt-2.5 rounded-md bg-warn-soft px-2.5 py-1.5 text-[11.5px] font-semibold text-warn">
                사내 상한 초과 — 선택 시 자동승인이 해제되고 승인 요청으로 전환됩니다
              </p>
            )}
          </button>
        );
      })}
    </div>
  );
}
