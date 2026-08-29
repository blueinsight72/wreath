-- ZENO 경조사 화환 발송 모듈 (ZENO-CND) — Supabase 스키마
-- Supabase 대시보드 > SQL Editor 에 붙여넣고 실행하십시오.
--
-- ⚠️ 보안 주의
-- 이 파일 마지막의 RLS 정책은 인증을 붙이기 전 프로토타입용입니다.
-- anon 키만으로 읽기·쓰기가 모두 열려 있으므로, 실제 임직원·고인·유족 정보를
-- 넣기 전에 반드시 rls-production.sql 의 정책으로 교체해야 합니다.
-- PRD F13(개인정보) 요구사항 — 조회 권한 제한, 접근 로그 전건 기록 — 은
-- 인증 도입 이후에 충족됩니다.

-- ────────────────────────────────────────────────────────────
-- 1. 규정 (F1)
-- ────────────────────────────────────────────────────────────

-- 규정 버전 — 개정 이력을 보존하고, 적용 시점 기준으로 판정한다 (F1-7)
-- 등록·개정 시 CFO 결재가 개별 건 자동승인의 사전 결재 근거가 된다 (F1-9)
create table if not exists policy_version (
  id           uuid primary key default gen_random_uuid(),
  label        text        not null,                 -- 예) v3.2
  status       text        not null default 'DRAFT'  -- DRAFT | PENDING | ACTIVE | ARCHIVED
               check (status in ('DRAFT', 'PENDING', 'ACTIVE', 'ARCHIVED')),
  effective_from date,
  approved_at  date,
  approved_by  text,
  note         text,
  created_at   timestamptz not null default now()
);

-- 규정표 한 줄 — 경조유형 × 대상구분 × 직급 × 재직기간 → 화환 상한 (F1-1, F1-2, F1-3)
create table if not exists policy_rule (
  id                 uuid primary key default gen_random_uuid(),
  version_id         uuid not null references policy_version(id) on delete cascade,
  code               text not null,                  -- 예) P-102
  event_type_code    text not null,
  target_kind        text not null check (target_kind in ('EMPLOYEE', 'EXTERNAL')),
  rank_tier          text check (rank_tier in ('EXEC', 'SENIOR', 'STAFF')),
  min_tenure_months  int  not null default 0,
  grade              text not null,
  wreath_limit       int  not null check (wreath_limit >= 0),
  created_at         timestamptz not null default now(),
  unique (version_id, code)
);

create index if not exists policy_rule_lookup
  on policy_rule (version_id, event_type_code, target_kind);

-- 화환 상품
create table if not exists wreath_product (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  grade            text not null,
  price            int  not null check (price >= 0),
  kind             text not null check (kind in ('WREATH', 'ALT')),
  fresh_guarantee  boolean not null default true,    -- 생화·신품 확약 (F3-4)
  lead_time_hours  int  not null default 3,
  description      text,
  active           boolean not null default true,
  created_at       timestamptz not null default now()
);

-- ────────────────────────────────────────────────────────────
-- 2. 마스터
-- ────────────────────────────────────────────────────────────

-- 거래처 수신자 마스터 (F14) — 레짐이 확정되지 않으면 자동승인 불가
create table if not exists external_recipient (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  org             text not null,
  position        text,
  regime          text not null default 'UNKNOWN'
                  check (regime in ('R1', 'R2', 'R3', 'UNKNOWN')),
  basis           text,                              -- 판정 근거 (감사 제출용)
  official_scope  text check (official_scope in ('SELF', 'SPOUSE')),
  auto_hint       text,                              -- 기관명 기반 자동 후보 판정 (F14-5)
  confirmed_at    date,
  confirmed_by    text,
  created_at      timestamptz not null default now()
);

-- 장례식장 · 반입 규정 (F8)
create table if not exists funeral_venue (
  id                 uuid primary key default gen_random_uuid(),
  name               text not null,
  address            text,
  region             text,
  phone              text,
  wreath_allowed     boolean,                        -- null = 확인 필요
  restriction_reason text,
  entry_fee          int not null default 0,
  entry_hours        text,
  verification       text not null default 'NEEDS_CHECK'
                     check (verification in ('VERIFIED', 'NEEDS_CHECK', 'REPORTED')),
  issue_reports      int  not null default 0,        -- 공급사 현장 보고 누적 (F8-4)
  updated_at         date,
  created_at         timestamptz not null default now()
);

