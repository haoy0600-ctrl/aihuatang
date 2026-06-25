import type { Metadata, Viewport } from 'next'
import { Inter, Ma_Shan_Zheng } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })
const maShanZheng = Ma_Shan_Zheng({ 
  subsets: ['latin'],
  weight: '400',
  variable: '--font-art',
})

export const metadata: Metadata = {
  title: 'AI画堂 - 自媒体高质感图形设计与智能排版素材工具箱',
  description: '专为自媒体创作者打造的高清卡片渲染、一键智能排版与设计素材无损导出工具。',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN" className={maShanZheng.variable}>
      <body className={inter.className}>{children}</body>
    </html>
  )
}