'use client'

import Link from 'next/link'

export default function TermsPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#091511]">
      <header className="border-b border-[#142D24]">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
          <Link href="/" className="flex items-center">
            <img src="/logo.png?v=8" alt="AI画堂" className="h-12 w-12 object-contain" />
          </Link>
          <Link
            href="/dashboard"
            className="rounded-lg bg-[#10B981] px-4 py-2 text-sm font-bold text-[#040D0A] transition-all hover:shadow-[0_0_15px_rgba(16,185,129,0.4)]"
          >
            返回创作
          </Link>
        </div>
      </header>

      <main className="mx-auto flex-1 max-w-4xl px-4 py-8">
        <div className="rounded-2xl border border-[#142D24] bg-[#0A1A10] p-6 md:p-8">
          <h1 className="mb-6 text-center text-xl font-bold text-white">AI画堂安全合规与使用须知</h1>

          <p className="mb-6 text-sm leading-relaxed text-gray-300">
            本站为 AI 图像生成与知识图卡制作平台。为了保障平台稳定运行、保护用户账号安全并满足合规要求，
            请在使用前认真阅读以下说明。
          </p>

          <Section
            title="一、禁止生成的内容"
            color="text-red-400"
            items={[
              '色情、低俗、擦边、血腥暴力或其他不适宜公开传播的内容。',
              '违法、仇恨、造谣、煽动、侵犯国家安全或公共安全的内容。',
              '侵犯他人肖像权、隐私权、名誉权，或被用于诈骗、黑灰产导流的内容。',
            ]}
          />

          <Section
            title="二、违规处理说明"
            color="text-yellow-400"
            items={[
              '系统会对提示词、成图结果和批量调用行为进行自动风控检测。',
              '恶意绕过限制、批量测试违规内容或反复触发高风险策略的账号，会被限制功能或永久封禁。',
              '情节严重时，平台将保留向有关部门提交必要注册信息与访问日志的权利。',
            ]}
          />

          <Section
            title="三、积分消耗规则"
            color="text-sky-400"
            items={[
              '1K 默认消耗 2 积分/次，2K 消耗 4 积分/次，4K 消耗 8 积分/次。',
              '多图生成按实际输出张数累计积分消耗。',
              '若因平台异常导致任务失败，系统会按规则自动退回积分。',
            ]}
          />

          <Section
            title="四、体验福利与充值说明"
            color="text-emerald-400"
            items={[
              '新用户首次注册后可获得体验积分，用于熟悉主要创作功能。',
              '赠送积分仅限站内使用，不支持提现、转让或线下兑换。',
              '充值后请在记录页或个人中心核对到账情况，如有异常可联系客服协助处理。',
            ]}
          />

          <Section
            title="五、售后与退款"
            color="text-orange-400"
            items={[
              'AI 算力和图像生成属于即时消耗型数字服务，已消耗部分通常不支持无理由退款。',
              '若发生重复扣费、充值异常或平台故障导致的任务失败，请联系官方客服核查。',
            ]}
          />

          <Section
            title="六、隐私保护"
            color="text-violet-400"
            items={[
              '注册邮箱仅用于身份验证、安全通知与必要的服务沟通。',
              '用户生成内容默认仅供账号本人查看与管理，不会被用于无关商业用途。',
              '用户可以自行删除历史记录，平台会按业务需要保留必要的最小日志信息。',
            ]}
          />
        </div>
      </main>

      <footer className="border-t border-[#142D24] py-4">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <p className="text-xs text-[#10B981]">© 2026 AI画堂</p>
        </div>
      </footer>
    </div>
  )
}

function Section({
  title,
  color,
  items,
}: {
  title: string
  color: string
  items: string[]
}) {
  return (
    <section className="mb-8">
      <h2 className={`mb-4 text-lg font-bold ${color}`}>{title}</h2>
      <ul className="space-y-3 pl-5 text-sm text-gray-300">
        {items.map((item) => (
          <li key={item} className="flex gap-3">
            <span className="mt-0.5 text-[#10B981]">•</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
