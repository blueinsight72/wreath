import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

/* ── 모바일 웹 우선 셸 ─────────────────────────────── */

export function MobileShell({
  title,
  subtitle,
  back,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  back?: { href: string; label?: string };
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col bg-surface shadow-[0_0_0_1px_var(--color-line)] sm:my-6 sm:min-h-[calc(100dvh-3rem)] sm:rounded-2xl">
      <header className="sticky top-0 z-10 border-b border-line bg-surface/95 px-5 py-4 backdrop-blur sm:rounded-t-2xl">
        {back && (
          <Link
            href={back.href}
            className="mb-2 inline-flex items-center gap-1 text-[13px] text-ink-3 transition hover:text-ink"
          >
            <span aria-hidden>←</span>
            {back.label ?? "뒤로"}
          </Link>
        )}
        <h1 className="text-[19px] font-bold tracking-tight text-ink">{title}</h1>
        {subtitle && (
          <p className="mt-1 text-[13px] leading-relaxed text-ink-2">{subtitle}</p>
        )}
      </header>

      <main className="flex-1 px-5 py-5">{children}</main>

      {footer && (
        <div className="sticky bottom-0 border-t border-line bg-surface/95 px-5 py-4 backdrop-blur sm:rounded-b-2xl">
          {footer}
        </div>
      )}
    </div>
  );
}

/* ── 진행 단계 ─────────────────────────────────────── */

export function StepBar({ current, total }: { current: number; total: number }) {
  return (
    <div className="mb-5 flex items-center gap-2">
      {Array.from({ length: total }, (_, i) => i + 1).map((n) => (
        <div
          key={n}
          className={`h-1 flex-1 rounded-full ${
            n <= current ? "bg-brand" : "bg-line"
          }`}
        />
      ))}
      <span className="ml-1 shrink-0 text-[12px] font-medium tabular-nums text-ink-3">
        {current}/{total}
      </span>
    </div>
  );
}

/* ── 카드 / 섹션 ───────────────────────────────────── */

export function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="mb-7 last:mb-0">
      <h2 className="text-[14px] font-bold text-ink">{title}</h2>
      {description && (
        <p className="mt-1 text-[12.5px] leading-relaxed text-ink-3">{description}</p>
      )}
      <div className="mt-3 space-y-4">{children}</div>
    </section>
  );
}

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-xl border border-line bg-surface-2 p-4 ${className}`}>
      {children}
    </div>
  );
}

/* ── 안내 배너 ─────────────────────────────────────── */

type Tone = "info" | "warn" | "danger" | "ok";

const TONE_STYLE: Record<Tone, string> = {
  info: "border-brand/15 bg-brand-soft text-brand",
  warn: "border-warn/20 bg-warn-soft text-warn",
  danger: "border-danger/20 bg-danger-soft text-danger",
  ok: "border-ok/20 bg-ok-soft text-ok",
};

export function Callout({
  tone = "info",
  title,
  children,
}: {
  tone?: Tone;
  title?: string;
  children: ReactNode;
}) {
  return (
    <div className={`rounded-xl border p-3.5 ${TONE_STYLE[tone]}`}>
      {title && <p className="text-[13px] font-bold">{title}</p>}
      <div className={`text-[12.5px] leading-relaxed ${title ? "mt-1" : ""}`}>
        {children}
      </div>
    </div>
  );
}

export function Badge({
  tone = "info",
  children,
}: {
  tone?: Tone | "neutral";
  children: ReactNode;
}) {
  const style =
    tone === "neutral"
      ? "border-line bg-surface-2 text-ink-2"
      : TONE_STYLE[tone];
  return (
    <span
      className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[11px] font-semibold ${style}`}
    >
      {children}
    </span>
  );
}

/* ── 폼 ────────────────────────────────────────────── */

export function Field({
  label,
  required,
  hint,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: ReactNode;
  error?: string | null;
  children: ReactNode;
}) {
  return (
    <div>
      <label className="field-label">
        {label}
        {required && <span className="ml-0.5 text-danger">*</span>}
      </label>
      {children}
      {error ? (
        <p className="mt-1.5 text-[12px] font-medium text-danger">{error}</p>
      ) : (
        hint && <p className="field-hint">{hint}</p>
      )}
    </div>
  );
}

/* ── 버튼 ──────────────────────────────────────────── */

const BUTTON_BASE =
  "inline-flex w-full items-center justify-center rounded-lg px-4 py-3.5 text-[15px] font-bold transition disabled:cursor-not-allowed disabled:opacity-45";

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ComponentProps<"button"> & { variant?: "primary" | "ghost" }) {
  const style =
    variant === "primary"
      ? "bg-brand text-white hover:bg-brand-2 active:bg-brand-2"
      : "border border-line bg-surface text-ink hover:bg-surface-2";
  return <button className={`${BUTTON_BASE} ${style} ${className}`} {...props} />;
}

export function LinkButton({
  href,
  variant = "primary",
  className = "",
  children,
}: {
  href: string;
  variant?: "primary" | "ghost";
  className?: string;
  children: ReactNode;
}) {
  const style =
    variant === "primary"
      ? "bg-brand text-white hover:bg-brand-2"
      : "border border-line bg-surface text-ink hover:bg-surface-2";
  return (
    <Link href={href} className={`${BUTTON_BASE} ${style} ${className}`}>
      {children}
    </Link>
  );
}
