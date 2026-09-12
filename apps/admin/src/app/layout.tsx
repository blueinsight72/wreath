import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthGate } from "@zeno/core/components/AuthGate";
import { AdminNav } from "@/components/AdminNav";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// 탭 제목과 로그인 화면 제목이 갈라지지 않도록 한 곳에 둔다.
const APP_TITLE = "ZENO 경조사 운영 백오피스";

export const metadata: Metadata = {
  title: APP_TITLE,
  description: "총무 · 감사 · 법무가 쓰는 규정 · 발주 · 통제 기록 관리 화면",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/* 로그인 게이트 — 세션이 없으면 탭까지 통째로 로그인 폼으로 바뀐다 */}
        <AuthGate
          title={APP_TITLE}
          subtitle="총무 · 감사 · 법무가 쓰는 화면입니다. 소속 고객사의 자료만 보입니다."
          hint={
            <>
              계정은 Supabase 대시보드 &gt; Authentication 에서 발급합니다. 발급 후
              tenant_member 에 소속 고객사를 넣어야 자료가 보입니다.
            </>
          }
        >
          <div className="min-h-dvh">
            <AdminNav />
            {children}
          </div>
        </AuthGate>
      </body>
    </html>
  );
}
