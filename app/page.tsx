'use client'

import Link from 'next/link'

export default function HomePage() {
  const features = [
    {
      icon: '📝',
      title: '文生图',
      description: '支持多段文字无缝切段，DeepSeek中控翻译，打造规整知识图谱。',
    },
    {
      icon: '🖼',
      title: '批量图生图',
      description: '支持最多10张图片批量导入，一键重塑为50+种大师级美术风格。',
    },
    {
      icon: '💰',
      title: '安全积分到账',
      description: '对接安全聚合支付，新用户注册即送 3 积分福利。',
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
    <div className="h-screen max-h-screen w-screen max-w-[100vw] overflow-hidden flex flex-col justify-between p-6 bg-[#0B0D17] text-white">
      <header className="flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <div className="w-9 h-9 bg-[#10B981] border border-[#202B3A] flex items-center justify-center shadow-[0_0_10px_rgba(16,185,129,0.3)]">
            <span className="text-[#0B0D17] font-bold text-sm">AI</span>
          </div>
          <span className="text-lg font-black tracking-widest bg-gradient-to-r from-[#00F2FE] via-[#94A3B8] to-[#00E676] bg-clip-text text-transparent drop-shadow-[0_0_10px_rgba(0,242,254,0.6)] hover:drop-shadow-[0_0_20px_rgba(0,242,254,0.9)] transition-all duration-300 select-none italic">AI画堂</span>
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
          <div className="space-y-2">
            <h1 className="text-4xl lg:text-6xl font-black tracking-widest leading-none">
              <span className="bg-gradient-to-r from-[#00F2FE] via-[#94A3B8] to-[#00E676] bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(0,242,254,0.6)] italic">AI画堂</span>
            </h1>
            <p className="text-xl lg:text-2xl font-bold text-white tracking-wide">
              自媒体爆款图形设计与智能排版素材工具箱
            </p>
          </div>
          <p className="text-sm lg:text-base text-[#94A3B8] max-w-xl mx-auto leading-relaxed">
            输入文本或参考图，一键批量生成专属高画质知识卡片与手绘板书
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#00E676] text-[#0A0F1D] rounded-lg border border-[#202B3A] text-base font-bold shadow-[0_0_15px_rgba(0,230,118,0.4)] hover:shadow-[0_0_20px_rgba(0,230,118,0.6)] transition-all"
          >
            立即免费开启
            <span className="text-lg text-[#00F2FE]">→</span>
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