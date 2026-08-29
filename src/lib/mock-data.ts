// 목업 데이터 — 백엔드 연동 전까지 화면 검증용
import type {
  DeptBudget,
  Employee,
  EventType,
  ExternalRecipient,
  FuneralVenue,
  PolicyRule,
  RelationType,
  ReligionType,
  SenderCompany,
  WreathProduct,
} from "./types";

/** 현재 로그인 사용자 (임시 고정) */
export const CURRENT_USER: Employee = {
  id: "emp-001",
  empNo: "20180311",
  name: "김재현",
  rank: "책임",
  dept: "경영지원팀",
  company: "제노㈜",
  tenureMonths: 89,
  costCenter: "CC-1200",
};

export const EMPLOYEES: Employee[] = [
  CURRENT_USER,
  { id: "emp-002", empNo: "20150102", name: "박세영", rank: "이사", dept: "영업본부", company: "제노㈜", tenureMonths: 128, costCenter: "CC-2100" },
  { id: "emp-003", empNo: "20210715", name: "이도현", rank: "선임", dept: "플랫폼개발팀", company: "제노㈜", tenureMonths: 50, costCenter: "CC-3100" },
  { id: "emp-004", empNo: "20190401", name: "최유진", rank: "책임", dept: "재무팀", company: "제노㈜", tenureMonths: 77, costCenter: "CC-1300" },
  { id: "emp-005", empNo: "20230801", name: "정민석", rank: "사원", dept: "마케팅팀", company: "제노㈜", tenureMonths: 24, costCenter: "CC-2300" },
  { id: "emp-006", empNo: "20120220", name: "한지수", rank: "상무", dept: "경영지원본부", company: "제노홀딩스㈜", tenureMonths: 162, costCenter: "CC-1000" },
  { id: "emp-007", empNo: "20240115", name: "오현우", rank: "사원", dept: "고객성공팀", company: "제노㈜", tenureMonths: 19, costCenter: "CC-2400" },
  { id: "emp-008", empNo: "20170905", name: "서나연", rank: "책임", dept: "구매팀", company: "제노㈜", tenureMonths: 95, costCenter: "CC-1400" },
];

export const EXTERNAL_RECIPIENTS: ExternalRecipient[] = [
  {
    id: "ext-001",
    name: "강태호",
    org: "한국조달공사",
    position: "구매기획처장",
    regime: "R1",
    basis: "공직유관단체 임직원 (공공기관 지정 목록 확인)",
    confirmedAt: "2026-06-12",
    confirmedBy: "법무팀 윤성재",
  },
  {
    id: "ext-002",
    name: "문혜린",
    org: "대성일보",
    position: "산업부 차장",
    regime: "R1",
    basis: "언론사 임직원",
    confirmedAt: "2026-05-30",
    confirmedBy: "법무팀 윤성재",
  },
  {
    id: "ext-003",
    name: "임경섭",
    org: "성모병원",
    position: "정형외과 과장",
    regime: "R2",
    basis: "보건의료인 — 경제적 이익 제공 규제 검토 필요",
    confirmedAt: "2026-04-18",
    confirmedBy: "법무팀 윤성재",
  },
  {
    id: "ext-004",
    name: "노상현",
    org: "대한물류㈜",
    position: "물류본부 이사",
    regime: "R3",
    basis: "일반 사기업 임직원 — 사내 규정 및 접대비 처리",
    confirmedAt: "2026-07-02",
    confirmedBy: "구매팀 서나연",
  },
  {
    id: "ext-005",
    name: "백승주",
    org: "미래테크㈜",
    position: "대표이사",
    regime: "R3",
    basis: "일반 사기업 임직원",
    confirmedAt: "2026-03-11",
    confirmedBy: "구매팀 서나연",
  },
  {
    id: "ext-006",
    name: "황인철",
    org: "성진대학교",
    position: "산학협력단 팀장",
    regime: "UNKNOWN",
    basis: "학교법인 직원 여부 확인 중",
    confirmedAt: null,
    confirmedBy: null,
  },
];

