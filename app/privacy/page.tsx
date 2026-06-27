'use client'

import Link from 'next/link'

export default function PrivacyPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#091511]">
      <header className="border-b border-[#142D24]">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
          <Link href="/" className="flex items-center">
            <img src="/logo.png?v=8" alt="AI画堂" className="h-12 w-12 object-contain" />
          </Link>
          <Link
            href="/login"
            className="rounded-lg bg-[#10B981] px-4 py-2 text-sm font-bold text-[#040D0A] transition-all hover:shadow-[0_0_15px_rgba(16,185,129,0.4)]"
          >
            返回登录
          </Link>
        </div>
      </header>

      <main className="mx-auto flex-1 max-w-4xl px-4 py-8">
        <div className="rounded-2xl border border-[#142D24] bg-[#0A1A10] p-6 md:p-8">
          <h1 className="mb-6 text-center text-xl font-bold text-white">AI画堂隐私政策</h1>

          <Section
            title="我们会收集哪些信息"
            items={[
              '注册邮箱、用户名、登录所需的身份信息。',
              '账户积分、充值记录、生成记录、使用偏好等业务数据。',
              '为保障安全所必需的访问日志、设备信息和错误日志。',
            ]}
          />

          <Section
            title="这些信息将如何使用"
            items={[
              '用于完成登录认证、账户找回、充值对账和任务执行。',
              '用于提供生成记录查询、风控识别和售后支持。',
              '用于优化产品性能与稳定性，但不会用于无关商业营销。 ',
            ]}
          />

          <Section
            title="信息存储与保护"
            items={[
              '平台会采取合理的访问控制、最小权限和日志审计措施保护数据安全。',
              '用户生成内容默认仅供账号本人查看与管理。',
              '在满足合规和业务要求的前提下，平台仅保留必要期限内的数据。',
            ]}
          />

          <Section
            title="用户的权利"
            items={[
              '你可以在站内查看、修改或删除自己的部分资料和历史记录。',
              '如需协助处理账号、充值或隐私相关问题，可通过官方客服渠道联系我们。',
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

function Section({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="mb-8">
      <h2 className="mb-4 text-lg font-bold text-[#10B981]">{title}</h2>
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
