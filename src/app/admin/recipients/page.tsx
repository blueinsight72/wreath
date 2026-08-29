"use client";

import { useState } from "react";
import { Badge, Button, Callout, Card, DeskShell, Field, Stat } from "@/components/ui";
import { EXTERNAL_RECIPIENTS } from "@/lib/mock-data";
import { TenantSwitcher } from "@/components/TenantSwitcher";
import { useCurrentTenant } from "@/lib/tenant-context";
import {
  REGIME_DESC,
  REGIME_LABEL,
  type ExternalRecipient,
  type Regime,
} from "@/lib/types";

const REGIME_TONE = {
  R1: "danger",
  R2: "warn",
  R3: "info",
  R4: "ok",
  UNKNOWN: "neutral",
} as const;

const EXTERNAL_REGIMES: Regime[] = ["R1", "R2", "R3", "UNKNOWN"];

export default function RecipientsPage() {
  const tenant = useCurrentTenant();
  // 거래처는 고객사마다 다르다 — 목업은 제노㈜ 기준
  const seed = tenant.id === "tn-zeno" ? EXTERNAL_RECIPIENTS : [];
  const [rows, setRows] = useState<ExternalRecipient[]>(seed);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftRegime, setDraftRegime] = useState<Regime>("UNKNOWN");
  const [draftBasis, setDraftBasis] = useState("");
  const [draftScope, setDraftScope] = useState<"SELF" | "SPOUSE" | "NONE">("NONE");

  const [loadedTenant, setLoadedTenant] = useState(tenant.id);
  if (loadedTenant !== tenant.id) {
    // 렌더 중 동기화 — 고객사가 바뀌면 그 고객사 목록으로 즉시 교체한다
    setLoadedTenant(tenant.id);
    setRows(seed);
    setEditingId(null);
  }

  const unknown = rows.filter((r) => r.regime === "UNKNOWN").length;

  const startEdit = (r: ExternalRecipient) => {
    setEditingId(r.id);
    setDraftRegime(r.regime);
    setDraftBasis(r.basis);
    setDraftScope(r.officialScope ?? "NONE");
  };

  const commit = (id: string) => {
    setRows((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              regime: draftRegime,
              basis: draftBasis,
              officialScope: draftScope === "NONE" ? null : draftScope,
              confirmedAt: "2026-08-29",
              confirmedBy: "총무팀 김재현",
            }
          : r
      )
    );
    setEditingId(null);
  };

  return (
    <DeskShell
      title="거래처 수신자 마스터"
      subtitle={`${tenant.name} — 신청 시점의 일반 임직원은 상대가 청탁금지법 적용 대상인지 판단할 수 없습니다. 여기서 미리 확정해 둡니다.`}
      back={{ href: "/", label: "홈" }}
      aside={
        <div className="flex flex-wrap items-center gap-2">
          <TenantSwitcher />
          <Button className="w-auto px-5">수신자 등록</Button>
        </div>
      }
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="등록 수신자" value={`${rows.length}명`} />
        <Stat
          label="레짐 미확인"
          value={`${unknown}명`}
          note="자동승인 불가"
          tone={unknown > 0 ? "warn" : "ok"}
        />
        <Stat
          label="R1 공직자등"
          value={`${rows.filter((r) => r.regime === "R1").length}명`}
          note="화환 10만원 하드리밋"
          tone="danger"
        />
        <Stat
          label="R2 보건의료인"
          value={`${rows.filter((r) => r.regime === "R2").length}명`}
          note="법무 검토 대기"
          tone="warn"
        />
      </div>

      <Callout tone="warn" title="미확인은 자동승인 불가가 기본값입니다">
        레짐이 확정되지 않은 수신자에게 보내는 건은 금액과 무관하게 승인 경로로
        전환됩니다. 주요 거래처는 온보딩 단계에서 미리 확정해 두십시오.
      </Callout>

      <div className="mt-6 space-y-3">
        {rows.length === 0 && (
          <p className="rounded-xl border border-dashed border-line bg-surface-2 px-4 py-5 text-center text-[12.5px] text-ink-3">
            등록된 거래처 수신자가 없습니다. 온보딩 단계에서 주요 거래처를 먼저
            등록하면 그 뒤부터 자동승인이 가능합니다.
          </p>
        )}
        {rows.map((r) => {
          const editing = editingId === r.id;
          return (
            <Card key={r.id} className="bg-surface">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[15.5px] font-bold text-ink">
                      {r.name}
                    </span>
                    <Badge tone={REGIME_TONE[r.regime]}>
                      {r.regime === "UNKNOWN"
                        ? "미확인"
                        : `${r.regime} · ${REGIME_LABEL[r.regime]}`}
                    </Badge>
                    {r.officialScope && (
                      <Badge tone="neutral">
                        {r.officialScope === "SELF" ? "본인" : "배우자"}
                      </Badge>
                    )}
                  </div>
                  <p className="mt-1 text-[13px] text-ink-2">
                    {r.org} · {r.position}
                  </p>
                  <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-3">
                    {r.basis}
                  </p>
                  <p className="mt-1 text-[12px] text-ink-3">
                    {r.confirmedAt
                      ? `${r.confirmedAt} ${r.confirmedBy} 확인`
                      : "확인 이력 없음"}
                  </p>

                  {r.autoHint && r.regime === "UNKNOWN" && (
                    <p className="mt-2 rounded-md bg-brand-soft px-2.5 py-1.5 text-[12px] font-semibold text-brand">
                      자동 후보 판정: {r.autoHint}
                    </p>
                  )}
                </div>

                {!editing && (
                  <Button
                    variant="ghost"
                    className="w-auto shrink-0 px-5 text-[13.5px]"
                    onClick={() => startEdit(r)}
                  >
                    레짐 확정
                  </Button>
                )}
              </div>

              {editing && (
                <div className="mt-4 border-t border-line-2 pt-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field
                      label="레짐"
                      required
                      hint={REGIME_DESC[draftRegime]}
                    >
                      <select
                        className="control"
                        value={draftRegime}
                        onChange={(e) =>
                          setDraftRegime(e.target.value as Regime)
                        }
                      >
                        {EXTERNAL_REGIMES.map((g) => (
                          <option key={g} value={g}>
                            {g === "UNKNOWN"
                              ? "미확인"
                              : `${g} · ${REGIME_LABEL[g]}`}
                          </option>
                        ))}
                      </select>
                    </Field>

                    <Field
                      label="수수 주체"
                      hint="청탁금지법은 공직자등의 배우자 수수도 규율합니다."
                    >
                      <select
                        className="control"
                        value={draftScope}
                        onChange={(e) =>
                          setDraftScope(
                            e.target.value as "SELF" | "SPOUSE" | "NONE"
                          )
                        }
                        disabled={draftRegime !== "R1"}
                      >
                        <option value="NONE">해당 없음</option>
                        <option value="SELF">공직자등 본인</option>
                        <option value="SPOUSE">공직자등의 배우자</option>
                      </select>
                    </Field>
                  </div>

                  <div className="mt-4">
                    <Field
                      label="판정 근거"
                      required
                      hint="감사 대응 시 이 문장이 근거로 제출됩니다."
                    >
                      <input
                        className="control"
                        value={draftBasis}
                        onChange={(e) => setDraftBasis(e.target.value)}
                      />
                    </Field>
                  </div>

                  <div className="mt-4 flex gap-2">
                    <Button
                      variant="ghost"
                      className="w-auto px-5"
                      onClick={() => setEditingId(null)}
                    >
                      취소
                    </Button>
                    <Button
                      className="w-auto px-6"
                      disabled={!draftBasis.trim()}
                      onClick={() => commit(r.id)}
                    >
                      확정
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      <p className="mt-7 text-[11.5px] leading-relaxed text-ink-3">
        기관명 기반 자동 후보 판정은 보조 수단일 뿐이며, 최종 확정은 반드시
        사람이 합니다.
      </p>
    </DeskShell>
  );
}
