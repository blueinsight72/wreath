"use client";

// 신청 내역 — 신청 화면(S1~S4)에서 접수된 건을 조회 · 수정 · 삭제한다.
//
// 대시보드(S9)가 "손대야 하는 건"만 골라 보여준다면, 여기는 접수된 전부를
// 그대로 펼쳐 놓는 자리다. 총무가 오탈자를 고치거나 잘못 들어온 건을 지운다.
//
// 인증이 아직 없다. 주소를 아는 누구나 남의 고객사 발주를 고치고 지울 수
// 있다는 뜻이므로, 그 사실을 화면에도 적어 둔다.
import { useEffect, useState, type ReactNode } from "react";
import {
  Badge,
  Button,
  Callout,
  Card,
  DeskShell,
  Field,
  Stat,
} from "@zeno/core/components/ui";
import { DataSourceBadge } from "@zeno/core/components/DataSourceBadge";
import { TenantSwitcher } from "@zeno/core/components/TenantSwitcher";
import { useCurrentTenant } from "@zeno/core/lib/tenant-context";
import { formatDateTime, formatKRW } from "@zeno/core/lib/format";
import { ORDER_STATUS_LABEL, type Order, type OrderStatus } from "@zeno/core/lib/ops-data";
import {
  deleteOrder,
  loadOrders,
  updateOrder,
  type DecisionRecord,
  type OrderBundle,
  type OrderPatch,
} from "@zeno/core/lib/repo/order-repo";
import { ACCOUNT_LABEL, REGIME_LABEL, type Regime } from "@zeno/core/lib/types";

const STATUSES = Object.keys(ORDER_STATUS_LABEL) as OrderStatus[];
const REGIMES: Regime[] = ["R1", "R2", "R3", "R4", "UNKNOWN"];

const STATUS_TONE: Record<OrderStatus, "neutral" | "warn" | "ok"> = {
  APPROVAL_PENDING: "warn",
  ORDERED: "neutral",
  ACCEPTED: "neutral",
  MAKING: "neutral",
  SHIPPING: "neutral",
  DELIVERED: "ok",
  CANCELLED: "neutral",
};

/** timestamptz → datetime-local 입력값. 입력칸은 초 · 시간대를 받지 못한다 */
function toLocalInput(value: string) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** 입력칸의 로컬 시각에 시간대를 붙여 돌려보낸다 — 안 그러면 DB 가 UTC 로 읽는다 */
function fromLocalInput(value: string): string | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function patchOf(order: Order): OrderPatch {
  return {
    applicantName: order.applicantName,
    applicantDept: order.applicantDept,
    targetLabel: order.targetLabel,
    targetOrg: order.targetOrg,
    regime: order.regime,
    eventTypeLabel: order.eventTypeLabel,
    // 빈소 미정은 표기일 뿐 값이 아니다 — 고칠 때는 빈 칸으로 되돌린다.
    venueName: order.venueName === "빈소 미정" ? "" : order.venueName,
    roomNo: order.roomNo,
    visitAt: order.visitAt || null,
    productName: order.productName,
    amount: order.amount,
    status: order.status,
    ribbonPhrase: order.ribbonPhrase,
    ribbonSender: order.ribbonSender,
  };
}

/** 수정 결과를 목록에 반영한다 — 전체를 다시 불러오지 않고 그 줄만 맞춘다 */
function applyPatch(order: Order, patch: OrderPatch): Order {
  return {
    ...order,
    applicantName: patch.applicantName,
    applicantDept: patch.applicantDept,
    targetLabel: patch.targetLabel,
    targetOrg: patch.targetOrg,
    regime: patch.regime,
    eventTypeLabel: patch.eventTypeLabel,
    venueName: patch.venueName || "빈소 미정",
    roomNo: patch.roomNo,
    visitAt: patch.visitAt ?? "",
    productName: patch.productName,
    amount: patch.amount,
    status: patch.status,
    ribbonPhrase: patch.ribbonPhrase,
    ribbonSender: patch.ribbonSender,
  };
}

