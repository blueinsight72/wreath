// 고객사별 목업 데이터 — 임직원 · 부서 예산 · 거래처 수신자 · 발신 명의 법인 · 기발송 이력.
// 전 고객사 공통(장례식장 · 공급사 · 상품)은 mock-data.ts 에 남는다.
import type {
  DeptBudget,
  Employee,
  ExternalRecipient,
  SenderCompany,
} from "./types";

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

export interface TenantData {
  /** 지금 로그인해 있는 신청자 */
  currentUser: Employee;
  employees: Employee[];
  budgets: DeptBudget[];
  recipients: ExternalRecipient[];
  /** 발신 명의로 쓸 수 있는 법인 — 그룹사면 여러 개 */
  senderCompanies: SenderCompany[];
  sentRecords: SentRecord[];
}

/* ── 제노㈜ ───────────────────────────────────────────────── */

const ZENO_EMPLOYEES: Employee[] = [
  { id: "emp-001", empNo: "20180311", name: "김재현", rank: "책임", dept: "경영지원팀", company: "제노㈜", tenureMonths: 89, costCenter: "CC-1200" },
  { id: "emp-002", empNo: "20150102", name: "박세영", rank: "이사", dept: "영업본부", company: "제노㈜", tenureMonths: 128, costCenter: "CC-2100" },
  { id: "emp-003", empNo: "20210715", name: "이도현", rank: "선임", dept: "플랫폼개발팀", company: "제노㈜", tenureMonths: 50, costCenter: "CC-3100" },
  { id: "emp-004", empNo: "20190401", name: "최유진", rank: "책임", dept: "재무팀", company: "제노㈜", tenureMonths: 77, costCenter: "CC-1300" },
  { id: "emp-005", empNo: "20230801", name: "정민석", rank: "사원", dept: "마케팅팀", company: "제노㈜", tenureMonths: 24, costCenter: "CC-2300" },
  { id: "emp-006", empNo: "20120220", name: "한지수", rank: "상무", dept: "경영지원본부", company: "제노홀딩스㈜", tenureMonths: 162, costCenter: "CC-1000" },
  { id: "emp-007", empNo: "20240115", name: "오현우", rank: "사원", dept: "고객성공팀", company: "제노㈜", tenureMonths: 19, costCenter: "CC-2400" },
  { id: "emp-008", empNo: "20170905", name: "서나연", rank: "책임", dept: "구매팀", company: "제노㈜", tenureMonths: 95, costCenter: "CC-1400" },
];

