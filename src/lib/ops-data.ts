// 운영 화면용 목업 데이터 — 승인 · 발주 · 증빙.
//
// 공급사 발주 접수 · 상태 관리 · 정산 · 온보딩은 ZENO SCM 소관이므로 이 모듈에
// 만들지 않는다. 이 모듈은 SCM 으로 발주를 넘기고, 배정 결과와 상태만 돌려받는다.
import type { AccountCode, Regime } from "./types";

export type OrderStatus =
  | "APPROVAL_PENDING"
  | "ORDERED"
  | "ACCEPTED"
  | "MAKING"
  | "SHIPPING"
  | "DELIVERED"
  | "CANCELLED";

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  APPROVAL_PENDING: "승인 대기",
  ORDERED: "발주 송신",
  ACCEPTED: "접수 완료",
  MAKING: "제작 중",
  SHIPPING: "배송 중",
  DELIVERED: "배송 완료",
  CANCELLED: "취소",
};

export interface ApprovalReason {
  label: string;
  detail: string;
}

export interface Order {
  id: string;
  createdAt: string;
  applicantName: string;
  applicantDept: string;
  /** 대상자 표기 */
  targetLabel: string;
  targetOrg: string;
  regime: Regime;
  eventTypeLabel: string;
  venueName: string;
  roomNo: string;
  /** 조문 예정 시각 */
  visitAt: string;
  productName: string;
  amount: number;
  account: AccountCode;
  internalLimit: number | null;
  legalLimit: number | null;
  ribbonPhrase: string;
  ribbonSender: string;
  status: OrderStatus;
  /** ZENO SCM 이 배정한 공급사 — 이 모듈은 배정 결과만 받아서 표시한다 */
  supplierRef: string | null;
  supplierName: string | null;
  approvalReasons: ApprovalReason[];
  /** 승인 SLA 잔여 (분) — 음수면 초과 */
  slaRemainingMin: number;
  /** 사진 증빙 필수 여부 (F7-2) */
  proofRequired: boolean;
  proofPhoto: boolean;
  /** 현장 반입 이슈 보고 (F8-4) */
  venueIssue: boolean;
  /** 접수까지 걸린 시간 (분) — 미접수면 null */
  acceptedInMin: number | null;
  /** 시스템 밖 발주를 사후 등록한 건 (F5-7) */
  offSystem: boolean;
}