export default function OrdersPage() {
  const tenant = useCurrentTenant();
  const [bundle, setBundle] = useState<OrderBundle | null>(null);

  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "ALL">("ALL");

  const [openId, setOpenId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<OrderPatch | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [writeError, setWriteError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    loadOrders(tenant.id).then((b) => {
      if (!alive) return;
      // 고객사가 바뀌면 이전 고객사에서 열어 두었던 편집 상태는 버린다
      setEditingId(null);
      setDraft(null);
      setConfirmId(null);
      setOpenId(null);
      setWriteError(null);
      setNotice(null);
      setBundle(b);
    });
    return () => {
      alive = false;
    };
  }, [tenant.id]);

  const shell = (children: ReactNode) => (
    <DeskShell
      title="신청 내역"
      subtitle={`${tenant.name} — 접수된 신청을 조회하고, 잘못 들어온 값을 고치거나 지웁니다.`}
      back={{ href: "/", label: "대시보드" }}
      aside={
        <div className="flex flex-wrap items-center gap-2">
          <TenantSwitcher />
          {bundle && <DataSourceBadge source={bundle.source} />}
        </div>
      }
    >
      {children}
    </DeskShell>
  );

  if (!bundle || bundle.tenantId !== tenant.id) {
    return shell(
      <Card>
        <p className="text-[13px] text-ink-2">신청 내역을 불러오는 중입니다…</p>
      </Card>,
    );
  }

  const { orders, snapshots, source } = bundle;
  // 목업에는 고칠 대상이 없다. 버튼을 눌러도 남지 않으므로 아예 잠근다.
  const readOnly = source !== "SUPABASE";

  const q = keyword.trim().toLowerCase();
  const rows = orders.filter((o) => {
    if (statusFilter !== "ALL" && o.status !== statusFilter) return false;
    if (!q) return true;
    return [o.id, o.applicantName, o.applicantDept, o.targetLabel, o.targetOrg]
      .join(" ")
      .toLowerCase()
      .includes(q);
  });

  const pending = orders.filter((o) => o.status === "APPROVAL_PENDING").length;
  const sum = orders.reduce((s, o) => s + o.amount, 0);

  const startEdit = (order: Order) => {
    setEditingId(order.id);
    setDraft(patchOf(order));
    setConfirmId(null);
    setWriteError(null);
    setNotice(null);
  };

  const edit = (patch: Partial<OrderPatch>) =>
    setDraft((prev) => (prev ? { ...prev, ...patch } : prev));

  const commit = async (id: string) => {
    if (!draft) return;
    setBusy(true);
    setWriteError(null);
    const result = await updateOrder(tenant.id, id, draft);
    setBusy(false);

    if (!result.ok) {
      setWriteError(result.error ?? "수정에 실패했습니다.");
      return;
    }
    setBundle({
      ...bundle,
      orders: bundle.orders.map((o) => (o.id === id ? applyPatch(o, draft) : o)),
    });
    setEditingId(null);
    setDraft(null);
    setNotice(`${id} 수정되었습니다.`);
  };

  const remove = async (id: string) => {
    setBusy(true);
    setWriteError(null);
    const result = await deleteOrder(tenant.id, id);
    setBusy(false);

    if (!result.ok) {
      setWriteError(result.error ?? "삭제에 실패했습니다.");
      return;
    }
    const snapshotsLeft = { ...bundle.snapshots };
    delete snapshotsLeft[id];
    setBundle({
      ...bundle,
      orders: bundle.orders.filter((o) => o.id !== id),
      snapshots: snapshotsLeft,
    });
    setConfirmId(null);
    setNotice(`${id} 삭제되었습니다. 판정 근거와 승인 이력도 함께 삭제되었습니다.`);
  };

  return shell(
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="접수 건수" value={`${orders.length}건`} />
        <Stat
          label="승인 대기"
          value={`${pending}건`}
          tone={pending > 0 ? "warn" : "ok"}
        />
        <Stat label="합계 금액" value={formatKRW(sum)} />
        <Stat
          label="판정 근거 보관"
          value={`${Object.keys(snapshots).length}건`}
          note="발주와 함께 남은 감사 증거"
        />
      </div>

      {bundle.error && (
        <div className="mt-5">
          <Callout tone="danger" title="DB 조회에 실패해 목업을 보고 있습니다">
            {bundle.error}
          </Callout>
        </div>
      )}

      <div className="mt-5">
        <Callout tone="warn" title="인증이 없는 화면입니다">
          로그인을 요구하지 않으므로 주소를 아는 누구나 발주를 고치고 지울 수
          있습니다. 사내망 · 시연 환경에서만 사용하십시오. 수정은 판정 근거
          스냅샷을 다시 쓰지 않으며, 삭제하면 그 발주의 판정 근거와 승인 이력이
          함께 사라집니다.
        </Callout>
      </div>

      {readOnly && (
        <div className="mt-3">
          <Callout tone="info" title="목업이라 수정 · 삭제할 수 없습니다">
            Supabase 가 연결되면 같은 화면에서 실제 발주를 고칠 수 있습니다.
          </Callout>
        </div>
      )}

      {writeError && (
        <div className="mt-3">
          <Callout tone="danger" title="DB 에 반영되지 않았습니다">
            {writeError}
          </Callout>
        </div>
      )}

      {notice && !writeError && (
        <div className="mt-3">
          <Callout tone="ok">{notice}</Callout>
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-end gap-3">
        <div className="min-w-[220px] flex-1">
          <Field label="검색" hint="신청번호 · 신청자 · 대상자 · 소속">
            <input
              className="control"
              value={keyword}
              placeholder="예) ZC-2609 · 김재현"
              onChange={(e) => setKeyword(e.target.value)}
            />
          </Field>
        </div>
        <div className="w-[180px]">
          <Field label="상태">
            <select
              className="control"
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as OrderStatus | "ALL")
              }
            >
              <option value="ALL">전체</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {ORDER_STATUS_LABEL[s]}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </div>

      <p className="mt-4 text-[12.5px] text-ink-3">
        {orders.length}건 중 {rows.length}건 표시
      </p>

      <div className="mt-3 space-y-3">
        {rows.length === 0 && (
          <p className="rounded-xl border border-dashed border-line bg-surface-2 px-4 py-5 text-center text-[12.5px] text-ink-3">
            {orders.length === 0
              ? "접수된 신청이 없습니다."
              : "조건에 맞는 신청이 없습니다."}
          </p>
        )}

        {rows.map((order) => {
          const editing = editingId === order.id;
          const open = openId === order.id;
          const snapshot: DecisionRecord | undefined = snapshots[order.id];

          return (
            <Card key={order.id} className="bg-surface">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[11px] font-semibold text-ink-3">
                      {order.id}
                    </span>
                    <Badge tone={STATUS_TONE[order.status] ?? "neutral"}>
                      {ORDER_STATUS_LABEL[order.status] ?? order.status}
                    </Badge>
                    <Badge tone="neutral">
                      {order.regime === "UNKNOWN"
                        ? "레짐 미확인"
                        : `${order.regime} · ${REGIME_LABEL[order.regime]}`}
                    </Badge>
                    <span className="text-[11.5px] text-ink-3">
                      {order.createdAt} 접수
                    </span>
                  </div>

                  <p className="mt-2 text-[15px] font-bold text-ink">
                    {order.targetLabel}
                    {order.eventTypeLabel ? ` · ${order.eventTypeLabel}` : ""}
                  </p>
                  <p className="mt-0.5 text-[12.5px] text-ink-2">
                    {order.targetOrg || "소속 미기재"} · 신청 {order.applicantName}
                    {order.applicantDept ? `(${order.applicantDept})` : ""}
                  </p>
                  <p className="mt-1.5 text-[13px] text-ink-2">
                    {formatKRW(order.amount)} · {order.productName || "상품 미지정"} ·{" "}
                    {order.venueName}
                    {order.roomNo ? ` ${order.roomNo}` : ""}
                  </p>
                  {order.visitAt && (
                    <p className="mt-0.5 text-[12.5px] text-ink-3">
                      조문 예정 {formatDateTime(order.visitAt)}
                    </p>
                  )}
                </div>

                <div className="flex w-full shrink-0 flex-col gap-2 sm:w-[150px]">
                  <Button
                    variant="ghost"
                    className="text-[13.5px]"
                    onClick={() => setOpenId(open ? null : order.id)}
                  >
                    {open ? "접기" : "상세 보기"}
                  </Button>
                  {!editing && (
                    <Button
                      variant="ghost"
                      className="text-[13.5px]"
                      disabled={readOnly || busy}
                      onClick={() => startEdit(order)}
                    >
                      수정
                    </Button>
                  )}
                  {confirmId !== order.id && (
                    <Button
                      variant="ghost"
                      className="border-danger/30 text-[13.5px] text-danger"
                      disabled={readOnly || busy}
                      onClick={() => {
                        setConfirmId(order.id);
                        setEditingId(null);
                        setWriteError(null);
                        setNotice(null);
                      }}
                    >
                      삭제
                    </Button>
                  )}
                </div>
              </div>

              {confirmId === order.id && (
                <div className="mt-4 rounded-xl border border-danger/20 bg-danger-soft p-3.5">
                  <p className="text-[13px] font-bold text-danger">
                    {order.id} 을(를) 삭제하시겠습니까?
                  </p>
                  <p className="mt-1 text-[12.5px] leading-relaxed text-danger">
                    발주와 함께 판정 근거 스냅샷 · 승인 이력이 삭제됩니다. 차단
                    로그는 남지만 이 발주와의 연결이 끊깁니다. 되돌릴 수 없습니다.
                  </p>
                  <div className="mt-3 flex gap-2">
                    <Button
                      variant="ghost"
                      className="w-auto px-5 text-[13.5px]"
                      disabled={busy}
                      onClick={() => setConfirmId(null)}
                    >
                      취소
                    </Button>
                    <Button
                      className="w-auto bg-danger px-6 text-[13.5px] hover:bg-danger"
                      disabled={busy}
                      onClick={() => remove(order.id)}
                    >
                      {busy ? "삭제 중…" : "삭제합니다"}
                    </Button>
                  </div>
                </div>
              )}

              {open && (
                <div className="mt-4 border-t border-line-2 pt-4">
                  <dl className="grid gap-x-6 gap-y-2 text-[12.5px] sm:grid-cols-2">
                    <Row label="계정과목" value={ACCOUNT_LABEL[order.account]} />
                    <Row
                      label="사내 상한"
                      value={
                        order.internalLimit === null
                          ? "규정 외"
                          : formatKRW(order.internalLimit)
                      }
                    />
                    <Row
                      label="법정 상한"
                      value={
                        order.legalLimit === null
                          ? "해당 없음"
                          : formatKRW(order.legalLimit)
                      }
                    />
                    <Row label="공급사" value={order.supplierName ?? "미배정"} />
                    <Row label="리본 문구" value={order.ribbonPhrase || "—"} />
                    <Row label="발신 명의" value={order.ribbonSender || "—"} />
                  </dl>

                  <div className="mt-4 rounded-xl border border-line bg-surface-2 p-3.5">
                    <p className="text-[13px] font-bold text-ink">판정 근거</p>
                    {snapshot ? (
                      <dl className="mt-2 grid gap-x-6 gap-y-2 text-[12.5px] sm:grid-cols-2">
                        <Row label="적용 규정" value={snapshot.versionLabel} />
                        <Row label="적용 규칙" value={snapshot.ruleCode ?? "규정 외"} />
                        <Row label="상한 계산" value={snapshot.limitFormula ?? "—"} />
                        <Row label="레짐 근거" value={snapshot.regimeBasis ?? "—"} />
                        <Row label="판정" value={snapshot.decision} />
                        <Row label="판정 시각" value={snapshot.decidedAt} />
                        {Object.entries(snapshot.conditions).map(([k, v]) => (
                          <Row key={k} label={k} value={String(v)} />
                        ))}
                      </dl>
                    ) : (
                      <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-3">
                        이 발주에는 판정 근거가 남아 있지 않습니다. 감사 대응 시
                        제출할 근거가 없다는 뜻입니다.
                      </p>
                    )}
                    <p className="mt-2 text-[11.5px] leading-relaxed text-ink-3">
                      판정 근거는 생성 후 고치지 않습니다. 위 내용을 수정해도 이
                      기록은 그대로 남습니다.
                    </p>
                  </div>
                </div>
              )}

              {editing && draft && (
                <div className="mt-4 border-t border-line-2 pt-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="대상자" required>
                      <input
                        className="control"
                        value={draft.targetLabel}
                        onChange={(e) => edit({ targetLabel: e.target.value })}
                      />
                    </Field>
                    <Field label="대상자 소속">
                      <input
                        className="control"
                        value={draft.targetOrg}
                        onChange={(e) => edit({ targetOrg: e.target.value })}
                      />
                    </Field>
                    <Field label="신청자" required>
                      <input
                        className="control"
                        value={draft.applicantName}
                        onChange={(e) => edit({ applicantName: e.target.value })}
                      />
                    </Field>
                    <Field label="신청 부서">
                      <input
                        className="control"
                        value={draft.applicantDept}
                        onChange={(e) => edit({ applicantDept: e.target.value })}
                      />
                    </Field>
                    <Field
                      label="레짐"
                      hint="레짐을 바꿔도 지난 판정 근거는 다시 계산되지 않습니다."
                    >
                      <select
                        className="control"
                        value={draft.regime}
                        onChange={(e) => edit({ regime: e.target.value as Regime })}
                      >
                        {REGIMES.map((r) => (
                          <option key={r} value={r}>
                            {r === "UNKNOWN" ? "미확인" : `${r} · ${REGIME_LABEL[r]}`}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="경조 유형">
                      <input
                        className="control"
                        value={draft.eventTypeLabel}
                        onChange={(e) => edit({ eventTypeLabel: e.target.value })}
                      />
                    </Field>
                    <Field label="장례식장" hint="비워 두면 빈소 미정으로 표시됩니다.">
                      <input
                        className="control"
                        value={draft.venueName}
                        onChange={(e) => edit({ venueName: e.target.value })}
                      />
                    </Field>
                    <Field label="호실">
                      <input
                        className="control"
                        value={draft.roomNo}
                        onChange={(e) => edit({ roomNo: e.target.value })}
                      />
                    </Field>
                    <Field label="조문 예정 시각">
                      <input
                        className="control"
                        type="datetime-local"
                        value={toLocalInput(draft.visitAt ?? "")}
                        onChange={(e) =>
                          edit({ visitAt: fromLocalInput(e.target.value) })
                        }
                      />
                    </Field>
                    <Field label="상품">
                      <input
                        className="control"
                        value={draft.productName}
                        onChange={(e) => edit({ productName: e.target.value })}
                      />
                    </Field>
                    <Field
                      label="금액"
                      required
                      hint="상한 초과 여부는 다시 판정하지 않습니다."
                    >
                      <input
                        className="control"
                        inputMode="numeric"
                        value={String(draft.amount)}
                        onChange={(e) =>
                          edit({
                            amount: Number(e.target.value.replace(/[^0-9]/g, "")) || 0,
                          })
                        }
                      />
                    </Field>
                    <Field label="상태">
                      <select
                        className="control"
                        value={draft.status}
                        onChange={(e) =>
                          edit({ status: e.target.value as OrderStatus })
                        }
                      >
                        {STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {ORDER_STATUS_LABEL[s]}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="리본 문구">
                      <input
                        className="control"
                        value={draft.ribbonPhrase}
                        onChange={(e) => edit({ ribbonPhrase: e.target.value })}
                      />
                    </Field>
                    <Field label="발신 명의">
                      <input
                        className="control"
                        value={draft.ribbonSender}
                        onChange={(e) => edit({ ribbonSender: e.target.value })}
                      />
                    </Field>
                  </div>

                  <div className="mt-4 flex gap-2">
                    <Button
                      variant="ghost"
                      className="w-auto px-5"
                      disabled={busy}
                      onClick={() => {
                        setEditingId(null);
                        setDraft(null);
                      }}
                    >
                      취소
                    </Button>
                    <Button
                      className="w-auto px-6"
                      disabled={
                        busy ||
                        !draft.targetLabel.trim() ||
                        !draft.applicantName.trim()
                      }
                      onClick={() => commit(order.id)}
                    >
                      {busy ? "저장 중…" : "저장"}
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </>,
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <dt className="shrink-0 font-semibold text-ink-3">{label}</dt>
      <dd className="min-w-0 flex-1 break-words text-ink-2">{value}</dd>
    </div>
  );
}
