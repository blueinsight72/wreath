/** 5자리 이상 금액을 "15만원" 형태로, 그 외는 원 단위로 */
export function formatKRW(won: number) {
  return `${won.toLocaleString("ko-KR")}원`;
}

export function formatManwon(won: number) {
  if (won % 10000 === 0) return `${(won / 10000).toLocaleString("ko-KR")}만원`;
  return formatKRW(won);
}

/** "2026-08-30T19:00" → "8월 30일(일) 오후 7:00" */
export function formatDateTime(value: string) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  const days = ["일", "월", "화", "수", "목", "금", "토"];
  const hour = d.getHours();
  const meridiem = hour < 12 ? "오전" : "오후";
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${d.getMonth() + 1}월 ${d.getDate()}일(${days[d.getDay()]}) ${meridiem} ${h12}:${min}`;
}
