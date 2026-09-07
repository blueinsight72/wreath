"use client";

import { useEffect, useState } from "react";
import { Badge, Callout, Card, DeskShell, Stat } from "@zeno/core/components/ui";
import { DataSourceBadge } from "@zeno/core/components/DataSourceBadge";
import { TenantSwitcher } from "@zeno/core/components/TenantSwitcher";
import { useCurrentTenant } from "@zeno/core/lib/tenant-context";
import { formatKRW } from "@zeno/core/lib/format";
import { ORDER_STATUS_LABEL } from "@zeno/core/lib/ops-data";
import {
  loadControlReport,
  type ApprovalRecord,
  type ControlReport,
} from "@zeno/core/lib/repo/control-repo";
import { ACCOUNT_LABEL } from "@zeno/core/lib/types";

const VERDICT_LABEL: Record<ApprovalRecord["verdict"], string> = {
  APPROVED: "승인",
  REJECTED: "반려",
  ESCALATED: "에스컬레이션",
};

export default function ControlReportPage() {
  const tenant = useCurrentTenant();
  const [report, setReport] = useState<ControlReport | null>(null);

  useEffect(() => {
    let alive = true;
    loadControlReport(tenant.id).then((r) => {
      if (alive) setReport(r);
    });
    return () => {
      alive = false;
    };
  }, [tenant.id]);

  if (!report || report.tenantId !== tenant.id) {
    return (
      <DeskShell
        title="통제 작동 리포트"
        subtitle={tenant.name}
        back={{ href: "/", label: "대시보드" }}
        aside={<TenantSwitcher />}
      >
        <Card>
          <p className="text-[13px] text-ink-2">리포트를 불러오는 중입니다…</p>
        </Card>
      </DeskShell>
    );
  }

  const { orders, blocked, approvals } = report;
  const total = orders.length;
  const pct = (n: number) => (total === 0 ? "—" : `${Math.round((n / total) * 100)}%`);
  const autoApproved = orders.filter(
    (o) => o.status !== "APPROVAL_PENDING" && o.approvalReasons.length === 0
  ).length;
  const overLimit = orders.filter(
    (o) => o.internalLimit !== null && o.amount > o.internalLimit
  );
  const offSystem = orders.filter((o) => o.offSystem);
  const entertainment = orders.filter((o) => o.account === "ENTERTAINMENT");
  const entertainmentSum = entertainment.reduce((s, o) => s + o.amount, 0);
  const welfareSum = orders
    .filter((o) => o.account === "WELFARE")
    .reduce((s, o) => s + o.amount, 0);

  return (
    <DeskShell
      title="통제 작동 리포트"
      subtitle={`${tenant.name} — 감사 · 법무 제출용. 규정 결재부터 차단 로그까지, 회사가 상당한 주의와 감독을 다했다는 기록입니다.`}
      back={{ href: "/", label: "대시보드" }}
      aside={
        <div className="flex flex-wrap items-center gap-2">
          <TenantSwitcher />
          <DataSourceBadge source={report.source} />
        </div>
      }
    >
      {report.error && (
        <div className="mb-5">
          <Callout tone="danger" title="Supabase 연결 문제">
            {report.error} — 목업 데이터로 표시하고 있습니다.
          </Callout>
        </div>
      )}

      <Callout tone="info" title="적용 규정 근거">
        {tenant.name} 시행 규정 <strong>{report.policyVersion}</strong> ·{" "}
        {report.policyApprovedAt} {report.policyApprovedBy} 결재. 이 결재가 개별
        발주 자동승인의 사전 결재를 갈음합니다.
      </Callout>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat
          label="자동승인율"
          value={pct(autoApproved)}
          note={`${autoApproved} / ${total}건`}
          tone="ok"
        />
        <Stat
          label="상한 초과 승인"
          value={`${overLimit.length}건`}
          note="사람 승인을 거친 건"
          tone={overLimit.length > 0 ? "warn" : "neutral"}
        />
        <Stat
          label="법정 상한 차단"
          value={`${blocked.length}건`}
          note="해제 불가 · 시도 기록"
          tone={blocked.length > 0 ? "danger" : "ok"}
        />
        <Stat
          label="규정 판정 커버리지"
          value={pct(total - offSystem.length)}
          note={`우회 ${offSystem.length}건`}
          tone={offSystem.length > 0 ? "warn" : "ok"}
        />
      </div>

      {/* 1. 차단 로그 — 통제가 실제로 발동했다는 가장 강한 증거 */}
      <ReportSection
        title="법정 상한 차단 로그"
        desc="청탁금지법 적용 대상(R1) 수신자에게 가액범위를 넘는 발주를 시도했으나 시스템이 차단한 기록입니다. 관리자도 해제할 수 없습니다."
      >
        {blocked.length === 0 ? (
          <Empty>차단된 시도가 없습니다.</Empty>
        ) : (
          <Table
            head={["시각", "신청자", "수신자", "레짐", "시도 금액", "법정 상한", "결과"]}
          >
            {blocked.map((b) => (
              <tr key={b.id} className="border-b border-line-2">
                <Td muted>{b.attemptedAt}</Td>
                <Td>{b.applicant}</Td>
                <Td>{b.targetLabel}</Td>
                <Td>
                  <Badge tone="danger">{b.regime}</Badge>
                </Td>
                <Td right>
                  <span className="font-semibold text-danger">
                    {formatKRW(b.attempted)}
                  </span>
                </Td>
                <Td right muted>
                  {formatKRW(b.legalLimit)}
                </Td>
                <Td>
                  <Badge tone="danger">발주 차단</Badge>
                </Td>
              </tr>
            ))}
          </Table>
        )}
      </ReportSection>

      {/* 2. 상한 초과 승인 — 사람이 판단한 건 */}
      <ReportSection
        title="사내 상한 초과 승인 건"
        desc="자동승인에서 제외되어 승인권자가 직접 판단한 건입니다. 초과 사유와 승인자가 건별로 남습니다."
      >
        {overLimit.length === 0 ? (
          <Empty>상한을 초과한 건이 없습니다.</Empty>
        ) : (
          <Table head={["발주번호", "수신자", "금액", "사내 상한", "초과액", "상태"]}>
            {overLimit.map((o) => (
              <tr key={o.id} className="border-b border-line-2">
                <Td mono>{o.id}</Td>
                <Td>
                  {o.targetLabel}
                  <span className="ml-1.5 text-ink-3">{o.targetOrg}</span>
                </Td>
                <Td right>{formatKRW(o.amount)}</Td>
                <Td right muted>
                  {o.internalLimit !== null ? formatKRW(o.internalLimit) : "—"}
                </Td>
                <Td right>
                  <span className="font-semibold text-warn">
                    +{formatKRW(o.amount - (o.internalLimit ?? 0))}
                  </span>
                </Td>
                <Td>
                  <Badge tone="warn">{ORDER_STATUS_LABEL[o.status]}</Badge>
                </Td>
              </tr>
            ))}
          </Table>
        )}
      </ReportSection>

      {/* 3. 승인 이력 */}
      <ReportSection
        title="승인 이력"
        desc="누가 언제 무엇을 근거로 승인했는지의 기록입니다."
      >
        {approvals.length === 0 ? (
          <Empty>승인 이력이 없습니다.</Empty>
        ) : (
          <Table head={["시각", "발주번호", "승인자", "판정", "사유"]}>
            {approvals.map((a) => (
              <tr key={a.id} className="border-b border-line-2">
                <Td muted>{a.decidedAt}</Td>
                <Td mono>{a.orderId}</Td>
                <Td>{a.approver}</Td>
                <Td>
                  <Badge
                    tone={
                      a.verdict === "APPROVED"
                        ? "ok"
                        : a.verdict === "REJECTED"
                          ? "danger"
                          : "warn"
                    }
                  >
                    {VERDICT_LABEL[a.verdict]}
                  </Badge>
                </Td>
                <Td muted>{a.reason ?? "—"}</Td>
              </tr>
            ))}
          </Table>
        )}
      </ReportSection>

      {/* 4. 계정과목 분리 */}
      <ReportSection
        title="계정과목 분리"
        desc="임직원 대상은 복리후생비, 거래처 대상은 접대비로 자동 분리됩니다. 접대비는 세법상 한도와 적격증빙 요건이 다릅니다."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Card className="bg-surface">
            <p className="text-[12px] font-semibold text-ink-3">
              {ACCOUNT_LABEL.WELFARE}
            </p>
            <p className="mt-1 text-[20px] font-bold tabular-nums text-ink">
              {formatKRW(welfareSum)}
            </p>
            <p className="mt-0.5 text-[12px] text-ink-3">
              {orders.filter((o) => o.account === "WELFARE").length}건 · 자사
              임직원(R4)
            </p>
          </Card>
          <Card className="bg-surface">
            <p className="text-[12px] font-semibold text-ink-3">
              {ACCOUNT_LABEL.ENTERTAINMENT}
            </p>
            <p className="mt-1 text-[20px] font-bold tabular-nums text-ink">
              {formatKRW(entertainmentSum)}
            </p>
            <p className="mt-0.5 text-[12px] text-ink-3">
              {entertainment.length}건 · 거래처(R1~R3) · 3만원 초과 건 적격증빙
              필수
            </p>
          </Card>
        </div>
      </ReportSection>

      {/* 5. 우회 구매 */}
      <ReportSection
        title="우회 구매 대사"
        desc="시스템을 거치지 않은 발주입니다. 속도로 전화를 이길 수 없으므로 사후 등록으로 데이터를 회수하고 법인카드 화훼 업종 사용 건과 대조합니다."
      >
        {offSystem.length === 0 ? (
          <Empty>우회 구매 건이 없습니다.</Empty>
        ) : (
          <Table head={["발주번호", "신청자", "수신자", "금액", "구분"]}>
            {offSystem.map((o) => (
              <tr key={o.id} className="border-b border-line-2">
                <Td mono>{o.id}</Td>
                <Td>
                  {o.applicantName}
                  <span className="ml-1.5 text-ink-3">{o.applicantDept}</span>
                </Td>
                <Td>{o.targetLabel}</Td>
                <Td right>{formatKRW(o.amount)}</Td>
                <Td>
                  <Badge tone="warn">사후 등록</Badge>
                </Td>
              </tr>
            ))}
          </Table>
        )}
      </ReportSection>

      <p className="mt-8 text-[11.5px] leading-relaxed text-ink-3">
        본 리포트는 사내 규정 부합 여부와 통제 작동 사실을 정리한 것이며, 개별
        건의 법적 적법성을 보증하지 않습니다.
      </p>
    </DeskShell>
  );
}