export const EVENT_TYPES: EventType[] = [
  { code: "PARENT_DEATH", label: "부모상", category: "근조", available: true },
  { code: "SPOUSE_PARENT_DEATH", label: "배우자 부모상", category: "근조", available: true },
  { code: "SPOUSE_DEATH", label: "배우자상", category: "근조", available: true },
  { code: "CHILD_DEATH", label: "자녀상", category: "근조", available: true },
  { code: "GRANDPARENT_DEATH", label: "조부모상", category: "근조", available: true },
  { code: "SIBLING_DEATH", label: "형제자매상", category: "근조", available: true },
  { code: "SELF_WEDDING", label: "본인 결혼", category: "축하", available: false },
  { code: "CHILD_WEDDING", label: "자녀 결혼", category: "축하", available: false },
  { code: "CHILDBIRTH", label: "출산", category: "축하", available: false },
  { code: "OPENING", label: "개업 · 취임", category: "축하", available: false },
];

export const RELATION_TYPES: RelationType[] = [
  { code: "SELF", label: "본인 (신청자 본인의 경조사)" },
  { code: "COWORKER", label: "동료 임직원" },
  { code: "TEAM_MEMBER", label: "팀원" },
  { code: "SUPERIOR", label: "상급자" },
  { code: "CLIENT", label: "거래처 담당자" },
  { code: "PARTNER", label: "협력사 담당자" },
];

export const FUNERAL_VENUES: FuneralVenue[] = [
  {
    id: "vn-001",
    name: "서울아산병원 장례식장",
    address: "서울 송파구 올림픽로43길 88",
    region: "서울",
    phone: "02-3010-2000",
    wreathAllowed: true,
    restrictionReason: null,
    entryFee: 0,
    entryHours: "06:00 ~ 22:00",
    verification: "VERIFIED",
    updatedAt: "2026-08-14",
  },
  {
    id: "vn-002",
    name: "삼성서울병원 장례식장",
    address: "서울 강남구 일원로 81",
    region: "서울",
    phone: "02-3410-3151",
    wreathAllowed: true,
    restrictionReason: null,
    entryFee: 0,
    entryHours: "06:00 ~ 22:00",
    verification: "VERIFIED",
    updatedAt: "2026-08-02",
  },
  {
    id: "vn-003",
    name: "부산 해운대백병원 장례식장",
    address: "부산 해운대구 해운대로 875",
    region: "부산",
    phone: "051-797-0444",
    wreathAllowed: false,
    restrictionReason: "폐기물 처리 비용 문제로 생화 화환 반입 거부 (2026-07 현장 보고 3건)",
    entryFee: 0,
    entryHours: null,
    verification: "REPORTED",
    updatedAt: "2026-07-28",
  },
  {
    id: "vn-004",
    name: "대전 을지대학교병원 장례식장",
    address: "대전 서구 둔산서로 95",
    region: "대전",
    phone: "042-611-3000",
    wreathAllowed: true,
    restrictionReason: null,
    entryFee: 30000,
    entryHours: "07:00 ~ 21:00",
    verification: "NEEDS_CHECK",
    updatedAt: "2026-02-10",
  },
  {
    id: "vn-005",
    name: "광주 조선대학교병원 장례식장",
    address: "광주 동구 필문대로 365",
    region: "광주",
    phone: "062-220-3000",
    wreathAllowed: null,
    restrictionReason: null,
    entryFee: 0,
    entryHours: null,
    verification: "NEEDS_CHECK",
    updatedAt: "2026-01-22",
  },
  {
    id: "vn-006",
    name: "인천 길병원 장례식장",
    address: "인천 남동구 남동대로774번길 21",
    region: "인천",
    phone: "032-460-3000",
    wreathAllowed: true,
    restrictionReason: null,
    entryFee: 0,
    entryHours: "06:00 ~ 23:00",
    verification: "VERIFIED",
    updatedAt: "2026-08-19",
  },
  {
    id: "vn-007",
    name: "수원 아주대학교병원 장례식장",
    address: "경기 수원시 영통구 월드컵로 164",
    region: "경기",
    phone: "031-219-5114",
    wreathAllowed: true,
    restrictionReason: "대형 화환(3단 이상) 반입 불가",
    entryFee: 0,
    entryHours: "06:00 ~ 22:00",
    verification: "VERIFIED",
    updatedAt: "2026-08-08",
  },
  {
    id: "vn-008",
    name: "대구 경북대학교병원 장례식장",
    address: "대구 중구 동덕로 130",
    region: "대구",
    phone: "053-200-5114",
    wreathAllowed: true,
    restrictionReason: null,
    entryFee: 20000,
    entryHours: "06:00 ~ 22:00",
    verification: "NEEDS_CHECK",
    updatedAt: "2026-03-30",
  },
];

