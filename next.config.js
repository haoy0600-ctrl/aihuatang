/** @type {import('next').NextConfig} */
const nextConfig = {
  // 1. 核心修复：开启独立生产包打包模式，强制将运行依赖打包进 .next/standalone
  output: 'standalone', 

  // 2. 保留你原有的 Supabase 远程图片白名单配置
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
    ],
  },
}

// 采用更符合主流且安全的兼容导出方式
export default nextConfig