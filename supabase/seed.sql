-- ZENO-CND 초기 데이터 — schema.sql 실행 후 붙여넣으십시오.
-- 지금까지 화면에서 쓰던 목업과 동일한 내용이라 연결 즉시 같은 화면이 뜹니다.

-- ── 규정 버전 ────────────────────────────────────────────────
insert into policy_version (label, status, effective_from, approved_at, approved_by, note)
values
  ('v3.2', 'ACTIVE',   '2026-03-01', '2026-02-20', 'CFO 한지수', '거래처 상한 신설'),
  ('v3.1', 'ARCHIVED', '2025-07-01', '2025-06-18', 'CFO 한지수', '임원 등급 상향'),
  ('v4.0', 'DRAFT',    null,         null,          null,        '보건의료인(R2) 규칙 반영 예정')
on conflict do nothing;

-- ── 규정표 (v3.2) ───────────────────────────────────────────
insert into policy_rule (version_id, code, event_type_code, target_kind, rank_tier, min_tenure_months, grade, wreath_limit)
select v.id, r.code, r.event_type_code, r.target_kind, r.rank_tier, r.min_tenure_months, r.grade, r.wreath_limit
from policy_version v
cross join (values
  ('P-101', 'PARENT_DEATH',        'EMPLOYEE', 'EXEC',   0,  'A', 300000),
  ('P-102', 'PARENT_DEATH',        'EMPLOYEE', 'SENIOR', 12, 'B', 200000),
  ('P-103', 'PARENT_DEATH',        'EMPLOYEE', 'STAFF',  12, 'C', 150000),
  ('P-104', 'PARENT_DEATH',        'EMPLOYEE', null,     0,  'D', 100000),
  ('P-111', 'SPOUSE_PARENT_DEATH', 'EMPLOYEE', 'EXEC',   0,  'A', 300000),
  ('P-112', 'SPOUSE_PARENT_DEATH', 'EMPLOYEE', null,     12, 'C', 150000),
  ('P-113', 'SPOUSE_PARENT_DEATH', 'EMPLOYEE', null,     0,  'D', 100000),
  ('P-121', 'SPOUSE_DEATH',        'EMPLOYEE', null,     0,  'A', 300000),
  ('P-131', 'CHILD_DEATH',         'EMPLOYEE', null,     0,  'A', 300000),
  ('P-141', 'GRANDPARENT_DEATH',   'EMPLOYEE', 'EXEC',   0,  'C', 150000),
  ('P-142', 'GRANDPARENT_DEATH',   'EMPLOYEE', null,     0,  'D', 100000),
  ('P-151', 'SIBLING_DEATH',       'EMPLOYEE', 'EXEC',   0,  'C', 150000),
  ('P-152', 'SIBLING_DEATH',       'EMPLOYEE', null,     0,  'D', 100000),
  ('P-201', 'PARENT_DEATH',        'EXTERNAL', null,     0,  'C', 150000),
  ('P-202', 'SPOUSE_PARENT_DEATH', 'EXTERNAL', null,     0,  'C', 150000),
  ('P-203', 'SPOUSE_DEATH',        'EXTERNAL', null,     0,  'B', 200000),
  ('P-204', 'CHILD_DEATH',         'EXTERNAL', null,     0,  'B', 200000),
  ('P-205', 'GRANDPARENT_DEATH',   'EXTERNAL', null,     0,  'D', 100000)
) as r(code, event_type_code, target_kind, rank_tier, min_tenure_months, grade, wreath_limit)
where v.label = 'v3.2'
on conflict do nothing;

-- ── 상품 ────────────────────────────────────────────────────
insert into wreath_product (name, grade, price, kind, fresh_guarantee, lead_time_hours, description)
values
  ('근조화환 3단 프리미엄', 'A', 300000, 'WREATH', true, 4, '국화 3단 · 대형 리본 2매'),
  ('근조화환 3단 고급',     'B', 200000, 'WREATH', true, 3, '국화 3단 · 리본 2매'),
  ('근조화환 3단 기본',     'C', 150000, 'WREATH', true, 3, '국화 3단 · 리본 2매'),
  ('근조화환 2단',          'D', 100000, 'WREATH', true, 2, '국화 2단 · 리본 2매'),
  ('근조화환 소형',         'E',  80000, 'WREATH', true, 2, '국화 소형 · 리본 1매'),
  ('근조 쌀화환 20kg',      'B', 200000, 'ALT',    true, 4, '기부 · 유족 전달 가능'),
  ('근조 쌀화환 10kg',      'C', 150000, 'ALT',    true, 4, '기부 · 유족 전달 가능'),
  ('조화 바구니',           'D', 100000, 'ALT',    true, 3, '실내 비치형 · 반입 제한 회피'),
  ('근조기 (근조 현수기)',  'E',  80000, 'ALT',    true, 2, '화환 반입 거부 장소 대응')
