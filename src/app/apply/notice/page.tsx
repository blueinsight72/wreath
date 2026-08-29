"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import {
  Badge,
  Button,
  Callout,
  Card,
  MobileShell,
  Section,
} from "@/components/ui";
import { saveDraft } from "@/lib/draft";
import { formatDateTime } from "@/lib/format";
import { findEventType } from "@/lib/mock-data";
import {
  CONFIDENCE_LABEL,
  SAMPLE_IMAGE_NOTICE,
  SAMPLE_TEXT_NOTICE,
  parseNotice,
  type Confidence,
  type ParsedNotice,
} from "@/lib/notice-parser";
import { EMPTY_DRAFT } from "@/lib/types";

const TONE: Record<Confidence, "ok" | "warn" | "danger"> = {
  HIGH: "ok",
  MEDIUM: "warn",
  LOW: "danger",
};

export default function NoticePage() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [parsed, setParsed] = useState<ParsedNotice | null>(null);
  const [source, setSource] = useState<"TEXT" | "IMAGE">("TEXT");
  const [imageName, setImageName] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const run = (raw: string, from: "TEXT" | "IMAGE") => {
    setSource(from);
    setText(raw);
    setParsed(parseNotice(raw));
  };

  const applyToForm = () => {
    if (!parsed) return;
    const target = parsed.matchedEmployee ?? parsed.matchedRecipient;
    saveDraft({
      ...EMPTY_DRAFT,
      targetKind: parsed.matchedRecipient ? "EXTERNAL" : "EMPLOYEE",
      targetId: target?.id ?? null,
      manualTargetName: target ? "" : (parsed.mourner?.value ?? ""),
      eventTypeCode: parsed.eventTypeCode?.value ?? "",
      eventAt: parsed.eventAt?.value ?? "",
      venueId: parsed.matchedVenue?.id ?? null,
      manualVenueName: parsed.matchedVenue ? "" : (parsed.venue?.value ?? ""),
      roomNo: parsed.roomNo?.value ?? "",
      note: parsed.deceased ? `고인 ${parsed.deceased.value}` : "",
    });
    router.push("/apply");
  };

  const missing = parsed
    ? [
        !parsed.eventAt && "발인 일시",
        !parsed.roomNo && "빈소 호실",
      ].filter(Boolean)
    : [];

  // 상주를 확실히 못 잡은 경우에만 강한 경고를 띄운다.
  // 마스터 미매칭은 별도 항목에서 안내하므로 여기서 겹쳐 경고하지 않는다.
  const mournerUncertain =
    parsed !== null && (parsed.mourner === null || parsed.mourner.confidence === "LOW");

  return (
    <MobileShell
      title="부고 인식"
      subtitle="부고 문자를 붙여넣거나 캡쳐 이미지를 올리면 신청서를 대신 채웁니다."
      back={{ href: "/apply", label: "직접 입력으로" }}
      footer={
        parsed ? (
          <div className="space-y-2">
            <Button onClick={applyToForm}>확인했습니다 · 신청서에 반영</Button>
            <p className="text-center text-[12px] text-ink-3">
              인식 결과는 초안입니다. 반영 후 신청서에서 다시 확인하세요.
            </p>
          </div>
        ) : (
          <Button disabled={!text.trim()} onClick={() => run(text, "TEXT")}>
            인식하기
          </Button>
        )
      }
    >
      {!parsed && (
        <>
          <Callout tone="warn" title="인식 결과는 그대로 발주되지 않습니다">
            추출된 값은 초안이며, 반드시 신청자가 확인한 뒤에야 실행됩니다.
            오인식이 곧 오배송이기 때문입니다.
          </Callout>

          <Section title="부고 문자 붙여넣기">
            <textarea
              className="control min-h-[180px] resize-none font-mono text-[13px]"
              placeholder="받으신 부고 문자를 그대로 붙여넣으세요."
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setText(SAMPLE_TEXT_NOTICE)}
              className="text-[12.5px] font-semibold text-brand-2 underline underline-offset-2"
            >
              예시 부고 문자 넣어보기
            </button>
          </Section>

          <Section
            title="캡쳐 이미지 업로드"
            description="카드형 부고 이미지도 인식합니다."
          >
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setImageName(file.name);
                run(SAMPLE_IMAGE_NOTICE, "IMAGE");
              }}
            />
            <Button variant="ghost" onClick={() => fileRef.current?.click()}>
              부고 캡쳐 이미지 선택
            </Button>
            <p className="field-hint">
              이미지 인식(OCR)은 서버 연동 후 동작합니다. 지금은 샘플 부고로
              결과 화면을 확인할 수 있습니다.
            </p>
          </Section>
        </>
      )}

      {parsed && (
        <>
          <Callout
            tone={mournerUncertain ? "danger" : "warn"}
            title={
              mournerUncertain
                ? "대상자를 반드시 확인해 주세요"
                : "확인이 필요한 초안입니다"
            }
          >
            {mournerUncertain
              ? "부고에 상주가 명확히 표기되어 있지 않습니다. 대상자가 바뀌면 규정 등급과 계정과목이 모두 달라집니다."
              : source === "IMAGE"
                ? `${imageName ?? "업로드한 이미지"}에서 추출한 결과입니다. 신뢰도가 낮은 항목은 원문과 대조해 주세요.`
                : "붙여넣은 문자에서 추출한 결과입니다. 신뢰도가 낮은 항목은 원문과 대조해 주세요."}
          </Callout>

          <Section title="추출 결과">
            <Card className="divide-y divide-line-2 p-0">
              <FieldRow label="고인" field={parsed.deceased} />
              <FieldRow label="상주" field={parsed.mourner} />
              <FieldRow label="관계" field={parsed.relation} />
              <FieldRow
                label="경조 유형"
                field={
                  parsed.eventTypeCode && {
                    ...parsed.eventTypeCode,
                    value:
                      findEventType(parsed.eventTypeCode.value)?.label ??
                      parsed.eventTypeCode.value,
                  }
                }
              />
              <FieldRow label="빈소" field={parsed.venue} />
              <FieldRow label="호실" field={parsed.roomNo} />
              <FieldRow
                label="발인"
                field={
                  parsed.eventAt && {
                    ...parsed.eventAt,
                    value: formatDateTime(parsed.eventAt.value),
                  }
                }
              />
              <FieldRow label="장지" field={parsed.burialSite} />
            </Card>
          </Section>

          {missing.length > 0 && (
            <div className="-mt-3 mb-7">
              <Callout
                tone="warn"
                title={`${missing.join(" · ")} 정보가 문자에 없습니다`}
              >
                {parsed.noticeUrl ? (
                  <>
                    모바일 부고장 링크에 있을 가능성이 높습니다. 링크를 확인한 뒤
                    신청서에서 입력해 주세요.
                    <a
                      href={parsed.noticeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 block truncate font-mono text-[11.5px] underline underline-offset-2"
                    >
                      {parsed.noticeUrl}
                    </a>
                  </>
                ) : (
                  "신청서에서 직접 입력해 주세요."
                )}
              </Callout>
            </div>
          )}

          {parsed.survivors.length > 0 && (
            <Section
              title="유족 명단"
              description="명단 전체를 임직원 · 거래처 마스터와 대조합니다."
            >
              <Card className="divide-y divide-line-2 p-0">
                {parsed.survivors.map((group) => (
                  <div key={group.role} className="flex gap-3 px-4 py-2.5">
                    <span className="w-[52px] shrink-0 text-[12.5px] font-semibold text-ink-3">
                      {group.role}
                    </span>
                    <span className="min-w-0 flex-1 text-[13px] text-ink">
                      {group.names.map((name, i) => {
                        const hit =
                          parsed.matchedFrom === "SURVIVOR" &&
                          (parsed.matchedEmployee?.name === name ||
                            parsed.matchedRecipient?.name === name);
                        return (
                          <span key={name}>
                            {i > 0 && ", "}
                            <span
                              className={
                                hit
                                  ? "rounded bg-ok-soft px-1 py-0.5 font-bold text-ok"
                                  : ""
                              }
                            >
                              {name}
                            </span>
                          </span>
                        );
                      })}
                    </span>
                  </div>
                ))}
              </Card>
            </Section>
          )}

          <Section title="마스터 매칭">
            {parsed.matchedEmployee ? (
              <Callout tone="ok" title="임직원으로 매칭되었습니다">
                {parsed.matchedEmployee.name} {parsed.matchedEmployee.rank} ·{" "}
                {parsed.matchedEmployee.dept} · 사번{" "}
                {parsed.matchedEmployee.empNo}
                {parsed.matchedFrom === "SURVIVOR" && (
                  <span className="mt-1 block">
                    유족 명단의 {parsed.matchedRole} 항목에서 찾았습니다.
                  </span>
                )}
              </Callout>
            ) : parsed.matchedRecipient ? (
              <Callout tone="info" title="거래처 수신자로 매칭되었습니다">
                {parsed.matchedRecipient.name} · {parsed.matchedRecipient.org} ·
                레짐{" "}
                {parsed.matchedRecipient.regime === "UNKNOWN"
                  ? "미확인"
                  : parsed.matchedRecipient.regime}
                {parsed.matchedFrom === "SURVIVOR" && (
                  <span className="mt-1 block">
                    유족 명단의 {parsed.matchedRole} 항목에서 찾았습니다.
                  </span>
                )}
              </Callout>
            ) : (
              <Callout tone="warn" title="유족 중 마스터에 등록된 사람이 없습니다">
                신청서에서 대상자를 직접 지정해 주세요. 매칭되지 않은 건은
                자동승인 대상이 아닙니다.
              </Callout>
            )}

            {parsed.matchedVenue ? (
              <Callout tone="ok" title="장례식장이 마스터와 연결되었습니다">
                {parsed.matchedVenue.name} · 반입{" "}
                {parsed.matchedVenue.wreathAllowed === false
                  ? "불가"
                  : parsed.matchedVenue.wreathAllowed === null
                    ? "확인 필요"
                    : "가능"}
              </Callout>
            ) : (
              <Callout tone="warn" title="장례식장을 특정하지 못했습니다">
                반입 규정을 확인할 수 없어 신청서에서 다시 선택해야 합니다.
              </Callout>
            )}
          </Section>

          <Section title="원문">
            <Card>
              <pre className="whitespace-pre-wrap font-mono text-[12px] leading-relaxed text-ink-2">
                {text}
              </pre>
            </Card>
            <button
              type="button"
              onClick={() => {
                setParsed(null);
                setImageName(null);
              }}
              className="text-[12.5px] font-semibold text-brand-2 underline underline-offset-2"
            >
              다시 인식하기
            </button>
          </Section>

          <p className="mt-6 text-[11.5px] leading-relaxed text-ink-3">
            조문 예정 시각은 부고에 없는 정보라 선택 입력입니다. 알고 계시면
            신청서에서 넣어 주세요. 비워두면 발인 전 도착 기준으로 배정됩니다.
          </p>
        </>
      )}
    </MobileShell>
  );
}

function FieldRow({
  label,
  field,
}: {
  label: string;
  field: { value: string; confidence: Confidence; evidence: string } | null;
}) {
  return (
    <div className="flex gap-3 px-4 py-3">
      <span className="w-[64px] shrink-0 text-[12.5px] font-semibold text-ink-3">
        {label}
      </span>
      <span className="min-w-0 flex-1">
        {field ? (
          <>
            <span className="flex flex-wrap items-center gap-2">
              <span className="text-[13.5px] font-semibold text-ink">
                {field.value}
              </span>
              <Badge tone={TONE[field.confidence]}>
                신뢰도 {CONFIDENCE_LABEL[field.confidence]}
              </Badge>
            </span>
            <span className="mt-0.5 block text-[11.5px] text-ink-3">
              {field.evidence}
            </span>
          </>
        ) : (
          <span className="text-[13px] text-ink-3">
            문자에 없습니다 — 직접 입력 필요
          </span>
        )}
      </span>
    </div>
  );
}
