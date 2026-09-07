// DB 에 등록된 발주 · 판정 근거 · 차단 로그를 메일로 한 번 보낸다.
//
//   npm run email:registered -- --dry-run     내용만 파일로 확인 (발송 안 함)
//   npm run email:registered                  발송
//   npm run email:registered -- --to a@b.com  수신 주소 지정
//
// 앱 코드와는 무관한 일회성 운영 스크립트다. 앱은 아직 메일을 보내지 않는다.
import { existsSync, writeFileSync } from "node:fs";
import postgres from "postgres";

for (const file of [".env.local", ".env"]) {
  if (existsSync(file)) process.loadEnvFile(file);
}

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const toIdx = args.indexOf("--to");
const to =
  (toIdx >= 0 ? args[toIdx + 1] : undefined) ??
  process.env.EMAIL_TO ??
  "jhchoi@castingn.com";
// 도메인 인증 전에는 onboarding@resend.dev 로만 보낼 수 있고, 수신도 계정 이메일로 제한된다.
const from = process.env.RESEND_FROM ?? "ZENO-CND <onboarding@resend.dev>";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL 이 없습니다. .env.local 을 확인하십시오.");
  process.exit(1);
}
if (!dryRun && !process.env.RESEND_API_KEY) {
  console.error(
    "RESEND_API_KEY 가 없습니다.\n" +
      "  1) https://resend.com/api-keys 에서 키를 만드십시오.\n" +
      '  2) .env.local 에 RESEND_API_KEY=re_... 를 추가하십시오.\n' +
      "  (먼저 --dry-run 으로 내용만 확인할 수 있습니다.)",
  );
  process.exit(1);
}

const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 1, onnotice: () => {} });

const won = (n) => `${Number(n).toLocaleString("ko-KR")}원`;
const ts = (d) => new Date(d).toISOString().slice(0, 16).replace("T", " ");
const esc = (s) =>
  String(s ?? "—").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function rows(pairs) {
  return pairs
    .map(
      ([k, v]) =>
        `<tr><th align="left" style="padding:6px 12px 6px 0;color:#6b7280;font-weight:600;white-space:nowrap">${esc(k)}</th>` +
        `<td style="padding:6px 0;color:#111827">${esc(v)}</td></tr>`,
    )
    .join("");
}

const orders = await sql`
  select o.*, t.name as tenant_name
  from condolence_order o join tenant t on t.id = o.tenant_id
  order by o.created_at`;

const blocked = await sql`
  select b.*, t.name as tenant_name
  from blocked_attempt b join tenant t on t.id = b.tenant_id
  order by b.attempted_at desc`;

const approvals = await sql`select count(*)::int as n from approval_log`;

const orderBlocks = [];
for (const o of orders) {
  const snaps = await sql`select * from policy_decision_snapshot where order_id = ${o.id}`;
  const basis = snaps
    .map((s) => {
      const conds = Object.entries(s.conditions ?? {})
        .map(([k, v]) => `<li>${esc(k)}: ${esc(v)}</li>`)
        .join("");
      return (
        `<div style="margin-top:12px;padding:12px;background:#f9fafb;border-radius:8px">` +
        `<div style="font-weight:700;color:#111827">판정 근거 — ${esc(s.version_label)} · 규칙 ${esc(s.rule_code ?? "미매칭")} · ${esc(s.decision)}</div>` +
        `<ul style="margin:8px 0 0;padding-left:18px;color:#374151">` +
        `<li>상한 산식: ${esc(s.limit_formula)}</li><li>레짐 근거: ${esc(s.regime_basis)}</li>${conds}</ul></div>`
      );
    })
    .join("");

  orderBlocks.push(
    `<div style="margin:16px 0;padding:16px;border:1px solid #e5e7eb;border-radius:12px">` +
      `<div style="font-size:16px;font-weight:700;color:#111827">${esc(o.id)} · ${esc(o.tenant_name)}</div>` +
      `<table style="margin-top:8px;font-size:14px;border-collapse:collapse">${rows([
        ["신청자", o.applicant_name],
        ["대상자", `${o.target_label} (${o.target_org || "—"})`],
        ["경조 유형", o.event_type_label],
        ["수신자 레짐", o.regime],
        ["상품 · 금액", `${o.product_name || "—"} · ${won(o.amount)}`],
        ["계정과목", o.account === "WELFARE" ? "복리후생비" : "접대비"],
        ["사내 상한", o.internal_limit == null ? "규정 외" : won(o.internal_limit)],
        ["법정 상한", o.legal_limit == null ? "해당 없음" : won(o.legal_limit)],
        ["빈소", `${o.venue_name || "미정"} ${o.room_no || ""}`.trim()],
        ["리본", `${o.ribbon_phrase || "—"} / ${o.ribbon_sender || "—"}`],
        ["상태", o.status],
        ["등록 시각", ts(o.created_at)],
      ])}</table>${basis}</div>`,
  );
}

