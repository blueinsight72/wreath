This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## 데이터베이스 (Supabase + Drizzle)

두 개의 접근 경로가 있고 역할이 다릅니다.

| | `src/lib/supabase.ts` | `src/db/index.ts` |
|---|---|---|
| 실행 위치 | 브라우저 | 서버 전용 |
| 자격증명 | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `DATABASE_URL` (DB 비밀번호) |
| 격리 | RLS | 없음 — 코드에서 `tenant_id` 를 직접 걸어야 함 |

`DATABASE_URL` 은 RLS 를 우회하므로 클라이언트 컴포넌트에서 부르면 안 됩니다.
고객사 격리가 코드 책임이 되니, 질의마다 `tenant_id` 조건을 반드시 넣으십시오.

### 설정

Supabase 대시보드 > Connect > ORMs 에서 연결 문자열을 복사해 `.env.local` 에
`DATABASE_URL` 로 넣습니다. 트랜잭션 모드 풀러(6543)를 쓰므로 `prepare: false`
가 필요하며, 이는 `src/db/index.ts` 에 이미 들어 있습니다.

### 스키마의 원본은 `supabase/schema.sql` 입니다

`src/db/schema.ts` 는 같은 표를 타입으로 옮긴 사본입니다. RLS 정책과
`current_tenant_ids()` 함수는 Drizzle 이 표현하지 못하므로 `schema.sql` 에만
있습니다. 따라서 표를 바꿀 때는

1. `supabase/schema.sql` 을 고치고 SQL Editor 에서 실행한 뒤
2. `src/db/schema.ts` 를 같은 내용으로 맞춥니다. (`npm run db:pull` 로 확인)

`npm run db:push` 는 Drizzle 스키마를 DB 에 강제로 맞추므로, `schema.sql` 에만
있는 것들을 지울 수 있습니다. 운영 DB 에는 쓰지 마십시오.

| 명령 | 용도 |
|---|---|
| `npm run db:studio` | 데이터 브라우저 |
| `npm run db:pull` | 실제 DB 스키마를 내려받아 대조 |
| `npm run db:generate` | 마이그레이션 SQL 생성 (DB 연결 불필요) |
| `npm run db:push` | ⚠️ 스크래치 DB 전용 |
