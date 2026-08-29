// ZENO 경조사 화환 발송 모듈 — 도메인 타입
// PRD: ZENO-CND v1.1 / MVP Phase 1-A

/** 수신자 리스크 레짐 (PRD §2.5) */
export type Regime = "R1" | "R2" | "R3" | "R4" | "UNKNOWN";

export const REGIME_LABEL: Record<Regime, string> = {
  R1: "공직자등",
  R2: "보건의료인",
  R3: "거래처 임직원",
  R4: "자사 임직원",
  UNKNOWN: "미확인",
};

export const REGIME_DESC: Record<Regime, string> = {
  R1: "청탁금지법 적용 대상 — 화환 10만원 법정 상한",
  R2: "약사법·의료기기법 규제 대상 — 법무 검토 전까지 승인 경로",
  R3: "사내 규정 상한 + 접대비 처리",
  R4: "사내 경조 규정 적용 — 대외 규제 미적용",
  UNKNOWN: "레짐 미확인 — 자동승인 불가",
};

/** 경조 유형 (MVP는 근조만) */
export interface EventType {
  code: string;
  label: string;
  category: "근조" | "축하";
  /** MVP 범위 여부 — 축하 화환은 Phase 1-C */
  available: boolean;
}

/** 신청 대상자와 신청자의 관계 */
export interface RelationType {
  code: string;
  label: string;
}

/** 종교·예식 유형 (F4-2 리본 문구 분기) */
export type ReligionType = "BUDDHIST" | "CHRISTIAN" | "CATHOLIC" | "NONE" | "UNKNOWN";

export const RELIGION_LABEL: Record<ReligionType, string> = {
  BUDDHIST: "불교 / 전통",
  CHRISTIAN: "기독교",
  CATHOLIC: "천주교",
  NONE: "무종교",
  UNKNOWN: "모름 (중립 문구)",
};

/** 임직원 마스터 */
export interface Employee {
  id: string;
  empNo: string;
  name: string;
  rank: string;
  dept: string;
  company: string;
  /** 재직기간 (개월) */
  tenureMonths: number;
  costCenter: string;
}

/** 거래처 수신자 마스터 (F14) */
export interface ExternalRecipient {
  id: string;
  name: string;
  org: string;
  position: string;
  regime: Regime;
  /** 레짐 판정 근거 */
  basis: string;
  /** 최종 확인일 (YYYY-MM-DD) */
  confirmedAt: string | null;
  confirmedBy: string | null;
}

/** 장례식장 마스터 (F8) */
export interface FuneralVenue {
  id: string;
  name: string;
  address: string;
  region: string;
  phone: string;
  /** 화환 반입 가능 여부 */
  wreathAllowed: boolean | null;
  /** 반입 제한 사유 */
  restrictionReason: string | null;
  /** 반입료 (원, 없으면 0) */
  entryFee: number;
  /** 반입 가능 시간대 */
  entryHours: string | null;
  /** 검증 상태 — 미검증 정보는 확정 사실로 안내하지 않는다 (F8-5) */
  verification: "VERIFIED" | "NEEDS_CHECK" | "REPORTED";
  updatedAt: string;
}

/** 신청 대상 구분 */
export type TargetKind = "EMPLOYEE" | "EXTERNAL";

/** S1에서 수집하는 신청 초안 (F2-A-2) */
export interface RequestDraft {
  targetKind: TargetKind;
  /** 임직원 대상 시 Employee.id, 거래처 대상 시 ExternalRecipient.id */
  targetId: string | null;
  /** 마스터에 없는 거래처 수신자를 직접 입력한 경우 */
  manualTargetName: string;
  manualTargetOrg: string;
  relationCode: string;
  eventTypeCode: string;
  religion: ReligionType;
  /** 행사(발인) 일시 */
  eventAt: string;
  /** 조문 예정 시각 — 화환 도착 기준점 (추가 고려사항 12) */
  visitAt: string;
  /** 장소 미정 허용 (F2-A-3) */
  venueUndecided: boolean;
  venueId: string | null;
  /** 마스터에 없는 장소 직접 입력 */
  manualVenueName: string;
  roomNo: string;
  note: string;
}

export const EMPTY_DRAFT: RequestDraft = {
  targetKind: "EMPLOYEE",
  targetId: null,
  manualTargetName: "",
  manualTargetOrg: "",
  relationCode: "",
  eventTypeCode: "",
  religion: "UNKNOWN",
  eventAt: "",
  visitAt: "",
  venueUndecided: false,
  venueId: null,
  manualVenueName: "",
  roomNo: "",
  note: "",
};