const ZENO_DATA: TenantData = {
  currentUser: ZENO_EMPLOYEES[0],
  employees: ZENO_EMPLOYEES,
  budgets: [
    { costCenter: "CC-1200", deptName: "경영지원팀", allocated: 3000000, used: 2760000 },
    { costCenter: "CC-2100", deptName: "영업본부", allocated: 6000000, used: 3100000 },
    { costCenter: "CC-3100", deptName: "플랫폼개발팀", allocated: 2000000, used: 450000 },
    { costCenter: "CC-1300", deptName: "재무팀", allocated: 2000000, used: 900000 },
    { costCenter: "CC-2300", deptName: "마케팅팀", allocated: 1500000, used: 300000 },
    { costCenter: "CC-2400", deptName: "고객성공팀", allocated: 1500000, used: 150000 },
    { costCenter: "CC-1400", deptName: "구매팀", allocated: 2000000, used: 700000 },
    { costCenter: "CC-1000", deptName: "경영지원본부", allocated: 5000000, used: 1200000 },
  ],
  senderCompanies: [
    { id: "co-zeno", name: "제노㈜", ceoName: "윤도현", holding: false },
    { id: "co-holdings", name: "제노홀딩스㈜", ceoName: "윤재경", holding: true },
    { id: "co-labs", name: "제노랩스㈜", ceoName: "서민호", holding: false },
  ],
  recipients: [
    { id: "ext-001", name: "강태호", org: "한국조달공사", position: "구매기획처장", regime: "R1", basis: "공직유관단체 임직원 (공공기관 지정 목록 확인)", officialScope: "SELF", autoHint: "공공기관 지정 목록에서 한국조달공사 확인됨", confirmedAt: "2026-06-12", confirmedBy: "법무팀 윤성재" },
    { id: "ext-002", name: "문혜린", org: "대성일보", position: "산업부 차장", regime: "R1", basis: "언론사 임직원", officialScope: "SELF", autoHint: "언론사 목록에서 대성일보 확인됨", confirmedAt: "2026-05-30", confirmedBy: "법무팀 윤성재" },
    { id: "ext-003", name: "임경섭", org: "성모병원", position: "정형외과 과장", regime: "R2", basis: "보건의료인 — 경제적 이익 제공 규제 검토 필요", officialScope: "SELF", autoHint: "의료기관 종사자 — 법무 검토 대기", confirmedAt: "2026-04-18", confirmedBy: "법무팀 윤성재" },
    { id: "ext-004", name: "노상현", org: "대한물류㈜", position: "물류본부 이사", regime: "R3", basis: "일반 사기업 임직원 — 사내 규정 및 접대비 처리", officialScope: null, autoHint: null, confirmedAt: "2026-07-02", confirmedBy: "구매팀 서나연" },
    { id: "ext-005", name: "백승주", org: "미래테크㈜", position: "대표이사", regime: "R3", basis: "일반 사기업 임직원", officialScope: null, autoHint: null, confirmedAt: "2026-03-11", confirmedBy: "구매팀 서나연" },
    { id: "ext-006", name: "황인철", org: "성진대학교", position: "산학협력단 팀장", regime: "UNKNOWN", basis: "학교법인 직원 여부 확인 중", officialScope: null, autoHint: "학교법인 여부 자동 판정 불가 — 사람 확인 필요", confirmedAt: null, confirmedBy: null },
  ],
  sentRecords: [
    { id: "sr-001", targetId: "emp-002", eventTypeCode: "PARENT_DEATH", senderTitle: "회사 명의", senderDept: "경영지원팀", sentAt: "2026-08-28 14:20", amount: 300000 },
  ],
};

/* ── 대한물산㈜ ───────────────────────────────────────────── */

const DAEHAN_EMPLOYEES: Employee[] = [
  { id: "dh-001", empNo: "DH20160204", name: "조성일", rank: "본부장", dept: "관리본부", company: "대한물산㈜", tenureMonths: 125, costCenter: "DH-1000" },
  { id: "dh-002", empNo: "DH20200907", name: "권나래", rank: "과장", dept: "총무팀", company: "대한물산㈜", tenureMonths: 59, costCenter: "DH-1100" },
  { id: "dh-003", empNo: "DH20220314", name: "신동환", rank: "대리", dept: "물류운영팀", company: "대한물산㈜", tenureMonths: 41, costCenter: "DH-2100" },
  { id: "dh-004", empNo: "DH20250602", name: "유하람", rank: "사원", dept: "물류운영팀", company: "대한물산㈜", tenureMonths: 3, costCenter: "DH-2100" },
  { id: "dh-005", empNo: "DH20180521", name: "배정훈", rank: "차장", dept: "영업2팀", company: "대한물산㈜", tenureMonths: 87, costCenter: "DH-2200" },
];

const DAEHAN_DATA: TenantData = {
  currentUser: DAEHAN_EMPLOYEES[1],
  employees: DAEHAN_EMPLOYEES,
  budgets: [
    { costCenter: "DH-1000", deptName: "관리본부", allocated: 4000000, used: 1500000 },
    { costCenter: "DH-1100", deptName: "총무팀", allocated: 2500000, used: 800000 },
    { costCenter: "DH-2100", deptName: "물류운영팀", allocated: 3000000, used: 2900000 },
    { costCenter: "DH-2200", deptName: "영업2팀", allocated: 2000000, used: 400000 },
  ],
  senderCompanies: [
    { id: "dh-co", name: "대한물산㈜", ceoName: "정해중", holding: false },
  ],
  recipients: [
    { id: "dh-ext-01", name: "오세근", org: "한국철도공사", position: "물류사업처 차장", regime: "R1", basis: "공공기관 임직원", officialScope: "SELF", autoHint: "공공기관 지정 목록에서 확인됨", confirmedAt: "2026-06-02", confirmedBy: "관리본부 조성일" },
    { id: "dh-ext-02", name: "차민규", org: "성일유통㈜", position: "구매팀장", regime: "R3", basis: "일반 사기업 임직원", officialScope: null, autoHint: null, confirmedAt: "2026-07-19", confirmedBy: "총무팀 권나래" },
  ],
  sentRecords: [],
};

