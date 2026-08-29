"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/admin", label: "대시보드", screen: "S9" },
  { href: "/admin/recipients", label: "수신자 마스터", screen: "S10" },
  { href: "/admin/venues", label: "장례식장 DB", screen: "S11" },
];

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  const pathname = usePathname();

  return (
    <div className="min-h-dvh">
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
                <span className="mr-1.5 font-mono text-[11px] opacity-60">
                  {tab.screen}
                </span>
                {tab.label}
              </Link>
            );
          })}
        </div>
      </nav>
      {children}
    </div>
  );
}
