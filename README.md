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

## 배포 (Vercel)

### 배포 전에 — 이 앱은 지금 잠겨 있지 않습니다

관리자 화면(`/admin/*`)에 인증이 없고, DB 의 RLS 도 `schema.sql` 의 프로토타입
정책(`prototype_all` — anon 에게 전부 허용)입니다. 공개 URL 로 나가는 순간
주소를 아는 누구나 발주를 읽고 고치고 지울 수 있습니다.

사내망 · 시연용이 아니라 실제 데이터를 넣는다면 배포 전에

1. Supabase Auth 를 붙이고
2. `supabase/rls-production.sql` 을 실행해 프로토타입 정책을 걷어냅니다.

`rls-production.sql` 을 먼저 실행하면 anon 키로는 아무것도 읽히지 않으므로,
인증을 붙이기 전에 실행하면 화면이 전부 목업으로 되돌아갑니다. 순서가 있습니다.

### 환경변수

화면이 브라우저에서 Supabase 를 직접 부르므로, 런타임에 필요한 값은 두 개뿐입니다.

| 변수 | 배포에 넣는가 | 쓰는 곳 |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | 예 | 브라우저 — 모든 화면 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 예 | 브라우저 — 모든 화면 |
| `DATABASE_URL` | 아니오 | 로컬 도구(`db:*`)와 운영 스크립트 전용 |
| `RESEND_API_KEY` | 아니오 | `npm run email:registered` 전용 |

`DATABASE_URL` 은 RLS 를 우회하는 DB 비밀번호입니다. 앱 코드는 이 값을 쓰지
않으므로(`src/db` 를 부르는 화면이 없습니다) 배포 환경변수에 넣지 마십시오.
넣더라도 `NEXT_PUBLIC_` 을 붙이면 브라우저 번들에 그대로 실립니다.

### 연결

Vercel 대시보드에서 GitHub 저장소를 import 하는 방식을 씁니다. 한 번 연결하면
`main` 에 푸시할 때마다 배포됩니다.

1. [vercel.com/new](https://vercel.com/new) → 이 저장소 import
2. Framework 는 Next.js 로 자동 인식됩니다. 빌드 설정은 기본값 그대로 둡니다.
3. Environment Variables 에 위 표의 `NEXT_PUBLIC_*` 두 개를 넣습니다.
4. Deploy.

CLI 로 하려면 (`vercel login` 은 브라우저 인증이 필요합니다)

```bash
npm i -g vercel@latest
vercel login
vercel link
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
vercel --prod
```

### Supabase 쪽 설정

배포 도메인이 정해지면 Supabase 대시보드 > Authentication > URL Configuration 에
그 도메인을 추가합니다. 지금은 인증이 없어 당장 필요하지 않지만, 로그인을 붙이는
순간 리디렉션이 막힙니다.
