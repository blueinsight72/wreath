"use client";

import { useRef, useState } from "react";
import { Badge, Button, Callout, Card, MobileShell } from "@/components/ui";
import { formatDateTime, formatKRW } from "@/lib/format";
import { findOrder } from "@/lib/ops-data";

/**
 * S6 배송 증빙 등록 — 공급사용 로그인 없는 원탭 웹뷰 (F7).
 * 알림톡 링크로 진입한다. 1차 완료 처리는 사진 없이 1탭이 기본 경로다.
 */
const ORDER = findOrder("ZC-2608-0414")!;

export default function ProofPage() {
  const [done, setDone] = useState(false);
  const [photoName, setPhotoName] = useState<string | null>(null);
  const [venueIssue, setVenueIssue] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // 거래처 대상 · 고액 · 클레임 이력 건만 사진 필수 (F7-2)
  const photoRequired = ORDER.proofRequired;
  const canComplete = !photoRequired || photoName !== null;

  if (done) {
    return (
      <MobileShell title="처리 완료" subtitle={`발주번호 ${ORDER.id}`}>
        <Callout tone="ok" title="배송 완료로 처리되었습니다">
          신청자와 총무팀에 결과가 자동 통보되었습니다. 이 링크는 더 이상
          사용되지 않습니다.
        </Callout>

        <Card className="mt-5 divide-y divide-line-2 p-0">
          <Row label="완료 처리" value="2026-08-28 20:12" />
          <Row
            label="사진 증빙"
            value={photoName ? `등록됨 · ${photoName}` : "미등록"}
          />
          <Row
            label="반입 이슈"
            value={venueIssue ? "있었음으로 보고됨" : "없음"}
          />
        </Card>

        {photoName ? (
          <Callout tone="info" title="익월 정산 대상입니다">
            증빙이 등록된 건은 익월 정산에 포함됩니다. 등록률 상위 공급사는
            정산주기가 2주로 단축되고 배정 가중치가 올라갑니다.
          </Callout>
        ) : (
          <Callout tone="warn" title="증빙 미등록 건입니다">
            대금은 정상 지급되지만 차차월 정산으로 이월됩니다. 지금이라도 사진을
            보내주시면 익월 정산으로 앞당겨집니다.
          </Callout>
        )}
      </MobileShell>
    );
  }

  return (
    <MobileShell
      title="배송 완료 처리"
      subtitle={`발주번호 ${ORDER.id} · 링크 유효시간 24시간`}
      footer={
        <div className="space-y-2">
          <Button disabled={!canComplete} onClick={() => setDone(true)}>
            {canComplete
              ? "배송 완료 처리"
              : "사진을 등록해야 완료 처리할 수 있습니다"}
          </Button>
          <p className="text-center text-[12px] text-ink-3">
            로그인 없이 이 화면에서 끝납니다.
          </p>
        </div>
      }
    >
      <Card className="divide-y divide-line-2 p-0">
        <Row
          label="수령지"
          value={`${ORDER.venueName} ${ORDER.roomNo}`}
        />
        <Row label="상품" value={`${ORDER.productName} · ${formatKRW(ORDER.amount)}`} />
        <Row label="리본 문구" value={ORDER.ribbonPhrase} />
        <Row label="발신 명의" value={ORDER.ribbonSender} />
        <Row
          label="도착 희망"
          value={`${formatDateTime(ORDER.visitAt)} 이전`}
        />
      </Card>

      <div className="mt-6">
        <div className="flex items-center gap-2">
          <p className="text-[14px] font-bold text-ink">사진 증빙</p>
          {photoRequired ? (
            <Badge tone="warn">필수</Badge>
          ) : (
            <Badge tone="neutral">선택</Badge>
          )}
        </div>
        <p className="mt-1 text-[12.5px] leading-relaxed text-ink-2">
          {photoRequired
            ? "거래처 대상 건이라 사진 증빙이 필요합니다. 버튼을 누르면 카메라가 바로 열립니다."
            : "임직원 대상 소액 건은 사진 없이 완료 처리하셔도 됩니다."}
        </p>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) setPhotoName(file.name);
          }}
        />

        {photoName ? (
          <div className="mt-3 flex items-center gap-3 rounded-lg border border-ok/20 bg-ok-soft p-3.5">
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] font-semibold text-ok">
                사진이 등록되었습니다
              </span>
              <span className="mt-0.5 block truncate text-[12px] text-ok/80">
                {photoName}
              </span>
            </span>
            <button
              type="button"
              onClick={() => {
                setPhotoName(null);
                if (fileRef.current) fileRef.current.value = "";
              }}
              className="shrink-0 text-[12.5px] font-semibold text-ok underline underline-offset-2"
            >
              다시 촬영
            </button>
          </div>
        ) : (
          <Button
            variant="ghost"
            className="mt-3"
            onClick={() => fileRef.current?.click()}
          >
            카메라로 촬영하기
          </Button>
        )}
      </div>

      <div className="mt-6">
        <label className="flex items-start gap-2.5 rounded-lg border border-line bg-surface-2 p-3.5">
          <input
            type="checkbox"
            className="mt-0.5 size-4 accent-[var(--color-brand)]"
            checked={venueIssue}
            onChange={(e) => setVenueIssue(e.target.checked)}
          />
          <span>
            <span className="block text-[14px] font-semibold text-ink">
              반입 이슈가 있었습니다
            </span>
            <span className="mt-0.5 block text-[12px] leading-relaxed text-ink-2">
              반입 거부 · 반입료 요구 · 시간 제한 등. 같은 장소에서 3건 이상
              보고되면 장례식장 정보에 반영됩니다.
            </span>
          </span>
        </label>
      </div>

      <p className="mt-6 text-[11.5px] leading-relaxed text-ink-3">
        촬영 시각과 원본 파일만 저장되며 위치정보는 수집하지 않습니다. 이 링크는
        이 발주 건에만 사용되는 1회용이며 24시간 후 만료됩니다.
      </p>
    </MobileShell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3 px-4 py-3">
      <span className="w-[72px] shrink-0 text-[12.5px] font-semibold text-ink-3">
        {label}
      </span>
      <span className="min-w-0 flex-1 text-[13px] leading-relaxed text-ink">
        {value}
      </span>
    </div>
  );
}