/* ── 미래바이오㈜ ─────────────────────────────────────────── */

const MIRAE_EMPLOYEES: Employee[] = [
  { id: "mr-001", empNo: "MB2021008", name: "배수현", rank: "이사", dept: "준법지원실", company: "미래바이오㈜", tenureMonths: 62, costCenter: "MB-1000" },
  { id: "mr-002", empNo: "MB2023041", name: "장예린", rank: "선임", dept: "인사총무팀", company: "미래바이오㈜", tenureMonths: 32, costCenter: "MB-1100" },
  { id: "mr-003", empNo: "MB2019112", name: "홍석주", rank: "책임", dept: "임상개발팀", company: "미래바이오㈜", tenureMonths: 80, costCenter: "MB-3100" },
  { id: "mr-004", empNo: "MB2024073", name: "남기훈", rank: "사원", dept: "영업기획팀", company: "미래바이오㈜", tenureMonths: 14, costCenter: "MB-2100" },
];

const MIRAE_DATA: TenantData = {
  currentUser: MIRAE_EMPLOYEES[1],
  employees: MIRAE_EMPLOYEES,
  budgets: [
    { costCenter: "MB-1000", deptName: "준법지원실", allocated: 1500000, used: 200000 },
    { costCenter: "MB-1100", deptName: "인사총무팀", allocated: 2000000, used: 600000 },
    { costCenter: "MB-3100", deptName: "임상개발팀", allocated: 1500000, used: 350000 },
    { costCenter: "MB-2100", deptName: "영업기획팀", allocated: 1000000, used: 950000 },
  ],
  senderCompanies: [
    { id: "mb-co", name: "미래바이오㈜", ceoName: "천경호", holding: false },
  ],
  recipients: [
    { id: "mb-ext-01", name: "임경섭", org: "성모병원", position: "정형외과 과장", regime: "R2", basis: "보건의료인 — 약사법·의료기기법상 경제적 이익 제공 규제 대상", officialScope: null, autoHint: "의료기관 종사자", confirmedAt: "2026-08-05", confirmedBy: "준법지원실 배수현" },
    { id: "mb-ext-02", name: "구본석", org: "한국보건의료연구원", position: "연구기획부장", regime: "R1", basis: "공직유관단체 임직원", officialScope: "SELF", autoHint: "공공기관 지정 목록에서 확인됨", confirmedAt: "2026-08-05", confirmedBy: "준법지원실 배수현" },
    { id: "mb-ext-03", name: "윤태경", org: "세강대학교병원", position: "약제부장", regime: "UNKNOWN", basis: "학교법인 소속 여부 및 보건의료인 해당 여부 확인 중", officialScope: null, autoHint: "학교법인 · 보건의료인 이중 검토 필요", confirmedAt: null, confirmedBy: null },
  ],
  sentRecords: [],
};

const BY_TENANT: Record<string, TenantData> = {
  "tn-zeno": ZENO_DATA,
  "tn-daehan": DAEHAN_DATA,
  "tn-mirae": MIRAE_DATA,
};

export function dataOf(tenantId: string): TenantData {
  return BY_TENANT[tenantId] ?? ZENO_DATA;
}

/* ── 조회 헬퍼 — 모두 고객사 안에서만 찾는다 ─────────────── */

export function findEmployee(tenantId: string, id: string | null) {
  return dataOf(tenantId).employees.find((e) => e.id === id) ?? null;
}

export function findRecipient(tenantId: string, id: string | null) {
  return dataOf(tenantId).recipients.find((r) => r.id === id) ?? null;
}

export function findBudget(tenantId: string, costCenter: string): DeptBudget {
  return (
    dataOf(tenantId).budgets.find((b) => b.costCenter === costCenter) ?? {
      costCenter,
      deptName: "미지정",
      allocated: 0,
      used: 0,
    }
  );
}

export function findSenderCompany(tenantId: string, id: string): SenderCompany {
  const list = dataOf(tenantId).senderCompanies;
  return list.find((c) => c.id === id) ?? list[0];
}
