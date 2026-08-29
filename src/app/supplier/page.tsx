"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Badge,
  Button,
  Callout,
  Card,
  DeskShell,
  Stat,
} from "@/components/ui";
import { formatDateTime, formatKRW } from "@/lib/format";
import {
  ORDERS,
  ORDER_STATUS_LABEL,
  SUPPLIERS,
  type Order,
  type OrderStatus,
} from "@/lib/ops-data";

/** 이 어드민에 로그인한 공급사 */
const ME = SUPPLIERS[0];

/** 상태 전이 — 접수 → 제작 → 출발 → 배송완료 (F6-4) */
const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  ORDERED: "ACCEPTED",
  ACCEPTED: "MAKING",
  MAKING: "SHIPPING",
  SHIPPING: "DELIVERED",
};

const NEXT_LABEL: Partial<Record<OrderStatus, string>> = {
  ORDERED: "접수 확인",
  ACCEPTED: "제작 시작",
  MAKING: "출발 처리",
  SHIPPING: "배송 완료",
};

const MINE = ORDERS.filter(
  (o) => o.supplierId === ME.id || o.status === "ORDERED"
);

export default function SupplierAdminPage() {
  const [states, setStates] = useState<Record<string, OrderStatus>>({});

  const statusOf = (order: Order) => states[order.id] ?? order.status;
  const newOrders = MINE.filter((o) => statusOf(o) === "ORDERED");
  const inProgress = MINE.filter((o) =>
    ["ACCEPTED", "MAKING", "SHIPPING"].includes(statusOf(o))
  );
  const done = MINE.filter((o) => statusOf(o) === "DELIVERED");

  const advance = (order: Order) => {
    const next = NEXT_STATUS[statusOf(order)];
    if (next) setStates((s) => ({ ...s, [order.id]: next }));
  };

  return (
    <DeskShell
      title="발주 접수 어드민"
      subtitle={`${ME.name} · ${ME.regions.join(", ")} · ${ME.businessHours}${
        ME.nightSupport ? " · 야간 대응" : ""
      }`}
      back={{ href: "/", label: "홈" }}
      aside={
        <Link
          href="/supplier/onboarding"
          className="rounded-lg border border-line bg-surface px-4 py-2.5 text-[13px] font-semibold text-ink transition hover:bg-surface-2"
        >
          공급사 온보딩 현황
        </Link>
      }
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat
          label="SLA 스코어"
          value={String(ME.slaScore)}
          note="배정 우선순위에 반영"
          tone="info"
        />
        <Stat label="접수율" value={`${ME.acceptRate}%`} note="15분 내 접수" />
        <Stat label="정시 배송률" value={`${ME.onTimeRate}%`} />
        <Stat
          label="증빙 등록률"
          value={`${ME.proofRate}%`}
          note={ME.proofRate < 85 ? "85% 미만 · 정산주기 단축 대상 아님" : "정산주기 단축 적용"}
          tone={ME.proofRate < 85 ? "warn" : "ok"}
        />
      </div>

      {newOrders.length > 0 && (
        <div className="mt-7">
          <Callout tone="warn" title={`신규 발주 ${newOrders.length}건`}>
            15분 내 접수하지 않으면 재알림이 발송되고, 30분을 넘기면 대체
            공급사로 자동 전환됩니다.
          </Callout>
        </div>
      )}

      <OrderGroup
        title="신규 발주"
        orders={newOrders}
        statusOf={statusOf}
        onAdvance={advance}
        empty="새로 들어온 발주가 없습니다."
      />
      <OrderGroup
        title="진행 중"
        orders={inProgress}
        statusOf={statusOf}
        onAdvance={advance}
        empty="진행 중인 발주가 없습니다."
      />
      <OrderGroup
        title="완료"
        orders={done}
        statusOf={statusOf}
        onAdvance={advance}
        empty="완료된 발주가 없습니다."
      />

      <div className="mt-8">
        <h2 className="text-[15px] font-bold text-ink">월 정산</h2>
        <Card className="mt-3">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-[13px] font-semibold text-ink">2026년 8월 정산서</p>
              <p className="mt-1 text-[12.5px] text-ink-2">
                증빙 등록 건 {done.filter((o) => o.proofPhoto).length}건은 익월
                정산, 미등록 건 {done.filter((o) => !o.proofPhoto).length}건은
                차차월 이월
              </p>
              <p className="mt-1 text-[12px] text-ink-3">
                과세유형 {ME.taxType === "GENERAL" ? "일반과세" : ME.taxType} ·
                적격증빙 발급 {ME.properEvidence ? "가능" : "불가"}
              </p>
            </div>
            <Button variant="ghost" className="w-auto px-5">
              정산서 내려받기
            </Button>
          </div>
        </Card>
      </div>
    </DeskShell>
  );
}

