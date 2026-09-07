import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @zeno/core 는 빌드 산출물이 아니라 TypeScript 원본을 그대로 내보낸다.
  // 워크스페이스 패키지를 컴파일 대상에 넣어야 한다.
  transpilePackages: ["@zeno/core"],
};

export default nextConfig;
