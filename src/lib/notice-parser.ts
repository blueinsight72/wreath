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

/** 유족 명단 한 줄 */
export interface SurvivorGroup {
  role: string;
  names: string[];
}

export interface ParsedNotice {
  deceased: ParsedField | null;
  /** 발송 주체 = 화환을 받을 상주 */
  mourner: ParsedField | null;
  relation: ParsedField | null;
  eventTypeCode: ParsedField | null;
  venue: ParsedField | null;
  roomNo: ParsedField | null;
  eventAt: ParsedField | null;
  burialSite: ParsedField | null;
  /** 유족 명단 — 임직원 마스터와 대조하는 데 쓴다 */
  survivors: SurvivorGroup[];
  /** 모바일 부고장 링크 — 빈소 호실 · 발인이 이 안에 있는 경우가 많다 */
  noticeUrl: string | null;
  matchedEmployee: Employee | null;
  matchedRecipient: ExternalRecipient | null;
  /** 대상자를 상주 표기에서 찾았는지, 유족 명단 대조로 찾았는지 */
  matchedFrom: "MOURNER" | "SURVIVOR" | null;
  /** 유족 명단에서 매칭된 경우의 역할 (아들 · 사위 등) */
  matchedRole: string | null;
  matchedVenue: FuneralVenue | null;
}

const NAME = "[가-힣]{2,4}";

/** 호칭 → 경조 유형. 상주 기준 관계다. */
const RELATIONS: { keywords: string[]; label: string; code: string }[] = [
  { keywords: ["부친", "아버님", "아버지", "선친"], label: "부친", code: "PARENT_DEATH" },
  { keywords: ["모친", "어머님", "어머니", "자당"], label: "모친", code: "PARENT_DEATH" },
  { keywords: ["장인", "빙부"], label: "장인", code: "SPOUSE_PARENT_DEATH" },
  { keywords: ["장모", "빙모"], label: "장모", code: "SPOUSE_PARENT_DEATH" },
  { keywords: ["시부", "시아버님"], label: "시부", code: "SPOUSE_PARENT_DEATH" },
  { keywords: ["시모", "시어머님"], label: "시모", code: "SPOUSE_PARENT_DEATH" },
  { keywords: ["배우자", "부군", "부인", "남편", "아내"], label: "배우자", code: "SPOUSE_DEATH" },
  { keywords: ["조부", "할아버님", "조모", "할머님"], label: "조부모", code: "GRANDPARENT_DEATH" },
  { keywords: ["형님", "누님", "동생", "형제", "자매"], label: "형제자매", code: "SIBLING_DEATH" },
];

const RELATION_WORDS = RELATIONS.flatMap((r) => r.keywords).join("|");

/** 유족 명단에 쓰이는 역할어 */
const SURVIVOR_ROLES = [
  "상주",
  "미망인",
  "배우자",
  "아들",
  "며느리",
  "자부",
  "딸",
  "사위",
  "손",
  "손자",
  "손녀",
  "형제",
  "자매",
];

function field(
  value: string,
  confidence: Confidence,
  evidence: string
): ParsedField {
  return { value: value.trim(), confidence, evidence };
}

/** "박효철님" → "박효철" — 이름 뒤에 붙는 존칭을 떼어낸다 */
function stripHonorific(name: string) {
  return name.trim().replace(/\s*(님|씨)$/, "");
}

/** 공백 · 괄호를 걷어낸 비교용 문자열 */
function normalize(text: string) {
  return text.replace(/[\s()（）]/g, "");
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

/** 유족 명단 파싱 — "아들\n전종택" 형태와 "아들: 전종택" 형태를 모두 받는다 */
function parseSurvivors(lines: string[]): SurvivorGroup[] {
  const groups: SurvivorGroup[] = [];
  const splitNames = (raw: string) =>
    raw
      .split(/[,、·\/]/)
      .map((n) => n.trim())
      .filter((n) => new RegExp(`^${NAME}$`).test(n));

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    const inline = line.match(new RegExp(`^(${SURVIVOR_ROLES.join("|")})\\s*[:：]\\s*(.+)$`));
    if (inline) {
      const names = splitNames(inline[2]);
      if (names.length) groups.push({ role: inline[1], names });
      continue;
    }

    if (SURVIVOR_ROLES.includes(line) && lines[i + 1]) {
      const names = splitNames(lines[i + 1]);
      if (names.length) {
        groups.push({ role: line, names });
        i += 1;
      }
    }
  }

  return groups;
}

