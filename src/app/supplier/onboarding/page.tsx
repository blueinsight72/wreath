"use client";

import { useState } from "react";
import {
  Badge,
  Button,
  Callout,
  Card,
  DeskShell,
  Field,
} from "@/components/ui";
import {
  ONBOARDING_STAGES,
  SUPPLIERS,
  TAX_TYPE_LABEL,
  type OnboardingStage,
  type TaxType,
} from "@/lib/ops-data";

/** 온보딩 진행 중인 공급사 (S8) */
const CANDIDATE = SUPPLIERS.find((s) => s.onboarding !== "ACTIVE") ?? SUPPLIERS[2];

export default function OnboardingPage() {
  const [stage, setStage] = useState<OnboardingStage>(CANDIDATE.onboarding);
  const [taxType, setTaxType] = useState<TaxType>(CANDIDATE.taxType);
  const [properEvidence, setProperEvidence] = useState(CANDIDATE.properEvidence);
  const [nightSupport, setNightSupport] = useState(CANDIDATE.nightSupport);

  const currentIndex = ONBOARDING_STAGES.findIndex((s) => s.key === stage);
  const isLast = currentIndex === ONBOARDING_STAGES.length - 1;

  return (
    <DeskShell
      title="공급사 온보딩"
      subtitle={`${CANDIDATE.name} · ${CANDIDATE.regions.join(", ")}`}
      back={{ href: "/supplier", label: "발주 어드민" }}
      aside={
        <Badge tone={isLast ? "ok" : "info"}>
          {currentIndex + 1} / {ONBOARDING_STAGES.length} 단계
        </Badge>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <ol className="space-y-0">
          {ONBOARDING_STAGES.map((s, i) => {
            const state =
              i < currentIndex ? "done" : i === currentIndex ? "active" : "todo";
            return (
              <li key={s.key} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <span
                    className={`mt-1 size-2.5 shrink-0 rounded-full ${
                      state === "done"
                        ? "bg-brand"
                        : state === "active"
                          ? "bg-brand ring-4 ring-brand/15"
                          : "bg-line"
                    }`}
                  />
                  {i < ONBOARDING_STAGES.length - 1 && (
                    <span
                      className={`w-px flex-1 ${
                        state === "done" ? "bg-brand/40" : "bg-line"
                      }`}
                    />
                  )}
                </div>
                <div className="flex-1 pb-5">
                  <p
                    className={`text-[13.5px] font-bold ${
                      state === "todo" ? "text-ink-3" : "text-ink"
                    }`}
                  >
                    {s.title}
                  </p>
                  <p className="mt-0.5 text-[12px] leading-relaxed text-ink-2">
                    {s.desc}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>

        <div>
          <Card className="bg-surface">
            <h2 className="text-[16px] font-bold text-ink">
              {ONBOARDING_STAGES[currentIndex].title}
            </h2>
            <p className="mt-1 text-[12.5px] text-ink-2">
              {ONBOARDING_STAGES[currentIndex].desc}
            </p>

            <div className="mt-5 space-y-4">
              {stage === "APPLIED" && (
                <>
                  <Field label="상호" required>
                    <input className="control" defaultValue={CANDIDATE.name} />
                  </Field>
                  <Field label="사업자등록번호" required>
                    <input className="control" placeholder="000-00-00000" />
                  </Field>
                  <Field label="발주 담당 연락처" required hint="증빙 링크가 이 번호로만 발송됩니다.">
                    <input className="control" placeholder="010-0000-0000" />
                  </Field>
                </>
              )}

              {stage === "SCREENING" && (
                <>
                  <DocRow name="사업자등록증" state="검토 완료" tone="ok" />
                  <DocRow name="통장 사본" state="검토 완료" tone="ok" />
                  <DocRow name="화훼 취급 증빙" state="검토 중" tone="warn" />
                </>
              )}

              {stage === "CONTRACT" && (
                <>
                  <Callout tone="info" title="표준 공급계약 3개 필수 조항">
                    아래 조항에 동의해야 계약이 체결됩니다.
                  </Callout>
                  <ClauseRow
                    title="생화 · 신품 확약"
                    body="재사용 화환을 공급하지 않으며, 위반 시 배정 중단 및 대금 환수 대상이 됩니다."
                  />
                  <ClauseRow
                    title="야간 · 주말 SLA"
                    body="부고는 시간을 가리지 않습니다. 영업시간 외 접수 가능 여부와 대응 시간을 계약에 명시합니다."
                  />
                  <ClauseRow
                    title="증빙 · 정산 조건"
                    body="증빙 등록 건은 익월, 미등록 건은 차차월 정산으로 이월됩니다. 대금 지급 자체를 거절하지 않습니다."
                  />
                </>
              )}

              {stage === "SETTLEMENT" && (
                <>
                  <Field
                    label="과세유형"
                    required
                    hint="화훼는 면세 · 간이과세 사업자가 흔합니다."
                  >
                    <select
                      className="control"
                      value={taxType}
                      onChange={(e) => setTaxType(e.target.value as TaxType)}
                    >
                      {(Object.keys(TAX_TYPE_LABEL) as TaxType[]).map((t) => (
                        <option key={t} value={t}>
                          {TAX_TYPE_LABEL[t]}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <label className="flex items-start gap-2.5 rounded-lg border border-line bg-surface-2 p-3.5">
                    <input
                      type="checkbox"
                      className="mt-0.5 size-4 accent-[var(--color-brand)]"
                      checked={properEvidence}
                      onChange={(e) => setProperEvidence(e.target.checked)}
                    />
                    <span>
                      <span className="block text-[14px] font-semibold text-ink">
                        적격증빙(세금계산서) 발급이 가능합니다
                      </span>
                      <span className="mt-0.5 block text-[12px] leading-relaxed text-ink-2">
                        접대비로 처리되는 3만원 초과 건 배정 조건입니다.
                      </span>
                    </span>
                  </label>

                  {!properEvidence && (
                    <Callout tone="warn" title="배정 범위가 제한됩니다">
                      적격증빙 발급이 불가하면 접대비 처리 건(거래처 대상 3만원
                      초과)에 배정되지 않습니다. 임직원 대상 복리후생비 건만
                      배정되며, 고객사 손금불산입 리스크가 사전 경고됩니다.
                    </Callout>
                  )}
                </>
              )}

              {stage === "COVERAGE" && (
                <>
                  <Field label="배송 권역" required>
                    <input
                      className="control"
                      defaultValue={CANDIDATE.regions.join(", ")}
                    />
                  </Field>
                  <Field label="영업시간" required>
                    <input
                      className="control"
                      defaultValue={CANDIDATE.businessHours}
                    />
                  </Field>
                  <label className="flex items-start gap-2.5 rounded-lg border border-line bg-surface-2 p-3.5">
                    <input
                      type="checkbox"
                      className="mt-0.5 size-4 accent-[var(--color-brand)]"
                      checked={nightSupport}
                      onChange={(e) => setNightSupport(e.target.checked)}
                    />
                    <span>
                      <span className="block text-[14px] font-semibold text-ink">
                        심야 · 주말 대응이 가능합니다
                      </span>
                      <span className="mt-0.5 block text-[12px] leading-relaxed text-ink-2">
                        야간 대응 공급사 풀에 포함되어 배정 우선순위가
                        올라갑니다.
                      </span>
                    </span>
                  </label>
                </>
              )}

              {stage === "ACTIVE" && (
                <Callout tone="ok" title="배정이 개시되었습니다">
                  계약 후 90일간은 SLA 스코어에 반영되지 않으며, 사진 증빙은
                  운영팀이 대신 등록해 드립니다. 문자나 카톡으로 보내주셔도
                  됩니다.
                </Callout>
              )}
            </div>

            {!isLast && (
              <div className="mt-6 flex gap-2">
                {currentIndex > 0 && (
                  <Button
                    variant="ghost"
                    className="w-auto px-5"
                    onClick={() =>
                      setStage(ONBOARDING_STAGES[currentIndex - 1].key)
                    }
                  >
                    이전
                  </Button>
                )}
                <Button
                  className="w-auto px-6"
                  onClick={() => setStage(ONBOARDING_STAGES[currentIndex + 1].key)}
                >
                  다음 단계
                </Button>
              </div>
            )}
          </Card>

          <p className="mt-4 text-[11.5px] leading-relaxed text-ink-3">
            공급사에게 시스템 사용을 요구하지 않습니다. 온보딩 이후 실제 운영은
            알림톡 안에서 끝납니다.
          </p>
        </div>
      </div>
    </DeskShell>
  );
}

function DocRow({
  name,
  state,
  tone,
}: {
  name: string;
  state: string;
  tone: "ok" | "warn";
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-line bg-surface-2 px-3.5 py-3">
      <span className="text-[13.5px] font-semibold text-ink">{name}</span>
      <Badge tone={tone}>{state}</Badge>
    </div>
  );
}

function ClauseRow({ title, body }: { title: string; body: string }) {
  return (
    <label className="flex items-start gap-2.5 rounded-lg border border-line bg-surface-2 p-3.5">
      <input
        type="checkbox"
        className="mt-0.5 size-4 accent-[var(--color-brand)]"
        defaultChecked
      />
      <span>
        <span className="block text-[14px] font-semibold text-ink">{title}</span>
        <span className="mt-0.5 block text-[12px] leading-relaxed text-ink-2">
          {body}
        </span>
      </span>
    </label>
  );
}