on conflict do nothing;

-- ── 거래처 수신자 마스터 ────────────────────────────────────
insert into external_recipient (name, org, position, regime, basis, official_scope, auto_hint, confirmed_at, confirmed_by)
values
  ('강태호', '한국조달공사', '구매기획처장', 'R1', '공직유관단체 임직원 (공공기관 지정 목록 확인)', 'SELF', '공공기관 지정 목록에서 한국조달공사 확인됨', '2026-06-12', '법무팀 윤성재'),
  ('문혜린', '대성일보', '산업부 차장', 'R1', '언론사 임직원', 'SELF', '언론사 목록에서 대성일보 확인됨', '2026-05-30', '법무팀 윤성재'),
  ('임경섭', '성모병원', '정형외과 과장', 'R2', '보건의료인 — 경제적 이익 제공 규제 검토 필요', 'SELF', '의료기관 종사자 — 법무 검토 대기', '2026-04-18', '법무팀 윤성재'),
  ('노상현', '대한물류㈜', '물류본부 이사', 'R3', '일반 사기업 임직원 — 사내 규정 및 접대비 처리', null, null, '2026-07-02', '구매팀 서나연'),
  ('백승주', '미래테크㈜', '대표이사', 'R3', '일반 사기업 임직원', null, null, '2026-03-11', '구매팀 서나연'),
  ('황인철', '성진대학교', '산학협력단 팀장', 'UNKNOWN', '학교법인 직원 여부 확인 중', null, '학교법인 여부 자동 판정 불가 — 사람 확인 필요', null, null)
on conflict do nothing;

-- ── 장례식장 ────────────────────────────────────────────────
insert into funeral_venue (name, address, region, phone, wreath_allowed, restriction_reason, entry_fee, entry_hours, verification, issue_reports, updated_at)
values
  ('서울아산병원 장례식장', '서울 송파구 올림픽로43길 88', '서울', '02-3010-2000', true, null, 0, '06:00 ~ 22:00', 'VERIFIED', 0, '2026-08-14'),
  ('삼성서울병원 장례식장', '서울 강남구 일원로 81', '서울', '02-3410-3151', true, null, 0, '06:00 ~ 22:00', 'VERIFIED', 0, '2026-08-02'),
  ('부산 해운대백병원 장례식장', '부산 해운대구 해운대로 875', '부산', '051-797-0444', false, '폐기물 처리 비용 문제로 생화 화환 반입 거부 (2026-07 현장 보고 3건)', 0, null, 'REPORTED', 3, '2026-07-28'),
  ('대전 을지대학교병원 장례식장', '대전 서구 둔산서로 95', '대전', '042-611-3000', true, null, 30000, '07:00 ~ 21:00', 'NEEDS_CHECK', 1, '2026-02-10'),
  ('광주 조선대학교병원 장례식장', '광주 동구 필문대로 365', '광주', '062-220-3000', null, null, 0, null, 'NEEDS_CHECK', 0, '2026-01-22'),
  ('인천 길병원 장례식장', '인천 남동구 남동대로774번길 21', '인천', '032-460-3000', true, null, 0, '06:00 ~ 23:00', 'VERIFIED', 0, '2026-08-19'),
  ('수원 아주대학교병원 장례식장', '경기 수원시 영통구 월드컵로 164', '경기', '031-219-5114', true, '대형 화환(3단 이상) 반입 불가', 0, '06:00 ~ 22:00', 'VERIFIED', 2, '2026-08-08'),
  ('대구 경북대학교병원 장례식장', '대구 중구 동덕로 130', '대구', '053-200-5114', true, null, 20000, '06:00 ~ 22:00', 'NEEDS_CHECK', 1, '2026-03-30')
on conflict do nothing;

-- ── 공급사 ──────────────────────────────────────────────────
insert into supplier (name, regions, business_hours, night_support, tax_type, proper_evidence, onboarding, grace_ends_at, sla_score, accept_rate, on_time_rate, proof_rate)
values
  ('전국화훼중계망㈜', array['전국'], '05:00 ~ 24:00', true, 'GENERAL', true, 'ACTIVE', null, 92, 98, 95, 71),
  ('부산제일꽃집', array['부산','경남'], '07:00 ~ 21:00', false, 'EXEMPT', false, 'ACTIVE', '2026-10-14', 88, 94, 91, 84),
  ('대전중앙화원', array['대전','충남'], '08:00 ~ 20:00', false, 'SIMPLE', false, 'SETTLEMENT', null, 0, 0, 0, 0)
on conflict do nothing;
