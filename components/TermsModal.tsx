'use client'

import { useEffect, useRef } from 'react'

interface TermsModalProps {
  show: boolean
  onClose: () => void
}

export function TermsModal({ show, onClose }: TermsModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    document.body.style.overflow = show ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [show])

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && show) {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [show, onClose])

  if (!show) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={onClose} />

      <div
        ref={modalRef}
        className="relative max-h-[80vh] w-full max-w-2xl rounded-2xl border border-[#142D24] bg-[#091511] shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-[#142D24] p-4">
          <h3 className="text-lg font-bold text-white">安全合规与使用须知</h3>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-[#142D24] text-white transition-colors hover:bg-[#10B981] hover:text-[#040D0A]"
          >
            ×
          </button>
        </div>

        <div className="max-h-[calc(80vh-144px)] space-y-6 overflow-y-auto p-6 text-sm text-gray-300">
          <p>
            本站提供 AI 图像生成与知识图卡创作服务。为了保障平台稳定运行，并保护所有用户的使用体验，请在使用前认真阅读以下规则。
          </p>

          <Section
            title="严禁生成的内容"
            color="text-red-400"
            items={[
              '色情、低俗、血腥暴力、擦边、诱导未成年人不当接触的内容。',
              '违法、仇恨、造谣、煽动、危害公共安全或国家安全的内容。',
              '侵犯他人肖像权、名誉权、隐私权，或用于诈骗、黑灰产引流的内容。',
            ]}
          />

          <Section
            title="违规处理方式"
            color="text-yellow-400"
            items={[
              '系统会对提示词和生成结果进行自动风控检测。',
              '发现恶意绕过风控、批量测试违规内容时，平台有权限制功能或封禁账号。',
              '情节严重时，平台会保留向相关部门提交必要注册信息与访问日志的权利。',
            ]}
          />

          <Section
            title="积分消耗说明"
            color="text-sky-400"
            items={[
              '1K 生成默认消耗 2 积分/张，2K 消耗 4 积分/张，4K 消耗 8 积分/张。',
              '如一次生成多张图片，实际消耗会按生成张数累计。',
              '若遇到平台侧报错或生成失败，积分会按规则自动退回。',
            ]}
          />

          <Section
            title="新用户福利"
            color="text-emerald-400"
            items={[
              '新用户完成首次注册后，可获得体验积分，用于熟悉平台主要功能。',
              '活动赠送积分仅限站内使用，不支持提现、转赠或线下兑换。',
            ]}
          />

          <Section
            title="退款与售后"
            color="text-orange-400"
            items={[
              'AI 算力与图像生成属于即时消耗型数字服务，已消耗部分通常不支持无理由退款。',
              '若出现充值到账异常、生成记录异常或重复扣费，请联系官方客服协助核查。',
            ]}
          />

          <Section
            title="隐私保护"
            color="text-violet-400"
            items={[
              '注册邮箱仅用于身份验证、安全通知和必要的服务沟通。',
              '用户生成内容默认仅供账号本人查看和管理，不会被用于无关商业用途。',
              '如需删除历史记录，可在个人记录页面自行处理。',
            ]}
          />

          <p className="text-xs text-gray-400">
            使用本站即表示你已理解并同意以上规则。如有疑问，请通过官方客服渠道联系我们。
          </p>
        </div>

        <div className="border-t border-[#142D24] p-4">
          <button
            onClick={onClose}
            className="w-full rounded-xl bg-[#10B981] py-3 text-sm font-bold text-[#040D0A] transition-all hover:shadow-[0_0_15px_rgba(16,185,129,0.4)]"
          >
            我已阅读并同意
          </button>
        </div>
      </div>
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
    <section>
      <h4 className={`mb-3 text-sm font-bold ${color}`}>{title}</h4>
      <ul className="space-y-2 pl-1">
        {items.map((item) => (
          <li key={item} className="flex gap-2">
            <span className="text-[#10B981]">•</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