function OrderGroup({
  title,
  orders,
  statusOf,
  onAdvance,
  empty,
}: {
  title: string;
  orders: Order[];
  statusOf: (order: Order) => OrderStatus;
  onAdvance: (order: Order) => void;
  empty: string;
}) {
  return (
    <div className="mt-8">
      <div className="flex items-center gap-2">
        <h2 className="text-[15px] font-bold text-ink">{title}</h2>
        <span className="text-[13px] font-semibold text-ink-3">
          {orders.length}
        </span>
      </div>

      {orders.length === 0 ? (
        <p className="mt-3 rounded-xl border border-dashed border-line bg-surface-2 px-4 py-5 text-center text-[12.5px] text-ink-3">
          {empty}
        </p>
      ) : (
        <div className="mt-3 space-y-3">
          {orders.map((order) => {
            const status = statusOf(order);
            const nextLabel = NEXT_LABEL[status];

            return (
              <Card key={order.id} className="bg-surface">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-[11px] font-semibold text-ink-3">
                        {order.id}
                      </span>
                      <StatusBadge status={status} />
                      {order.acceptedInMin !== null && (
                        <span className="text-[11.5px] text-ink-3">
                          {order.acceptedInMin}분 만에 접수
                        </span>
                      )}
                    </div>

                    <p className="mt-2 text-[15px] font-bold text-ink">
                      {order.venueName} {order.roomNo}
                    </p>
                    <p className="mt-1 text-[13px] text-ink-2">
                      {order.productName} · {formatKRW(order.amount)}
                    </p>

                    <div className="mt-3 rounded-lg border border-line-2 bg-surface-2 p-3">
                      <p className="text-[11.5px] font-semibold text-ink-3">
                        리본 문구 (텍스트 · 이미지 이중 전달)
                      </p>
                      <p className="mt-1 text-[13px] font-semibold text-ink">
                        {order.ribbonPhrase}
                      </p>
                      <p className="text-[13px] text-ink">{order.ribbonSender}</p>
                    </div>

                    <p className="mt-2.5 text-[12.5px] text-ink-2">
                      도착 희망 {formatDateTime(order.visitAt)} 이전
                    </p>
                  </div>

                  <div className="flex w-full shrink-0 flex-col gap-2 sm:w-[168px]">
                    {nextLabel && (
                      <Button onClick={() => onAdvance(order)}>{nextLabel}</Button>
                    )}
                    {status === "DELIVERED" && (
                      <Badge tone={order.proofPhoto ? "ok" : "warn"}>
                        {order.proofPhoto ? "증빙 등록됨" : "증빙 미등록"}
                      </Badge>
                    )}
                    {order.venueIssue && <Badge tone="warn">반입 이슈 보고</Badge>}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: OrderStatus }) {
  const tone =
    status === "DELIVERED"
      ? "ok"
      : status === "ORDERED"
        ? "warn"
        : status === "CANCELLED"
          ? "danger"
          : "info";
  return <Badge tone={tone}>{ORDER_STATUS_LABEL[status]}</Badge>;
}