function ReportSection({
  title,
  desc,
  children,
}: {
  title: string;
  desc: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-8">
      <h2 className="text-[15px] font-bold text-ink">{title}</h2>
      <p className="mt-1 max-w-[68ch] text-[12.5px] leading-relaxed text-ink-2">
        {desc}
      </p>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Table({
  head,
  children,
}: {
  head: string[];
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-line bg-surface p-4">
      <table className="w-full min-w-[720px] border-collapse text-[13px]">
        <thead>
          <tr className="border-b border-line text-left text-[12px] text-ink-3">
            {head.map((h, i) => (
              <th
                key={h}
                className={`py-2 pr-3 font-semibold ${
                  i >= 2 && /금액|상한|초과액/.test(h) ? "text-right" : ""
                }`}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

function Td({
  children,
  right,
  muted,
  mono,
}: {
  children: React.ReactNode;
  right?: boolean;
  muted?: boolean;
  mono?: boolean;
}) {
  return (
    <td
      className={`py-2.5 pr-3 ${right ? "text-right tabular-nums" : ""} ${
        muted ? "text-ink-3" : "text-ink"
      } ${mono ? "font-mono text-[12px]" : ""}`}
    >
      {children}
    </td>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-xl border border-dashed border-line bg-surface-2 px-4 py-5 text-center text-[12.5px] text-ink-3">
      {children}
    </p>
  );
}
