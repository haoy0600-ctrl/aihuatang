export type RechargePlan = {
  credits: number
  price: number
  title: string
  desc: string
  highlight?: boolean
}

export const RECHARGE_PLANS: RechargePlan[] = [
  { credits: 100, price: 10, title: '体验入门', desc: '适合新用户试用流程、少量测试和临时出图。' },
  { credits: 320, price: 29, title: '轻量创作', desc: '适合日常图文、课程小批量生成。' },
  { credits: 700, price: 59, title: '高频创作', desc: '适合持续产出，单积分成本更低。', highlight: true },
  { credits: 1300, price: 99, title: '工作室进阶', desc: '适合多账号运营或集中制作素材。' },
  { credits: 2800, price: 199, title: '长期高阶', desc: '适合稳定批量生产和团队使用。' },
]
