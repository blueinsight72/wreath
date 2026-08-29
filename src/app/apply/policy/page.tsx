"use client";

import { Callout, Card, LinkButton, MobileShell, StepBar } from "@/components/ui";
import { useDraft } from "@/lib/draft";
import { formatDateTime } from "@/lib/format";
import {
  findEmployee,
  findEventType,
  findRecipient,
  findRelation,
  findVenue,
} from "@/lib/mock-data";
import { RELIGION_LABEL, type RequestDraft } from "@/lib/types";

/**
 * S2 규정 판정 결과 · 상품 선택 — 2단계에서 구현 예정.
 * 현재는 S1이 수집한 값이 온전히 넘어왔는지 확인하는 검수용 화면이다.
 */
export default function PolicyPlaceholderPage() {
  const draft = useDraft();
  const rows = draft ? buildRows(draft) : [];

  return (
    <MobileShell
      title="규정 판정 결과"
      subtitle="S2 화면은 다음 단계에서 구현합니다."
      back={{ href: "/apply", label: "신청서 수정" }}
      footer={
        <LinkButton href="/apply" variant="ghost">
          신청서로 돌아가기
        </LinkButton>
      }
    >
      <StepBar current={2} total={4} />

      <Callout tone="info" title="아직 구현되지 않은 화면입니다">
        규정 판정 엔진, 상품 자동 추천, 상한 초과 경고는 2단계에서 만듭니다. 아래는
        1단계 화면이 수집한 값입니다.
      </Callout>

      <div className="mt-5">
        {!draft ? (
          <Card>
            <p className="text-[13px] text-ink-2">
              전달된 신청 정보가 없습니다. 신청서를 먼저 작성해 주세요.
            </p>
          </Card>
        ) : (
          <Card className="divide-y divide-line-2 p-0">
            {rows.map((row) => (
              <div key={row.label} className="flex gap-3 px-4 py-3">
                <span className="w-[86px] shrink-0 text-[12.5px] font-semibold text-ink-3">
                  {row.label}
                </span>
                <span className="min-w-0 flex-1 text-[13px] leading-relaxed text-ink">
                  {row.value}
                </span>
              </div>
            ))}
          </Card>
        )}
      </div>
    </MobileShell>
  );
}

function buildRows(draft: RequestDraft) {
  const employee = findEmployee(draft.targetId);
  const recipient = findRecipient(draft.targetId);
  const venue = findVenue(draft.venueId);

  const target =
    draft.targetKind === "EMPLOYEE"
      ? employee
        ? `${employee.name} ${employee.rank} · ${employee.dept}`
        : "—"
      : recipient
        ? `${recipient.name} · ${recipient.org} (${recipient.regime})`
        : draft.manualTargetName
          ? `${draft.manualTargetName} · ${draft.manualTargetOrg || "소속 미입력"} (레짐 미확인)`
          : "—";

  const venueText = draft.venueUndecided
    ? "빈소 미정 — 확정 시 자동 재개"
    : venue
      ? `${venue.name}${draft.roomNo ? ` ${draft.roomNo}` : ""}`
      : draft.manualVenueName
        ? `${draft.manualVenueName}${draft.roomNo ? ` ${draft.roomNo}` : ""} (직접 입력)`
        : "—";

  return [
    { label: "대상 구분", value: draft.targetKind === "EMPLOYEE" ? "자사 임직원" : "거래처 · 외부" },
    { label: "대상자", value: target },
    { label: "관계", value: findRelation(draft.relationCode)?.label ?? "—" },
    { label: "경조 유형", value: findEventType(draft.eventTypeCode)?.label ?? "—" },
    { label: "종교", value: RELIGION_LABEL[draft.religion] },
    { label: "발인", value: formatDateTime(draft.eventAt) || "—" },
    { label: "조문 예정", value: formatDateTime(draft.visitAt) || "—" },
    { label: "빈소", value: venueText },
    { label: "메모", value: draft.note || "—" },
  ];
}
