import type { RibbonText } from "@zeno/core/lib/ribbon";

/**
 * 실제 근조화환 리본 배치를 그대로 보여준다 (F4-4).
 * 근조 리본은 세로쓰기 2매 — 오른쪽에 애도 문구, 왼쪽에 발신 명의가 걸린다.
 * 이 미리보기 이미지가 공급사에 텍스트와 함께 이중 전달된다 (F4-6).
 */
export function RibbonPreview({ ribbon }: { ribbon: RibbonText }) {
  return (
    <div className="rounded-xl border border-line bg-[#1b1f26] p-5">
      <div className="flex items-stretch justify-center gap-8">
        <Ribbon text={ribbon.sender} label="왼쪽 · 발신 명의" />
        <Ribbon text={ribbon.phrase} label="오른쪽 · 애도 문구" />
      </div>
      <p className="mt-4 text-center text-[11.5px] leading-relaxed text-white/45">
        실제 리본은 세로쓰기 2매로 제작됩니다. 이 미리보기가 문구 이미지로
        공급사에 함께 전달됩니다.
      </p>
    </div>
  );
}

function Ribbon({ text, label }: { text: string; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="relative flex min-h-[210px] w-[54px] flex-1 justify-center rounded-t-[4px] bg-gradient-to-b from-[#f7f5ef] to-[#e9e5da] px-1 pt-4 pb-6 shadow-[0_2px_10px_rgba(0,0,0,0.35)]">
        <p
          className="text-[14px] font-semibold leading-[1.35] tracking-[0.06em] text-[#1a1a1a]"
          style={{ writingMode: "vertical-rl", textOrientation: "upright" }}
        >
          {text || " "}
        </p>
        {/* 리본 하단 제비꼬리 */}
        <span
          className="absolute -bottom-[1px] left-0 h-4 w-full bg-[#1b1f26]"
          style={{
            clipPath: "polygon(0 100%, 0 0, 50% 60%, 100% 0, 100% 100%)",
          }}
        />
      </div>
      <p className="mt-2.5 text-[11px] text-white/50">{label}</p>
    </div>
  );
}