export const ORDERS: Order[] = [
  {
    id: "ZC-2608-0417",
    createdAt: "2026-08-29 14:02",
    applicantName: "김재현",
    applicantDept: "경영지원팀",
    targetLabel: "황인철",
    targetOrg: "성진대학교 산학협력단",
    regime: "UNKNOWN",
    eventTypeLabel: "부모상",
    venueName: "빈소 미정",
    roomNo: "",
    visitAt: "2026-09-01T18:00",
    productName: "근조화환 3단 기본",
    amount: 150000,
    account: "ENTERTAINMENT",
    internalLimit: 150000,
    legalLimit: null,
    ribbonPhrase: "삼가 조의를 표합니다",
    ribbonSender: "제노㈜ 대표이사 윤도현",
    status: "APPROVAL_PENDING",
    supplierRef: null,
    supplierName: null,
    approvalReasons: [
      {
        label: "수신자 레짐 미확인",
        detail:
          "청탁금지법 적용 대상 여부가 확인되지 않았습니다. 수신자 마스터 등록이 필요합니다.",
      },
      {
        label: "빈소 미정",
        detail: "장소가 확정되면 발주가 자동 재개됩니다.",
      },
    ],
    slaRemainingMin: 42,
    proofRequired: true,
    proofPhoto: false,
    venueIssue: false,
    acceptedInMin: null,
    offSystem: false,
  },
  {
    id: "ZC-2608-0416",
    createdAt: "2026-08-29 11:35",
    applicantName: "박세영",
    applicantDept: "영업본부",
    targetLabel: "노상현",
    targetOrg: "대한물류㈜ 물류본부 이사",
    regime: "R3",
    eventTypeLabel: "배우자상",
    venueName: "삼성서울병원 장례식장",
    roomNo: "3호실",
    visitAt: "2026-08-30T19:00",
    productName: "근조화환 3단 프리미엄",
    amount: 300000,
    account: "ENTERTAINMENT",
    internalLimit: 200000,
    legalLimit: null,
    ribbonPhrase: "삼가 고인의 명복을 빕니다",
    ribbonSender: "제노㈜ 영업본부",
    status: "APPROVAL_PENDING",
    supplierRef: null,
    supplierName: null,
    approvalReasons: [
      {
        label: "사내 규정 상한 초과",
        detail: "사내 상한 200,000원을 100,000원 초과합니다.",
      },
      {
        label: "부서 예산 잔액 부족",
        detail: "영업본부 잔액 대비 초과하여 예산관리자 승인선이 추가되었습니다.",
      },
    ],
    slaRemainingMin: -18,
    proofRequired: true,
    proofPhoto: false,
    venueIssue: false,
    acceptedInMin: null,
    offSystem: false,
  },
  {
    id: "ZC-2608-0415",
    createdAt: "2026-08-29 09:14",
    applicantName: "이도현",
    applicantDept: "플랫폼개발팀",
    targetLabel: "정민석 사원",
    targetOrg: "마케팅팀",
    regime: "R4",
    eventTypeLabel: "조부모상",
    venueName: "인천 길병원 장례식장",
    roomNo: "특1호실",
    visitAt: "2026-08-29T19:00",
    productName: "근조화환 2단",
    amount: 100000,
    account: "WELFARE",
    internalLimit: 100000,
    legalLimit: null,
    ribbonPhrase: "삼가 고인의 명복을 빕니다",
    ribbonSender: "제노㈜",
    status: "ORDERED",
    supplierRef: "SCM-SP-001",
    supplierName: "전국화훼중계망㈜",
    approvalReasons: [],
    slaRemainingMin: 0,
    proofRequired: false,
    proofPhoto: false,
    venueIssue: false,
    acceptedInMin: null,
    offSystem: false,
  },
  {
    id: "ZC-2608-0414",
    createdAt: "2026-08-28 16:40",
    applicantName: "최유진",
    applicantDept: "재무팀",
    targetLabel: "강태호",
    targetOrg: "한국조달공사 구매기획처장",
    regime: "R1",
    eventTypeLabel: "부모상",
    venueName: "서울아산병원 장례식장",
    roomNo: "2호실",
    visitAt: "2026-08-28T20:00",
    productName: "근조화환 2단",
    amount: 100000,
    account: "ENTERTAINMENT",
    internalLimit: 150000,
    legalLimit: 100000,
    ribbonPhrase: "삼가 고인의 명복을 빕니다",
    ribbonSender: "제노㈜",
    status: "SHIPPING",
    supplierRef: "SCM-SP-001",
    supplierName: "전국화훼중계망㈜",
    approvalReasons: [],
    slaRemainingMin: 0,
    proofRequired: true,
    proofPhoto: false,
    venueIssue: false,
    acceptedInMin: 12,
    offSystem: false,
  },
  {
    id: "ZC-2608-0413",
    createdAt: "2026-08-28 10:05",
    applicantName: "서나연",
    applicantDept: "구매팀",
    targetLabel: "백승주",
    targetOrg: "미래테크㈜ 대표이사",
    regime: "R3",
    eventTypeLabel: "부모상",
    venueName: "부산 해운대백병원 장례식장",
    roomNo: "5호실",
    visitAt: "2026-08-28T18:00",
    productName: "근조 쌀화환 10kg",
    amount: 150000,
    account: "ENTERTAINMENT",
    internalLimit: 150000,
    legalLimit: null,
    ribbonPhrase: "삼가 조의를 표합니다",
    ribbonSender: "제노㈜ 구매팀",
    status: "DELIVERED",
    supplierRef: "SCM-SP-002",
    supplierName: "부산제일꽃집",
    approvalReasons: [],
    slaRemainingMin: 0,
    proofRequired: true,
    proofPhoto: true,
    venueIssue: true,
    acceptedInMin: 8,
    offSystem: false,
  },
  {
    id: "ZC-2608-0412",
    createdAt: "2026-08-27 21:18",
    applicantName: "한지수",
    applicantDept: "경영지원본부",
    targetLabel: "오현우 사원",
    targetOrg: "고객성공팀",
    regime: "R4",
    eventTypeLabel: "배우자 부모상",
    venueName: "수원 아주대학교병원 장례식장",
    roomNo: "1호실",
    visitAt: "2026-08-28T11:00",
    productName: "근조화환 3단 기본",
    amount: 150000,
    account: "WELFARE",
    internalLimit: 150000,
    legalLimit: null,
    ribbonPhrase: "삼가 고인의 명복을 빕니다",
    ribbonSender: "제노홀딩스㈜",
    status: "DELIVERED",
    supplierRef: "SCM-SP-001",
    supplierName: "전국화훼중계망㈜",
    approvalReasons: [],
    slaRemainingMin: 0,
    proofRequired: false,
    proofPhoto: false,
    venueIssue: false,
    acceptedInMin: 31,
    offSystem: true,
  },
];

export function findOrder(id: string) {
  return ORDERS.find((o) => o.id === id) ?? null;
}