export function parseNotice(text: string): ParsedNotice {
  const clean = text.replace(/\r/g, "");
  const lines = clean
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  /* 고인 */
  let deceased: ParsedField | null = null;
  const deceasedByMark = clean.match(new RegExp(`故\\s*(${NAME})`));
  const deceasedByLabel = clean.match(new RegExp(`고\\s*인\\s*[:：]\\s*(${NAME})`));
  if (deceasedByMark) {
    deceased = field(stripHonorific(deceasedByMark[1]), "HIGH", "故 표기 뒤 이름");
  } else if (deceasedByLabel) {
    deceased = field(stripHonorific(deceasedByLabel[1]), "HIGH", "고인 라벨");
  }

  /* 상주 + 관계 — "OOO님의 장모" 형태가 가장 확실한 단서다 */
  let mourner: ParsedField | null = null;
  let relation: ParsedField | null = null;
  let eventTypeCode: ParsedField | null = null;

  const possessive = clean.match(
    new RegExp(`(${NAME})\\s*님?의\\s*(${RELATION_WORDS})`)
  );
  if (possessive) {
    const who = stripHonorific(possessive[1]);
    const quote = `"${who}님의 ${possessive[2]}"`;
    mourner = field(who, "HIGH", `${quote} 표현`);
    const entry = RELATIONS.find((r) => r.keywords.includes(possessive[2]));
    if (entry) {
      relation = field(entry.label, "HIGH", `${quote} 표현`);
      eventTypeCode = field(entry.code, "HIGH", `${entry.label} 기준`);
    }
  }

  // "박재범 [사위] 드림" / "홍길동 올림"
  if (!mourner) {
    const signed = clean.match(
      new RegExp(`(${NAME})\\s*(?:\\[[^\\]]*\\])?\\s*(?:드림|올림|배상)`)
    );
    if (signed) {
      mourner = field(stripHonorific(signed[1]), "HIGH", "부고 발신인 서명");
    }
  }

  if (!mourner) {
    const labeled = clean.match(new RegExp(`상\\s*주\\s*[:：]\\s*(${NAME})`));
    if (labeled) mourner = field(stripHonorific(labeled[1]), "HIGH", "상주 라벨");
  }

  /* 유족 명단 */
  const survivors = parseSurvivors(lines);

  // 상주를 못 찾았으면 유족 명단 첫 사람을 후보로 두되 신뢰도를 낮게 준다
  if (!mourner && survivors.length > 0) {
    const first = survivors[0];
    mourner = field(
      stripHonorific(first.names[0]),
      "LOW",
      `유족 명단의 "${first.role}" 첫 번째 이름 — 확인 필요`
    );
  }

  /* 관계를 아직 못 잡았으면 본문 표현으로 추정 */
  if (!relation) {
    for (const entry of RELATIONS) {
      const hit = entry.keywords.find((k) => clean.includes(k));
      if (hit) {
        relation = field(entry.label, "MEDIUM", `본문의 "${hit}" 표현`);
        eventTypeCode = field(entry.code, "MEDIUM", `"${hit}" 호칭 기준 추정`);
        break;
      }
    }
  }

  /* 빈소 — 라벨이 없으면 헤더 줄에서 찾는다 */
  let venue: ParsedField | null = null;
  const venueByLabel = clean.match(
    /빈\s*소\s*[:：]\s*([^\n,]+?)(?:\s+[특별VIP\d]+\s*호실|\n|$)/
  );
  const venueByHeader = clean.match(
    /^\s*\[?\s*부\s*고\s*\]?\s*([^\n(（]+)/
  );
  const venueByPattern = clean.match(
    /([가-힣A-Za-z0-9 ]*(?:장례식장|장례문화원|추모관|병원))/
  );
  if (venueByLabel) {
    venue = field(venueByLabel[1], "HIGH", "빈소 라벨");
  } else if (venueByHeader && /장례|병원|추모/.test(venueByHeader[1])) {
    venue = field(venueByHeader[1], "MEDIUM", "부고 머리글의 장소 표기");
  } else if (venueByPattern) {
    venue = field(venueByPattern[1], "LOW", "장례식장 명칭 패턴 추정");
  }

  const roomMatch = clean.match(/((?:특|별|VIP)?\s*\d{0,2}\s*호실)/);
  const roomNo = roomMatch ? field(roomMatch[1], "HIGH", "호실 표기") : null;

  /* 발인 */
  const eventAtRaw = clean.match(/발\s*인\s*[:：]?\s*([^\n]+)/);
  const eventAtValue = eventAtRaw ? parseDateTime(eventAtRaw[1]) : null;
  const eventAt = eventAtValue
    ? field(
        eventAtValue,
        /오전|오후|\d{1,2}\s*시/.test(eventAtRaw![1]) ? "HIGH" : "MEDIUM",
        "발인 라벨"
      )
    : null;

  const burialMatch = clean.match(/장\s*지\s*[:：]?\s*([^\n]+)/);
  const burialSite = burialMatch
    ? field(burialMatch[1], "HIGH", "장지 라벨")
    : null;

  /* 모바일 부고장 링크 */
  const urlMatch = clean.match(/https?:\/\/[^\s]+/);
  const noticeUrl = urlMatch ? urlMatch[0] : null;

  /* 마스터 매칭 (F2-C-4) — 상주 표기를 먼저 보고, 없으면 유족 명단 전체를 대조 */
  let matchedEmployee: Employee | null = null;
  let matchedRecipient: ExternalRecipient | null = null;
  let matchedFrom: ParsedNotice["matchedFrom"] = null;
  let matchedRole: string | null = null;

  if (mourner) {
    const e = EMPLOYEES.find((x) => x.name === mourner!.value);
    if (e) {
      matchedEmployee = e;
      matchedFrom = "MOURNER";
    } else {
      const r = EXTERNAL_RECIPIENTS.find((x) => x.name === mourner!.value);
      if (r) {
        matchedRecipient = r;
        matchedFrom = "MOURNER";
      }
    }
  }

  if (!matchedEmployee && !matchedRecipient) {
    outer: for (const group of survivors) {
      for (const name of group.names) {
        const e = EMPLOYEES.find((x) => x.name === name);
        if (e) {
          matchedEmployee = e;
          matchedFrom = "SURVIVOR";
          matchedRole = group.role;
          break outer;
        }
        const r = EXTERNAL_RECIPIENTS.find((x) => x.name === name);
        if (r) {
          matchedRecipient = r;
          matchedFrom = "SURVIVOR";
          matchedRole = group.role;
          break outer;
        }
      }
    }
  }

  /* 장례식장 매칭 — 공백 · 괄호 차이를 무시하고 비교한다 */
  let matchedVenue: FuneralVenue | null = null;
  if (venue) {
    const key = normalize(venue.value);
    matchedVenue =
      FUNERAL_VENUES.find((v) => {
        const target = normalize(v.name);
        return target === key || target.includes(key) || key.includes(target);
      }) ?? null;
  }

  return {
    deceased,
    mourner,
    relation,
    eventTypeCode,
    venue,
    roomNo,
    eventAt,
    burialSite,
    survivors,
    noticeUrl,
    matchedEmployee,
    matchedRecipient,
    matchedFrom,
    matchedRole,
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

/** 실제로 돌아다니는 모바일 부고장 형식 — 발인 · 호실이 링크 안에 있다 */
export const SAMPLE_TEXT_NOTICE = `[부고] 삼성서울병원장례식장(일원동)

이도현님의 장모 故 박효철님께서 별세 하셨기에 아래와 같이 부고를 전해 드립니다.

▶ 이도현 [사위] 드림 ◀

일일이 연락드리지 못함을 부디 혜량해 주시길 바라오며 아래의 모바일 부고장으로 부고를 알려드립니다.

■모바일부고장■
https://example.com/page/funeral/view.php?uri=P189TVRNPSZfbTO3Mg==

아들
전종택
며느리
허정원
딸
전미경, 전미라
사위
김종태, 이도현
손
전희영, 전윤지, 김수민, 김여진, 박정빈, 박성빈`;
