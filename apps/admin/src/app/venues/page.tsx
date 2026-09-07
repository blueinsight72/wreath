"use client";

import { useEffect, useState } from "react";
import { Badge, Button, Callout, Card, DeskShell, Field, Stat } from "@zeno/core/components/ui";
import { DataSourceBadge } from "@zeno/core/components/DataSourceBadge";
import { FUNERAL_VENUES } from "@zeno/core/lib/mock-data";
import { loadVenues, saveVenueRule } from "@zeno/core/lib/repo/venue-repo";
import type { DataSource } from "@zeno/core/lib/supabase";
import type { FuneralVenue } from "@zeno/core/lib/types";

type Verification = FuneralVenue["verification"];

const VERIFICATION_LABEL: Record<Verification, string> = {
  VERIFIED: "검증 완료",
  NEEDS_CHECK: "확인 필요",
  REPORTED: "현장 보고 기반",
};

export default function VenuesPage() {
  const [rows, setRows] = useState<FuneralVenue[]>(FUNERAL_VENUES);
  const [source, setSource] = useState<DataSource>("MOCK");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftAllowed, setDraftAllowed] = useState<"YES" | "NO" | "UNKNOWN">(
    "UNKNOWN"
  );
  const [draftReason, setDraftReason] = useState("");

  useEffect(() => {
    let alive = true;
    loadVenues().then((bundle) => {
      if (!alive) return;
      setRows(bundle.venues);
      setSource(bundle.source);
      setLoadError(bundle.error);
    });
    return () => {
      alive = false;
    };
  }, []);

  const needsReview = rows.filter(
    (v) => v.issueReports >= 3 || v.verification === "NEEDS_CHECK"
  ).length;
  const blocked = rows.filter((v) => v.wreathAllowed === false).length;

  const startEdit = (v: FuneralVenue) => {
    setEditingId(v.id);
    setDraftAllowed(
      v.wreathAllowed === true ? "YES" : v.wreathAllowed === false ? "NO" : "UNKNOWN"
    );
    setDraftReason(v.restrictionReason ?? "");
  };

  const commit = async (id: string) => {
    const patch = {
      wreathAllowed:
        draftAllowed === "YES" ? true : draftAllowed === "NO" ? false : null,
      restrictionReason: draftReason.trim() || null,
      verification: (draftAllowed === "UNKNOWN"
        ? "NEEDS_CHECK"
        : "VERIFIED") as FuneralVenue["verification"],
      updatedAt: new Date().toISOString().slice(0, 10),
    };

    setRows((prev) => prev.map((v) => (v.id === id ? { ...v, ...patch } : v)));
    setEditingId(null);

    // 저장에 실패하면 화면만 바뀌고 DB 는 그대로다 — 반드시 알려야 한다.
    setSaveError(await saveVenueRule(id, patch));
  };

  return (
    <DeskShell
      title="장례식장 반입 규정 DB"
      subtitle="전 고객사 공통 자산입니다. 공공 마스터는 누구나 받지만, 이 장례식장이 화환을 거부한다는 정보는 모든 고객사의 실제 배송에서 함께 쌓입니다."
      back={{ href: "/", label: "대시보드" }}
      aside={<Button className="w-auto px-5">장례식장 등록</Button>}
    >
      <div className="mb-4">
        <DataSourceBadge source={source} />
      </div>

      {loadError && (
        <Callout tone="warn" title="Supabase 연결 문제">
          {loadError} — 목업 데이터로 표시하고 있습니다.
        </Callout>
      )}

      {saveError && (
        <Callout tone="danger" title="저장에 실패했습니다">
          {saveError} — 화면의 값은 바뀌었지만 DB 에는 반영되지 않았습니다.
        </Callout>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="등록 장례식장" value={`${rows.length}곳`} />
        <Stat
          label="검증 필요"
          value={`${needsReview}곳`}
          note="미검증 · 보고 3건 이상"
          tone={needsReview > 0 ? "warn" : "ok"}
        />
        <Stat
          label="반입 거부"
          value={`${blocked}곳`}
          note="대체 상품 자동 제안"
          tone={blocked > 0 ? "danger" : "neutral"}
        />
        <Stat
          label="현장 보고 누적"
          value={`${rows.reduce((sum, v) => sum + v.issueReports, 0)}건`}
          note="공급사 완료 처리 시 수집"
        />
      </div>

      <Callout tone="warn" title="검증되지 않은 정보는 확정 사실로 안내하지 않습니다">
        신청 화면에서는 미검증 장소를 반입 가능이라고 표시하지 않고 확인 필요로만
        노출합니다. 과장 안내가 곧 사고입니다.
      </Callout>

      <div className="mt-6 space-y-3">
        {rows.map((v) => {
          const editing = editingId === v.id;
          const flagged = v.issueReports >= 3;

          return (
            <Card key={v.id} className="bg-surface">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[15.5px] font-bold text-ink">
                      {v.name}
                    </span>
                    {v.wreathAllowed === false ? (
                      <Badge tone="danger">반입 불가</Badge>
                    ) : v.wreathAllowed === null ? (
                      <Badge tone="warn">반입 여부 미상</Badge>
                    ) : (
                      <Badge tone="ok">반입 가능</Badge>
                    )}
                    <Badge
                      tone={v.verification === "VERIFIED" ? "info" : "neutral"}
                    >
                      {VERIFICATION_LABEL[v.verification]}
                    </Badge>
                    {flagged && (
                      <Badge tone="warn">
                        현장 보고 {v.issueReports}건 · 검증 대상
                      </Badge>
                    )}
                  </div>

                  <p className="mt-1 text-[13px] text-ink-2">{v.address}</p>
                  <p className="mt-1 text-[12.5px] text-ink-3">
                    {v.phone}
                    {v.entryHours ? ` · 반입 ${v.entryHours}` : ""}
                    {v.entryFee > 0
                      ? ` · 반입료 ${v.entryFee.toLocaleString("ko-KR")}원`
                      : ""}
                    {` · 최종 갱신 ${v.updatedAt}`}
                  </p>
                  {v.restrictionReason && (
                    <p className="mt-2 rounded-md bg-warn-soft px-2.5 py-1.5 text-[12px] font-semibold text-warn">
                      {v.restrictionReason}
                    </p>
                  )}
                </div>

                {!editing && (
                  <Button
                    variant="ghost"
                    className="w-auto shrink-0 px-5 text-[13.5px]"
                    onClick={() => startEdit(v)}
                  >
                    반입 규정 갱신
                  </Button>
                )}
              </div>

              {editing && (
                <div className="mt-4 border-t border-line-2 pt-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="화환 반입" required>
                      <select
                        className="control"
                        value={draftAllowed}
                        onChange={(e) =>
                          setDraftAllowed(
                            e.target.value as "YES" | "NO" | "UNKNOWN"
                          )
                        }
                      >
                        <option value="YES">가능</option>
                        <option value="NO">불가</option>
                        <option value="UNKNOWN">확인 필요</option>
                      </select>
                    </Field>
                    <Field
                      label="제한 사유 · 조건"
                      hint="비워두면 제한 없음으로 저장됩니다."
                    >
                      <input
                        className="control"
                        value={draftReason}
                        onChange={(e) => setDraftReason(e.target.value)}
                        placeholder="예) 3단 이상 대형 화환 반입 불가"
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
                    <Button className="w-auto px-6" onClick={() => commit(v.id)}>
                      저장
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      <p className="mt-7 text-[11.5px] leading-relaxed text-ink-3">
        초기 마스터는 공공데이터로 구축하고, 반입 규정은 공급사가 완료 처리할 때
        체크하는 반입 이슈 1필드로 축적합니다. 3건 이상 누적되면 운영팀 검증
        대상이 됩니다.
      </p>
    </DeskShell>
  );
}
