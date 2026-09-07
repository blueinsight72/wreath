"use client";

import { useState } from "react";
import { Badge, Button, Callout } from "@zeno/core/components/ui";
import { formatKRW } from "@zeno/core/lib/format";
import { WREATH_PRODUCTS } from "@zeno/core/lib/mock-data";
import type { Order } from "@zeno/core/lib/ops-data";

/**
 * 공급사 반입 불가 회신 처리.
 *
 * 1차 방어는 장례식장 DB 사전 판정이고, 이건 그걸 통과했는데 현장에서 막힌 건이다.
 * 대체 상품으로 바꾸면 금액이 달라지므로 규정 상한을 다시 검증한다.
 */
export function VenueRejectionCard({ order }: { order: Order }) {
  const report = order.supplierReport;
  const [choiceId, setChoiceId] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  if (!report) return null;

  // 반입 거부 장소이므로 화환이 아닌 대체 상품만 제안한다
  const alternatives = WREATH_PRODUCTS.filter((p) => p.kind === "ALT").sort(
    (a, b) => b.price - a.price
  );
  const chosen = alternatives.find((p) => p.id === choiceId) ?? null;

  const overInternal =
    chosen !== null &&
    order.internalLimit !== null &&
    chosen.price > order.internalLimit;
  const overLegal =
    chosen !== null &&
    order.legalLimit !== null &&
    chosen.price > order.legalLimit;

  if (done && chosen) {
    return (
      <div className="mt-3 border-t border-line-2 pt-3">
        <Callout tone="ok" title="대체 상품으로 변경되었습니다">
          {chosen.name} · {formatKRW(chosen.price)} 로 재발주되었습니다. 신청자와
          요청 임원에게 변경 사실이 통보되었고, {order.venueName} 은 반입 이슈
          누적 대상에 반영되었습니다.
        </Callout>
      </div>
    );
  }

  return (
    <div className="mt-3 border-t border-line-2 pt-3">
      <Callout tone="danger" title="공급사가 반입 불가를 알려왔습니다">
        {report.reason}
        <span className="mt-1.5 block text-[11.5px] opacity-80">
          {report.reportedAt} · {report.supplierName} 회신 · 장례식장 DB 에는
          반입 가능으로 등록되어 있던 건입니다.
        </span>
      </Callout>

      <p className="mt-3 text-[13px] font-semibold text-ink">
        대체 상품 선택
        <span className="ml-1.5 font-normal text-ink-3">
          현재 {order.productName} · {formatKRW(order.amount)}
        </span>
      </p>

      <div className="mt-2 space-y-2">
        {alternatives.map((p) => {
          const selected = p.id === choiceId;
          const blocked =
            order.legalLimit !== null && p.price > order.legalLimit;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => setChoiceId(p.id)}
              className={`flex w-full items-center gap-3 rounded-lg border px-3.5 py-2.5 text-left transition ${
                selected
                  ? blocked
                    ? "border-danger bg-danger-soft"
                    : "border-brand bg-brand-soft"
                  : "border-line bg-surface hover:border-brand-2"
              }`}
            >
              <span className="min-w-0 flex-1">
                <span className="block text-[13.5px] font-semibold text-ink">
                  {p.name}
                </span>
                <span className="block text-[12px] text-ink-3">{p.desc}</span>
              </span>
              <span className="shrink-0 text-[13.5px] font-bold tabular-nums text-ink">
                {formatKRW(p.price)}
              </span>
              {blocked && <Badge tone="danger">법정 상한 초과</Badge>}
            </button>
          );
        })}
      </div>

      {chosen && overLegal && (
        <div className="mt-3">
          <Callout tone="danger" title="법정 상한을 초과합니다">
            청탁금지법 적용 대상 수신자에게는{" "}
            {formatKRW(order.legalLimit ?? 0)} 을 초과할 수 없습니다. 다른 상품을
            선택해 주세요.
          </Callout>
        </div>
      )}
      {chosen && !overLegal && overInternal && (
        <div className="mt-3">
          <Callout tone="warn" title="사내 상한을 초과합니다">
            사내 상한 {formatKRW(order.internalLimit ?? 0)} 을{" "}
            {formatKRW(chosen.price - (order.internalLimit ?? 0))} 초과하여
            승인권자 재승인 후 발주됩니다.
          </Callout>
        </div>
      )}

      <Button
        className="mt-3"
        disabled={!chosen || overLegal}
        onClick={() => setDone(true)}
      >
        {!chosen
          ? "대체 상품을 선택해 주세요"
          : overLegal
            ? "이 상품으로는 발주할 수 없습니다"
            : overInternal
              ? "변경 후 재승인 요청"
              : "변경 확정 · 재발주"}
      </Button>

      <p className="mt-2 text-[11.5px] leading-relaxed text-ink-3">
        확정하면 이 회신이 {order.venueName} 의 반입 이슈로 누적됩니다. 3건 이상
        쌓이면 운영팀 검증을 거쳐 장례식장 DB 에 반영되어, 다음부터는 발주 전에
        걸러집니다.
      </p>
    </div>
  );
}
