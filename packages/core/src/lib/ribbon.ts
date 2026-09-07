// 리본 문구 생성 및 검증 — PRD F4.
// 공급사에는 텍스트와 이미지를 이중 전달하므로(F4-6), 화면 미리보기가 곧 발주 원본이다.
import {
  FORBIDDEN_TERMS,
  RIBBON_MAX_LENGTH,
  RIBBON_PHRASES,
} from "./mock-data";
import { dataOf, findSenderCompany } from "./tenant-data";
import type { RequestDraft, RibbonIssue, SenderType } from "./types";

export interface RibbonText {
  /** 오른쪽 리본 — 애도 문구 */
  phrase: string;
  /** 왼쪽 리본 — 발신 명의 */
  sender: string;
}

/** 발신 명의 문자열 생성 (F4-1, F4-3) */
export function buildSenderLine(
  tenantId: string,
  senderType: SenderType,
  senderCompanyId: string,
  attending: boolean
): string {
  const company = findSenderCompany(tenantId, senderCompanyId);
  const me = dataOf(tenantId).currentUser;

  switch (senderType) {
    case "COMPANY":
      return company.name;
    case "CEO":
      return `${company.name} 대표이사 ${company.ceoName}`;
    case "DEPT":
      return `${company.name} ${me.dept}`;
    case "PERSONAL":
      // 조문에 직접 참석하는 경우 직함까지 밝히는 것이 관례
      return attending
        ? `${company.name} ${me.dept} ${me.rank} ${me.name}`
        : `${company.name} ${me.name}`;
  }
}

/** 기본 애도 문구 */
export function defaultPhrase(draft: RequestDraft): string {
  return RIBBON_PHRASES[draft.phraseReligion][0];
}

/** 선택 가능한 애도 문구 목록 */
export function phraseOptions(draft: RequestDraft): string[] {
  return RIBBON_PHRASES[draft.phraseReligion];
}

export function buildRibbon(draft: RequestDraft, tenantId: string): RibbonText {
  return {
    phrase: draft.phraseOverride.trim() || defaultPhrase(draft),
    sender: buildSenderLine(
      tenantId,
      draft.senderType,
      draft.senderCompanyId,
      draft.attending
    ),
  };
}

/** 문구 검증 (F4-5) */
export function validateRibbon(ribbon: RibbonText): RibbonIssue[] {
  const issues: RibbonIssue[] = [];

  const hit = FORBIDDEN_TERMS.find((term) => ribbon.phrase.includes(term));
  if (hit) {
    issues.push({
      code: "FORBIDDEN",
      message: `근조 리본에 축하 표현("${hit}")이 포함되어 있습니다. 발주 전에 반드시 수정하십시오.`,
      tone: "danger",
    });
  }

  if (!ribbon.phrase.trim()) {
    issues.push({
      code: "EMPTY",
      message: "애도 문구가 비어 있습니다.",
      tone: "danger",
    });
  }

  if (ribbon.phrase.length > RIBBON_MAX_LENGTH) {
    issues.push({
      code: "TOO_LONG",
      message: `애도 문구가 ${ribbon.phrase.length}자입니다. 리본 1매 권장 ${RIBBON_MAX_LENGTH}자를 넘으면 글자가 작아지거나 잘릴 수 있습니다.`,
      tone: "warn",
    });
  }

  if (ribbon.sender.length > RIBBON_MAX_LENGTH) {
    issues.push({
      code: "SENDER_TOO_LONG",
      message: `발신 명의가 ${ribbon.sender.length}자입니다. 권장 ${RIBBON_MAX_LENGTH}자를 넘습니다.`,
      tone: "warn",
    });
  }

  return issues;
}

/** 소속 법인과 발신 명의 법인이 다른지 (그룹사에서 예민한 지점) */
export function isCrossCompany(tenantId: string, senderCompanyId: string): boolean {
  return (
    findSenderCompany(tenantId, senderCompanyId).name !==
    dataOf(tenantId).currentUser.company
  );
}
