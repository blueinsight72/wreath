// drizzle-kit 설정 — 스키마 비교(introspect · push · generate) 용도.
//
// next dev 와 달리 drizzle-kit CLI 는 .env.local 을 자동으로 읽지 않으므로
// 직접 읽어 넣는다. (Node 20.12+ 내장 기능, 의존성 없음)
import { existsSync } from "node:fs";

import { defineConfig } from "drizzle-kit";

for (const file of [".env.local", ".env"]) {
  if (existsSync(file)) process.loadEnvFile(file);
}

// generate 는 스키마 파일만 읽으므로 연결 정보가 없어도 된다.
// push · pull · migrate · studio 는 DB 에 붙으므로 여기서 미리 막는다.
const needsDb = process.argv.some((a) =>
  ["push", "pull", "migrate", "studio", "check", "up"].includes(a),
);

const url = process.env.DATABASE_URL;
if (!url && needsDb) {
  throw new Error(
    "DATABASE_URL 이 없습니다. .env.local 에 Supabase 연결 문자열을 넣으십시오 " +
      "(.env.example 참고).",
  );
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: { url: url ?? "" },
  // auth · storage 등 Supabase 내부 스키마는 건드리지 않는다.
  schemaFilter: ["public"],
  verbose: true,
  strict: true,
});
