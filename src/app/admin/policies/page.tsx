"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Badge,
  Button,
  Callout,
  Card,
  DeskShell,
  Field,
  Stat,
} from "@/components/ui";
import { DataSourceBadge } from "@/components/DataSourceBadge";
import { formatKRW } from "@/lib/format";
import { EVENT_TYPES, findEventType } from "@/lib/mock-data";
import {
  VERSION_STATUS_LABEL,
  deleteRule,
  loadPolicies,
  saveRule,
  activateVersion,
  updateVersionStatus,
  type PolicyBundle,
  type PolicyVersion,
  type RuleInput,
} from "@/lib/repo/policy-repo";
import { RANK_TIER_LABEL, type PolicyRule, type RankTier, type TargetKind } from "@/lib/types";

const EMPTY_RULE: RuleInput = {
  code: "",
  eventTypeCode: "PARENT_DEATH",
  targetKind: "EMPLOYEE",
  rankTier: null,
  minTenureMonths: 0,
  grade: "C",
  wreathLimit: 150000,
};

export default function PoliciesPage() {
  const [bundle, setBundle] = useState<PolicyBundle | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editing, setEditing] = useState<RuleInput | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    loadPolicies().then((result) => {
      if (!alive) return;
      setBundle(result);
      setSelectedId(
        result.versions.find((v) => v.status === "ACTIVE")?.id ??
          result.versions[0]?.id ??
          null
      );
    });
    return () => {
      alive = false;
    };
  }, []);

  const version = useMemo(
    () => bundle?.versions.find((v) => v.id === selectedId) ?? null,
    [bundle, selectedId]
  );
  const rules = selectedId ? (bundle?.rulesByVersion[selectedId] ?? []) : [];
  const editable = version?.status === "DRAFT" || version?.status === "PENDING";

  if (!bundle) {
    return (
      <DeskShell title="경조 규정 관리" back={{ href: "/", label: "홈" }}>
        <Card>
          <p className="text-[13px] text-ink-2">규정을 불러오는 중입니다…</p>
        </Card>
      </DeskShell>
    );
  }

  /* 로컬 상태와 Supabase 를 함께 갱신한다. 미설정이면 로컬만 바뀐다. */
  const applyRule = async (input: RuleInput) => {
    if (!selectedId) return;
    const err = await saveRule(selectedId, input);
    if (err) {
      setNotice(`저장 실패 — ${err}`);
      return;
    }
    setBundle((prev) => {
      if (!prev) return prev;
      const list = [...(prev.rulesByVersion[selectedId] ?? [])];
      const next: PolicyRule = {
        id: input.code,
        eventTypeCode: input.eventTypeCode,
        targetKind: input.targetKind,
        rankTier: input.rankTier,
        minTenureMonths: input.minTenureMonths,
        grade: input.grade,
        wreathLimit: input.wreathLimit,
      };
      const at = list.findIndex((r) => r.id === input.code);
      if (at >= 0) list[at] = next;
      else list.push(next);
      return {
        ...prev,
        rulesByVersion: { ...prev.rulesByVersion, [selectedId]: list },
      };
    });
    setEditing(null);
    setNotice(null);
  };

  const removeRule = async (code: string) => {
    if (!selectedId) return;
    const err = await deleteRule(selectedId, code);
    if (err) {
      setNotice(`삭제 실패 — ${err}`);
      return;
    }
    setBundle((prev) =>
      prev
        ? {
            ...prev,
            rulesByVersion: {
              ...prev.rulesByVersion,
              [selectedId]: (prev.rulesByVersion[selectedId] ?? []).filter(
                (r) => r.id !== code
              ),
            },
          }
        : prev
    );
  };

  const requestApproval = async (next: PolicyVersion["status"]) => {
    if (!selectedId) return;
    const activating = next === "ACTIVE";
    const approvedBy = activating ? "CFO 한지수" : undefined;
    const approvedAt = activating ? "2026-08-29" : undefined;

    const err = activating
      ? await activateVersion(selectedId, approvedBy!, approvedAt!)
      : await updateVersionStatus(selectedId, next);
    if (err) {
      setNotice(`상태 변경 실패 — ${err}`);
      return;
    }

    setBundle((prev) =>
      prev
        ? {
            ...prev,
            versions: prev.versions.map((v) => {
              if (v.id === selectedId) {
                return {
                  ...v,
                  status: next,
                  approvedBy: approvedBy ?? v.approvedBy,
                  approvedAt: approvedAt ?? v.approvedAt,
                };
              }
              // 시행 중 규정은 하나만 존재해야 한다
              if (activating && v.status === "ACTIVE") {
                return { ...v, status: "ARCHIVED" as const };
              }
              return v;
            }),
          }
        : prev
    );
  };

  return (
    <DeskShell
      title="경조 규정 관리"
      subtitle="여기서 등록한 규정이 모든 발주의 판정 기준이 됩니다. 규정 결재가 곧 자동승인의 사전 결재입니다."
      back={{ href: "/", label: "홈" }}
      aside={<DataSourceBadge source={bundle.source} />}
    >
      {bundle.error && (
        <div className="mb-5">
          <Callout tone="danger" title="Supabase 연결 문제">
            {bundle.error} — 목업 데이터로 표시하고 있습니다.
          </Callout>
        </div>
      )}
      {notice && (
        <div className="mb-5">
          <Callout tone="danger">{notice}</Callout>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="규정 버전" value={`${bundle.versions.length}개`} />
        <Stat
          label="시행 중 규정"
          value={`${rules.length}줄`}
          note={version?.label}
          tone="ok"
        />
        <Stat label="등록 상품" value={`${bundle.products.length}종`} />
        <Stat
          label="최고 상한"
          value={
            rules.length
              ? formatKRW(Math.max(...rules.map((r) => r.wreathLimit)))
              : "—"
          }
        />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[260px_1fr]">
        <div>
          <h2 className="text-[15px] font-bold text-ink">버전</h2>
          <div className="mt-3 space-y-2">
            {bundle.versions.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => {
                  setSelectedId(v.id);
                  setEditing(null);
                }}
                className={`block w-full rounded-xl border p-3.5 text-left transition ${
                  v.id === selectedId
                    ? "border-brand bg-brand-soft"
                    : "border-line bg-surface hover:border-brand-2"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-[14.5px] font-bold text-ink">
                    {v.label}
                  </span>
                  <Badge
                    tone={
                      v.status === "ACTIVE"
                        ? "ok"
                        : v.status === "PENDING"
                          ? "warn"
                          : v.status === "DRAFT"
                            ? "info"
                            : "neutral"
                    }
                  >
                    {VERSION_STATUS_LABEL[v.status]}
                  </Badge>
                </div>
                <p className="mt-1 text-[12px] text-ink-2">
                  {v.effectiveFrom ? `${v.effectiveFrom} 시행` : "시행일 미정"}
                </p>
                <p className="mt-0.5 text-[12px] text-ink-3">
                  {v.approvedAt
                    ? `${v.approvedAt} ${v.approvedBy} 결재`
                    : "결재 전"}
                </p>
              </button>
            ))}
          </div>
        </div>

        <div>
          {version && (
            <Card className="bg-surface">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-[16px] font-bold text-ink">
                    {version.label} 규정표
                  </h2>
                  <p className="mt-1 text-[12.5px] text-ink-2">
                    {version.note ?? "설명 없음"}
                  </p>
                </div>
                <div className="flex gap-2">
                  {version.status === "DRAFT" && (
                    <Button
                      variant="ghost"
                      className="w-auto px-4 text-[13.5px]"
                      onClick={() => requestApproval("PENDING")}
                    >
                      결재 상신
                    </Button>
                  )}
                  {version.status === "PENDING" && (
                    <Button
                      className="w-auto px-4 text-[13.5px]"
                      onClick={() => requestApproval("ACTIVE")}
                    >
                      결재 승인 · 시행
                    </Button>
                  )}
                </div>
              </div>

              {version.status === "ACTIVE" && (
                <div className="mt-4">
                  <Callout tone="info" title="시행 중인 규정은 수정할 수 없습니다">
                    개정하려면 새 버전을 만들어야 합니다. 판정 근거 스냅샷이
                    버전을 참조하므로, 시행 중 규정을 고치면 과거 판정의 근거가
                    사라집니다.
                  </Callout>
                </div>
              )}

              {version.status === "PENDING" && (
                <div className="mt-4">
                  <Callout tone="warn" title="결재 대기 중입니다">
                    이 결재가 개별 발주 자동승인의 사전 결재 근거가 됩니다.
                    결재 없이 시행하면 내부감사에서 자동승인 건이 통째로
                    롤백될 수 있습니다.
                  </Callout>
                </div>
              )}

              <div className="mt-5 overflow-x-auto">
                <table className="w-full min-w-[640px] border-collapse text-[13px]">
                  <thead>
                    <tr className="border-b border-line text-left text-[12px] text-ink-3">
                      <th className="py-2 pr-3 font-semibold">코드</th>
                      <th className="py-2 pr-3 font-semibold">경조 유형</th>
                      <th className="py-2 pr-3 font-semibold">대상</th>
                      <th className="py-2 pr-3 font-semibold">직급</th>
                      <th className="py-2 pr-3 font-semibold">재직</th>
                      <th className="py-2 pr-3 font-semibold">등급</th>
                      <th className="py-2 pr-3 text-right font-semibold">상한</th>
                      <th className="py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {rules.length === 0 && (
                      <tr>
                        <td colSpan={8} className="py-6 text-center text-ink-3">
                          등록된 규정이 없습니다.
                        </td>
                      </tr>
                    )}
                    {rules.map((rule) => (
                      <tr key={rule.id} className="border-b border-line-2">
                        <td className="py-2.5 pr-3 font-mono text-[12px] text-ink-3">
                          {rule.id}
                        </td>
                        <td className="py-2.5 pr-3 text-ink">
                          {findEventType(rule.eventTypeCode)?.label ??
                            rule.eventTypeCode}
                        </td>
                        <td className="py-2.5 pr-3 text-ink-2">
                          {rule.targetKind === "EMPLOYEE" ? "임직원" : "거래처"}
                        </td>
                        <td className="py-2.5 pr-3 text-ink-2">
                          {rule.rankTier ? RANK_TIER_LABEL[rule.rankTier] : "무관"}
                        </td>
                        <td className="py-2.5 pr-3 tabular-nums text-ink-2">
                          {rule.minTenureMonths > 0
                            ? `${rule.minTenureMonths}개월+`
                            : "무관"}
                        </td>
                        <td className="py-2.5 pr-3 text-ink-2">{rule.grade}</td>
                        <td className="py-2.5 pr-3 text-right font-semibold tabular-nums text-ink">
                          {formatKRW(rule.wreathLimit)}
                        </td>
                        <td className="py-2.5 text-right">
                          {editable && (
                            <span className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  setEditing({
                                    code: rule.id,
                                    eventTypeCode: rule.eventTypeCode,
                                    targetKind: rule.targetKind,
                                    rankTier: rule.rankTier,
                                    minTenureMonths: rule.minTenureMonths,
                                    grade: rule.grade,
                                    wreathLimit: rule.wreathLimit,
                                  })
                                }
                                className="text-[12.5px] font-semibold text-brand-2 underline underline-offset-2"
                              >
                                수정
                              </button>
                              <button
                                type="button"
                                onClick={() => removeRule(rule.id)}
                                className="text-[12.5px] font-semibold text-danger underline underline-offset-2"
                              >
                                삭제
                              </button>
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {editable && !editing && (
                <Button
                  variant="ghost"
                  className="mt-4 w-auto px-5 text-[13.5px]"
                  onClick={() =>
                    setEditing({
                      ...EMPTY_RULE,
                      code: `P-${String(rules.length + 1).padStart(3, "0")}`,
                    })
                  }
                >
                  규정 추가
                </Button>
              )}

              {editing && (
                <RuleEditor
                  value={editing}
                  onChange={setEditing}
                  onCancel={() => setEditing(null)}
                  onSave={() => applyRule(editing)}
                />
              )}
            </Card>
          )}
        </div>
      </div>

      <p className="mt-7 text-[11.5px] leading-relaxed text-ink-3">
        규정 버전 · 결재 이력은 발주 건별 판정 근거 스냅샷과 연결되어 감사
        자료로 제출됩니다.
      </p>
    </DeskShell>
  );
}

function RuleEditor({
  value,
  onChange,
  onCancel,
  onSave,
}: {
  value: RuleInput;
  onChange: (next: RuleInput) => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  const patch = (part: Partial<RuleInput>) => onChange({ ...value, ...part });

  return (
    <div className="mt-5 rounded-xl border border-line bg-surface-2 p-4">
      <h3 className="text-[14px] font-bold text-ink">규정 편집</h3>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="코드" required>
          <input
            className="control"
            value={value.code}
            onChange={(e) => patch({ code: e.target.value })}
          />
        </Field>
        <Field label="경조 유형" required>
          <select
            className="control"
            value={value.eventTypeCode}
            onChange={(e) => patch({ eventTypeCode: e.target.value })}
          >
            {EVENT_TYPES.filter((t) => t.category === "근조").map((t) => (
              <option key={t.code} value={t.code}>
                {t.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="대상 구분" required>
          <select
            className="control"
            value={value.targetKind}
            onChange={(e) =>
              patch({ targetKind: e.target.value as TargetKind })
            }
          >
            <option value="EMPLOYEE">자사 임직원</option>
            <option value="EXTERNAL">거래처 · 외부</option>
          </select>
        </Field>
        <Field label="직급 등급" hint="무관으로 두면 모든 직급에 적용됩니다.">
          <select
            className="control"
            value={value.rankTier ?? ""}
            onChange={(e) =>
              patch({ rankTier: (e.target.value || null) as RankTier | null })
            }
          >
            <option value="">무관</option>
            <option value="EXEC">임원</option>
            <option value="SENIOR">책임 · 선임</option>
            <option value="STAFF">사원</option>
          </select>
        </Field>
        <Field label="최소 재직 개월" hint="0이면 재직기간 조건 없음">
          <input
            className="control"
            inputMode="numeric"
            value={value.minTenureMonths}
            onChange={(e) =>
              patch({ minTenureMonths: Number(e.target.value) || 0 })
            }
          />
        </Field>
        <Field label="등급" required hint="같은 등급 상품이 기본 선택됩니다.">
          <input
            className="control"
            value={value.grade}
            onChange={(e) => patch({ grade: e.target.value.toUpperCase() })}
          />
        </Field>
        <Field label="화환 상한 (원)" required>
          <input
            className="control"
            inputMode="numeric"
            value={value.wreathLimit}
            onChange={(e) => patch({ wreathLimit: Number(e.target.value) || 0 })}
          />
        </Field>
      </div>

      <div className="mt-4 flex gap-2">
        <Button variant="ghost" className="w-auto px-5" onClick={onCancel}>
          취소
        </Button>
        <Button
          className="w-auto px-6"
          disabled={!value.code.trim() || !value.grade.trim()}
          onClick={onSave}
        >
          저장
        </Button>
      </div>
    </div>
  );
}
