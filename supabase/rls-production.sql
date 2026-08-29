-- ZENO-CND — 운영용 RLS 정책 (테넌트 격리)
--
-- 실행 조건
--   1) Supabase Auth 도입 완료
--   2) tenant_member 에 사용자 ↔ 고객사 매핑이 들어 있을 것
--
-- 이 파일을 실행하면 schema.sql 의 프로토타입 정책(prototype_all)이 삭제되고,
-- 소속 고객사 데이터만 보이도록 잠깁니다. anon 키로는 아무것도 읽히지 않습니다.
--
-- 격리 규칙
--   · 고객사 귀속 테이블 : 본인이 속한 고객사의 행만
--   · ZENO 공통 테이블   : 로그인한 사용자면 읽기 가능, 쓰기는 OPERATOR 만
--   · 공급사 · 배송 상태는 ZENO SCM 소관이라 이 스키마에 없다
--   · 판정 스냅샷 · 차단 로그 : 읽기만 허용 (수정 · 삭제 불가 — 감사 증거이므로)

-- ── 프로토타입 정책 제거 ────────────────────────────────────
do $$
declare t text;
begin
  foreach t in array array[
    'tenant', 'tenant_member', 'policy_version', 'policy_rule', 'wreath_product',
    'external_recipient', 'funeral_venue', 'condolence_order',
    'policy_decision_snapshot', 'blocked_attempt', 'approval_log'
  ]
  loop
    execute format('drop policy if exists prototype_all on %I;', t);
  end loop;
end $$;

-- ── 헬퍼 ────────────────────────────────────────────────────
create or replace function is_operator()
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from tenant_member
    where user_id = auth.uid() and role = 'OPERATOR'
  );
$$;

-- ── 테넌트 자체 ─────────────────────────────────────────────
create policy tenant_read on tenant
  for select to authenticated
  using (id in (select current_tenant_ids()));

create policy tenant_write on tenant
  for all to authenticated
  using (is_operator()) with check (is_operator());

create policy member_read on tenant_member
  for select to authenticated
  using (user_id = auth.uid() or is_operator());

create policy member_write on tenant_member
  for all to authenticated
  using (is_operator()) with check (is_operator());

-- ── 고객사 귀속 테이블 ──────────────────────────────────────
do $$
declare t text;
begin
  foreach t in array array[
    'policy_version', 'policy_rule', 'external_recipient', 'condolence_order'
  ]
  loop
    execute format(
      'create policy tenant_rw on %I for all to authenticated '
      'using (tenant_id in (select current_tenant_ids())) '
      'with check (tenant_id in (select current_tenant_ids()));', t);
  end loop;
end $$;

-- ── 감사 증거 — 읽기만 허용 ─────────────────────────────────
-- 판정 근거 · 차단 로그 · 승인 이력은 사후 수정이 가능하면 증거로서 가치가 없다.
-- 기록은 서버(service_role)만 남기고, 사용자는 읽기만 한다.
do $$
declare t text;
begin
  foreach t in array array[
    'policy_decision_snapshot', 'blocked_attempt', 'approval_log'
  ]
  loop
    execute format(
      'create policy tenant_read on %I for select to authenticated '
      'using (tenant_id in (select current_tenant_ids()));', t);
  end loop;
end $$;

-- ── ZENO 공통 테이블 ────────────────────────────────────────
-- 장례식장 · 공급사 · 상품은 전 고객사가 함께 쓴다. 쓰기는 운영팀만.
do $$
declare t text;
begin
  foreach t in array array['funeral_venue', 'wreath_product']
  loop
    execute format(
      'create policy shared_read on %I for select to authenticated using (true);', t);
    execute format(
      'create policy shared_write on %I for all to authenticated '
      'using (is_operator()) with check (is_operator());', t);
  end loop;
end $$;
