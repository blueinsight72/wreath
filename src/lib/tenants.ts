// 멀티테넌트 — 고객사마다 경조 규정이 다르다.
// 규정 · 거래처 수신자 마스터 · 발주 이력은 고객사에 귀속되고,
// 장례식장 DB · 공급사 · 상품 카탈로그는 ZENO 가 전 고객사 공통으로 운영한다.
// (장례식장 반입 정보는 모든 고객사의 배송에서 함께 축적될 때 가장 정확해진다)
import type { PolicyRule } from "./types";

export interface Tenant {
  id: string;
  name: string;
  /** 고객사 식별용 슬러그 — 서브도메인 · URL 에 쓴다 */
  slug: string;
  industry: string;
  /** 계약 상태 */
  plan: "PILOT" | "ACTIVE" | "SUSPENDED";
  /** 이 고객사에서 시행 중인 규정 버전 */
  policyVersion: string;
  policyApprovedAt: string;
  policyApprovedBy: string;
  /** 도입 특성 메모 — 규정이 왜 이렇게 생겼는지 */
  note: string;
}

export const TENANTS: Tenant[] = [
  {
    id: "tn-zeno",
    name: "제노㈜",
    slug: "zeno",
    industry: "IT · 플랫폼",
    plan: "ACTIVE",
    policyVersion: "v3.2",
    policyApprovedAt: "2026-02-20",
    policyApprovedBy: "CFO 한지수",
    note: "직급별 차등 3단계. 거래처 경조도 규정에 포함.",
  },
  {
    id: "tn-daehan",
    name: "대한물산㈜",
    slug: "daehan",
    industry: "유통 · 물류",
    plan: "ACTIVE",
    policyVersion: "v1.4",
    policyApprovedAt: "2026-05-11",
    policyApprovedBy: "관리본부장 조성일",
    note: "직급 차등 없이 경조 유형별 단일 상한. 거래처 경조는 규정 외로 두고 전건 승인.",
  },
  {
    id: "tn-mirae",
    name: "미래바이오㈜",
    slug: "mirae",
    industry: "제약 · 의료기기",
    plan: "PILOT",
    policyVersion: "v0.9",
    policyApprovedAt: "2026-08-01",
    policyApprovedBy: "준법지원인 배수현",
    note: "보건의료인(R2) 대상 발송이 잦아 상한을 보수적으로 잡고 전건 승인 경로.",
  },
];

export const DEFAULT_TENANT_ID = TENANTS[0].id;

export function findTenant(id: string | null | undefined): Tenant {
  return TENANTS.find((t) => t.id === id) ?? TENANTS[0];
}

/* ── 고객사별 규정표 ──────────────────────────────────────── */

/** 제노㈜ — 직급 3단 차등 */
const ZENO_RULES: PolicyRule[] = [
  { id: "P-101", eventTypeCode: "PARENT_DEATH", targetKind: "EMPLOYEE", rankTier: "EXEC", minTenureMonths: 0, grade: "A", wreathLimit: 300000 },
  { id: "P-102", eventTypeCode: "PARENT_DEATH", targetKind: "EMPLOYEE", rankTier: "SENIOR", minTenureMonths: 12, grade: "B", wreathLimit: 200000 },
  { id: "P-103", eventTypeCode: "PARENT_DEATH", targetKind: "EMPLOYEE", rankTier: "STAFF", minTenureMonths: 12, grade: "C", wreathLimit: 150000 },
  { id: "P-104", eventTypeCode: "PARENT_DEATH", targetKind: "EMPLOYEE", rankTier: null, minTenureMonths: 0, grade: "D", wreathLimit: 100000 },
  { id: "P-111", eventTypeCode: "SPOUSE_PARENT_DEATH", targetKind: "EMPLOYEE", rankTier: "EXEC", minTenureMonths: 0, grade: "A", wreathLimit: 300000 },
  { id: "P-112", eventTypeCode: "SPOUSE_PARENT_DEATH", targetKind: "EMPLOYEE", rankTier: null, minTenureMonths: 12, grade: "C", wreathLimit: 150000 },
  { id: "P-113", eventTypeCode: "SPOUSE_PARENT_DEATH", targetKind: "EMPLOYEE", rankTier: null, minTenureMonths: 0, grade: "D", wreathLimit: 100000 },
  { id: "P-121", eventTypeCode: "SPOUSE_DEATH", targetKind: "EMPLOYEE", rankTier: null, minTenureMonths: 0, grade: "A", wreathLimit: 300000 },
  { id: "P-131", eventTypeCode: "CHILD_DEATH", targetKind: "EMPLOYEE", rankTier: null, minTenureMonths: 0, grade: "A", wreathLimit: 300000 },
  { id: "P-141", eventTypeCode: "GRANDPARENT_DEATH", targetKind: "EMPLOYEE", rankTier: "EXEC", minTenureMonths: 0, grade: "C", wreathLimit: 150000 },
  { id: "P-142", eventTypeCode: "GRANDPARENT_DEATH", targetKind: "EMPLOYEE", rankTier: null, minTenureMonths: 0, grade: "D", wreathLimit: 100000 },
  { id: "P-151", eventTypeCode: "SIBLING_DEATH", targetKind: "EMPLOYEE", rankTier: "EXEC", minTenureMonths: 0, grade: "C", wreathLimit: 150000 },
  { id: "P-152", eventTypeCode: "SIBLING_DEATH", targetKind: "EMPLOYEE", rankTier: null, minTenureMonths: 0, grade: "D", wreathLimit: 100000 },
  { id: "P-201", eventTypeCode: "PARENT_DEATH", targetKind: "EXTERNAL", rankTier: null, minTenureMonths: 0, grade: "C", wreathLimit: 150000 },
  { id: "P-202", eventTypeCode: "SPOUSE_PARENT_DEATH", targetKind: "EXTERNAL", rankTier: null, minTenureMonths: 0, grade: "C", wreathLimit: 150000 },
  { id: "P-203", eventTypeCode: "SPOUSE_DEATH", targetKind: "EXTERNAL", rankTier: null, minTenureMonths: 0, grade: "B", wreathLimit: 200000 },
  { id: "P-204", eventTypeCode: "CHILD_DEATH", targetKind: "EXTERNAL", rankTier: null, minTenureMonths: 0, grade: "B", wreathLimit: 200000 },
  { id: "P-205", eventTypeCode: "GRANDPARENT_DEATH", targetKind: "EXTERNAL", rankTier: null, minTenureMonths: 0, grade: "D", wreathLimit: 100000 },
];

