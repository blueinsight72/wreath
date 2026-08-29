-- ZENO-CND 초기 데이터 (멀티테넌트) — schema.sql 실행 후 붙여넣으십시오.
-- 고객사 3곳의 규정이 서로 다르게 들어갑니다. 이게 멀티테넌트의 핵심입니다.

-- ── 고객사 ──────────────────────────────────────────────────
insert into tenant (name, slug, industry, plan, note) values
  ('제노㈜',       'zeno',   'IT · 플랫폼',      'ACTIVE', '직급별 차등 3단계. 거래처 경조도 규정에 포함.'),
  ('대한물산㈜',   'daehan', '유통 · 물류',      'ACTIVE', '직급 차등 없이 경조 유형별 단일 상한. 거래처는 규정 외 전건 승인.'),
  ('미래바이오㈜', 'mirae',  '제약 · 의료기기',  'PILOT',  '보건의료인(R2) 발송이 잦아 상한을 보수적으로 운영.')
on conflict (slug) do nothing;

-- ── 규정 버전 ───────────────────────────────────────────────
insert into policy_version (tenant_id, label, status, effective_from, approved_at, approved_by, note)
select t.id, v.label, v.status, v.effective_from::date, v.approved_at::date, v.approved_by, v.note
from tenant t
join (values
  ('zeno',   'v3.2', 'ACTIVE', '2026-03-01', '2026-02-20', 'CFO 한지수',          '거래처 상한 신설'),
  ('zeno',   'v3.3', 'DRAFT',  null,          null,         null,                  '개정 작업 중'),
  ('daehan', 'v1.4', 'ACTIVE', '2026-05-11', '2026-05-11', '관리본부장 조성일',   '경조 유형별 단일 상한'),
  ('mirae',  'v0.9', 'ACTIVE', '2026-08-01', '2026-08-01', '준법지원인 배수현',   '파일럿 초기 규정')
) as v(slug, label, status, effective_from, approved_at, approved_by, note)
  on v.slug = t.slug
on conflict (tenant_id, label) do nothing;

-- ── 제노㈜ 규정표 — 직급 3단 차등 ──────────────────────────
insert into policy_rule (tenant_id, version_id, code, event_type_code, target_kind, rank_tier, min_tenure_months, grade, wreath_limit)
select pv.tenant_id, pv.id, r.code, r.etc, r.tk, r.tier, r.tenure, r.grade, r.lim
from policy_version pv
join tenant t on t.id = pv.tenant_id and t.slug = 'zeno'
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
) as r(code, etc, tk, tier, tenure, grade, lim)
where pv.label = 'v3.2'
on conflict (version_id, code) do nothing;

-- ── 대한물산㈜ 규정표 — 직급 차등 없음 ─────────────────────
insert into policy_rule (tenant_id, version_id, code, event_type_code, target_kind, rank_tier, min_tenure_months, grade, wreath_limit)
select pv.tenant_id, pv.id, r.code, r.etc, r.tk, r.tier, r.tenure, r.grade, r.lim
from policy_version pv
join tenant t on t.id = pv.tenant_id and t.slug = 'daehan'
cross join (values
  ('D-01', 'PARENT_DEATH',        'EMPLOYEE', null, 0, 'B', 200000),
  ('D-02', 'SPOUSE_PARENT_DEATH', 'EMPLOYEE', null, 0, 'C', 150000),
  ('D-03', 'SPOUSE_DEATH',        'EMPLOYEE', null, 0, 'B', 200000),
  ('D-04', 'CHILD_DEATH',         'EMPLOYEE', null, 0, 'B', 200000),
  ('D-05', 'GRANDPARENT_DEATH',   'EMPLOYEE', null, 6, 'D', 100000),
  ('D-06', 'SIBLING_DEATH',       'EMPLOYEE', null, 6, 'D', 100000)
) as r(code, etc, tk, tier, tenure, grade, lim)
where pv.label = 'v1.4'
on conflict (version_id, code) do nothing;

-- ── 미래바이오㈜ 규정표 — 보수적 상한 ──────────────────────
insert into policy_rule (tenant_id, version_id, code, event_type_code, target_kind, rank_tier, min_tenure_months, grade, wreath_limit)
select pv.tenant_id, pv.id, r.code, r.etc, r.tk, r.tier, r.tenure, r.grade, r.lim
from policy_version pv
join tenant t on t.id = pv.tenant_id and t.slug = 'mirae'
cross join (values
  ('M-01', 'PARENT_DEATH',        'EMPLOYEE', 'EXEC', 0, 'C', 150000),
  ('M-02', 'PARENT_DEATH',        'EMPLOYEE', null,   0, 'D', 100000),
  ('M-03', 'SPOUSE_PARENT_DEATH', 'EMPLOYEE', null,   0, 'D', 100000),
  ('M-04', 'SPOUSE_DEATH',        'EMPLOYEE', null,   0, 'C', 150000),
  ('M-05', 'CHILD_DEATH',         'EMPLOYEE', null,   0, 'C', 150000),
  ('M-06', 'GRANDPARENT_DEATH',   'EMPLOYEE', null,   0, 'E',  80000),
  ('M-11', 'PARENT_DEATH',        'EXTERNAL', null,   0, 'E',  80000)
) as r(code, etc, tk, tier, tenure, grade, lim)
where pv.label = 'v0.9'
on conflict (version_id, code) do nothing;

