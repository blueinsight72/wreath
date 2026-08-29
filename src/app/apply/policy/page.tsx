"use client";

import { useRouter } from "next/navigation";
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
import { ProductList } from "@/components/ProductList";
import { saveDraft, useDraft } from "@/lib/draft";
import { formatKRW } from "@/lib/format";
import { CURRENT_USER, findEmployee, findRecipient, findVenue } from "@/lib/mock-data";
import { decideExecution, decidePolicy, recommendProducts } from "@/lib/policy";
import { ACCOUNT_LABEL, REGIME_LABEL, type PolicyFlag } from "@/lib/types";

export default function PolicyPage() {
  const router = useRouter();
  const draft = useDraft();
  const [chosenId, setChosenId] = useState<string | null>(null);
  const [showBasis, setShowBasis] = useState(false);

  const model = useMemo(() => {
    if (!draft) return null;
    const decision = decidePolicy(draft, CURRENT_USER.costCenter);
    const { products, defaultId } = recommendProducts(decision, draft);
    return { decision, products, defaultId };
  }, [draft]);

  if (!draft || !model) {
    return (
      <MobileShell
        title="규정 판정 결과"
        back={{ href: "/apply", label: "신청서" }}
        footer={
          <LinkButton href="/apply" variant="ghost">
            신청서 작성하기
          </LinkButton>
        }
      >
        <StepBar current={2} total={4} />
        <Card>
          <p className="text-[13px] text-ink-2">
            전달된 신청 정보가 없습니다. 신청서를 먼저 작성해 주세요.
          </p>
        </Card>
      </MobileShell>
    );
  }

  const { decision, products, defaultId } = model;
  const selectedId = chosenId ?? defaultId;
  const product = products.find((p) => p.id === selectedId) ?? null;
  const execution = decideExecution(decision, product);

  const venue = findVenue(draft.venueId);
  const venueBlocked = venue?.wreathAllowed === false;
  // R1 가액범위 안내는 상시 노출한다 (현금 경조금 병행 시 합산 한도 경고 포함)
  const legalCapFlag = decision.flags.find((f) => f.code === "LEGAL_CAP") ?? null;
  const remaining = decision.budget.allocated - decision.budget.used;

  const targetName =
    draft.targetKind === "EMPLOYEE"
      ? (() => {
          const e = findEmployee(draft.targetId);
          return e ? `${e.name} ${e.rank}` : "대상자 미지정";
        })()
      : (() => {
          const r = findRecipient(draft.targetId);
          return r ? `${r.name} · ${r.org}` : draft.manualTargetName || "수신자 미지정";
        })();

  return (
    <MobileShell
      title="규정 판정 결과"
      subtitle={`${targetName} 건에 대한 사내 규정 판정입니다.`}
      back={{ href: "/apply", label: "신청서 수정" }}
      footer={
        <div className="space-y-2">
          <Button
            disabled={execution.result === "BLOCKED" || !product}
            onClick={() => {
              if (!product) return;
              saveDraft({ ...draft, productId: product.id });
              router.push("/apply/ribbon");
            }}
          >
            {execution.result === "AUTO_APPROVE"
              ? "다음 · 리본 문구 확인"
              : execution.result === "BLOCKED"
                ? "발주할 수 없습니다"
                : "다음 · 승인 요청으로 진행"}
          </Button>
          {execution.result === "BLOCKED" && (
            <p className="text-center text-[12px] text-ink-3">
              상한 이내 상품으로 변경하면 계속 진행할 수 있습니다.
            </p>
          )}
        </div>
      }
    >
      <StepBar current={2} total={4} />

      <VerdictCard
        result={execution.result}
        finalLimit={decision.finalLimit}
        price={product?.price ?? null}
      />

      {legalCapFlag && (
        <div className="-mt-4 mb-7">
          <Callout tone="danger" title={legalCapFlag.label}>
            {legalCapFlag.detail}
          </Callout>
        </div>
      )}

      <Section title="판정 요약">
        <Card className="divide-y divide-line-2 p-0">
          <SummaryRow
            label="수신자 레짐"
            value={
              <span className="inline-flex items-center gap-1.5">
                {decision.regime === "UNKNOWN"
                  ? "미확인"
                  : `${decision.regime} · ${REGIME_LABEL[decision.regime]}`}
              </span>
            }
          />
          <SummaryRow
            label="사내 상한"
            value={
              decision.internalLimit === null ? (
                <span className="text-ink-3">규정 외 — 승인권자 판단</span>
              ) : (
                <>
                  {formatKRW(decision.internalLimit)}
                  {decision.grade && (
                    <span className="ml-1.5 text-ink-3">({decision.grade}등급)</span>
                  )}
                </>
              )
            }
          />
          {decision.legalLimit !== null && (
            <SummaryRow
              label="법정 상한"
              value={
                <span className="font-semibold text-danger">
                  {formatKRW(decision.legalLimit)} · 해제 불가
                </span>
              }
            />
          )}
          <SummaryRow
            label="적용 상한"
            value={
              decision.finalLimit === null ? (
                <span className="text-ink-3">미산출</span>
              ) : (
                <span className="font-bold">{formatKRW(decision.finalLimit)}</span>
              )
            }
          />
          <SummaryRow
            label="계정과목"
            value={ACCOUNT_LABEL[decision.account]}
          />
          <SummaryRow
            label="부서 예산"
            value={
              <>
                잔액 {formatKRW(remaining)}
                <span className="ml-1.5 text-ink-3">
                  / {decision.budget.deptName}
                </span>
              </>
            }
          />
        </Card>

        <button
          type="button"
          onClick={() => setShowBasis((v) => !v)}
          className="text-[12.5px] font-semibold text-brand-2 underline underline-offset-2"
        >
          {showBasis ? "판정 근거 접기" : "판정 근거 보기"}
        </button>

        {showBasis && (
          <Card className="p-0">
            <div className="border-b border-line-2 px-4 py-3">
              <p className="text-[12px] font-semibold text-ink-3">적용 규정</p>
              <p className="mt-0.5 text-[13px] font-semibold text-ink">
                {decision.snapshot.policyVersion}
              </p>
              <p className="mt-0.5 text-[12px] text-ink-2">
                {decision.snapshot.policyApprovedAt} {decision.snapshot.policyApprovedBy}{" "}
                결재
                {decision.snapshot.matchedRuleId
                  ? ` · 규정 ${decision.snapshot.matchedRuleId}`
                  : ""}
              </p>
            </div>
            <div className="divide-y divide-line-2">
              {decision.snapshot.conditions.map((c) => (
                <div key={c.label} className="flex gap-3 px-4 py-2.5">
                  <span className="w-[72px] shrink-0 text-[12px] text-ink-3">
                    {c.label}
                  </span>
                  <span className="flex-1 text-[12.5px] text-ink">{c.value}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-line-2 px-4 py-3">
              <p className="text-[12px] font-semibold text-ink-3">상한 산출</p>
              <p className="mt-0.5 font-mono text-[12px] leading-relaxed text-ink">
                {decision.snapshot.limitFormula}
              </p>
              <p className="mt-2 text-[12px] font-semibold text-ink-3">레짐 근거</p>
              <p className="mt-0.5 text-[12.5px] leading-relaxed text-ink">
                {decision.snapshot.regimeBasis}
              </p>
            </div>
            <div className="border-t border-line-2 bg-surface px-4 py-2.5">
              <p className="text-[11.5px] leading-relaxed text-ink-3">
                이 판정 근거는 발주 시점에 스냅샷으로 고정 저장되어 감사 자료로
                사용됩니다.
              </p>
            </div>
          </Card>
        )}
      </Section>

      <Section
        title="상품 선택"
        description={
          venueBlocked
            ? "화환 반입이 거부되는 장소여서 대체 상품을 먼저 제안합니다."
            : "규정 등급에 맞는 상품이 기본 선택되어 있습니다. 변경할 수 있습니다."
        }
      >
        <ProductList
          products={products}
          selectedId={selectedId}
          recommendedId={defaultId}
          internalLimit={decision.internalLimit}
          legalLimit={decision.legalLimit}
          visitAt={draft.visitAt || draft.eventAt}
          onSelect={setChosenId}
        />
      </Section>

      {execution.reasons.length > 0 && (
        <Section title="확인이 필요한 사항">
          <div className="space-y-2.5">
            {execution.reasons.map((flag) => (
              <FlagCallout key={flag.code} flag={flag} />
            ))}
          </div>
        </Section>
      )}

      <p className="mt-6 text-[11.5px] leading-relaxed text-ink-3">
        본 판정은 사내 경조 규정 부합 여부이며, 개별 건의 법적 적법성을 보증하지
        않습니다.
      </p>
    </MobileShell>
  );
}

function VerdictCard({
  result,
  finalLimit,
  price,
}: {
  result: "AUTO_APPROVE" | "NEED_APPROVAL" | "BLOCKED";
  finalLimit: number | null;
  price: number | null;
}) {
  const config = {
    AUTO_APPROVE: {
      tone: "ok" as const,
      badge: "자동승인",
      title: "사내 규정 이내입니다",
      body: "승인 절차 없이 즉시 발주됩니다. 규정 등록 시점의 결재가 사전 결재를 갈음합니다.",
    },
    NEED_APPROVAL: {
      tone: "warn" as const,
      badge: "승인 요청",
      title: "승인권자 확인이 필요합니다",
      body: "발주 전 승인 요청이 발송되며, 지정 시간 내 미승인 시 차상위로 자동 에스컬레이션됩니다.",
    },
    BLOCKED: {
      tone: "danger" as const,
      badge: "발주 차단",
      title: "발주할 수 없는 금액입니다",
      body: "법정 상한을 초과하여 관리자도 해제할 수 없습니다. 이 시도는 통제 리포트에 기록됩니다.",
    },
  }[result];

  return (
    <div className="mb-7">
      <Callout tone={config.tone}>
        <div className="flex items-center gap-2">
          <Badge tone={config.tone}>{config.badge}</Badge>
          {finalLimit !== null && (
            <span className="text-[12px] font-semibold opacity-80">
              적용 상한 {formatKRW(finalLimit)}
              {price !== null ? ` · 선택 ${formatKRW(price)}` : ""}
            </span>
          )}
        </div>
        <p className="mt-2 text-[15px] font-bold">{config.title}</p>
        <p className="mt-1 text-[12.5px] leading-relaxed opacity-90">{config.body}</p>
      </Callout>
    </div>
  );
}

function SummaryRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
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

function FlagCallout({ flag }: { flag: PolicyFlag }) {
  return (
    <Callout tone={flag.tone} title={flag.label}>
      {flag.detail}
    </Callout>
  );
}
