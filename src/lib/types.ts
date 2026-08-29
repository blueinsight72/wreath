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
  /** 공직자등 본인인지 배우자인지 — 경조 유형별 판정이 갈린다 (F14-3) */
  officialScope: "SELF" | "SPOUSE" | null;
  /** 기관명 기반 자동 후보 판정 결과 (F14-5) — 최종 확정은 사람이 한다 */
  autoHint: string | null;
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
  /** 공급사 현장 보고 누적 건수 — 3건 이상이면 운영팀 검증 대상 (F8-4) */
  issueReports: number;
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
  /** S2에서 선택한 상품 */
  productId: string | null;
  /** S3 발신 명의 유형 */
  senderType: SenderType;
  /** 발신 명의 법인 — 소속 법인과 다를 수 있다 (지주사 · 대표 계열사 명의) */
  senderCompanyId: string;
  /** 조문 참석 예정 여부 — 명의 분기 규칙에 사용 */
  attending: boolean;
  /** 애도 문구에 적용할 종교 유형 (S1 값이 기본, 여기서 조정 가능) */
  phraseReligion: ReligionType;
  /** 문구를 직접 고친 경우 */
  phraseOverride: string;
}

/** 발신 명의 유형 (F4-1) */
export type SenderType = "COMPANY" | "CEO" | "DEPT" | "PERSONAL";

export const SENDER_TYPE_LABEL: Record<SenderType, string> = {
  COMPANY: "회사 명의",
  CEO: "대표이사 명의",
  DEPT: "부서 명의",
  PERSONAL: "개인 명의",
};

/** 발신 명의 법인 */
export interface SenderCompany {
  id: string;
  name: string;
  ceoName: string;
  /** 지주사 여부 */
  holding: boolean;
}

/** 리본 문구 검증 결과 (F4-5) */
export interface RibbonIssue {
  code: string;
  message: string;
  tone: "warn" | "danger";
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
  productId: null,
  senderType: "COMPANY",
  senderCompanyId: "co-zeno",
  attending: false,
  phraseReligion: "UNKNOWN",
  phraseOverride: "",
};

/* ── 규정 판정 · 상품 (S2) ─────────────────────────── */

/** 직급 등급 — 규정표 조건 축 */
export type RankTier = "EXEC" | "SENIOR" | "STAFF";

export const RANK_TIER_LABEL: Record<RankTier, string> = {
  EXEC: "임원",
  SENIOR: "책임 · 선임",
  STAFF: "사원",
};

/** 사내 경조 규정 한 줄 (CondolencePolicy) */
export interface PolicyRule {
  id: string;
  eventTypeCode: string;
  targetKind: TargetKind;
  /** null 이면 직급 무관 */
  rankTier: RankTier | null;
  /** 이 개월 수 이상 재직 시 적용 */
  minTenureMonths: number;
  grade: string;
  wreathLimit: number;
}

/** 화환 상품 */
export interface WreathProduct {
  id: string;
  name: string;
  grade: string;
  price: number;
  /** 화환 / 대체 상품 (반입 불가 장소용) */
  kind: "WREATH" | "ALT";
  /** 생화 · 신품 확약 (F3-4) */
  freshGuarantee: boolean;
  /** 제작 + 배송 소요 시간 */
  leadTimeHours: number;
  desc: string;
}

/** 부서 경조 예산 (F11-4) */
export interface DeptBudget {
  costCenter: string;
  deptName: string;
  /** 연간 배정액 */
  allocated: number;
  /** 집행액 */
  used: number;
}

/** 계정과목 */
export type AccountCode = "WELFARE" | "ENTERTAINMENT";

export const ACCOUNT_LABEL: Record<AccountCode, string> = {
  WELFARE: "복리후생비",
  ENTERTAINMENT: "접대비",
};

/** 승인 경로 전환 사유 */
export interface PolicyFlag {
  code: string;
  label: string;
  detail: string;
  tone: "info" | "warn" | "danger";
}

/** 판정 근거 스냅샷 (F1-8) — 감사 · 양벌규정 면책 입증자료 */
export interface DecisionSnapshot {
  policyVersion: string;
  policyApprovedAt: string;
  policyApprovedBy: string;
  matchedRuleId: string | null;
  conditions: { label: string; value: string }[];
  limitFormula: string;
  regimeBasis: string;
  decidedAt: string;
}

/** 판정 결과 */
export interface PolicyDecision {
  regime: Regime;
  /** 사내 규정 상한 — null 이면 규정 외 */
  internalLimit: number | null;
  /** 법정 하드리밋 — R1 에만 적용 */
  legalLimit: number | null;
  /** MIN(사내, 법정) */
  finalLimit: number | null;
  grade: string | null;
  account: AccountCode;
  budget: DeptBudget;
  /** 자동승인 가능 여부 (상품 선택 전 기준) */
  autoApprovable: boolean;
  flags: PolicyFlag[];
  snapshot: DecisionSnapshot;
}

/** 선택 상품까지 반영한 최종 실행 판정 */
export type ExecutionResult = "AUTO_APPROVE" | "NEED_APPROVAL" | "BLOCKED";

export interface ExecutionDecision {
  result: ExecutionResult;
  reasons: PolicyFlag[];
}