export function findEmployee(id: string | null) {
  return EMPLOYEES.find((e) => e.id === id) ?? null;
}

export function findRecipient(id: string | null) {
  return EXTERNAL_RECIPIENTS.find((r) => r.id === id) ?? null;
}

export function findVenue(id: string | null) {
  return FUNERAL_VENUES.find((v) => v.id === id) ?? null;
}

export function findEventType(code: string) {
  return EVENT_TYPES.find((t) => t.code === code) ?? null;
}

export function findRelation(code: string) {
  return RELATION_TYPES.find((r) => r.code === code) ?? null;
}

/* ── 사내 경조 규정 (S2) ───────────────────────────── */

/** 규정 버전 — 판정 근거 스냅샷에 기록된다 (F1-7, F1-9) */
export const POLICY_VERSION = "v3.2 (2026-03-01 시행)";
export const POLICY_APPROVED_AT = "2026-02-20";
export const POLICY_APPROVED_BY = "CFO 한지수";

/** 청탁금지법 화환 · 조화 가액범위 (R1 하드리밋) */
export const LEGAL_WREATH_LIMIT = 100000;

export const POLICY_RULES: PolicyRule[] = [
  // 자사 임직원 — 직급별 차등
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

  // 거래처 · 외부 — 직급 축 없이 경조 유형별 단일 상한
  { id: "P-201", eventTypeCode: "PARENT_DEATH", targetKind: "EXTERNAL", rankTier: null, minTenureMonths: 0, grade: "C", wreathLimit: 150000 },
  { id: "P-202", eventTypeCode: "SPOUSE_PARENT_DEATH", targetKind: "EXTERNAL", rankTier: null, minTenureMonths: 0, grade: "C", wreathLimit: 150000 },
  { id: "P-203", eventTypeCode: "SPOUSE_DEATH", targetKind: "EXTERNAL", rankTier: null, minTenureMonths: 0, grade: "B", wreathLimit: 200000 },
  { id: "P-204", eventTypeCode: "CHILD_DEATH", targetKind: "EXTERNAL", rankTier: null, minTenureMonths: 0, grade: "B", wreathLimit: 200000 },
  { id: "P-205", eventTypeCode: "GRANDPARENT_DEATH", targetKind: "EXTERNAL", rankTier: null, minTenureMonths: 0, grade: "D", wreathLimit: 100000 },
  // SIBLING_DEATH 는 거래처 규정에 없음 — 규정 외 → 승인 경로 (F1 판정 로직)
];

export const WREATH_PRODUCTS: WreathProduct[] = [
  { id: "pd-a1", name: "근조화환 3단 프리미엄", grade: "A", price: 300000, kind: "WREATH", freshGuarantee: true, leadTimeHours: 4, desc: "국화 3단 · 대형 리본 2매" },
  { id: "pd-b1", name: "근조화환 3단 고급", grade: "B", price: 200000, kind: "WREATH", freshGuarantee: true, leadTimeHours: 3, desc: "국화 3단 · 리본 2매" },
  { id: "pd-c1", name: "근조화환 3단 기본", grade: "C", price: 150000, kind: "WREATH", freshGuarantee: true, leadTimeHours: 3, desc: "국화 3단 · 리본 2매" },
  { id: "pd-d1", name: "근조화환 2단", grade: "D", price: 100000, kind: "WREATH", freshGuarantee: true, leadTimeHours: 2, desc: "국화 2단 · 리본 2매" },
  { id: "pd-e1", name: "근조화환 소형", grade: "E", price: 80000, kind: "WREATH", freshGuarantee: true, leadTimeHours: 2, desc: "국화 소형 · 리본 1매" },

  // 대체 상품 — 화환 반입이 거부되는 장소용 (F3-5)
  { id: "pd-r1", name: "근조 쌀화환 20kg", grade: "B", price: 200000, kind: "ALT", freshGuarantee: true, leadTimeHours: 4, desc: "기부 · 유족 전달 가능" },
  { id: "pd-r2", name: "근조 쌀화환 10kg", grade: "C", price: 150000, kind: "ALT", freshGuarantee: true, leadTimeHours: 4, desc: "기부 · 유족 전달 가능" },
  { id: "pd-r3", name: "조화 바구니", grade: "D", price: 100000, kind: "ALT", freshGuarantee: true, leadTimeHours: 3, desc: "실내 비치형 · 반입 제한 회피" },
  { id: "pd-r4", name: "근조기 (근조 현수기)", grade: "E", price: 80000, kind: "ALT", freshGuarantee: true, leadTimeHours: 2, desc: "화환 반입 거부 장소 대응" },
];

