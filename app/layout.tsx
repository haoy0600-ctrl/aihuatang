import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'AI画堂 - 自媒体高质感图形设计与智能排版素材工具箱',
  description: '专为自媒体创作者打造的高清卡片渲染、一键智能排版与设计素材无损导出工具。',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
      <body className={inter.className}>{children}</body>
    </html>
  )
}