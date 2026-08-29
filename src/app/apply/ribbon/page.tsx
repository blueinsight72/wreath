"use client";

import { Callout, Card, LinkButton, MobileShell, StepBar } from "@/components/ui";
import { useDraft } from "@/lib/draft";
import { formatKRW } from "@/lib/format";
import { CURRENT_USER, WREATH_PRODUCTS } from "@/lib/mock-data";
import { decideExecution, decidePolicy } from "@/lib/policy";
import { RELIGION_LABEL } from "@/lib/types";

/**
 * S3 리본 문구 미리보기 — 3단계에서 구현 예정.
 * 현재는 S2 판정 결과가 온전히 넘어왔는지 확인하는 검수용 화면이다.
 */
export default function RibbonPlaceholderPage() {
  const draft = useDraft();
  const product = draft
    ? (WREATH_PRODUCTS.find((p) => p.id === draft.productId) ?? null)
    : null;
  const decision = draft ? decidePolicy(draft, CURRENT_USER.costCenter) : null;
  const execution = decision ? decideExecution(decision, product) : null;

  const resultLabel = {
    AUTO_APPROVE: "자동승인",
    NEED_APPROVAL: "승인 요청",
    BLOCKED: "발주 차단",
  };

  return (
    <MobileShell
      title="리본 문구 확인"
      subtitle="S3 화면은 다음 단계에서 구현합니다."
      back={{ href: "/apply/policy", label: "판정 결과" }}
      footer={
        <LinkButton href="/apply/policy" variant="ghost">
          판정 결과로 돌아가기
        </LinkButton>
      }
    >
      <StepBar current={3} total={4} />

      <Callout tone="info" title="아직 구현되지 않은 화면입니다">
        발신 명의 선택, 종교별 문구 분기, 실제 리본 레이아웃 미리보기는 3단계에서
        만듭니다. 아래는 2단계 화면이 확정한 값입니다.
      </Callout>

      <div className="mt-5">
        {!draft || !decision || !execution ? (
          <Card>
            <p className="text-[13px] text-ink-2">
              전달된 신청 정보가 없습니다. 신청서를 먼저 작성해 주세요.
            </p>
          </Card>
        ) : (
          <Card className="divide-y divide-line-2 p-0">
            <Row label="선택 상품" value={product ? product.name : "—"} />
            <Row label="금액" value={product ? formatKRW(product.price) : "—"} />
            <Row
              label="적용 상한"
              value={
                decision.finalLimit === null
                  ? "미산출"
                  : formatKRW(decision.finalLimit)
              }
            />
            <Row
              label="판정"
              value={resultLabel[execution.result]}
            />
            <Row label="계정과목" value={decision.account === "WELFARE" ? "복리후생비" : "접대비"} />
            <Row label="종교" value={RELIGION_LABEL[draft.religion]} />
            <Row
              label="적용 규정"
              value={`${decision.snapshot.policyVersion}${
                decision.snapshot.matchedRuleId
                  ? ` · ${decision.snapshot.matchedRuleId}`
                  : ""
              }`}
            />
          </Card>
        )}
      </div>
    </MobileShell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3 px-4 py-3">
      <span className="w-[86px] shrink-0 text-[12.5px] font-semibold text-ink-3">
        {label}
      </span>
      <span className="min-w-0 flex-1 text-[13px] leading-relaxed text-ink">
        {value}
      </span>
    </div>
  );
}
