"use client";

import { useState } from "react";
import {
  Badge,
  Button,
  Callout,
  Card,
  DeskShell,
  Field,
  Stat,
} from "@/components/ui";
import { formatKRW } from "@/lib/format";
import {
  ORDERS,
  ORDER_STATUS_LABEL,
  findSupplier,
  type Order,
} from "@/lib/ops-data";
import { POLICY_VERSION } from "@/lib/mock-data";

/** 총무가 실제로 손대야 하는 건만 골라낸다 — 나머지는 자동으로 흐른다 */
function exceptionsOf(order: Order) {
  const list: { label: string; tone: "warn" | "danger" }[] = [];
  if (order.status === "APPROVAL_PENDING") {
    list.push(
      order.slaRemainingMin < 0
        ? { label: `승인 SLA ${Math.abs(order.slaRemainingMin)}분 초과`, tone: "danger" }
        : { label: `승인 대기 ${order.slaRemainingMin}분 남음`, tone: "warn" }
    );
  }
  if (order.regime === "UNKNOWN") {
    list.push({ label: "수신자 레짐 미확인", tone: "warn" });
  }
  if (order.venueName === "빈소 미정") {
    list.push({ label: "빈소 미정", tone: "warn" });
  }
  if (order.venueIssue) {
    list.push({ label: "반입 이슈 보고", tone: "warn" });
  }
  if (order.status === "ORDERED" && order.acceptedInMin === null) {
    list.push({ label: "공급사 미접수", tone: "warn" });
  }
  if (order.status === "DELIVERED" && order.proofRequired && !order.proofPhoto) {
    list.push({ label: "증빙 미등록", tone: "warn" });
  }
  if (order.offSystem) {
    list.push({ label: "시스템 밖 발주 (사후 등록)", tone: "warn" });
  }
  return list;
}

