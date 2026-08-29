import type { DataSource } from "@/lib/supabase";
import { Badge } from "./ui";

/** 지금 보고 있는 데이터가 실제 DB 인지 목업인지 화면에서 바로 구분되게 한다 */
export function DataSourceBadge({ source }: { source: DataSource }) {
  return source === "SUPABASE" ? (
    <Badge tone="ok">Supabase 연결됨</Badge>
  ) : (
    <Badge tone="warn">목업 데이터 · Supabase 미연결</Badge>
  );
}
