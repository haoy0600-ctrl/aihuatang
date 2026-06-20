'use client'

import Link from 'next/link'

export default function HomePage() {
  const features = [
    {
      icon: '📝',
      title: 'AI图片生成',
      description: '支持 image-2 和 NanoBanana2 两大模型，输入文本自动生成精美竖版知识卡片，多种比例与画质可选。',
    },
    {
      icon: '🖼',
      title: '批量图生图',
      description: '支持最多10张图片批量导入，一键重塑为50+种大师级美术风格。',
    },
    {
      icon: '💰',
      title: '安全积分到账',
      description: '对接安全聚合支付，QQ邮箱注册即送6积分，免费测试3张图。',
    },
  ]

  const steps = [
    {
      step: '01',
      title: '输入内容',
      description: '输入文本描述或上传参考图片',
    },
    {
      step: '02',
      title: '选择风格',
      description: '从50+种美术风格中选择心仪样式',
    },
    {
      step: '03',
      title: '生成下载',
      description: '一键生成高画质知识卡片并下载',
    },
  ]

  return (
    <div className="h-screen max-h-screen w-screen max-w-[100vw] overflow-hidden flex flex-col justify-between p-6 bg-[#040D0A] text-white">
      <header className="flex items-center justify-between">
        <Link href="/" className="flex items-center h-14 sm:h-16 select-none hover:opacity-80 transition-opacity">
          <img src="/logo.png?v=3" alt="AI画堂" className="h-full w-auto object-contain" />
        </Link>

        <nav className="flex items-center gap-4">
          <Link
            href="/dashboard"
            className="px-4 py-2 bg-[#10B981] text-[#0B0D17] rounded-none border border-[#202B3A] text-sm font-bold shadow-[0_0_10px_rgba(16,185,129,0.3)] hover:shadow-[0_0_15px_rgba(16,185,129,0.5)] transition-all"
          >
            创作
          </Link>
          <Link
            href="/records"
            className="px-4 py-2 bg-[#141923] text-white rounded-none border border-[#202B3A] text-sm font-bold hover:bg-[#1a2230] hover:border-[#00F2FE] transition-all"
          >
            记录
          </Link>
          <Link
            href="/recharge"
            className="px-4 py-2 bg-[#141923] text-white rounded-none border border-[#202B3A] text-sm font-bold hover:bg-[#1a2230] hover:border-[#00F2FE] transition-all"
          >
            充值
          </Link>
        </nav>

        <Link
          href="/dashboard"
          className="px-4 py-2 bg-[#10B981] text-[#0B0D17] rounded-none border border-[#202B3A] text-sm font-bold shadow-[0_0_15px_rgba(16,185,129,0.4)] hover:shadow-[0_0_20px_rgba(16,185,129,0.6)] transition-all"
        >
          开始创作
        </Link>
      </header>

      <main className="flex-1 flex flex-col justify-center items-center">
        <div className="max-w-4xl mx-auto text-center space-y-4">
          <div className="w-full flex justify-center items-center px-4 py-6 bg-transparent overflow-visible">
            <h1 className="text-base sm:text-xl md:text-3xl lg:text-5xl font-black tracking-wider whitespace-nowrap text-center bg-gradient-to-r from-[#03F09C] via-[#00F2FE] via-[#FF007A] to-[#03F09C] bg-[length:200%_auto] bg-clip-text text-transparent animate-[superShimmer_3s_linear_infinite] drop-shadow-[0_0_20px_rgba(3,240,156,0.35)] font-sans select-none" style={{ WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              自媒体爆款图形设计与智能排版素材工具箱
            </h1>
            <style>{`
              @keyframes superShimmer {
                0% { background-position: 0% center; }
                100% { background-position: 200% center; }
              }
            `}</style>
          </div>
          <p className="text-sm lg:text-base text-[#94A3B8] max-w-xl mx-auto leading-relaxed">
            输入文本或参考图，一键批量生成专属高画质知识卡片与手绘板书
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#00E676] text-[#0A0F1D] rounded-none border border-[#202B3A] text-base font-bold shadow-[0_0_15px_rgba(0,230,118,0.4)] hover:shadow-[0_0_20px_rgba(0,230,118,0.6)] transition-all"
          >
            立即免费开启
            <span className="text-lg text-[#0A0F1D]">→</span>
          </Link>
        </div>

        <div className="max-w-6xl mx-auto w-full mt-6">
          <div className="text-center mb-3">
            <h2 className="text-lg font-bold text-white">核心功能</h2>
            <p className="text-xs text-[#00F2FE]">高效创作，一键生成</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {features.map((feature, index) => (
              <div
                key={index}
                className="bg-[#141923] rounded-lg border border-[#202B3A] p-4 hover:border-[#00F2FE] hover:shadow-[0_0_15px_rgba(0,242,254,0.2)] transition-all"
              >
                <div className="text-3xl mb-2">{feature.icon}</div>
                <h3 className="text-sm font-bold text-white mb-1">{feature.title}</h3>
                <p className="text-xs text-[#00F2FE] leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="max-w-4xl mx-auto w-full mt-4">
          <div className="text-center mb-3">
            <h2 className="text-lg font-bold text-white">创作流程</h2>
            <p className="text-xs text-[#00F2FE]">简单三步，轻松上手</p>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {steps.map((step, index) => (
              <div key={index} className="text-center">
                <div className="inline-flex items-center justify-center w-10 h-10 bg-[#10B981] text-[#0B0D17] rounded-lg text-xs font-bold mb-2 border border-[#202B3A] shadow-[0_0_10px_rgba(16,185,129,0.3)]">
                  {step.step}
                </div>
                <h3 className="text-sm font-bold text-white mb-0.5">{step.title}</h3>
                <p className="text-xs text-[#00F2FE]">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </main>

      <footer className="text-center">
        <p className="text-xs text-[#00F2FE]">© 2026 AI画堂 · 让知识绽放艺术之美</p>
      </footer>
    </div>
  )
}