// 부고 문자 · 이미지 파싱 (F2-C) — C채널.
// 파싱 결과는 언제나 "초안"이며, 반드시 사용자가 1회 확인해야 실행된다 (F2-C-3).
// 실제 구현에서는 서버가 텍스트 + OCR/VLM 으로 처리한다. 여기서는 붙여넣은
// 텍스트를 규칙 기반으로 분해해 화면 동작을 검증한다.
import { EMPLOYEES, EXTERNAL_RECIPIENTS, FUNERAL_VENUES } from "./mock-data";
import type { Employee, ExternalRecipient, FuneralVenue } from "./types";

/** 항목별 신뢰도 (F2-C-5) */
export type Confidence = "HIGH" | "MEDIUM" | "LOW";

export const CONFIDENCE_LABEL: Record<Confidence, string> = {
  HIGH: "높음",
  MEDIUM: "보통",
  LOW: "낮음",
};

export interface ParsedField<T = string> {
  value: T;
  confidence: Confidence;
  /** 어떤 단서로 뽑았는지 — 사용자가 확인할 때 판단 근거가 된다 */
  evidence: string;
}

export interface ParsedNotice {
  deceased: ParsedField | null;
  chiefMourner: ParsedField | null;
  relation: ParsedField | null;
  eventTypeCode: ParsedField | null;
  venue: ParsedField | null;
  roomNo: ParsedField | null;
  eventAt: ParsedField | null;
  burialSite: ParsedField | null;
  /** 상주명으로 매칭된 임직원 */
  matchedEmployee: Employee | null;
  /** 상주명으로 매칭된 거래처 수신자 */
  matchedRecipient: ExternalRecipient | null;
  /** 빈소명으로 매칭된 장례식장 마스터 */
  matchedVenue: FuneralVenue | null;
}

/** 호칭 → 경조 유형 (신청자 기준이 아니라 상주 기준) */
const RELATION_MAP: { keywords: string[]; label: string; code: string }[] = [
  { keywords: ["부친", "아버님", "아버지", "선친"], label: "부친", code: "PARENT_DEATH" },
  { keywords: ["모친", "어머님", "어머니", "자당"], label: "모친", code: "PARENT_DEATH" },
  { keywords: ["장인", "빙부"], label: "장인", code: "SPOUSE_PARENT_DEATH" },
  { keywords: ["장모", "빙모"], label: "장모", code: "SPOUSE_PARENT_DEATH" },
  { keywords: ["시부", "시아버님"], label: "시부", code: "SPOUSE_PARENT_DEATH" },
  { keywords: ["시모", "시어머님"], label: "시모", code: "SPOUSE_PARENT_DEATH" },
  { keywords: ["배우자", "부군", "부인", "남편", "아내"], label: "배우자", code: "SPOUSE_DEATH" },
  { keywords: ["조부", "할아버님", "조모", "할머님"], label: "조부모", code: "GRANDPARENT_DEATH" },
  { keywords: ["형", "누나", "동생", "형제", "자매"], label: "형제자매", code: "SIBLING_DEATH" },
];

const NAME = "[가-힣]{2,4}";

function pick(
  text: string,
  patterns: { re: RegExp; confidence: Confidence; evidence: string }[]
): ParsedField | null {
  for (const p of patterns) {
    const m = text.match(p.re);
    if (m?.[1]) {
      return {
        value: m[1].trim(),
        confidence: p.confidence,
        evidence: p.evidence,
      };
    }
  }
  return null;
}

