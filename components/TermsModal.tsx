'use client'

import { useEffect } from 'react'

interface TermsModalProps {
  show: boolean
  onClose: () => void
}

const sections = [
  {
    title: '内容边界',
    color: 'text-red-300',
    items: [
      '不得生成违法、侵权、欺诈、恶意误导或不适合公开传播的内容。',
      '不得上传或使用未经授权的人像、商标、作品素材进行商业化输出。',
      '如内容被系统判定存在风险，可能会被拦截或要求重新调整提示词。',
    ],
  },
  {
    title: '积分规则',
    color: 'text-emerald-300',
    items: [
      '1K 输出消耗 2 积分，2K 输出消耗 4 积分，4K 输出消耗 8 积分。',
      '如一次生成多张图片，按生成张数累加扣除积分。',
      '生成失败时会自动回退本次扣除的积分。',
    ],
  },
  {
    title: '生成与记录',
    color: 'text-sky-300',
    items: [
      '生成完成后会写入生成记录，记录中可查看图片、参数、消耗积分和状态。',
      '部分任务可能需要短时间轮询，页面会自动刷新处理中记录。',
      '如网络中断，记录页会尝试根据任务编号补齐最终结果。',
    ],
  },
  {
    title: '隐私说明',
    color: 'text-violet-300',
    items: [
      '注册邮箱仅用于登录验证、密码找回和必要的服务通知。',
      '用户生成记录默认仅账号本人可见，管理员仅用于排查故障和处理售后。',
      '你可以在生成记录页删除不再需要的历史记录。',
    ],
  },
]

export function TermsModal({ show, onClose }: TermsModalProps) {
  useEffect(() => {
    document.body.style.overflow = show ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [show])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    if (show) {
      document.addEventListener('keydown', handleKeyDown)
    }

    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [show, onClose])

  if (!show) {
    return null
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="关闭使用须知"
        className="absolute inset-0 cursor-default bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative flex max-h-[86vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-[#174438] bg-[#071611] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#174438] px-5 py-4">
          <div>
            <h3 className="text-lg font-bold text-white">安全合规与使用须知</h3>
            <p className="mt-1 text-xs text-[#8FB5A8]">使用 AI 画堂前请了解这些基础规则。</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[#1F4B3F] text-lg text-white transition hover:border-[#10B981] hover:text-[#10B981]"
            aria-label="关闭"
          >
            x
          </button>
        </div>

        <div className="space-y-6 overflow-y-auto px-5 py-5 text-sm leading-7 text-[#C8D6D0]">
          <p>
            AI 画堂用于辅助自媒体图文、课程卡片、知识总结和视觉排版创作。请确保输入内容、上传素材和生成用途符合平台规则。
          </p>

          {sections.map((section) => (
            <section key={section.title}>
              <h4 className={`mb-2 font-bold ${section.color}`}>{section.title}</h4>
              <ul className="space-y-2">
                {section.items.map((item) => (
                  <li key={item} className="flex gap-2">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#10B981]" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <div className="border-t border-[#174438] p-4">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl bg-[#10B981] py-3 text-sm font-bold text-[#04110D] transition hover:bg-[#34D399]"
          >
            我已了解
          </button>
        </div>
      </div>
    </div>
  )
}
