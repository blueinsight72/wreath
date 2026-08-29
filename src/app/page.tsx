import Link from "next/link";
import { CURRENT_USER } from "@/lib/mock-data";

type Entry = {
  href: string;
  screen: string;
  title: string;
  desc: string;
  role: string;
  ready: boolean;
};

const ENTRIES: Entry[] = [
  {
    href: "/apply",
    screen: "S1",
    title: "경조사 신청",
    desc: "부고 정보를 입력하면 규정 판정부터 발주까지 자동 실행됩니다.",
    role: "임직원",
    ready: true,
  },
  {
    href: "/approvals",
    screen: "S5",
    title: "승인 요청 처리",
    desc: "사내 규정 초과·예외 건만 모바일에서 판단합니다.",
    role: "승인권자",
    ready: true,
  },
  {
    href: "/proof",
    screen: "S6",
    title: "배송 증빙 등록",
    desc: "로그인 없이 링크 한 번으로 배송 완료를 처리합니다.",
    role: "공급사",
    ready: true,
  },
  {
    href: "/supplier",
    screen: "S7 · S8",
    title: "공급사 발주 어드민",
    desc: "신규 발주 접수, 상태 관리, 온보딩.",
    role: "공급사",
    ready: true,
  },
  {
    href: "/admin",
    screen: "S9 ~ S11",
    title: "총무 대시보드",
    desc: "예외·SLA 모니터링, 수신자 마스터, 장례식장 DB.",
    role: "총무 · 운영",
    ready: true,
  },
];

export default function Home() {
  return (
    <div className="mx-auto w-full max-w-[520px] px-5 py-10">
      <p className="text-[12px] font-bold tracking-[0.14em] text-ink-3">
        ZENO-CND
      </p>
      <h1 className="mt-2 text-[26px] font-bold leading-tight tracking-tight text-ink">
        경조사 화환 발송 관리
      </h1>
      <p className="mt-2 text-[14px] leading-relaxed text-ink-2">
        {CURRENT_USER.company} · {CURRENT_USER.dept} {CURRENT_USER.name}{" "}
        {CURRENT_USER.rank}님으로 로그인되어 있습니다.
      </p>

      <div className="mt-7 space-y-3">
        {ENTRIES.map((entry) =>
          entry.ready ? (
            <Link
              key={entry.href}
              href={entry.href}
              className="block rounded-xl border border-line bg-surface p-4 transition hover:border-brand-2 hover:shadow-sm"
            >
              <EntryBody entry={entry} />
            </Link>
          ) : (
            <div
              key={entry.href}
              className="rounded-xl border border-dashed border-line bg-surface-2 p-4 opacity-70"
            >
              <EntryBody entry={entry} />
            </div>
          )
        )}
      </div>

      <p className="mt-8 text-[12px] leading-relaxed text-ink-3">
        본 화면은 백엔드 연동 전 UI 검수용입니다. 표시되는 임직원·거래처·장례식장
        정보는 모두 목업 데이터입니다.
      </p>
    </div>
  );
}

function EntryBody({ entry }: { entry: Entry }) {
  return (
    <>
      <div className="flex items-center gap-2">
        <span className="rounded-md border border-line bg-surface px-1.5 py-0.5 font-mono text-[11px] font-semibold text-ink-3">
          {entry.screen}
        </span>
        <span className="text-[11.5px] font-semibold text-ink-3">{entry.role}</span>
        {!entry.ready && (
          <span className="ml-auto text-[11.5px] font-semibold text-ink-3">
            준비 중
          </span>
        )}
      </div>
      <p className="mt-2 text-[15.5px] font-bold text-ink">{entry.title}</p>
      <p className="mt-1 text-[12.5px] leading-relaxed text-ink-2">{entry.desc}</p>
    </>
  );
}