/** "2026년 9월 2일 오전 7시" → "2026-09-02T07:00" */
function parseDateTime(raw: string): string | null {
  const d = raw.match(/(\d{4})\s*[.년-]\s*(\d{1,2})\s*[.월-]\s*(\d{1,2})/);
  if (!d) return null;

  let hour = 0;
  let minute = 0;
  const t = raw.match(/(오전|오후)?\s*(\d{1,2})\s*(?:시|:)\s*(\d{1,2})?/);
  if (t) {
    hour = Number(t[2]);
    minute = t[3] ? Number(t[3]) : 0;
    if (t[1] === "오후" && hour < 12) hour += 12;
    if (t[1] === "오전" && hour === 12) hour = 0;
  }

  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d[1]}-${pad(Number(d[2]))}-${pad(Number(d[3]))}T${pad(hour)}:${pad(minute)}`;
}

export function parseNotice(text: string): ParsedNotice {
  const clean = text.replace(/\r/g, "");

  const deceased = pick(clean, [
    {
      re: new RegExp(`故\\s*(${NAME})`),
      confidence: "HIGH",
      evidence: "故 표기 뒤 이름",
    },
    {
      re: new RegExp(`고\\s*인\\s*[:：]\\s*(${NAME})`),
      confidence: "HIGH",
      evidence: "고인 라벨",
    },
  ]);

  const chiefMourner = pick(clean, [
    {
      re: new RegExp(`상\\s*주\\s*[:：]\\s*(${NAME})`),
      confidence: "HIGH",
      evidence: "상주 라벨",
    },
    {
      re: new RegExp(`(?:미망인|장남|차남|장녀|아들|딸)\\s*[:：]?\\s*(${NAME})`),
      confidence: "MEDIUM",
      evidence: "유족 호칭 뒤 이름",
    },
  ]);

  // 호칭으로 경조 유형 추정
  let relation: ParsedField | null = null;
  let eventTypeCode: ParsedField | null = null;
  for (const entry of RELATION_MAP) {
    const hit = entry.keywords.find((k) => clean.includes(k));
    if (hit) {
      relation = {
        value: entry.label,
        confidence: "MEDIUM",
        evidence: `본문의 "${hit}" 표현`,
      };
      eventTypeCode = {
        value: entry.code,
        confidence: "MEDIUM",
        evidence: `"${hit}" 호칭 기준 추정`,
      };
      break;
    }
  }

  const venue = pick(clean, [
    {
      re: /빈\s*소\s*[:：]\s*([^\n,]+?)(?:\s+[특별VIP0-9]+\s*호실|\n|$)/,
      confidence: "HIGH",
      evidence: "빈소 라벨",
    },
    {
      re: /([가-힣A-Za-z0-9 ]*(?:장례식장|장례문화원|병원))/,
      confidence: "LOW",
      evidence: "장례식장 명칭 패턴 추정",
    },
  ]);

  const roomNo = pick(clean, [
    {
      re: /((?:특|별|VIP)?\s*\d{0,2}\s*호실)/,
      confidence: "HIGH",
      evidence: "호실 표기",
    },
  ]);

  const eventAtRaw = pick(clean, [
    {
      re: /발\s*인\s*[:：]?\s*([^\n]+)/,
      confidence: "HIGH",
      evidence: "발인 라벨",
    },
  ]);

  const eventAtValue = eventAtRaw ? parseDateTime(eventAtRaw.value) : null;
  const eventAt: ParsedField | null = eventAtValue
    ? {
        value: eventAtValue,
        confidence: /오전|오후|\d{1,2}\s*시/.test(eventAtRaw!.value)
          ? "HIGH"
          : "MEDIUM",
        evidence: eventAtRaw!.evidence,
      }
    : null;

  const burialSite = pick(clean, [
    { re: /장\s*지\s*[:：]?\s*([^\n]+)/, confidence: "HIGH", evidence: "장지 라벨" },
  ]);

  // 상주명 기준 마스터 자동 매칭 (F2-C-4)
  const mournerName = chiefMourner?.value ?? "";
  const matchedEmployee =
    EMPLOYEES.find((e) => mournerName && e.name === mournerName) ?? null;
  const matchedRecipient =
    !matchedEmployee && mournerName
      ? (EXTERNAL_RECIPIENTS.find((r) => r.name === mournerName) ?? null)
      : null;

  const venueName = venue?.value ?? "";
  const matchedVenue = venueName
    ? (FUNERAL_VENUES.find(
        (v) => v.name === venueName || v.name.includes(venueName) || venueName.includes(v.name)
      ) ?? null)
    : null;

  return {
    deceased,
    chiefMourner,
    relation,
    eventTypeCode,
    venue,
    roomNo,
    eventAt,
    burialSite,
    matchedEmployee,
    matchedRecipient,
    matchedVenue,
  };
}

/** 캡쳐 이미지 업로드 시 사용하는 인식 결과 목업 (OCR/VLM 은 Phase 2 백엔드) */
export const SAMPLE_IMAGE_NOTICE = `訃告
저희 어머님께서 2026년 8월 30일 별세하셨기에 삼가 알려드립니다.

故 윤말순 님
상주: 최유진, 최성호
빈소: 삼성서울병원 장례식장 3호실
발인: 2026년 9월 2일(수) 오전 6시 30분
장지: 분당 메모리얼파크
연락처: 010-2345-6789`;

export const SAMPLE_TEXT_NOTICE = `[부고]
저희 아버님께서 2026년 8월 29일 소천하셨기에 알려드립니다.

故 이한수 님
상주: 이도현
빈소: 서울아산병원 장례식장 특2호실
발인: 2026년 9월 2일(수) 오전 7시
장지: 경기 광주 시안가족추모공원`;
