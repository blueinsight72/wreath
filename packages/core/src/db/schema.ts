// ZENO 경조사 화환 발송 모듈 (ZENO-CND) — Drizzle 스키마
//
// supabase/schema.sql 과 같은 구조를 타입으로 옮긴 것이다. 표의 정의는 여전히
// schema.sql 이 원본이며(Supabase SQL Editor 로 실행), 이 파일은 서버에서
// 질의를 타입 안전하게 쓰기 위한 사본이다. 둘 중 하나만 고치면 어긋나므로
// 표를 바꿀 때는 반드시 같이 고친다.
//
// text({ enum }) 은 TypeScript 타입일 뿐 SQL 에 제약을 만들지 않는다. 그래서
// schema.sql 의 check (... in (...)) 를 check() 로 한 번 더 적는다. 이름은
// Postgres 가 인라인 check 에 붙이는 이름(<표>_<열>_check)과 맞춰, drizzle-kit
// 이 기존 제약을 "없는 것"으로 보고 지우지 않게 한다.
//
// 테넌트 경계
//   고객사 귀속 : 규정 · 거래처 수신자 마스터 · 발주 · 판정 스냅샷 · 차단 로그 · 승인 이력
//   ZENO 공통   : 장례식장 DB · 상품 카탈로그
//   ZENO SCM    : 공급사 마스터 · 발주 접수 · 배송 상태 · 정산 (이 모듈 밖)
import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

// ────────────────────────────────────────────────────────────
// 0. 테넌트
// ────────────────────────────────────────────────────────────

export const tenant = pgTable(
  "tenant",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    industry: text("industry"),
    plan: text("plan", { enum: ["PILOT", "ACTIVE", "SUSPENDED"] })
      .notNull()
      .default("PILOT"),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [check("tenant_plan_check", sql`${t.plan} in ('PILOT', 'ACTIVE', 'SUSPENDED')`)],
);

/**
 * 사용자 ↔ 고객사 소속. RLS 는 이 표를 기준으로 판단한다.
 * role: OPERATOR = ZENO 운영팀(전 고객사 접근), 그 외는 해당 고객사 안에서만.
 */
export const tenantMember = pgTable(
  "tenant_member",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenant.id, { onDelete: "cascade" }),
    /** auth.users.id */
    userId: uuid("user_id").notNull(),
    role: text("role", {
      enum: ["OPERATOR", "ADMIN", "APPROVER", "STAFF", "AUDITOR"],
    })
      .notNull()
      .default("STAFF"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique().on(t.tenantId, t.userId),
    index("tenant_member_user").on(t.userId),
    check(
      "tenant_member_role_check",
      sql`${t.role} in ('OPERATOR', 'ADMIN', 'APPROVER', 'STAFF', 'AUDITOR')`,
    ),
  ],
);

// ────────────────────────────────────────────────────────────
// 1. 규정 (F1) — 고객사 귀속
// ────────────────────────────────────────────────────────────

export const policyVersion = pgTable(
  "policy_version",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenant.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    status: text("status", { enum: ["DRAFT", "PENDING", "ACTIVE", "ARCHIVED"] })
      .notNull()
      .default("DRAFT"),
    effectiveFrom: date("effective_from"),
    approvedAt: date("approved_at"),
    approvedBy: text("approved_by"),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique().on(t.tenantId, t.label),
    // 고객사마다 시행 중 규정은 하나뿐이어야 한다.
    // 둘 이상이면 어느 기준으로 판정했는지 확정할 수 없다.
    uniqueIndex("policy_version_one_active")
      .on(t.tenantId)
      .where(sql`${t.status} = 'ACTIVE'`),
    check(
      "policy_version_status_check",
      sql`${t.status} in ('DRAFT', 'PENDING', 'ACTIVE', 'ARCHIVED')`,
    ),
  ],
);

export const policyRule = pgTable(
  "policy_rule",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenant.id, { onDelete: "cascade" }),
    versionId: uuid("version_id")
      .notNull()
      .references(() => policyVersion.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    eventTypeCode: text("event_type_code").notNull(),
    targetKind: text("target_kind", { enum: ["EMPLOYEE", "EXTERNAL"] }).notNull(),
    rankTier: text("rank_tier", { enum: ["EXEC", "SENIOR", "STAFF"] }),
    minTenureMonths: integer("min_tenure_months").notNull().default(0),
    grade: text("grade").notNull(),
    wreathLimit: integer("wreath_limit").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique().on(t.versionId, t.code),
    index("policy_rule_lookup").on(t.tenantId, t.versionId, t.eventTypeCode, t.targetKind),
    check("policy_rule_target_kind_check", sql`${t.targetKind} in ('EMPLOYEE', 'EXTERNAL')`),
    check("policy_rule_rank_tier_check", sql`${t.rankTier} in ('EXEC', 'SENIOR', 'STAFF')`),
    check("policy_rule_wreath_limit_check", sql`${t.wreathLimit} >= 0`),
  ],
);

