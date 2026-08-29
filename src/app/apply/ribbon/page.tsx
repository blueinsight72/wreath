"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { RibbonPreview } from "@/components/RibbonPreview";
import {
  Button,
  Callout,
  Card,
  Field,
  LinkButton,
  MobileShell,
  Section,
  StepBar,
} from "@/components/ui";
import { saveDraft, useDraft } from "@/lib/draft";
import {
  CURRENT_USER,
  RIBBON_MAX_LENGTH,
  SENDER_COMPANIES,
  findSenderCompany,
} from "@/lib/mock-data";
import {
  buildRibbon,
  isCrossCompany,
  phraseOptions,
  validateRibbon,
} from "@/lib/ribbon";
import {
  RELIGION_LABEL,
  SENDER_TYPE_LABEL,
  type ReligionType,
  type RequestDraft,
  type SenderType,
} from "@/lib/types";

const SENDER_TYPES: SenderType[] = ["COMPANY", "CEO", "DEPT", "PERSONAL"];

export default function RibbonPage() {
  const router = useRouter();
  const stored = useDraft();
  const [edits, setEdits] = useState<Partial<RequestDraft>>({});

  const draft = useMemo(() => {
    if (!stored) return null;
    // S1에서 고른 종교를 문구 기본값으로 가져온다
    const base: RequestDraft = {
      ...stored,
      phraseReligion:
        stored.phraseReligion === "UNKNOWN" && stored.religion !== "UNKNOWN"
          ? stored.religion
          : stored.phraseReligion,
    };
    return { ...base, ...edits };
  }, [stored, edits]);

  if (!draft) {
    return (
      <MobileShell
        title="리본 문구 확인"
        back={{ href: "/apply/policy", label: "판정 결과" }}
        footer={
          <LinkButton href="/apply" variant="ghost">
            신청서 작성하기
          </LinkButton>
        }
      >
        <StepBar current={3} total={4} />
        <Card>
          <p className="text-[13px] text-ink-2">
            전달된 신청 정보가 없습니다. 신청서를 먼저 작성해 주세요.
          </p>
        </Card>
      </MobileShell>
    );
  }

  const patch = (values: Partial<RequestDraft>) =>
    setEdits((prev) => ({ ...prev, ...values }));

  const ribbon = buildRibbon(draft);
  const issues = validateRibbon(ribbon);
  const hasBlocking = issues.some((i) => i.tone === "danger");
  const crossCompany = isCrossCompany(draft.senderCompanyId);
  const options = phraseOptions(draft);
  const company = findSenderCompany(draft.senderCompanyId);

  return (
    <MobileShell
      title="리본 문구 확인"
      subtitle="발주 전 마지막 확인 단계입니다. 이 문구가 그대로 제작됩니다."
      back={{ href: "/apply/policy", label: "판정 결과" }}
      footer={
        <div className="space-y-2">
          <Button
            disabled={hasBlocking}
            onClick={() => {
              saveDraft(draft);
              router.push("/apply/done");
            }}
          >
            {hasBlocking ? "문구를 수정해 주세요" : "확인 · 발주 진행"}
          </Button>
          <p className="text-center text-[12px] text-ink-3">
            발주 후 15분 이내에는 전액 취소할 수 있습니다.
          </p>
        </div>
      }
    >
      <StepBar current={3} total={4} />

      <div className="mb-7">
        <RibbonPreview ribbon={ribbon} />
      </div>

      {issues.length > 0 && (
        <div className="mb-7 space-y-2.5">
          {issues.map((issue) => (
            <Callout key={issue.code} tone={issue.tone}>
              {issue.message}
            </Callout>
          ))}
        </div>
      )}

      <Section
        title="발신 명의"
        description="소속 법인과 다른 법인 명의로도 보낼 수 있습니다."
      >
        <div className="grid grid-cols-2 gap-2">
          {SENDER_TYPES.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => patch({ senderType: type })}
              className={`rounded-lg border px-3 py-3 text-[14px] font-semibold transition ${
                draft.senderType === type
                  ? "border-brand bg-brand text-white"
                  : "border-line bg-surface text-ink-2 hover:bg-surface-2"
              }`}
            >
              {SENDER_TYPE_LABEL[type]}
            </button>
          ))}
        </div>

        <Field
          label="발신 명의 법인"
          hint={
            crossCompany
              ? `신청자 소속은 ${CURRENT_USER.company}입니다. 다른 법인 명의로 발송됩니다.`
              : undefined
          }
        >
          <select
            className="control"
            value={draft.senderCompanyId}
            onChange={(e) => patch({ senderCompanyId: e.target.value })}
          >
            {SENDER_COMPANIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.holding ? " (지주사)" : ""}
              </option>
            ))}
          </select>
        </Field>

        {draft.senderType === "CEO" && (
          <Callout tone="info">
            대표이사 명의는 {company.name} 대표이사 {company.ceoName} 이름으로
            나갑니다. 명의 사용 권한은 규정에 따라 총무팀이 사후 확인합니다.
          </Callout>
        )}

        <label className="flex items-start gap-2.5 rounded-lg border border-line bg-surface-2 p-3.5">
          <input
            type="checkbox"
            className="mt-0.5 size-4 accent-[var(--color-brand)]"
            checked={draft.attending}
            onChange={(e) => patch({ attending: e.target.checked })}
          />
          <span>
            <span className="block text-[14px] font-semibold text-ink">
              조문에 직접 참석할 예정입니다
            </span>
            <span className="mt-0.5 block text-[12px] leading-relaxed text-ink-2">
              개인 명의로 보낼 때 직함과 부서까지 표기합니다.
            </span>
          </span>
        </label>
      </Section>

      <Section
        title="애도 문구"
        description="종교에 따라 적절한 표현이 다릅니다. 상가의 종교를 아는 경우에만 바꿔 주세요."
      >
        <Field label="종교 · 예식 유형">
          <select
            className="control"
            value={draft.phraseReligion}
            onChange={(e) =>
              patch({
                phraseReligion: e.target.value as ReligionType,
                phraseOverride: "",
              })
            }
          >
            {(Object.keys(RELIGION_LABEL) as ReligionType[]).map((key) => (
              <option key={key} value={key}>
                {RELIGION_LABEL[key]}
              </option>
            ))}
          </select>
        </Field>

        <div className="space-y-2">
          {options.map((phrase) => {
            const selected = ribbon.phrase === phrase;
            return (
              <button
                key={phrase}
                type="button"
                onClick={() => patch({ phraseOverride: phrase })}
                className={`block w-full rounded-lg border px-4 py-3 text-left text-[14px] transition ${
                  selected
                    ? "border-brand bg-brand-soft font-semibold text-brand"
                    : "border-line bg-surface text-ink hover:border-brand-2"
                }`}
              >
                {phrase}
              </button>
            );
          })}
        </div>

        <Field
          label="문구 직접 입력"
          hint={`${ribbon.phrase.length}/${RIBBON_MAX_LENGTH}자 · 비워두면 위에서 고른 문구가 적용됩니다.`}
        >
          <input
            className="control"
            placeholder="직접 입력하지 않으면 선택한 문구가 사용됩니다"
            value={draft.phraseOverride}
            onChange={(e) => patch({ phraseOverride: e.target.value })}
          />
        </Field>
      </Section>

      <Section title="공급사 전달 내용">
        <Card className="divide-y divide-line-2 p-0">
          <Row label="애도 문구" value={ribbon.phrase} />
          <Row label="발신 명의" value={ribbon.sender} />
          <Row
            label="전달 방식"
            value="텍스트 + 리본 이미지 이중 전달 (구술 전달 없음)"
          />
        </Card>
      </Section>

      <p className="mt-6 text-[11.5px] leading-relaxed text-ink-3">
        문구는 발주와 동시에 확정되며, 제작 착수 이후에는 변경할 수 없습니다.
      </p>
    </MobileShell>
  );
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
