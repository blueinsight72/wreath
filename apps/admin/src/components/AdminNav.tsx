"use client";

// 백오피스 탭. 앱이 분리되면서 /admin 접두사가 사라지고 화면이 루트로 올라왔다.
import Link from "next/link";
import { usePathname } from "next/navigation";

import { signOut, useAuth } from "@zeno/core/lib/auth";

const TABS = [
  { href: "/", label: "대시보드", screen: "S9" },
  // 접수된 신청을 그대로 펼쳐 놓는 자리. PRD 에 화면 번호가 없어 비워 둔다.
  { href: "/orders", label: "신청 내역", screen: null },
  { href: "/recipients", label: "수신자 마스터", screen: "S10" },
  { href: "/venues", label: "장례식장 DB", screen: "S11" },
  { href: "/policies", label: "규정 관리", screen: "S12" },
  { href: "/control", label: "통제 리포트", screen: "S13" },
] as const;

export function AdminNav() {
  const pathname = usePathname();
  const auth = useAuth();

  return (
    <nav className="border-b border-line bg-surface">
      <div className="mx-auto flex max-w-[980px] gap-1 overflow-x-auto px-5 sm:px-8">
        {TABS.map((tab) => {
          const active = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`shrink-0 border-b-2 px-3 py-3.5 text-[13.5px] font-semibold transition ${
                active
                  ? "border-brand text-brand"
                  : "border-transparent text-ink-3 hover:text-ink"
              }`}
            >
              {tab.screen && (
                <span className="mr-1.5 font-mono text-[11px] opacity-60">
                  {tab.screen}
                </span>
              )}
              {tab.label}
            </Link>
          );
        })}

        {auth.status === "SIGNED_IN" && (
          <div className="ml-auto flex shrink-0 items-center gap-2.5 self-center">
            <span className="hidden text-[12px] text-ink-3 sm:inline">{auth.email}</span>
            <button
              type="button"
              onClick={() => void signOut()}
              className="rounded-md border border-line px-2.5 py-1 text-[12px] font-semibold text-ink-3 transition hover:text-ink"
            >
              로그아웃
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
