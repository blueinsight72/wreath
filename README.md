# ZENO-CND — 경조사 화환 발송 모듈

임직원이 쓰는 신청 앱과, 총무·감사·법무가 쓰는 백오피스 앱을 한 저장소에서
관리합니다. 두 앱은 같은 도메인 계층(`@zeno/core`)을 공유합니다.

## 구조

```
apps/
  web/      @zeno/web    신청(S1~S4) · 승인(S5) · 증빙(S6)          :3000
  admin/    @zeno/admin  대시보드 · 신청 내역 · 수신자 · 장례식장 · 규정 · 통제 리포트  :3001
packages/
  core/     @zeno/core   도메인 · 데이터 접근 · 공용 UI · 테마
scripts/                 운영용 일회성 스크립트 (앱과 무관)
supabase/                스키마 · RLS 정책 (SQL 원본)
```

앱을 나눈 기준은 **사용자 층**입니다. 임직원·승인권자·공급사가 모바일에서
쓰는 화면은 `web`, 사내 운영자가 데스크톱에서 쓰는 화면은 `admin` 입니다.
백오피스는 인증·접근 제어를 따로 얹을 자리라 배포도 분리합니다.

`packages/core` 에는 **양쪽이 쓰거나, 쓸 수 있는 것**만 둡니다.

| 위치 | 내용 |
|---|---|
| `core/src/lib` | 규정 판정 · 리본 문구 · 부고 파서 · 목업 · 리포지토리(Supabase 접근) |
| `core/src/db` | Drizzle 스키마 (서버 전용 · 지금은 도구만 사용) |
| `core/src/components` | `ui.tsx`(셸·버튼·필드) · `TenantSwitcher` · `DataSourceBadge` |
| `core/src/globals.css` | 테마 한 벌 — 두 앱이 각자 `@import` 합니다 |

화면 전용 컴포넌트는 그 앱에 둡니다. 신청 플로우의 `TargetPicker` ·
`VenuePicker` · `ProductList` · `RibbonPreview` 는 `apps/web`, 대시보드의
`VenueRejectionCard` 는 `apps/admin` 에 있습니다.

## 실행

```bash
npm install          # 워크스페이스 전체 (루트에서 한 번)
npm run dev:web      # http://localhost:3000
npm run dev:admin    # http://localhost:3001
```

두 앱은 각자 프로세스라 터미널이 둘 필요합니다. `npm run dev` 는 web 만
띄웁니다.

| 명령 | 용도 |
|---|---|
| `npm run build` | 두 앱 모두 빌드 |
| `npm run lint` | 두 앱 모두 검사 |
| `npm run typecheck` | 두 앱 모두 타입 검사 (core 포함) |

`@zeno/core` 는 빌드 산출물 없이 TypeScript 원본을 그대로 내보냅니다. 그래서
각 앱의 `next.config.ts` 에 `transpilePackages: ["@zeno/core"]` 가 있습니다.
Tailwind 는 실행 디렉터리 아래만 자동으로 훑으므로, 각 앱의 `globals.css` 가
`@source` 로 core 를 스캔 대상에 넣습니다.

## 환경변수는 앱마다 따로입니다

Next 는 **자기 디렉터리의** `.env.local` 만 읽습니다. 루트 파일은 앱에 닿지
않습니다.

| 파일 | 값 | 읽는 쪽 |
|---|---|---|
| `apps/web/.env.local` | `NEXT_PUBLIC_SUPABASE_*` · `NEXT_PUBLIC_ADMIN_URL` | 신청 앱 |
| `apps/admin/.env.local` | `NEXT_PUBLIC_SUPABASE_*` | 백오피스 앱 |
| `.env.local` (루트) | `DATABASE_URL` · `RESEND_API_KEY` | drizzle-kit · `scripts/` |

각 디렉터리의 `.env.example` 을 복사해 채우십시오. `NEXT_PUBLIC_ADMIN_URL` 은
web 홈 화면이 백오피스로 나가는 링크에 씁니다 — 앱이 분리되어 있으므로 앱 안의
라우트가 아니라 절대 URL 입니다. 비워 두면 개발 중에는 `localhost:3001`,
배포본에서는 현재 백오피스 도메인으로 갑니다(`apps/web/src/app/page.tsx`).
커스텀 도메인을 붙이면 이 변수로 덮어쓰십시오.

## 데이터베이스 (Supabase + Drizzle)

두 개의 접근 경로가 있고 역할이 다릅니다.

| | `core/src/lib/supabase.ts` | `core/src/db/index.ts` |
|---|---|---|
| 실행 위치 | 브라우저 | 서버 전용 |
| 자격증명 | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `DATABASE_URL` (DB 비밀번호) |
| 격리 | RLS | 없음 — 코드에서 `tenant_id` 를 직접 걸어야 함 |

`DATABASE_URL` 은 RLS 를 우회하므로 클라이언트 컴포넌트에서 부르면 안 됩니다.
고객사 격리가 코드 책임이 되니, 질의마다 `tenant_id` 조건을 반드시 넣으십시오.

### 설정

Supabase 대시보드 > Connect > ORMs 에서 연결 문자열을 복사해 루트 `.env.local` 에
`DATABASE_URL` 로 넣습니다. 트랜잭션 모드 풀러(6543)를 쓰므로 `prepare: false`
가 필요하며, 이는 `core/src/db/index.ts` 에 이미 들어 있습니다.

