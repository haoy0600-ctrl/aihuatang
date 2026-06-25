'use client'

import { useEffect, useRef } from 'react'

interface TermsModalProps {
  show: boolean
  onClose: () => void
}

export function TermsModal({ show, onClose }: TermsModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (show) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [show])

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && show) {
        onClose()
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [show, onClose])

  if (!show) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-md"
        onClick={onClose}
      ></div>
      <div 
        ref={modalRef}
        className="relative bg-[#091511] border border-[#142D24] rounded-2xl w-full max-w-2xl max-h-[80vh] shadow-2xl animate-in fade-in zoom-in duration-200"
      >
        <div className="flex items-center justify-between p-4 border-b border-[#142D24]">
          <h3 className="text-lg font-bold text-white">📋 AI画堂·安全合规与使用须知</h3>
          <button 
            onClick={onClose}
            className="w-8 h-8 bg-[#142D24] text-white rounded-full flex items-center justify-center hover:bg-[#10B981] hover:text-[#040D0A] transition-colors"
          >
            ✕
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto max-h-[calc(80vh-80px)] scrollbar-hide">
          <p className="text-sm text-gray-300 mb-6">
            本站为自动化 AI 绘画创意辅助工具，各行各业用户在享受高效生图的同时，必须严格遵守国家网络安全法律法规。
          </p>
          
          <div className="mb-6">
            <h4 className="text-sm font-bold text-red-400 mb-3">🔴 【全站严厉禁止生成的违规内容】：</h4>
            <ul className="space-y-2 text-sm text-gray-300 pl-4">
              <li className="flex gap-2">
                <span className="text-[#10B981]">•</span>
                <span>严禁生成任何涉及色情、低俗、裸露及擦边暴力的图片。</span>
              </li>
              <li className="flex gap-2">
                <span className="text-[#10B981]">•</span>
                <span>严禁生成政治敏感、散布谣言、丑化特定人物或涉及国家安全的违法内容。</span>
              </li>
              <li className="flex gap-2">
                <span className="text-[#10B981]">•</span>
                <span>严禁用于任何侵犯他人肖像权、名誉权、商业欺诈或违规引流的黑色产业链。</span>
              </li>
            </ul>
          </div>
          
          <div className="mb-6">
            <h4 className="text-sm font-bold text-yellow-400 mb-3">💡 【如何避免违规与处罚说明】：</h4>
            <ul className="space-y-2 text-sm text-gray-300 pl-4">
              <li className="flex gap-2">
                <span className="text-[#10B981]">•</span>
                <span>平台已部署后端敏感词自动拦截过滤系统（包含但不限于政治、暴力、色情等中英文关键词）。</span>
              </li>
              <li className="flex gap-2">
                <span className="text-[#10B981]">•</span>
                <span>请在输入 Prompt 提示词时主动规范自身的创作意图。</span>
              </li>
              <li className="flex gap-2">
                <span className="text-[#10B981]">•</span>
                <span>一经发现恶意尝试绕过风控、生成违规内容者，平台将采取【直接永久封禁账号、清空剩余积分、不予退款】的铁腕处罚，情节严重者将依法向有关部门上报其注册邮箱与访问 IP！</span>
              </li>
            </ul>
          </div>
          
          <div className="mb-6">
            <h4 className="text-sm font-bold text-blue-400 mb-3">📊 【积分与退款政策】：</h4>
            <ul className="space-y-2 text-sm text-gray-300 pl-4">
              <li className="flex gap-2">
                <span className="text-[#10B981]">•</span>
                <span>新用户注册即赠送 10 积分，可免费体验多张图片生成。</span>
              </li>
              <li className="flex gap-2">
                <span className="text-[#10B981]">•</span>
                <span>积分档位：1K高清 2积分/张，2K超清 4积分/张，4K极清 8积分/张（VIP专属）。</span>
              </li>
              <li className="flex gap-2">
                <span className="text-[#10B981]">•</span>
                <span>积分充值后不予退款，请根据自身需求合理购买。</span>
              </li>
              <li className="flex gap-2">
                <span className="text-[#10B981]">•</span>
                <span>若因平台技术问题导致生图失败，系统将自动退回消耗的积分。</span>
              </li>
            </ul>
          </div>
          
          <div className="mb-6">
            <h4 className="text-sm font-bold text-purple-400 mb-3">🔒 【隐私保护说明】：</h4>
            <ul className="space-y-2 text-sm text-gray-300 pl-4">
              <li className="flex gap-2">
                <span className="text-[#10B981]">•</span>
                <span>您的注册邮箱仅用于身份验证和安全通知，不会被用于其他商业用途。</span>
              </li>
              <li className="flex gap-2">
                <span className="text-[#10B981]">•</span>
                <span>生成的图片将存储在安全的云端存储中，您可以随时删除自己的生成记录。</span>
              </li>
              <li className="flex gap-2">
                <span className="text-[#10B981]">•</span>
                <span>平台不会主动查看或使用用户生成的图片内容。</span>
              </li>
            </ul>
          </div>
          
          <p className="text-xs text-gray-400">
            💬 关于售后：大算力完全消耗在海外下游接口。若遇网络延迟卡密未到账、或生图超时失败，积分会自动退回。若有账目疑问，请联系官方客服微信人工核对。
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