"use client";

import { useMemo, useState } from "react";
import {
  Badge,
  Button,
  Callout,
  Card,
  LinkButton,
  MobileShell,
  Section,
  StepBar,
} from "@/components/ui";
import { useDraft } from "@/lib/draft";
import { formatDateTime, formatKRW } from "@/lib/format";
import { WREATH_PRODUCTS, findVenue } from "@/lib/mock-data";
import { dataOf, findEmployee, findRecipient } from "@/lib/tenant-data";
import { useCurrentTenant } from "@/lib/tenant-context";
import { decideExecution, decidePolicy } from "@/lib/policy";
import { buildRibbon } from "@/lib/ribbon";
import { ACCOUNT_LABEL } from "@/lib/types";

/** 진행 상태 — 접수부터 정산까지 (F6-4, F7) */
type StageState = "DONE" | "ACTIVE" | "PENDING";

interface Stage {
  key: string;
  title: string;
  detail: string;
  state: StageState;
}

export default function DonePage() {
  const tenant = useCurrentTenant();
  const me = dataOf(tenant.id).currentUser;
  const draft = useDraft();
  const [cancelled, setCancelled] = useState(false);

  const model = useMemo(() => {
    if (!draft) return null;
    const decision = decidePolicy(draft, me.costCenter, tenant.id);
    const product = WREATH_PRODUCTS.find((p) => p.id === draft.productId) ?? null;
    const execution = decideExecution(decision, product);
    return { decision, product, execution, ribbon: buildRibbon(draft, tenant.id) };
  }, [draft, tenant.id, me.costCenter]);

  if (!draft || !model) {
    return (
      <MobileShell
        title="신청 완료"
        back={{ href: "/", label: "홈" }}
        footer={
          <LinkButton href="/apply" variant="ghost">
            신청서 작성하기
          </LinkButton>
        }
      >
        <StepBar current={4} total={4} />
        <Card>
          <p className="text-[13px] text-ink-2">
            전달된 신청 정보가 없습니다. 신청서를 먼저 작성해 주세요.
          </p>
        </Card>
      </MobileShell>
    );
  }

  const { decision, product, execution, ribbon } = model;
  const auto = execution.result === "AUTO_APPROVE";
  const venue = findVenue(draft.venueId);

  const targetName =
    draft.targetKind === "EMPLOYEE"
      ? (() => {
          const e = findEmployee(tenant.id, draft.targetId);
          return e ? `${e.name} ${e.rank}` : "대상자";
        })()
      : (() => {
          const r = findRecipient(tenant.id, draft.targetId);
          return r ? r.name : draft.manualTargetName || "수신자";
        })();

  const venueText = draft.venueUndecided
    ? "빈소 미정 — 확정 시 자동 재개"
    : venue
      ? `${venue.name}${draft.roomNo ? ` ${draft.roomNo}` : ""}`
      : `${draft.manualVenueName}${draft.roomNo ? ` ${draft.roomNo}` : ""}`;

  // 발주서에 반입 규정을 함께 실어 보낸다.
  // 사전 판정은 장례식장 DB 로 하되, 현장이 다르면 공급사가 회신하게 하는 2차 방어선이다.
  const venueRuleText = draft.venueUndecided
    ? "빈소 확정 후 조회"
    : !venue
      ? "마스터에 없는 장소 — 공급사 현장 확인 필요"
      : venue.wreathAllowed === false
        ? `반입 불가 — ${venue.restrictionReason ?? "사유 미기재"}`
        : [
            venue.wreathAllowed === null ? "반입 여부 확인 필요" : "반입 가능",
            venue.entryHours ? `반입 ${venue.entryHours}` : null,
            venue.entryFee > 0
              ? `반입료 ${venue.entryFee.toLocaleString("ko-KR")}원`
              : null,
            venue.restrictionReason,
          ]
            .filter(Boolean)
            .join(" · ");

  const stages = buildStages(auto, draft.venueUndecided, cancelled);

  return (
    <MobileShell
      title={cancelled ? "신청이 취소되었습니다" : "신청이 접수되었습니다"}
      subtitle={`신청번호 ZC-2608-0417 · ${targetName} 경조사`}
      back={{ href: "/", label: "홈" }}
      footer={
        <div className="space-y-2">
          <LinkButton href="/" variant="ghost">
            홈으로
          </LinkButton>
          {!cancelled && (
            <Button
              variant="ghost"
              className="border-danger/30 text-danger"
              onClick={() => setCancelled(true)}
            >
              발주 취소 (15분 이내 전액 취소)
            </Button>
          )}
        </div>
      }
    >
      <StepBar current={4} total={4} />

      {cancelled ? (
        <Callout tone="danger" title="발주가 취소되었습니다">
          제작 착수 전이라 취소 수수료 없이 처리되었습니다. 취소 사실이 신청자와
          총무팀에 통보되었습니다.
        </Callout>
      ) : (
        <Callout
          tone={auto ? "ok" : "warn"}
          title={
            auto
              ? "자동승인되어 발주가 송신되었습니다"
              : "승인 요청이 발송되었습니다"
          }
        >
          {auto
            ? "공급사 접수 확인까지 보통 15분 이내입니다. 배송이 완료되면 알림을 보내드립니다."
            : "승인권자에게 알림톡이 발송되었습니다. 지정 시간 내 미승인 시 차상위로 자동 에스컬레이션되며, 급한 경우 총무팀이 선발주할 수 있습니다."}
        </Callout>
      )}

      <div className="mt-7">
        <Section title="진행 현황">
          <ol className="relative space-y-0">
            {stages.map((stage, i) => (
              <li key={stage.key} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <span
                    className={`mt-1 size-2.5 shrink-0 rounded-full ${
                      stage.state === "DONE"
                        ? "bg-brand"
                        : stage.state === "ACTIVE"
                          ? "bg-brand ring-4 ring-brand/15"
                          : "bg-line"
                    }`}
                  />
                  {i < stages.length - 1 && (
                    <span
                      className={`w-px flex-1 ${
                        stage.state === "DONE" ? "bg-brand/40" : "bg-line"
                      }`}
                    />
                  )}
                </div>
                <div className="flex-1 pb-5">
                  <div className="flex items-center gap-2">
                    <p
                      className={`text-[14px] font-bold ${
                        stage.state === "PENDING" ? "text-ink-3" : "text-ink"
                      }`}
                    >
                      {stage.title}
                    </p>
                    {stage.state === "ACTIVE" && <Badge tone="info">진행 중</Badge>}
                  </div>
                  <p className="mt-0.5 text-[12.5px] leading-relaxed text-ink-2">
                    {stage.detail}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </Section>

        <Section title="발주 내용">
          <Card className="divide-y divide-line-2 p-0">
            <Row label="상품" value={product?.name ?? "—"} />
            <Row
              label="금액"
              value={
                product
                  ? `${formatKRW(product.price)} · ${ACCOUNT_LABEL[decision.account]}`
                  : "—"
              }
            />
            <Row label="애도 문구" value={ribbon.phrase} />
            <Row label="발신 명의" value={ribbon.sender} />
            <Row label="수령지" value={venueText} />
            <Row label="반입 규정" value={venueRuleText} />
            <Row
              label="도착 희망"
              value={
                draft.visitAt
                  ? `${formatDateTime(draft.visitAt)} 이전 (조문 시각)`
                  : draft.eventAt
                    ? `${formatDateTime(draft.eventAt)} 이전 (발인 기준)`
                    : "일시 미입력"
              }
            />
          </Card>
        </Section>

        <Section
          title="알림 발송"
          description="상태가 바뀔 때마다 아래 대상에게 자동으로 발송됩니다."
        >
          <Card className="divide-y divide-line-2 p-0">
            <NotifyRow
              who={`신청자 · ${me.name} ${me.rank}`}
              when="접수 · 승인 · 발주 · 배송완료"
              sent={!cancelled}
            />
            <NotifyRow
              who="총무 담당자"
              when="예외 · SLA 초과 · 반입 이슈"
              sent={!auto || draft.venueUndecided}
            />
            <NotifyRow
              who="승인권자"
              when="승인 요청 · 에스컬레이션"
              sent={!auto && !cancelled}
            />
            <NotifyRow
              who="공급사"
              when="신규 발주 · 완료 독촉"
              sent={auto && !cancelled && !draft.venueUndecided}
            />
          </Card>
        </Section>
      </div>

      <p className="mt-6 text-[11.5px] leading-relaxed text-ink-3">
        반입 가능 여부는 장례식장 DB 로 발주 전에 판정합니다. 현장 사정이 다르면
        공급사가 회신하며, 이 경우 총무팀이 대체 상품으로 변경합니다.
      </p>
      <p className="mt-2 text-[11.5px] leading-relaxed text-ink-3">
        발주 · 판정 근거 · 승인 이력 · 배송 증빙은 이 신청번호로 영구 연결되어
        보관됩니다.
      </p>
    </MobileShell>
  );
}

function buildStages(
  auto: boolean,
  venueUndecided: boolean,
  cancelled: boolean
): Stage[] {
  if (cancelled) {
    return [
      { key: "received", title: "신청 접수", detail: "부고 정보 입력 완료", state: "DONE" },
      { key: "cancelled", title: "발주 취소", detail: "제작 착수 전 전액 취소 처리", state: "DONE" },
    ];
  }

  const stages: Stage[] = [
    {
      key: "received",
      title: "신청 접수",
      detail: "부고 정보 입력 및 규정 판정 완료",
      state: "DONE",
    },
    {
      key: "approval",
      title: auto ? "자동승인" : "승인 대기",
      detail: auto
        ? "사내 규정 이내로 승인 절차 없이 처리"
        : "승인권자 알림톡 발송 · SLA 타이머 작동 중",
      state: auto ? "DONE" : "ACTIVE",
    },
  ];

  if (venueUndecided) {
    stages.push({
      key: "venue",
      title: "빈소 확정 대기",
      detail: "장소가 입력되면 발주가 자동으로 재개됩니다",
      state: auto ? "ACTIVE" : "PENDING",
    });
  }

  const orderState: StageState =
    auto && !venueUndecided ? "ACTIVE" : "PENDING";

  stages.push(
    {
      key: "order",
      title: "ZENO SCM 발주 전달",
      detail: "공급사 배정과 발주 송신은 SCM 이 처리합니다",
      state: orderState,
    },
    {
      key: "accept",
      title: "공급사 접수",
      detail: "SCM 에서 접수 상태를 받아 표시합니다",
      state: "PENDING",
    },
    {
      key: "delivery",
      title: "배송 완료",
      detail: "공급사 원탭 완료 처리 후 증빙 등록",
      state: "PENDING",
    }
  );

  return stages;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3 px-4 py-3">
      <span className="w-[76px] shrink-0 text-[12.5px] font-semibold text-ink-3">
        {label}
      </span>
      <span className="min-w-0 flex-1 text-[13px] leading-relaxed text-ink">
        {value}
      </span>
    </div>
  );
}

function NotifyRow({
  who,
  when,
  sent,
}: {
  who: string;
  when: string;
  sent: boolean;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold text-ink">{who}</p>
        <p className="mt-0.5 text-[12px] text-ink-3">{when}</p>
      </div>
      <Badge tone={sent ? "ok" : "neutral"}>{sent ? "발송" : "대기"}</Badge>
    </div>
  );
}