export const DEPT_BUDGETS: DeptBudget[] = [
  { costCenter: "CC-1200", deptName: "경영지원팀", allocated: 3000000, used: 2760000 },
  { costCenter: "CC-2100", deptName: "영업본부", allocated: 6000000, used: 3100000 },
  { costCenter: "CC-3100", deptName: "플랫폼개발팀", allocated: 2000000, used: 450000 },
  { costCenter: "CC-1300", deptName: "재무팀", allocated: 2000000, used: 900000 },
];

/** 기발송 이력 — 중복 발송 검사용 (F9) */
export interface SentRecord {
  id: string;
  targetId: string;
  eventTypeCode: string;
  senderTitle: string;
  /** 부서명은 조회 권한 문제로 화면에서 마스킹된다 (F9-2, F13-2) */
  senderDept: string;
  sentAt: string;
  amount: number;
}

export const SENT_RECORDS: SentRecord[] = [
  {
    id: "sr-001",
    targetId: "emp-002",
    eventTypeCode: "PARENT_DEATH",
    senderTitle: "회사 명의",
    senderDept: "경영지원팀",
    sentAt: "2026-08-28 14:20",
    amount: 300000,
  },
];

export function findBudget(costCenter: string): DeptBudget {
  return (
    DEPT_BUDGETS.find((b) => b.costCenter === costCenter) ?? {
      costCenter,
      deptName: "미지정",
      allocated: 0,
      used: 0,
    }
  );
}

/* ── 발신 명의 (S3) ────────────────────────────────── */

/** 소속 법인과 발신 명의 법인이 다른 케이스를 지원한다 (F4-1) */
export const SENDER_COMPANIES: SenderCompany[] = [
  { id: "co-zeno", name: "제노㈜", ceoName: "윤도현", holding: false },
  { id: "co-holdings", name: "제노홀딩스㈜", ceoName: "윤재경", holding: true },
  { id: "co-labs", name: "제노랩스㈜", ceoName: "서민호", holding: false },
];

export function findSenderCompany(id: string): SenderCompany {
  return SENDER_COMPANIES.find((c) => c.id === id) ?? SENDER_COMPANIES[0];
}

/** 종교 · 예식 유형별 애도 문구 (F4-2) */
export const RIBBON_PHRASES: Record<ReligionType, string[]> = {
  BUDDHIST: ["삼가 고인의 명복을 빕니다", "謹弔"],
  CHRISTIAN: [
    "주님의 위로가 함께하시기를 기도합니다",
    "하나님의 위로가 함께하시기를",
  ],
  CATHOLIC: [
    "고인의 영원한 안식을 기도합니다",
    "주님 안에서 영원한 안식을 누리소서",
  ],
  NONE: ["삼가 조의를 표합니다", "깊은 애도를 표합니다"],
  UNKNOWN: ["삼가 조의를 표합니다", "깊은 애도를 표합니다"],
};

/** 근조 리본에 들어가서는 안 되는 표현 (F4-5) */
export const FORBIDDEN_TERMS = [
  "축",
  "祝",
  "축하",
  "화혼",
  "결혼",
  "개업",
  "취임",
  "번창",
  "발전",
];

/** 리본 1매 권장 글자수 상한 */
export const RIBBON_MAX_LENGTH = 20;
