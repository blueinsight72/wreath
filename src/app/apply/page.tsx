"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { EmployeePicker, RecipientPicker } from "@/components/TargetPicker";
import { VenuePicker } from "@/components/VenuePicker";
import {
  Button,
  Callout,
  Field,
  MobileShell,
  Section,
  StepBar,
} from "@/components/ui";
import { saveDraft, useDraft } from "@/lib/draft";
import {
  EVENT_TYPES,
  RELATION_TYPES,
  findEmployee,
  findRecipient,
  findVenue,
} from "@/lib/mock-data";
import {
  EMPTY_DRAFT,
  RELIGION_LABEL,
  type Employee,
  type ExternalRecipient,
  type FuneralVenue,
  type ReligionType,
  type RequestDraft,
} from "@/lib/types";

type Errors = Partial<Record<keyof RequestDraft, string>>;

export default function ApplyPage() {
  const router = useRouter();

  const stored = useDraft();
  const [edits, setEdits] = useState<Partial<RequestDraft>>({});
  const [errors, setErrors] = useState<Errors>({});

  // 부고 인식(S14)이 채워 둔 초안이 있으면 그대로 이어서 작성한다
  const draft: RequestDraft = useMemo(
    () => ({ ...EMPTY_DRAFT, ...(stored ?? {}), ...edits }),
    [stored, edits]
  );

  const patch = (values: Partial<RequestDraft>) =>
    setEdits((prev) => ({ ...prev, ...values }));

  // 선택된 항목은 초안의 id에서 파생시킨다 — 별도 상태를 두면 프리필과 어긋난다
  const employee =
    draft.targetKind === "EMPLOYEE" ? findEmployee(draft.targetId) : null;
  const recipient =
    draft.targetKind === "EXTERNAL" ? findRecipient(draft.targetId) : null;
  const venue = findVenue(draft.venueId);
  const setEmployee = (e: Employee | null) => patch({ targetId: e?.id ?? null });
  const setRecipient = (r: ExternalRecipient | null) =>
    patch({ targetId: r?.id ?? null });
  const setVenue = (v: FuneralVenue | null) => patch({ venueId: v?.id ?? null });

  const isExternal = draft.targetKind === "EXTERNAL";

  /* 실시간 사전 고지 — 신청 시점에 승인 경로 전환을 미리 알린다 (F2-A-5) */
  const notices = useMemo(() => {
    const list: { tone: "info" | "warn" | "danger"; title: string; body: string }[] =
      [];

    if (isExternal) {
      const manualEntered = !recipient && draft.manualTargetName.trim().length > 0;
      if (manualEntered || recipient?.regime === "UNKNOWN") {
        list.push({
          tone: "warn",
          title: "자동승인 대상이 아닙니다",
          body: "수신자 레짐이 확인되지 않아 승인권자 승인 후 발주됩니다. 총무팀에 수신자 마스터 등록을 요청하면 다음 건부터 자동 처리됩니다.",
        });
      }
      if (recipient?.regime === "R1") {
        list.push({
          tone: "danger",
          title: "청탁금지법 적용 대상 수신자",
          body: "화환 10만원 법정 상한이 적용되며 초과 발주는 차단됩니다. 현금 경조금을 함께 보내는 경우 합산 10만원·현금 5만원 한도를 별도로 확인하십시오.",
        });
      }
      if (recipient?.regime === "R2") {
        list.push({
          tone: "warn",
          title: "보건의료인 대상 건",
          body: "약사법·의료기기법상 경제적 이익 제공 규제 검토가 완료되기 전까지 자동승인 없이 승인 경로로 처리됩니다.",
        });
      }
    }

    if (draft.venueUndecided) {
      list.push({
        tone: "info",
        title: "빈소 미정 상태로 접수됩니다",
        body: "빈소가 확정되면 알림을 보내드리며, 장소 입력 즉시 발주가 자동 재개됩니다.",
      });
    }

    if (venue?.wreathAllowed === false) {
      list.push({
        tone: "danger",
        title: "화환 반입이 거부되는 장소입니다",
        body: `${venue.restrictionReason ?? "반입 불가"} — 다음 단계에서 쌀화환·조화 바구니 등 대체 상품을 제안합니다.`,
      });
    } else if (venue && venue.verification === "NEEDS_CHECK") {
      list.push({
        tone: "warn",
        title: "반입 규정이 검증되지 않은 장소입니다",
        body: `최종 확인일 ${venue.updatedAt}. 반입 가능 여부가 확정된 정보가 아니므로 공급사 배정 시 재확인됩니다.`,
      });
    } else if (venue?.restrictionReason) {
      list.push({
        tone: "warn",
        title: "반입 제한이 있는 장소입니다",
        body: venue.restrictionReason,
      });
    }

    return list;
  }, [isExternal, recipient, venue, draft.manualTargetName, draft.venueUndecided]);

  function validate(): Errors {
    const next: Errors = {};

    if (isExternal) {
      if (!recipient && !draft.manualTargetName.trim()) {
        next.targetId = "수신자를 선택하거나 직접 입력해 주세요.";
      }
    } else if (!employee) {
      next.targetId = "대상 임직원을 선택해 주세요.";
    }

    if (!draft.relationCode) next.relationCode = "관계를 선택해 주세요.";
    if (!draft.eventTypeCode) next.eventTypeCode = "경조 유형을 선택해 주세요.";
    if (!draft.eventAt) next.eventAt = "발인 일시를 입력해 주세요.";
    // 조문 예정 시각은 선택 입력 — 부고 문자에 없는 경우가 많다
    if (draft.visitAt && draft.eventAt && draft.visitAt > draft.eventAt) {
      next.visitAt = "조문 예정 시각이 발인 일시보다 늦습니다.";
    }

    if (!draft.venueUndecided && !venue && !draft.manualVenueName.trim()) {
      next.venueId = "장례식장을 선택하거나 빈소 미정을 체크해 주세요.";
    }

    return next;
  }

  function handleSubmit() {
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length > 0) {
      const first = document.querySelector("[data-error=true]");
      first?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    saveDraft(draft);
    router.push("/apply/policy");
  }

  return (
    <MobileShell
      title="경조사 신청"
      subtitle="부고 정보만 입력하면 규정 판정·상품 선정·발주가 자동 실행됩니다."
      back={{ href: "/", label: "홈" }}
      footer={<Button onClick={handleSubmit}>다음 · 규정 판정 결과 보기</Button>}
    >
      <StepBar current={1} total={4} />

      <Link
        href="/apply/notice"
        className="mb-6 flex items-center gap-3 rounded-xl border border-brand/20 bg-brand-soft p-4 transition hover:border-brand"
      >
        <span className="min-w-0 flex-1">
          <span className="block text-[14px] font-bold text-brand">
            부고 문자 · 캡쳐로 자동 입력
          </span>
          <span className="mt-0.5 block text-[12.5px] leading-relaxed text-brand/80">
            받으신 부고를 붙여넣거나 캡쳐를 올리면 아래 항목을 대신 채웁니다.
          </span>
        </span>
        <span className="shrink-0 text-brand" aria-hidden>
          →
        </span>
      </Link>

      <Section title="누구의 경조사입니까?">
        <div className="grid grid-cols-2 gap-2">
          <SegmentButton
            active={!isExternal}
            onClick={() =>
              patch({
                targetKind: "EMPLOYEE",
                relationCode: "",
                targetId: null,
                manualTargetName: "",
                manualTargetOrg: "",
              })
            }
          >
            자사 임직원
          </SegmentButton>
          <SegmentButton
            active={isExternal}
            onClick={() =>
              patch({
                targetKind: "EXTERNAL",
                relationCode: "CLIENT",
                targetId: null,
              })
            }
          >
            거래처 · 외부
          </SegmentButton>
        </div>

        <div data-error={Boolean(errors.targetId)}>
          <Field
            label={isExternal ? "수신자" : "대상 임직원"}
            required
            error={errors.targetId}
            hint={
              isExternal
                ? "수신자 마스터에 등록된 사람만 자동승인 대상입니다."
                : "성명 또는 사번으로 검색하세요."
            }
          >
            {isExternal ? (
              <RecipientPicker
                selected={recipient}
                manualName={draft.manualTargetName}
                manualOrg={draft.manualTargetOrg}
                onSelect={setRecipient}
                onManualChange={(name, org) =>
                  patch({ manualTargetName: name, manualTargetOrg: org })
                }
              />
            ) : (
              <EmployeePicker selected={employee} onSelect={setEmployee} />
            )}
          </Field>
        </div>

        <div data-error={Boolean(errors.relationCode)}>
          <Field label="신청자와의 관계" required error={errors.relationCode}>
            <select
              className="control"
              value={draft.relationCode}
              onChange={(e) => patch({ relationCode: e.target.value })}
            >
              <option value="">선택하세요</option>
              {RELATION_TYPES.map((r) => (
                <option key={r.code} value={r.code}>
                  {r.label}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </Section>

      <Section title="경조 정보">
        <div data-error={Boolean(errors.eventTypeCode)}>
          <Field
            label="경조 유형"
            required
            error={errors.eventTypeCode}
            hint="축하 화환(결혼·출산·개업)은 Phase 1-C에서 제공됩니다."
          >
            <select
              className="control"
              value={draft.eventTypeCode}
              onChange={(e) => patch({ eventTypeCode: e.target.value })}
            >
              <option value="">선택하세요</option>
              <optgroup label="근조">
                {EVENT_TYPES.filter((t) => t.category === "근조").map((t) => (
                  <option key={t.code} value={t.code}>
                    {t.label}
                  </option>
                ))}
              </optgroup>
              <optgroup label="축하 (준비 중)">
                {EVENT_TYPES.filter((t) => t.category === "축하").map((t) => (
                  <option key={t.code} value={t.code} disabled>
                    {t.label}
                  </option>
                ))}
              </optgroup>
            </select>
          </Field>
        </div>

        <Field
          label="종교 · 예식 유형"
          hint="리본 문구가 종교에 따라 달라집니다. 모르면 중립 문구가 적용됩니다."
        >
          <select
            className="control"
            value={draft.religion}
            onChange={(e) => patch({ religion: e.target.value as ReligionType })}
          >
            {(Object.keys(RELIGION_LABEL) as ReligionType[]).map((key) => (
              <option key={key} value={key}>
                {RELIGION_LABEL[key]}
              </option>
            ))}
          </select>
        </Field>
      </Section>

      <Section title="일정">
        <div data-error={Boolean(errors.eventAt)}>
          <Field label="발인 일시" required error={errors.eventAt}>
            <input
              type="datetime-local"
              className="control"
              value={draft.eventAt}
              onChange={(e) => patch({ eventAt: e.target.value })}
            />
          </Field>
        </div>

        <div data-error={Boolean(errors.visitAt)}>
          <Field
            label="조문 예정 시각"
            error={errors.visitAt}
            hint="알면 입력해 주세요. 화환은 발인이 아니라 조문 시각 전에 도착해야 하므로, 입력하시면 배송 희망 시각이 더 정확해집니다. 비워두면 발인 전 도착 기준으로 배정됩니다."
          >
            <input
              type="datetime-local"
              className="control"
              value={draft.visitAt}
              onChange={(e) => patch({ visitAt: e.target.value })}
            />
          </Field>
        </div>
      </Section>

      <Section title="빈소">
        <label className="flex items-start gap-2.5 rounded-lg border border-line bg-surface-2 p-3.5">
          <input
            type="checkbox"
            className="mt-0.5 size-4 accent-[var(--color-brand)]"
            checked={draft.venueUndecided}
            onChange={(e) =>
              patch(
                e.target.checked
                  ? {
                      venueUndecided: true,
                      venueId: null,
                      manualVenueName: "",
                      roomNo: "",
                    }
                  : { venueUndecided: false }
              )
            }
          />
          <span>
            <span className="block text-[14px] font-semibold text-ink">
              빈소 미정
            </span>
            <span className="mt-0.5 block text-[12px] leading-relaxed text-ink-2">
              지금 접수하고 장소가 확정되면 이어서 발주합니다.
            </span>
          </span>
        </label>

        {!draft.venueUndecided && (
          <>
            <div data-error={Boolean(errors.venueId)}>
              <Field label="장례식장" required error={errors.venueId}>
                <VenuePicker
                  selected={venue}
                  manualName={draft.manualVenueName}
                  onSelect={setVenue}
                  onManualChange={(name) => patch({ manualVenueName: name })}
                />
              </Field>
            </div>

            <Field
              label="호실"
              hint="입력하신 값이 그대로 공급사에 전달됩니다. 부고 문자를 다시 한 번 확인해 주세요."
            >
              <input
                className="control"
                placeholder="예) 특2호실"
                value={draft.roomNo}
                onChange={(e) => patch({ roomNo: e.target.value })}
              />
            </Field>
          </>
        )}
      </Section>

      <Section title="전달 사항">
        <Field label="총무팀 전달 메모" hint="선택 입력입니다.">
          <textarea
            className="control min-h-[88px] resize-none"
            placeholder="예) 대표이사 명의로 요청드립니다."
            value={draft.note}
            onChange={(e) => patch({ note: e.target.value })}
          />
        </Field>
      </Section>

      {notices.length > 0 && (
        <div className="space-y-2.5">
          {notices.map((n) => (
            <Callout key={n.title} tone={n.tone} title={n.title}>
              {n.body}
            </Callout>
          ))}
        </div>
      )}
    </MobileShell>
  );
}

function SegmentButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border px-3 py-3 text-[14px] font-semibold transition ${
        active
          ? "border-brand bg-brand text-white"
          : "border-line bg-surface text-ink-2 hover:bg-surface-2"
      }`}
    >
      {children}
    </button>
  );
}
