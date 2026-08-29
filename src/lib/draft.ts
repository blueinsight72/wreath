"use client";

// 백엔드 없이 화면 간 신청 초안을 넘기기 위한 임시 저장소.
// 실제 구현에서는 서버 세션 / API 로 대체된다.
import { useMemo, useSyncExternalStore } from "react";
import { EMPTY_DRAFT, type RequestDraft } from "./types";

const KEY = "zeno-cnd-draft";

export function saveDraft(draft: RequestDraft) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(KEY, JSON.stringify(draft));
}

export function clearDraft() {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(KEY);
}

function parse(raw: string | null): RequestDraft | null {
  if (!raw) return null;
  try {
    return { ...EMPTY_DRAFT, ...(JSON.parse(raw) as Partial<RequestDraft>) };
  } catch {
    return null;
  }
}

const subscribe = () => () => {};
const getSnapshot = () => window.sessionStorage.getItem(KEY);
const getServerSnapshot = () => null;

/** 서버 렌더 시에는 null, 하이드레이션 이후 실제 저장값을 돌려준다. */
export function useDraft(): RequestDraft | null {
  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return useMemo(() => parse(raw), [raw]);
}