export default function AdminDashboardPage() {
  const [registering, setRegistering] = useState(false);
  const [registered, setRegistered] = useState(false);

  const total = ORDERS.length;
  const autoApproved = ORDERS.filter(
    (o) => o.status !== "APPROVAL_PENDING" && o.approvalReasons.length === 0
  ).length;
  const offSystem = ORDERS.filter((o) => o.offSystem).length;
  const proofTargets = ORDERS.filter((o) => o.status === "DELIVERED");
  const proofDone = proofTargets.filter((o) => o.proofPhoto).length;

  const exceptions = ORDERS.map((o) => ({ order: o, flags: exceptionsOf(o) })).filter(
    (x) => x.flags.length > 0
  );

  return (
    <DeskShell
      title="총무 대시보드"
      subtitle="자동으로 흐르는 건은 보이지 않습니다. 손을 대야 하는 건만 모았습니다."
      back={{ href: "/", label: "홈" }}
      aside={
        <Button
          className="w-auto px-5"
          variant="ghost"
          onClick={() => setRegistering(true)}
        >
          시스템 밖 발주 사후 등록
        </Button>
      }
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat
          label="자동승인율"
          value={`${Math.round((autoApproved / total) * 100)}%`}
          note={`${autoApproved} / ${total}건`}
          tone="ok"
        />
        <Stat
          label="처리 필요"
          value={`${exceptions.length}건`}
          note="예외 · SLA · 증빙"
          tone={exceptions.length > 0 ? "warn" : "neutral"}
        />
        <Stat
          label="증빙 등록률"
          value={
            proofTargets.length
              ? `${Math.round((proofDone / proofTargets.length) * 100)}%`
              : "—"
          }
          note={`배송완료 ${proofTargets.length}건 기준`}
        />
        <Stat
          label="규정 판정 커버리지"
          value={`${Math.round(((total - offSystem) / total) * 100)}%`}
          note={`우회 ${offSystem}건`}
          tone={offSystem > 0 ? "warn" : "ok"}
        />
      </div>

      <Callout tone="info" title={`적용 규정 ${POLICY_VERSION}`}>
        모든 발주는 이 규정 버전으로 판정되었으며, 판정 근거 · 승인 이력 · 차단
        로그가 건별로 보관되어 있습니다.
      </Callout>

      {registering && !registered && (
        <Card className="mt-5 bg-surface">
          <h2 className="text-[15px] font-bold text-ink">
            시스템 밖 발주 사후 등록
          </h2>
          <p className="mt-1 text-[12.5px] leading-relaxed text-ink-2">
            전화 주문 등 시스템을 거치지 않은 건을 등록합니다. 리포트에 별도
            집계되며 법인카드 화훼 업종 사용 건과 대사됩니다.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="대상자" required>
              <input className="control" placeholder="성명 · 소속" />
            </Field>
            <Field label="금액" required>
              <input className="control" placeholder="0" inputMode="numeric" />
            </Field>
            <Field label="공급사" required>
              <input className="control" placeholder="상호" />
            </Field>
            <Field label="발주 사유" required hint="우회 사유가 리포트에 남습니다.">
              <input className="control" placeholder="예) 심야 부고로 전화 주문" />
            </Field>
          </div>
          <div className="mt-4 flex gap-2">
            <Button
              variant="ghost"
              className="w-auto px-5"
              onClick={() => setRegistering(false)}
            >
              취소
            </Button>
            <Button className="w-auto px-6" onClick={() => setRegistered(true)}>
              등록
            </Button>
          </div>
        </Card>
      )}

      {registered && (
        <div className="mt-5">
          <Callout tone="ok" title="사후 등록되었습니다">
            우회 구매로 별도 집계되며, 법인카드 대사 대상에 포함됩니다. 속도로
            전화를 이길 수는 없으므로 데이터라도 회수합니다.
          </Callout>
        </div>
      )}

      <div className="mt-8">
        <div className="flex items-center gap-2">
          <h2 className="text-[15px] font-bold text-ink">처리가 필요한 건</h2>
          <span className="text-[13px] font-semibold text-ink-3">
            {exceptions.length}
          </span>
        </div>

        <div className="mt-3 space-y-3">
          {exceptions.map(({ order, flags }) => (
            <Card key={order.id} className="bg-surface">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[11px] font-semibold text-ink-3">
                      {order.id}
                    </span>
                    <Badge tone="neutral">
                      {ORDER_STATUS_LABEL[order.status]}
                    </Badge>
                    {flags.map((f) => (
                      <Badge key={f.label} tone={f.tone}>
                        {f.label}
                      </Badge>
                    ))}
                  </div>

                  <p className="mt-2 text-[15px] font-bold text-ink">
                    {order.targetLabel} · {order.eventTypeLabel}
                  </p>
                  <p className="mt-0.5 text-[12.5px] text-ink-2">
                    {order.targetOrg} · 신청 {order.applicantName}(
                    {order.applicantDept})
                  </p>
                  <p className="mt-1.5 text-[13px] text-ink-2">
                    {formatKRW(order.amount)} · {order.productName} ·{" "}
                    {order.venueName}
                    {order.roomNo ? ` ${order.roomNo}` : ""}
                    {order.supplierId
                      ? ` · ${findSupplier(order.supplierId)?.name}`
                      : ""}
                  </p>
                </div>

                <div className="flex w-full shrink-0 flex-col gap-2 sm:w-[180px]">
                  {order.status === "APPROVAL_PENDING" && (
                    <Button className="text-[13.5px]">긴급 선발주</Button>
                  )}
                  {order.status === "DELIVERED" &&
                    order.proofRequired &&
                    !order.proofPhoto && (
                      <Button variant="ghost" className="text-[13.5px]">
                        증빙 대행 등록
                      </Button>
                    )}
                  {order.regime === "UNKNOWN" && (
                    <Button variant="ghost" className="text-[13.5px]">
                      수신자 마스터 등록
                    </Button>
                  )}
                </div>
              </div>

              {order.status === "APPROVAL_PENDING" && (
                <p className="mt-3 border-t border-line-2 pt-3 text-[12px] leading-relaxed text-ink-3">
                  긴급 선발주 시 사유 기록이 필수이며, 발주 후 사후 승인으로
                  처리됩니다.
                </p>
              )}
            </Card>
          ))}
        </div>
      </div>
    </DeskShell>
  );
}