-- ── 거래처 수신자 마스터 — 제노㈜ ──────────────────────────
insert into external_recipient (tenant_id, name, org, position, regime, basis, official_scope, auto_hint, confirmed_at, confirmed_by)
select t.id, r.name, r.org, r.position, r.regime, r.basis, r.scope, r.hint, r.cat::date, r.cby
from tenant t
cross join (values
  ('강태호', '한국조달공사', '구매기획처장',  'R1', '공직유관단체 임직원 (공공기관 지정 목록 확인)', 'SELF', '공공기관 지정 목록에서 한국조달공사 확인됨', '2026-06-12', '법무팀 윤성재'),
  ('문혜린', '대성일보',     '산업부 차장',    'R1', '언론사 임직원',                                  'SELF', '언론사 목록에서 대성일보 확인됨',            '2026-05-30', '법무팀 윤성재'),
  ('임경섭', '성모병원',     '정형외과 과장',  'R2', '보건의료인 — 경제적 이익 제공 규제 검토 필요',  'SELF', '의료기관 종사자 — 법무 검토 대기',           '2026-04-18', '법무팀 윤성재'),
  ('노상현', '대한물류㈜',   '물류본부 이사',  'R3', '일반 사기업 임직원 — 사내 규정 및 접대비 처리', null,   null,                                          '2026-07-02', '구매팀 서나연'),
  ('백승주', '미래테크㈜',   '대표이사',       'R3', '일반 사기업 임직원',                            null,   null,                                          '2026-03-11', '구매팀 서나연'),
  ('황인철', '성진대학교',   '산학협력단 팀장','UNKNOWN', '학교법인 직원 여부 확인 중',                null,   '학교법인 여부 자동 판정 불가 — 사람 확인 필요', null,     null)
) as r(name, org, position, regime, basis, scope, hint, cat, cby)
where t.slug = 'zeno';

-- ── 장례식장 (ZENO 공통) ────────────────────────────────────
insert into funeral_venue (name, address, region, phone, wreath_allowed, restriction_reason, entry_fee, entry_hours, verification, issue_reports, updated_at)
values
  ('서울아산병원 장례식장', '서울 송파구 올림픽로43길 88', '서울', '02-3010-2000', true, null, 0, '06:00 ~ 22:00', 'VERIFIED', 0, '2026-08-14'),
  ('삼성서울병원 장례식장', '서울 강남구 일원로 81', '서울', '02-3410-3151', true, null, 0, '06:00 ~ 22:00', 'VERIFIED', 0, '2026-08-02'),
  ('부산 해운대백병원 장례식장', '부산 해운대구 해운대로 875', '부산', '051-797-0444', false, '폐기물 처리 비용 문제로 생화 화환 반입 거부 (2026-07 현장 보고 3건)', 0, null, 'REPORTED', 3, '2026-07-28'),
  ('대전 을지대학교병원 장례식장', '대전 서구 둔산서로 95', '대전', '042-611-3000', true, null, 30000, '07:00 ~ 21:00', 'NEEDS_CHECK', 1, '2026-02-10'),
  ('광주 조선대학교병원 장례식장', '광주 동구 필문대로 365', '광주', '062-220-3000', null, null, 0, null, 'NEEDS_CHECK', 0, '2026-01-22'),
  ('인천 길병원 장례식장', '인천 남동구 남동대로774번길 21', '인천', '032-460-3000', true, null, 0, '06:00 ~ 23:00', 'VERIFIED', 0, '2026-08-19'),
  ('수원 아주대학교병원 장례식장', '경기 수원시 영통구 월드컵로 164', '경기', '031-219-5114', true, '대형 화환(3단 이상) 반입 불가', 0, '06:00 ~ 22:00', 'VERIFIED', 2, '2026-08-08'),
  ('대구 경북대학교병원 장례식장', '대구 중구 동덕로 130', '대구', '053-200-5114', true, null, 20000, '06:00 ~ 22:00', 'NEEDS_CHECK', 1, '2026-03-30');

-- ── 상품 카탈로그 (ZENO 공통) ───────────────────────────────
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
  ('근조기 (근조 현수기)',  'E',  80000, 'ALT',    true, 2, '화환 반입 거부 장소 대응');
