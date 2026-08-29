// 전 고객사 공통 목업 데이터 — 장례식장 · 상품 · 경조 유형 · 리본 문구.
// 고객사별 데이터(임직원 · 예산 · 거래처 · 발신 명의)는 tenant-data.ts 에 있다.
import type {
  EventType,
  FuneralVenue,
  RelationType,
  ReligionType,
  WreathProduct,
} from "./types";

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
    issueReports: 0,
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
    issueReports: 0,
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
    issueReports: 3,
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
    issueReports: 1,
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
    issueReports: 0,
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
    issueReports: 0,
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
    issueReports: 2,
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
    issueReports: 1,
  },
];

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

/** 청탁금지법 화환 · 조화 가액범위 (R1 하드리밋) — 법이 정한 값이라 고객사 공통 */
export const LEGAL_WREATH_LIMIT = 100000;

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