// ────────────────────────────────────────────────────────────
// 2. 마스터
// ────────────────────────────────────────────────────────────

/** 거래처 수신자 마스터 (F14) — 고객사 귀속. 거래처는 회사마다 다르다. */
export const externalRecipient = pgTable(
  "external_recipient",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenant.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    org: text("org").notNull(),
    position: text("position"),
    regime: text("regime", { enum: ["R1", "R2", "R3", "UNKNOWN"] })
      .notNull()
      .default("UNKNOWN"),
    basis: text("basis"),
    officialScope: text("official_scope", { enum: ["SELF", "SPOUSE"] }),
    autoHint: text("auto_hint"),
    confirmedAt: date("confirmed_at"),
    confirmedBy: text("confirmed_by"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("external_recipient_tenant").on(t.tenantId, t.name),
    check(
      "external_recipient_regime_check",
      sql`${t.regime} in ('R1', 'R2', 'R3', 'UNKNOWN')`,
    ),
    check(
      "external_recipient_official_scope_check",
      sql`${t.officialScope} in ('SELF', 'SPOUSE')`,
    ),
  ],
);

/** 장례식장 (F8) — ZENO 공통 자산. 전 고객사 배송에서 함께 축적된다. */
export const funeralVenue = pgTable(
  "funeral_venue",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    address: text("address"),
    region: text("region"),
    phone: text("phone"),
    wreathAllowed: boolean("wreath_allowed"),
    restrictionReason: text("restriction_reason"),
    entryFee: integer("entry_fee").notNull().default(0),
    entryHours: text("entry_hours"),
    verification: text("verification", {
      enum: ["VERIFIED", "NEEDS_CHECK", "REPORTED"],
    })
      .notNull()
      .default("NEEDS_CHECK"),
    issueReports: integer("issue_reports").notNull().default(0),
    updatedAt: date("updated_at"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check(
      "funeral_venue_verification_check",
      sql`${t.verification} in ('VERIFIED', 'NEEDS_CHECK', 'REPORTED')`,
    ),
  ],
);

/** 상품 카탈로그 — ZENO 공통 */
export const wreathProduct = pgTable(
  "wreath_product",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    grade: text("grade").notNull(),
    price: integer("price").notNull(),
    kind: text("kind", { enum: ["WREATH", "ALT"] }).notNull(),
    freshGuarantee: boolean("fresh_guarantee").notNull().default(true),
    leadTimeHours: integer("lead_time_hours").notNull().default(3),
    description: text("description"),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check("wreath_product_price_check", sql`${t.price} >= 0`),
    check("wreath_product_kind_check", sql`${t.kind} in ('WREATH', 'ALT')`),
  ],
);

// ────────────────────────────────────────────────────────────
// 3. 발주 및 통제 기록 — 고객사 귀속
// ────────────────────────────────────────────────────────────

