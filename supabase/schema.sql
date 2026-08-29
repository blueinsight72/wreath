-- ZENO 경조사 화환 발송 모듈 (ZENO-CND) — Supabase 스키마 (멀티테넌트)
-- Supabase 대시보드 > SQL Editor 에 붙여넣고 실행하십시오.
--
-- 테넌트 경계
--   고객사 귀속 : 규정 · 거래처 수신자 마스터 · 발주 · 판정 스냅샷 · 차단 로그 · 승인 이력
--   ZENO 공통   : 장례식장 DB · 공급사 · 상품 카탈로그
--   장례식장 반입 정보는 모든 고객사의 배송에서 함께 축적될 때 가장 정확해지므로
--   의도적으로 테넌트 밖에 둔다.
--
-- ⚠️ 이 파일의 RLS 는 인증 도입 전 프로토타입용이다.
--    실제 데이터 투입 전에 rls-production.sql 로 반드시 교체할 것.

-- ────────────────────────────────────────────────────────────
-- 0. 테넌트
-- ────────────────────────────────────────────────────────────

create table if not exists tenant (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null unique,
  industry    text,
  plan        text not null default 'PILOT'
              check (plan in ('PILOT', 'ACTIVE', 'SUSPENDED')),
  note        text,
  created_at  timestamptz not null default now()
);

-- 사용자 ↔ 고객사 소속. RLS 는 이 표를 기준으로 판단한다.
-- role: OPERATOR = ZENO 운영팀(전 고객사 접근), 그 외는 해당 고객사 안에서만.
create table if not exists tenant_member (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references tenant(id) on delete cascade,
  user_id    uuid not null,                       -- auth.users.id
  role       text not null default 'STAFF'
             check (role in ('OPERATOR', 'ADMIN', 'APPROVER', 'STAFF', 'AUDITOR')),
  created_at timestamptz not null default now(),
  unique (tenant_id, user_id)
);

create index if not exists tenant_member_user on tenant_member (user_id);

-- 현재 사용자가 접근 가능한 고객사 목록. RLS 정책이 이 함수를 쓴다.
create or replace function current_tenant_ids()
returns setof uuid
language sql stable security definer set search_path = public as $$
  select case
    when exists (select 1 from tenant_member m
                  where m.user_id = auth.uid() and m.role = 'OPERATOR')
    then (select id from tenant)                  -- ZENO 운영팀은 전 고객사
    else (select tenant_id from tenant_member m where m.user_id = auth.uid())
  end;
$$;

-- ────────────────────────────────────────────────────────────
-- 1. 규정 (F1) — 고객사 귀속
-- ────────────────────────────────────────────────────────────

create table if not exists policy_version (
  id             uuid primary key default gen_random_uuid(),
  tenant_id      uuid not null references tenant(id) on delete cascade,
  label          text not null,
  status         text not null default 'DRAFT'
                 check (status in ('DRAFT', 'PENDING', 'ACTIVE', 'ARCHIVED')),
  effective_from date,
  approved_at    date,
  approved_by    text,
  note           text,
  created_at     timestamptz not null default now(),
  unique (tenant_id, label)
);

-- 고객사마다 시행 중 규정은 하나뿐이어야 한다.
-- 둘 이상이면 어느 기준으로 판정했는지 확정할 수 없다.
create unique index if not exists policy_version_one_active
  on policy_version (tenant_id) where status = 'ACTIVE';

create table if not exists policy_rule (
  id                uuid primary key default gen_random_uuid(),
  tenant_id         uuid not null references tenant(id) on delete cascade,
  version_id        uuid not null references policy_version(id) on delete cascade,
  code              text not null,
  event_type_code   text not null,
  target_kind       text not null check (target_kind in ('EMPLOYEE', 'EXTERNAL')),
  rank_tier         text check (rank_tier in ('EXEC', 'SENIOR', 'STAFF')),
  min_tenure_months int  not null default 0,
  grade             text not null,
  wreath_limit      int  not null check (wreath_limit >= 0),
  created_at        timestamptz not null default now(),
  unique (version_id, code)
);

create index if not exists policy_rule_lookup
  on policy_rule (tenant_id, version_id, event_type_code, target_kind);

-- ────────────────────────────────────────────────────────────
-- 2. 마스터
-- ────────────────────────────────────────────────────────────

-- 거래처 수신자 마스터 (F14) — 고객사 귀속. 거래처는 회사마다 다르다.
create table if not exists external_recipient (
  id             uuid primary key default gen_random_uuid(),
  tenant_id      uuid not null references tenant(id) on delete cascade,
  name           text not null,
  org            text not null,
  position       text,
  regime         text not null default 'UNKNOWN'
                 check (regime in ('R1', 'R2', 'R3', 'UNKNOWN')),
  basis          text,
  official_scope text check (official_scope in ('SELF', 'SPOUSE')),
  auto_hint      text,
  confirmed_at   date,
  confirmed_by   text,
  created_at     timestamptz not null default now()
);