/** 대한물산㈜ — 직급 차등 없음, 거래처는 규정 외(전건 승인) */
const DAEHAN_RULES: PolicyRule[] = [
  { id: "D-01", eventTypeCode: "PARENT_DEATH", targetKind: "EMPLOYEE", rankTier: null, minTenureMonths: 0, grade: "B", wreathLimit: 200000 },
  { id: "D-02", eventTypeCode: "SPOUSE_PARENT_DEATH", targetKind: "EMPLOYEE", rankTier: null, minTenureMonths: 0, grade: "C", wreathLimit: 150000 },
  { id: "D-03", eventTypeCode: "SPOUSE_DEATH", targetKind: "EMPLOYEE", rankTier: null, minTenureMonths: 0, grade: "B", wreathLimit: 200000 },
  { id: "D-04", eventTypeCode: "CHILD_DEATH", targetKind: "EMPLOYEE", rankTier: null, minTenureMonths: 0, grade: "B", wreathLimit: 200000 },
  { id: "D-05", eventTypeCode: "GRANDPARENT_DEATH", targetKind: "EMPLOYEE", rankTier: null, minTenureMonths: 6, grade: "D", wreathLimit: 100000 },
  { id: "D-06", eventTypeCode: "SIBLING_DEATH", targetKind: "EMPLOYEE", rankTier: null, minTenureMonths: 6, grade: "D", wreathLimit: 100000 },
];

/** 미래바이오㈜ — 상한 보수적, 거래처는 전건 승인 */
const MIRAE_RULES: PolicyRule[] = [
  { id: "M-01", eventTypeCode: "PARENT_DEATH", targetKind: "EMPLOYEE", rankTier: "EXEC", minTenureMonths: 0, grade: "C", wreathLimit: 150000 },
  { id: "M-02", eventTypeCode: "PARENT_DEATH", targetKind: "EMPLOYEE", rankTier: null, minTenureMonths: 0, grade: "D", wreathLimit: 100000 },
  { id: "M-03", eventTypeCode: "SPOUSE_PARENT_DEATH", targetKind: "EMPLOYEE", rankTier: null, minTenureMonths: 0, grade: "D", wreathLimit: 100000 },
  { id: "M-04", eventTypeCode: "SPOUSE_DEATH", targetKind: "EMPLOYEE", rankTier: null, minTenureMonths: 0, grade: "C", wreathLimit: 150000 },
  { id: "M-05", eventTypeCode: "CHILD_DEATH", targetKind: "EMPLOYEE", rankTier: null, minTenureMonths: 0, grade: "C", wreathLimit: 150000 },
  { id: "M-06", eventTypeCode: "GRANDPARENT_DEATH", targetKind: "EMPLOYEE", rankTier: null, minTenureMonths: 0, grade: "E", wreathLimit: 80000 },
  { id: "M-11", eventTypeCode: "PARENT_DEATH", targetKind: "EXTERNAL", rankTier: null, minTenureMonths: 0, grade: "E", wreathLimit: 80000 },
];

export const POLICY_RULES_BY_TENANT: Record<string, PolicyRule[]> = {
  "tn-zeno": ZENO_RULES,
  "tn-daehan": DAEHAN_RULES,
  "tn-mirae": MIRAE_RULES,
};

export function rulesOf(tenantId: string): PolicyRule[] {
  return POLICY_RULES_BY_TENANT[tenantId] ?? [];
}
