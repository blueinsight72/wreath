"use client";

// 로그인 게이트 — 세션이 없으면 화면 대신 로그인 폼을 보여준다.
//
// 이건 UX 이지 보안 경계가 아니다. 실제 차단은 DB 의 RLS 가 한다. Next 인증
// 가이드가 레이아웃에서 세션을 검사하지 말라고 하는 이유(레이아웃은 네비게이션마다
// 다시 렌더되지 않고 하위 라우트 렌더를 막지도 못한다)도 여기서는 비켜간다 —
// 화면 전부가 클라이언트 컴포넌트라 조건부 렌더가 실제로 마운트를 막고,
// 세션 변화는 onAuthStateChange 구독이 따라오기 때문이다.
//
// Supabase 가 설정되지 않았으면 그냥 통과시킨다. 목업으로 도는 화면에는
// 로그인시킬 대상도, 가릴 데이터도 없다.
//
// 문구는 앱이 넘긴다. web 과 admin 은 쓰는 사람이 다르므로 같은 안내를 쓸 수
// 없다. 공유하는 것은 폼과 세션 처리이지 copy 가 아니다.
import { useState, type FormEvent, type ReactNode } from "react";

import { signIn, useAuth } from "../lib/auth";
import { Button, Callout, Card, Field } from "./ui";

export interface AuthGateCopy {
  title: string;
  subtitle?: ReactNode;
  /** 폼 아래 안내 — 계정 발급처 같은 것 */
  hint?: ReactNode;
}

export function AuthGate({ children, ...copy }: AuthGateCopy & { children: ReactNode }) {
  const auth = useAuth();

  if (auth.status === "UNCONFIGURED" || auth.status === "SIGNED_IN") return <>{children}</>;
  // 저장된 세션을 읽는 찰나에 로그인 폼을 띄우면 매 새로고침마다 깜빡인다.
  if (auth.status === "LOADING") return null;
  return <SignInScreen {...copy} />;
}

function SignInScreen({ title, subtitle, hint }: AuthGateCopy) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    // 성공하면 onAuthStateChange 가 게이트를 열어 이 화면을 걷어낸다.
    const result = await signIn(email.trim(), password);
    if (!result.ok) {
      setError(result.error);
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center px-5 py-12">
      <div className="w-full max-w-[360px]">
        <h1 className="text-[19px] font-bold text-ink">{title}</h1>
        {subtitle && (
          <p className="mt-1.5 text-[13px] leading-relaxed text-ink-3">{subtitle}</p>
        )}

        <Card className="mt-5">
          <form onSubmit={submit} className="flex flex-col gap-3.5">
            <Field label="이메일" required>
              <input
                className="control"
                type="email"
                value={email}
                autoComplete="username"
                required
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field>
            <Field label="비밀번호" required>
              <input
                className="control"
                type="password"
                value={password}
                autoComplete="current-password"
                required
                onChange={(e) => setPassword(e.target.value)}
              />
            </Field>
            {error && <Callout tone="danger">{error}</Callout>}
            <Button type="submit" disabled={busy}>
              {busy ? "확인 중…" : "로그인"}
            </Button>
          </form>
        </Card>

        {hint && <p className="mt-4 text-[12px] leading-relaxed text-ink-3">{hint}</p>}
      </div>
    </div>
  );
}