create index if not exists external_recipient_tenant
  on external_recipient (tenant_id, name);

-- 장례식장 (F8) — ZENO 공통 자산. 전 고객사 배송에서 함께 축적된다.
create table if not exists funeral_venue (
  id                 uuid primary key default gen_random_uuid(),
  name               text not null,
  address            text,
  region             text,
  phone              text,
  wreath_allowed     boolean,
  restriction_reason text,
  entry_fee          int not null default 0,
  entry_hours        text,
  verification       text not null default 'NEEDS_CHECK'
                     check (verification in ('VERIFIED', 'NEEDS_CHECK', 'REPORTED')),
  issue_reports      int  not null default 0,
  updated_at         date,
  created_at         timestamptz not null default now()
);

-- 공급사 — ZENO 공통
create table if not exists supplier (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  regions         text[] not null default '{}',
  business_hours  text,
  night_support   boolean not null default false,
  tax_type        text not null default 'GENERAL'
                  check (tax_type in ('GENERAL', 'SIMPLE', 'EXEMPT')),
  proper_evidence boolean not null default false,
  onboarding      text not null default 'APPLIED',
  grace_ends_at   date,
  sla_score       int not null default 0,
  accept_rate     int not null default 0,
  on_time_rate    int not null default 0,
  proof_rate      int not null default 0,
  created_at      timestamptz not null default now()
);

-- 상품 카탈로그 — ZENO 공통
create table if not exists wreath_product (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  grade           text not null,
  price           int  not null check (price >= 0),
  kind            text not null check (kind in ('WREATH', 'ALT')),
  fresh_guarantee boolean not null default true,
  lead_time_hours int  not null default 3,
  description     text,
  active          boolean not null default true,
  created_at      timestamptz not null default now()
);

-- ────────────────────────────────────────────────────────────
-- 3. 발주 및 통제 기록 — 고객사 귀속
-- ────────────────────────────────────────────────────────────

create table if not exists condolence_order (
  id                text primary key,
  tenant_id         uuid not null references tenant(id) on delete cascade,
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
  off_system        boolean not null default false
);

create index if not exists condolence_order_tenant
  on condolence_order (tenant_id, created_at desc);

-- 판정 근거 스냅샷 (F1-8) — 생성 후 수정하지 않는다
create table if not exists policy_decision_snapshot (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references tenant(id) on delete cascade,
  order_id      text not null references condolence_order(id) on delete cascade,
  version_label text not null,
  rule_code     text,
  conditions    jsonb not null default '{}'::jsonb,
  limit_formula text,
  regime_basis  text,
  decision      text not null,
  decided_at    timestamptz not null default now()
);

-- 법정 상한 초과 시도 로그 (F1-5)
create table if not exists blocked_attempt (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references tenant(id) on delete cascade,
  order_id     text references condolence_order(id) on delete set null,
  applicant    text,
  target_label text,
  regime       text,
  attempted    int not null,
  legal_limit  int not null,
  attempted_at timestamptz not null default now()
);

create table if not exists approval_log (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references tenant(id) on delete cascade,
  order_id   text not null references condolence_order(id) on delete cascade,
  approver   text not null,
  verdict    text not null check (verdict in ('APPROVED', 'REJECTED', 'ESCALATED')),
  reason     text,
  decided_at timestamptz not null default now()
);

-- ────────────────────────────────────────────────────────────
-- 4. RLS — 프로토타입 정책
-- ────────────────────────────────────────────────────────────
-- ⚠️ anon 키만으로 전 고객사 데이터를 읽고 쓸 수 있습니다.
--    고객사 간 격리가 전혀 없으므로 실제 데이터를 넣지 마십시오.
--    인증을 붙인 뒤 rls-production.sql 을 실행해 이 정책을 대체하십시오.

do $$
declare t text;
begin
  foreach t in array array[
    'tenant', 'tenant_member', 'policy_version', 'policy_rule', 'wreath_product',
    'external_recipient', 'funeral_venue', 'supplier', 'condolence_order',
    'policy_decision_snapshot', 'blocked_attempt', 'approval_log'
  ]
  loop
    execute format('alter table %I enable row level security;', t);
    execute format(
      'drop policy if exists prototype_all on %I; '
      'create policy prototype_all on %I for all to anon, authenticated '
      'using (true) with check (true);', t, t);
  end loop;
end $$;