-- 공급사 (F6-7, F11-7)
create table if not exists supplier (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  regions          text[] not null default '{}',
  business_hours   text,
  night_support    boolean not null default false,
  tax_type         text not null default 'GENERAL'
                   check (tax_type in ('GENERAL', 'SIMPLE', 'EXEMPT')),
  proper_evidence  boolean not null default false,   -- 적격증빙 발급 가능 여부
  onboarding       text not null default 'APPLIED',
  grace_ends_at    date,
  sla_score        int not null default 0,
  accept_rate      int not null default 0,
  on_time_rate     int not null default 0,
  proof_rate       int not null default 0,
  created_at       timestamptz not null default now()
);

-- ────────────────────────────────────────────────────────────
-- 3. 발주 및 통제 기록
-- ────────────────────────────────────────────────────────────

create table if not exists condolence_order (
  id                text primary key,                -- 예) ZC-2608-0417
  created_at        timestamptz not null default now(),
  applicant_name    text not null,
  applicant_dept    text,
  target_label      text not null,
  target_org        text,
  regime            text not null default 'UNKNOWN',
  event_type_label  text,
  venue_name        text,
  room_no           text,
  visit_at          timestamptz,
  product_name      text,
  amount            int not null default 0,
  account           text not null default 'WELFARE'
                    check (account in ('WELFARE', 'ENTERTAINMENT')),
  internal_limit    int,
  legal_limit       int,
  ribbon_phrase     text,
  ribbon_sender     text,
  status            text not null default 'APPROVAL_PENDING',
  supplier_id       uuid references supplier(id) on delete set null,
  sla_remaining_min int not null default 0,
  proof_required    boolean not null default false,
  proof_photo       boolean not null default false,
  venue_issue       boolean not null default false,
  accepted_in_min   int,
  off_system        boolean not null default false   -- 시스템 밖 발주 사후 등록 (F5-7)
);

-- 판정 근거 스냅샷 (F1-8) — 감사 · 양벌규정 면책 입증자료. 생성 후 수정하지 않는다.
create table if not exists policy_decision_snapshot (
  id             uuid primary key default gen_random_uuid(),
  order_id       text not null references condolence_order(id) on delete cascade,
  version_label  text not null,
  rule_code      text,
  conditions     jsonb not null default '{}'::jsonb,
  limit_formula  text,
  regime_basis   text,
  decision       text not null,                      -- AUTO_APPROVE | NEED_APPROVAL | BLOCKED
  decided_at     timestamptz not null default now()
);

-- 법정 상한 초과 발주 시도 로그 (F1-5) — 차단되어도 시도는 남긴다
create table if not exists blocked_attempt (
  id            uuid primary key default gen_random_uuid(),
  order_id      text references condolence_order(id) on delete set null,
  applicant     text,
  target_label  text,
  regime        text,
  attempted     int not null,
  legal_limit   int not null,
  attempted_at  timestamptz not null default now()
);

-- 승인 이력
create table if not exists approval_log (
  id          uuid primary key default gen_random_uuid(),
  order_id    text not null references condolence_order(id) on delete cascade,
  approver    text not null,
  verdict     text not null check (verdict in ('APPROVED', 'REJECTED', 'ESCALATED')),
  reason      text,
  decided_at  timestamptz not null default now()
);

-- ────────────────────────────────────────────────────────────
-- 4. RLS — 프로토타입 정책
-- ────────────────────────────────────────────────────────────
-- ⚠️ 아래는 인증 도입 전까지만 쓰는 정책입니다.
--    anon 키를 가진 누구나 읽고 쓸 수 있으므로 실제 개인정보를 넣지 마십시오.

alter table policy_version           enable row level security;
alter table policy_rule              enable row level security;
alter table wreath_product           enable row level security;
alter table external_recipient       enable row level security;
alter table funeral_venue            enable row level security;
alter table supplier                 enable row level security;
alter table condolence_order         enable row level security;
alter table policy_decision_snapshot enable row level security;
alter table blocked_attempt          enable row level security;
alter table approval_log             enable row level security;

do $$
declare t text;
begin
  foreach t in array array[
    'policy_version', 'policy_rule', 'wreath_product', 'external_recipient',
    'funeral_venue', 'supplier', 'condolence_order',
    'policy_decision_snapshot', 'blocked_attempt', 'approval_log'
  ]
  loop
    execute format(
      'drop policy if exists prototype_all on %I; '
      'create policy prototype_all on %I for all to anon, authenticated '
      'using (true) with check (true);', t, t);
  end loop;
end $$;
