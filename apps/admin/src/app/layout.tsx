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

export const metadata: Metadata = {
  title: "ZENO 경조사 운영 백오피스",
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
        <AuthGate>
          <div className="min-h-dvh">
            <AdminNav />
            {children}
          </div>
        </AuthGate>
      </body>
    </html>
  );
}