export const condolenceOrder = pgTable(
  "condolence_order",
  {
    id: text("id").primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenant.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    applicantName: text("applicant_name").notNull(),
    applicantDept: text("applicant_dept"),
    targetLabel: text("target_label").notNull(),
    targetOrg: text("target_org"),
    regime: text("regime").notNull().default("UNKNOWN"),
    eventTypeLabel: text("event_type_label"),
    venueName: text("venue_name"),
    roomNo: text("room_no"),
    /** 조문 예정 시각 */
    visitAt: timestamp("visit_at", { withTimezone: true }),
    productName: text("product_name"),
    amount: integer("amount").notNull().default(0),
    account: text("account", { enum: ["WELFARE", "ENTERTAINMENT"] })
      .notNull()
      .default("WELFARE"),
    internalLimit: integer("internal_limit"),
    legalLimit: integer("legal_limit"),
    ribbonPhrase: text("ribbon_phrase"),
    ribbonSender: text("ribbon_sender"),
    status: text("status").notNull().default("APPROVAL_PENDING"),
    // 공급사 배정 · 접수 · 배송 상태는 ZENO SCM 이 관리한다.
    // 이 모듈은 SCM 식별자와 배정 결과 스냅샷만 보관한다.
    supplierRef: text("supplier_ref"),
    supplierName: text("supplier_name"),
    /** 승인 SLA 잔여 (분) — 음수면 초과 */
    slaRemainingMin: integer("sla_remaining_min").notNull().default(0),
    /** 사진 증빙 필수 여부 (F7-2) */
    proofRequired: boolean("proof_required").notNull().default(false),
    proofPhoto: boolean("proof_photo").notNull().default(false),
    /** 현장 반입 이슈 보고 (F8-4) */
    venueIssue: boolean("venue_issue").notNull().default(false),
    // 공급사 반입 불가 회신 (2차 방어선). 사전 판정은 funeral_venue 로 한다.
    supplierReportAt: timestamp("supplier_report_at", { withTimezone: true }),
    supplierReportReason: text("supplier_report_reason"),
    /** 접수까지 걸린 시간 (분) — 미접수면 null */
    acceptedInMin: integer("accepted_in_min"),
    offSystem: boolean("off_system").notNull().default(false),
  },
  (t) => [
    index("condolence_order_tenant").on(t.tenantId, t.createdAt.desc()),
    check(
      "condolence_order_account_check",
      sql`${t.account} in ('WELFARE', 'ENTERTAINMENT')`,
    ),
  ],
);

/** 판정 근거 스냅샷 (F1-8) — 생성 후 수정하지 않는다 */
export const policyDecisionSnapshot = pgTable("policy_decision_snapshot", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenant.id, { onDelete: "cascade" }),
  orderId: text("order_id")
    .notNull()
    .references(() => condolenceOrder.id, { onDelete: "cascade" }),
  versionLabel: text("version_label").notNull(),
  ruleCode: text("rule_code"),
  conditions: jsonb("conditions")
    .notNull()
    .default(sql`'{}'::jsonb`),
  limitFormula: text("limit_formula"),
  regimeBasis: text("regime_basis"),
  decision: text("decision").notNull(),
  decidedAt: timestamp("decided_at", { withTimezone: true }).notNull().defaultNow(),
});

/** 법정 상한 초과 시도 로그 (F1-5) */
export const blockedAttempt = pgTable("blocked_attempt", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenant.id, { onDelete: "cascade" }),
  orderId: text("order_id").references(() => condolenceOrder.id, {
    onDelete: "set null",
  }),
  applicant: text("applicant"),
  targetLabel: text("target_label"),
  regime: text("regime"),
  attempted: integer("attempted").notNull(),
  legalLimit: integer("legal_limit").notNull(),
  attemptedAt: timestamp("attempted_at", { withTimezone: true }).notNull().defaultNow(),
});

export const approvalLog = pgTable(
  "approval_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenant.id, { onDelete: "cascade" }),
    orderId: text("order_id")
      .notNull()
      .references(() => condolenceOrder.id, { onDelete: "cascade" }),
    approver: text("approver").notNull(),
    verdict: text("verdict", { enum: ["APPROVED", "REJECTED", "ESCALATED"] }).notNull(),
    reason: text("reason"),
    decidedAt: timestamp("decided_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check(
      "approval_log_verdict_check",
      sql`${t.verdict} in ('APPROVED', 'REJECTED', 'ESCALATED')`,
    ),
  ],
);

// ────────────────────────────────────────────────────────────
// 행 타입 — 서버 코드에서 재사용한다
// ────────────────────────────────────────────────────────────

export type Tenant = typeof tenant.$inferSelect;
export type TenantMember = typeof tenantMember.$inferSelect;
export type PolicyVersion = typeof policyVersion.$inferSelect;
export type PolicyRule = typeof policyRule.$inferSelect;
export type ExternalRecipient = typeof externalRecipient.$inferSelect;
export type FuneralVenue = typeof funeralVenue.$inferSelect;
export type WreathProduct = typeof wreathProduct.$inferSelect;
export type CondolenceOrder = typeof condolenceOrder.$inferSelect;
export type PolicyDecisionSnapshot = typeof policyDecisionSnapshot.$inferSelect;
export type BlockedAttempt = typeof blockedAttempt.$inferSelect;
export type ApprovalLog = typeof approvalLog.$inferSelect;

export type NewCondolenceOrder = typeof condolenceOrder.$inferInsert;
export type NewApprovalLog = typeof approvalLog.$inferInsert;
export type NewBlockedAttempt = typeof blockedAttempt.$inferInsert;