const blockedRows = blocked.length
  ? blocked
      .map(
        (b) =>
          `<tr>${[ts(b.attempted_at), b.tenant_name, b.applicant, b.target_label, b.regime, won(b.attempted), won(b.legal_limit)]
            .map((v) => `<td style="padding:8px;border-top:1px solid #e5e7eb">${esc(v)}</td>`)
            .join("")}</tr>`,
      )
      .join("")
  : `<tr><td colspan="7" style="padding:12px;color:#6b7280">차단된 시도가 없습니다.</td></tr>`;

const html =
  `<div style="font-family:system-ui,-apple-system,'Segoe UI',sans-serif;max-width:720px;margin:0 auto;padding:24px;color:#111827">` +
  `<h1 style="font-size:20px;margin:0">ZENO-CND 등록 내용</h1>` +
  `<p style="color:#6b7280;font-size:13px;margin:4px 0 20px">${ts(new Date())} 기준 · 발주 ${orders.length}건 · 법정 상한 차단 ${blocked.length}건 · 승인 이력 ${approvals[0].n}건</p>` +
  `<h2 style="font-size:16px;margin:24px 0 0">발주</h2>${orderBlocks.join("") || '<p style="color:#6b7280">등록된 발주가 없습니다.</p>'}` +
  `<h2 style="font-size:16px;margin:24px 0 8px">법정 상한 차단 로그</h2>` +
  `<p style="color:#6b7280;font-size:13px;margin:0 0 8px">관리자도 해제할 수 없는 통제가 작동한 기록입니다. 발주는 생성되지 않았습니다.</p>` +
  `<table style="width:100%;border-collapse:collapse;font-size:13px">` +
  `<tr style="background:#f9fafb">${["시각", "고객사", "신청자", "수신자", "레짐", "시도 금액", "법정 상한"]
    .map((h) => `<th align="left" style="padding:8px">${h}</th>`)
    .join("")}</tr>${blockedRows}</table>` +
  `</div>`;

await sql.end();

const subject = `[ZENO-CND] 등록 내용 — 발주 ${orders.length}건 · 차단 ${blocked.length}건`;

if (dryRun) {
  const out = "email-preview.html";
  writeFileSync(out, html, "utf8");
  console.log(`발송하지 않았습니다. 미리보기: ${out}`);
  console.log(`  제목: ${subject}`);
  console.log(`  수신: ${to}`);
  process.exit(0);
}

const res = await fetch("https://api.resend.com/emails", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ from, to: [to], subject, html }),
});

const body = await res.json().catch(() => ({}));
if (!res.ok) {
  console.error(`발송 실패 (HTTP ${res.status})`);
  console.error(JSON.stringify(body, null, 2));
  if (res.status === 403) {
    console.error(
      "\n도메인 인증 전에는 Resend 계정 이메일로만 보낼 수 있습니다.\n" +
        "다른 주소로 보내려면 https://resend.com/domains 에서 도메인을 인증하고\n" +
        "RESEND_FROM 을 그 도메인 주소로 지정하십시오.",
    );
  }
  process.exit(1);
}

console.log(`발송 완료 → ${to}`);
console.log(`  id: ${body.id ?? "—"}`);