### 스키마의 원본은 `supabase/schema.sql` 입니다

`packages/core/src/db/schema.ts` 는 같은 표를 타입으로 옮긴 사본입니다. RLS 정책과
`current_tenant_ids()` 함수는 Drizzle 이 표현하지 못하므로 `schema.sql` 에만
있습니다. 따라서 표를 바꿀 때는

1. `supabase/schema.sql` 을 고치고 SQL Editor 에서 실행한 뒤
2. `packages/core/src/db/schema.ts` 를 같은 내용으로 맞춥니다. (`npm run db:pull` 로 확인)

`npm run db:push` 는 Drizzle 스키마를 DB 에 강제로 맞추므로, `schema.sql` 에만
있는 것들을 지울 수 있습니다. 운영 DB 에는 쓰지 마십시오.

| 명령 | 용도 |
|---|---|
| `npm run db:studio` | 데이터 브라우저 |
| `npm run db:pull` | 실제 DB 스키마를 내려받아 대조 |
| `npm run db:generate` | 마이그레이션 SQL 생성 (DB 연결 불필요) |
| `npm run db:push` | ⚠️ 스크래치 DB 전용 |

## 배포 (Vercel)

### 배포 전에 — 백오피스는 지금 잠겨 있지 않습니다

`admin` 앱에 인증이 없고, DB 의 RLS 도 `schema.sql` 의 프로토타입
정책(`prototype_all` — anon 에게 전부 허용)입니다. 공개 URL 로 나가는 순간
주소를 아는 누구나 발주를 읽고 고치고 지울 수 있습니다.

앱을 분리했으므로 잠글 자리는 분명해졌습니다. 실제 데이터를 넣는다면 배포 전에

1. `admin` 에 인증(Supabase Auth)을 붙이고
2. `supabase/rls-production.sql` 을 실행해 프로토타입 정책을 걷어냅니다.

`rls-production.sql` 을 먼저 실행하면 anon 키로는 아무것도 읽히지 않으므로,
인증을 붙이기 전에 실행하면 화면이 전부 목업으로 되돌아갑니다. 순서가 있습니다.

### 프로젝트를 두 개 만듭니다

한 저장소에서 두 앱이 각각 배포됩니다. Vercel 프로젝트를 두 개 만들고
**Root Directory** 만 다르게 잡습니다.

| 프로젝트 | Root Directory | 도메인 예 |
|---|---|---|
| zeno-cnd-web | `apps/web` | `cnd.example.com` |
| zeno-cnd-admin | `apps/admin` | `cnd-admin.example.com` |

Root Directory 를 지정하면 Vercel 이 워크스페이스를 인식해 루트에서
`npm install` 을 돌리고 해당 앱만 빌드합니다. Build Command 는 기본값
(`next build`) 그대로 둡니다.

### 환경변수

화면이 브라우저에서 Supabase 를 직접 부르므로, 런타임에 필요한 값은 앱마다
두 개(web 은 세 개)뿐입니다.

| 변수 | web | admin | 쓰는 곳 |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | 예 | 예 | 브라우저 — 모든 화면 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 예 | 예 | 브라우저 — 모든 화면 |
| `NEXT_PUBLIC_ADMIN_URL` | 선택 | — | 홈 화면의 백오피스 링크. 없으면 코드의 배포 기본값 |
| `DATABASE_URL` | 아니오 | 아니오 | 로컬 도구(`db:*`) · `scripts/` 전용 |
| `RESEND_API_KEY` | 아니오 | 아니오 | `npm run email:registered` 전용 |

`DATABASE_URL` 은 RLS 를 우회하는 DB 비밀번호입니다. 앱 코드는 이 값을 쓰지
않으므로(`@zeno/core/db` 를 부르는 화면이 없습니다) 배포 환경변수에 넣지
마십시오. 넣더라도 `NEXT_PUBLIC_` 을 붙이면 브라우저 번들에 그대로 실립니다.

### 연결

대시보드에서 GitHub 저장소를 import 하는 방식을 씁니다. 한 번 연결하면
`main` 에 푸시할 때마다 두 프로젝트가 각각 배포됩니다.

1. [vercel.com/new](https://vercel.com/new) → 이 저장소 import
2. Root Directory 를 `apps/web` 으로 지정, Framework 는 Next.js 자동 인식
3. Environment Variables 에 위 표의 web 열을 넣고 Deploy
4. 같은 저장소로 프로젝트를 하나 더 만들어 Root Directory 를 `apps/admin` 으로
5. 커스텀 도메인을 붙였다면 web 프로젝트의 `NEXT_PUBLIC_ADMIN_URL` 에 그 주소를 넣고 재배포

CLI 로 하려면 (`vercel login` 은 브라우저 인증이 필요합니다) 각 앱 디렉터리에서

```bash
cd apps/web && vercel link && vercel --prod
cd ../admin && vercel link && vercel --prod
```

### Supabase 쪽 설정

배포 도메인이 정해지면 Supabase 대시보드 > Authentication > URL Configuration 에
두 도메인을 모두 추가합니다. 지금은 인증이 없어 당장 필요하지 않지만, 로그인을
붙이는 순간 리디렉션이 막힙니다.
