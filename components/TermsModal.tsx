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
        className="relative bg-[#091511] border border-[#142D24] rounded-2xl w-full max-w-2xl max-h-[80vh] shadow-2xl"
      >
        <div className="flex items-center justify-between p-4 border-b border-[#142D24]">
          <h3 className="text-lg font-bold text-white">AI画堂安全合规与使用须知</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 bg-[#142D24] text-white rounded-full flex items-center justify-center hover:bg-[#10B981] hover:text-[#040D0A] transition-colors"
          >
            ×
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(80vh-144px)] space-y-6 text-sm text-gray-300">
          <p>
            本站提供 AI 图像生成与知识图卡创作服务。为了保障平台稳定与用户权益，请在使用前认真阅读以下规则。
          </p>

          <Section
            title="严禁生成的内容"
            color="text-red-400"
            items={[
              '任何色情、低俗、擦边、血腥暴力或诱导未成年人不当接触的内容。',
              '任何违法、政治敏感、仇恨、造谣、煽动性或危害国家安全的内容。',
              '任何侵犯他人肖像权、名誉权、隐私权，或用于诈骗、黑灰产引流的内容。',
            ]}
          />

          <Section
            title="违规处理方式"
            color="text-yellow-400"
            items={[
              '系统会对提示词和生成内容进行自动风控检测。',
              '如发现恶意绕过风控、批量测试违规内容，平台有权直接封禁账号并清空剩余积分。',
              '情节严重时，平台会保留向相关部门提供注册信息与访问记录的权利。',
            ]}
          />

          <Section
            title="积分消耗说明"
            color="text-sky-400"
            items={[
              '1K 生成默认消耗 2 积分/次，2K 消耗 4 积分/次，4K 消耗 8 积分/次。',
              '若一次生成多张图片，实际消耗会按图片张数累计。',
              '如遇平台侧报错或生成失败，积分会按规则自动退回。',
            ]}
          />

          <Section
            title="新用户福利"
            color="text-emerald-400"
            items={[
              '新用户完成首次注册后，可获得体验积分，用于熟悉平台主要功能。',
              '活动赠送积分仅限站内使用，不支持折现或转赠。',
            ]}
          />

          <Section
            title="退款与售后"
            color="text-orange-400"
            items={[
              'AI 算力与图像生成属于即时消耗型数字服务，已消耗部分不支持无理由退款。',
              '若充值到账异常、生成记录异常或系统重复扣费，请联系官方客服协助核查。',
            ]}
          />

          <Section
            title="隐私保护"
            color="text-violet-400"
            items={[
              '注册邮箱仅用于身份验证、安全通知与服务沟通。',
              '用户生成内容默认仅供账号本人查看和管理，平台不会将其用于无关商业用途。',
              '如需删除历史记录，可在个人记录页面自行操作。',
            ]}
          />

          <p className="text-xs text-gray-400">
            使用本站即表示你已理解并同意以上规则。如有疑问，请通过官方客服渠道联系我们。
          </p>
        </div>

        <div className="p-4 border-t border-[#142D24]">
          <button
            onClick={onClose}
            className="w-full py-3 bg-[#10B981] text-[#040D0A] font-bold text-sm rounded-xl hover:shadow-[0_0_15px_rgba(16,185,129,0.4)] transition-all"
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
    <div>
      <h4 className={`text-sm font-bold mb-3 ${color}`}>{title}</h4>
      <ul className="space-y-2 pl-1">
        {items.map((item) => (
          <li key={item} className="flex gap-2">
            <span className="text-[#10B981]">•</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
