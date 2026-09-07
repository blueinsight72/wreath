"use client";

import { useState } from "react";
import {
  Badge,
  Button,
  Callout,
  Card,
  LinkButton,
  MobileShell,
  Section,
} from "@zeno/core/components/ui";
import { formatDateTime, formatKRW } from "@zeno/core/lib/format";
import { ORDERS, type Order } from "@zeno/core/lib/ops-data";
import { REGIME_LABEL } from "@zeno/core/lib/types";

type Verdict = "APPROVED" | "REJECTED";

const PENDING = ORDERS.filter((o) => o.status === "APPROVAL_PENDING");

export default function ApprovalsPage() {
  const [openId, setOpenId] = useState<string | null>(null);
  const [verdicts, setVerdicts] = useState<Record<string, Verdict>>({});
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const remaining = PENDING.filter((o) => !verdicts[o.id]);

  return (
    <MobileShell
      title="승인 요청"
      subtitle={
        remaining.length > 0
          ? `${remaining.length}건이 승인을 기다리고 있습니다.`
          : "처리할 승인 요청이 없습니다."
      }
      back={{ href: "/", label: "홈" }}
      footer={
        <LinkButton href="/" variant="ghost">
          홈으로
        </LinkButton>
      }
    >
      <Callout tone="info">
        사내 규정 이내 건은 자동승인되어 이 목록에 오지 않습니다. 규정 초과 ·
        예외 건만 판단하시면 됩니다.
      </Callout>

      <div className="mt-6 space-y-3">
        {PENDING.map((order) => {
          const verdict = verdicts[order.id];
          const open = openId === order.id;

          return (
            <div
              key={order.id}
              className={`overflow-hidden rounded-xl border ${
                verdict ? "border-line bg-surface-2" : "border-line bg-surface"
              }`}
            >
              <button
                type="button"
                onClick={() => setOpenId(open ? null : order.id)}
                className="block w-full p-4 text-left"
              >
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[11px] font-semibold text-ink-3">
                    {order.id}
                  </span>
                  {verdict ? (
                    <Badge tone={verdict === "APPROVED" ? "ok" : "danger"}>
                      {verdict === "APPROVED" ? "승인함" : "반려함"}
                    </Badge>
                  ) : (
                    <SlaBadge minutes={order.slaRemainingMin} />
                  )}
                </div>

                <p className="mt-2 text-[15.5px] font-bold text-ink">
                  {order.targetLabel} · {order.eventTypeLabel}
                </p>
                <p className="mt-0.5 text-[12.5px] text-ink-2">
                  {order.targetOrg}
                </p>
                <p className="mt-1.5 text-[13px] text-ink">
                  <span className="font-bold">{formatKRW(order.amount)}</span>
                  <span className="text-ink-3">
                    {" "}
                    · {order.productName} · 신청 {order.applicantName}
                  </span>
                </p>

                {!open && order.approvalReasons.length > 0 && (
                  <p className="mt-2 text-[12px] font-semibold text-warn">
                    {order.approvalReasons.map((r) => r.label).join(" · ")}
                  </p>
                )}
              </button>

              {open && <OrderDetail order={order} />}

              {open && !verdict && (
                <div className="border-t border-line p-4">
                  {rejectingId === order.id ? (
                    <div className="space-y-2.5">
                      <textarea
                        className="control min-h-[72px] resize-none"
                        placeholder="반려 사유를 입력하세요. 신청자에게 그대로 전달됩니다."
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          variant="ghost"
                          onClick={() => {
                            setRejectingId(null);
                            setRejectReason("");
                          }}
                        >
                          취소
                        </Button>
                        <Button
                          disabled={!rejectReason.trim()}
                          className="bg-danger hover:bg-danger"
                          onClick={() => {
                            setVerdicts((v) => ({
                              ...v,
                              [order.id]: "REJECTED",
                            }));
                            setRejectingId(null);
                            setRejectReason("");
                          }}
                        >
                          반려 확정
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="ghost"
                        onClick={() => setRejectingId(order.id)}
                      >
                        반려
                      </Button>
                      <Button
                        onClick={() =>
                          setVerdicts((v) => ({ ...v, [order.id]: "APPROVED" }))
                        }
                      >
                        승인
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {open && verdict === "APPROVED" && (
                <div className="border-t border-line bg-ok-soft px-4 py-3">
                  <p className="text-[12.5px] font-semibold text-ok">
                    승인 완료 — 공급사에 발주가 송신되었습니다.
                  </p>
                </div>
              )}
              {open && verdict === "REJECTED" && (
                <div className="border-t border-line bg-danger-soft px-4 py-3">
                  <p className="text-[12.5px] font-semibold text-danger">
                    반려 완료 — 신청자와 총무팀에 사유가 전달되었습니다.
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p className="mt-7 text-[11.5px] leading-relaxed text-ink-3">
        승인 · 반려 이력은 판정 근거 스냅샷과 함께 발주 건에 영구 연결됩니다.
      </p>
    </MobileShell>
  );
}

function OrderDetail({ order }: { order: Order }) {
  return (
    <div className="border-t border-line">
      {order.approvalReasons.length > 0 && (
        <div className="space-y-2.5 p-4">
          {order.approvalReasons.map((reason) => (
            <Callout key={reason.label} tone="warn" title={reason.label}>
              {reason.detail}
            </Callout>
          ))}
        </div>
      )}

      <Section title="">
        <div className="px-4 pb-4">
          <Card className="divide-y divide-line-2 p-0">
            <Row
              label="수신자"
              value={`${order.targetLabel} · ${order.targetOrg}`}
            />
            <Row
              label="레짐"
              value={
                order.regime === "UNKNOWN"
                  ? "미확인 — 자동승인 불가"
                  : `${order.regime} · ${REGIME_LABEL[order.regime]}`
              }
            />
            <Row
              label="사내 상한"
              value={
                order.internalLimit === null
                  ? "규정 외"
                  : formatKRW(order.internalLimit)
              }
            />
            {order.legalLimit !== null && (
              <Row
                label="법정 상한"
                value={`${formatKRW(order.legalLimit)} · 해제 불가`}
              />
            )}
            <Row
              label="신청 금액"
              value={`${formatKRW(order.amount)} · ${order.productName}`}
            />
            <Row label="리본 문구" value={order.ribbonPhrase} />
            <Row label="발신 명의" value={order.ribbonSender} />
            <Row
              label="수령지"
              value={`${order.venueName}${order.roomNo ? ` ${order.roomNo}` : ""}`}
            />
            <Row
              label="도착 희망"
              value={`${formatDateTime(order.visitAt)} 이전`}
            />
            <Row
              label="신청자"
              value={`${order.applicantName} · ${order.applicantDept} · ${order.createdAt}`}
            />
          </Card>
        </div>
      </Section>
    </div>
  );
}

function SlaBadge({ minutes }: { minutes: number }) {
  if (minutes < 0) {
    return (
      <Badge tone="danger">SLA {Math.abs(minutes)}분 초과 · 에스컬레이션됨</Badge>
    );
  }
  return <Badge tone="warn">승인 기한 {minutes}분 남음</Badge>;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3 px-4 py-3">
      <span className="w-[72px] shrink-0 text-[12.5px] font-semibold text-ink-3">
        {label}
      </span>
      <span className="min-w-0 flex-1 text-[13px] leading-relaxed text-ink">
        {value}
      </span>
    </div>
  );
}
