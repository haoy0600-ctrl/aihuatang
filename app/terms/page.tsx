'use client'

import Link from 'next/link'

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#091511] flex flex-col">
      <header className="border-b border-[#142D24]">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center">
            <img 
              src="/logo.png?v=8" 
              alt="AI画堂" 
              className="h-12 w-12 object-contain"
            />
          </Link>
          <Link 
            href="/dashboard"
            className="px-4 py-2 bg-[#10B981] text-[#040D0A] font-bold text-sm rounded-lg hover:shadow-[0_0_15px_rgba(16,185,129,0.4)] transition-all"
          >
            返回创作
          </Link>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto px-4 py-8">
        <div className="bg-[#0A1A10] border border-[#142D24] rounded-2xl p-6 md:p-8">
          <h1 className="text-xl font-bold text-white mb-6 text-center">📋 AI画堂·安全合规与使用须知</h1>
          
          <p className="text-sm text-gray-300 mb-6 leading-relaxed">
            本站为自动化 AI 绘画创意辅助工具，各行各业用户在享受高效生图的同时，必须严格遵守国家网络安全法律法规。
          </p>
          
          <div className="mb-8">
            <h2 className="text-lg font-bold text-red-400 mb-4">🔴 【全站严厉禁止生成的违规内容】：</h2>
            <ul className="space-y-3 text-sm text-gray-300 pl-5">
              <li className="flex gap-3">
                <span className="text-[#10B981] mt-0.5">•</span>
                <span>严禁生成任何涉及色情、低俗、裸露及擦边暴力的图片。</span>
              </li>
              <li className="flex gap-3">
                <span className="text-[#10B981] mt-0.5">•</span>
                <span>严禁生成政治敏感、散布谣言、丑化特定人物或涉及国家安全的违法内容。</span>
              </li>
              <li className="flex gap-3">
                <span className="text-[#10B981] mt-0.5">•</span>
                <span>严禁用于任何侵犯他人肖像权、名誉权、商业欺诈或违规引流的黑色产业链。</span>
              </li>
            </ul>
          </div>
          
          <div className="mb-8">
            <h2 className="text-lg font-bold text-yellow-400 mb-4">💡 【如何避免违规与处罚说明】：</h2>
            <ul className="space-y-3 text-sm text-gray-300 pl-5">
              <li className="flex gap-3">
                <span className="text-[#10B981] mt-0.5">•</span>
                <span>平台已部署后端敏感词自动拦截过滤系统（包含但不限于政治、暴力、色情等中英文关键词）。</span>
              </li>
              <li className="flex gap-3">
                <span className="text-[#10B981] mt-0.5">•</span>
                <span>请在输入 Prompt 提示词时主动规范自身的创作意图。</span>
              </li>
              <li className="flex gap-3">
                <span className="text-[#10B981] mt-0.5">•</span>
                <span>一经发现恶意尝试绕过风控、生成违规内容者，平台将采取【直接永久封禁账号、清空剩余积分、不予退款】的铁腕处罚，情节严重者将依法向有关部门上报其注册邮箱与访问 IP！</span>
              </li>
            </ul>
          </div>
          
          <div className="mb-8">
            <h2 className="text-lg font-bold text-blue-400 mb-4">📊 【积分消耗】：</h2>
            <ul className="space-y-3 text-sm text-gray-300 pl-5">
              <li className="flex gap-3">
                <span className="text-[#10B981] mt-0.5">•</span>
                <span>本站采用 Image 模型分级消耗机制。标准 1K 分辨率生成消耗 2 积分/次；2K 高清生成消耗 4 积分/次；4K 至臻超清生成消耗 8 积分/次。</span>
              </li>
            </ul>
          </div>
          
          <div className="mb-8">
            <h2 className="text-lg font-bold text-green-400 mb-4">🎁 【体验福利】：</h2>
            <ul className="space-y-3 text-sm text-gray-300 pl-5">
              <li className="flex gap-3">
                <span className="text-[#10B981] mt-0.5">•</span>
                <span>新用户通过邮箱首次注册成功，系统赠送 8 个免费 Image 模型体验积分（可用于自由体验 4张1K生成、2张2K生成 或 1张4K至臻超清生成）。</span>
              </li>
            </ul>
          </div>
          
          <div className="mb-8">
            <h2 className="text-lg font-bold text-red-400 mb-4">🔄 【退款政策】：</h2>
            <ul className="space-y-3 text-sm text-gray-300 pl-5">
              <li className="flex gap-3">
                <span className="text-[#10B981] mt-0.5">•</span>
                <span>鉴于 AI 图像生成与多阶段超清模型服务属于即时消耗的数字算力产品，一旦积分充值成功或已产生模型消耗，本站一律不支持任何形式的无理由退款。</span>
              </li>
              <li className="flex gap-3">
                <span className="text-[#10B981] mt-0.5">•</span>
                <span>若因平台技术问题导致生图失败，系统将自动退回消耗的积分。</span>
              </li>
            </ul>
          </div>
          
          <div className="mb-8">
            <h2 className="text-lg font-bold text-purple-400 mb-4">🔒 【隐私保护说明】：</h2>
            <ul className="space-y-3 text-sm text-gray-300 pl-5">
              <li className="flex gap-3">
                <span className="text-[#10B981] mt-0.5">•</span>
                <span>您的注册邮箱仅用于身份验证和安全通知，不会被用于其他商业用途。</span>
              </li>
              <li className="flex gap-3">
                <span className="text-[#10B981] mt-0.5">•</span>
                <span>生成的图片将存储在安全的云端存储中，您可以随时删除自己的生成记录。</span>
              </li>
              <li className="flex gap-3">
                <span className="text-[#10B981] mt-0.5">•</span>
                <span>平台不会主动查看或使用用户生成的图片内容。</span>
              </li>
            </ul>
          </div>
          
          <div className="bg-[#142327] border border-[#18353d] rounded-xl p-4">
            <p className="text-xs text-gray-400 leading-relaxed">
              💬 关于售后：大算力完全消耗在海外下游接口。若遇网络延迟卡密未到账、或生图超时失败，积分会自动退回。若有账目疑问，请联系官方客服微信人工核对。
            </p>
          </div>
        </div>
      </main>

      <footer className="border-t border-[#142D24] py-4">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <p className="text-xs text-[#10B981]">© 2026 AI画堂</p>
        </div>
      </footer>
    </div>
  )
}