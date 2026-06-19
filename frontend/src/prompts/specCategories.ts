/**
 * 设计规范分类与标签
 *
 * 与 docs/open-design-integration-plan.md 1.2 节分类体系保持一致：
 *   - SaaS / 开发者工具
 *   - 金融 / 商业
 *   - 消费 / 生活方式
 *   - 社交媒体 / 内容
 *   - 电商 / 零售
 *   - 出行 / 旅游
 *   - 媒体 / AI
 *
 * 任何新规范都应通过 `getSpecCategory(specId)` / `getSpecTags(specId)` 派生
 * 分类与标签，保证分类中心化、便于扩展。
 */

export type SpecIndustry =
  | 'SaaS/Developer'
  | 'Fintech'
  | 'Consumer'
  | 'Social/Content'
  | 'E-commerce'
  | 'Mobility/Booking'
  | 'Media/AI'
  | 'Productivity'
  | 'Design Tools'
  | 'Other'

export const SPEC_INDUSTRIES: Array<{ id: SpecIndustry; label: string; emoji: string }> = [
  { id: 'SaaS/Developer', label: 'SaaS / 开发者工具', emoji: '🛠' },
  { id: 'Fintech', label: '金融科技', emoji: '💳' },
  { id: 'Consumer', label: '消费 / 生活方式', emoji: '🛍' },
  { id: 'Social/Content', label: '社交 / 内容', emoji: '💬' },
  { id: 'E-commerce', label: '电商 / 零售', emoji: '🛒' },
  { id: 'Mobility/Booking', label: '出行 / 旅游', emoji: '✈' },
  { id: 'Media/AI', label: '媒体 / AI', emoji: '🤖' },
  { id: 'Productivity', label: '生产力工具', emoji: '📋' },
  { id: 'Design Tools', label: '设计工具', emoji: '🎨' },
  { id: 'Other', label: '其他', emoji: '📦' },
]

/** 全局可复用的标签词表 */
export const SPEC_TAGS = [
  'dark-mode', 'light-mode', 'minimal', 'editorial', 'photography',
  'gradient', 'monochrome', 'playful', 'serious', 'data-dense',
  'dashboard', 'landing-page', 'mobile-first', 'web-first',
  'developer-friendly', 'consumer-friendly', 'e-commerce', 'media',
  'chat', 'social', 'finance', 'travel', 'fitness',
  'gaming', 'productivity', 'ai', 'crypto', 'open-source',
] as const

export type SpecTag = (typeof SPEC_TAGS)[number]

/**
 * 已知规范的"分类 + 标签"派生表。
 *
 * 注意：规范数据本身（designSpecs.ts）里已经携带了 `industry / tags / mood`
 * 字段，此处仅作为"分类元数据 / 工具栏"使用，避免在前端做硬编码的逻辑分支。
 * 真实渲染请用 DesignSpec 自身的字段。
 */
export const SPEC_CATEGORY_META: Record<string, { industry: SpecIndustry; tags: SpecTag[] }> = {
  // SaaS/Developer
  stripe: { industry: 'Fintech', tags: ['editorial', 'minimal', 'landing-page'] },
  linear: { industry: 'SaaS/Developer', tags: ['dark-mode', 'data-dense', 'developer-friendly'] },
  vercel: { industry: 'SaaS/Developer', tags: ['minimal', 'gradient', 'developer-friendly'] },
  supabase: { industry: 'SaaS/Developer', tags: ['dark-mode', 'open-source', 'developer-friendly'] },
  cursor: { industry: 'SaaS/Developer', tags: ['dark-mode', 'ai', 'developer-friendly'] },
  github: { industry: 'SaaS/Developer', tags: ['dark-mode', 'developer-friendly', 'open-source'] },
  gitlab: { industry: 'SaaS/Developer', tags: ['developer-friendly', 'open-source', 'data-dense'] },
  cloudflare: { industry: 'SaaS/Developer', tags: ['developer-friendly', 'data-dense', 'serious'] },
  datadog: { industry: 'SaaS/Developer', tags: ['dark-mode', 'data-dense', 'dashboard'] },
  sentry: { industry: 'SaaS/Developer', tags: ['dark-mode', 'developer-friendly', 'data-dense'] },
  hashicorp: { industry: 'SaaS/Developer', tags: ['serious', 'open-source', 'data-dense'] },
  postman: { industry: 'SaaS/Developer', tags: ['developer-friendly', 'data-dense', 'light-mode'] },

  // Fintech
  plaid: { industry: 'Fintech', tags: ['minimal', 'data-dense', 'finance'] },
  robinhood: { industry: 'Fintech', tags: ['dark-mode', 'finance', 'mobile-first'] },
  coinbase: { industry: 'Fintech', tags: ['crypto', 'finance', 'minimal'] },
  alipay: { industry: 'Fintech', tags: ['mobile-first', 'finance', 'landing-page'] },
  wechatpay: { industry: 'Fintech', tags: ['mobile-first', 'finance', 'minimal'] },

  // Consumer
  apple: { industry: 'Consumer', tags: ['photography', 'minimal', 'editorial'] },
  airbnb: { industry: 'Consumer', tags: ['photography', 'travel', 'landing-page'] },
  spotify: { industry: 'Media/AI', tags: ['dark-mode', 'media', 'playful'] },
  nike: { industry: 'Consumer', tags: ['monochrome', 'photography', 'editorial'] },
  tesla: { industry: 'Consumer', tags: ['monochrome', 'photography', 'minimal'] },
  adidas: { industry: 'Consumer', tags: ['monochrome', 'photography', 'editorial'] },
  patagonia: { industry: 'Consumer', tags: ['photography', 'editorial', 'landing-page'] },
  hermes: { industry: 'Consumer', tags: ['editorial', 'minimal', 'photography'] },
  rivian: { industry: 'Consumer', tags: ['photography', 'minimal', 'monochrome'] },

  // Media/AI
  notion: { industry: 'Productivity', tags: ['minimal', 'productivity', 'web-first'] },
  openai: { industry: 'Media/AI', tags: ['minimal', 'ai', 'editorial'] },
  anthropic: { industry: 'Media/AI', tags: ['editorial', 'ai', 'minimal'] },
  midjourney: { industry: 'Media/AI', tags: ['dark-mode', 'ai', 'editorial'] },
  perplexity: { industry: 'Media/AI', tags: ['ai', 'minimal', 'editorial'] },

  // Social/Content
  discord: { industry: 'Social/Content', tags: ['chat', 'social', 'playful'] },
  telegram: { industry: 'Social/Content', tags: ['chat', 'social', 'mobile-first'] },
  slack: { industry: 'Social/Content', tags: ['chat', 'productivity', 'playful'] },
  twitterx: { industry: 'Social/Content', tags: ['dark-mode', 'social', 'minimal'] },
  substack: { industry: 'Social/Content', tags: ['editorial', 'media', 'minimal'] },
  arc: { industry: 'Social/Content', tags: ['editorial', 'playful', 'minimal'] },

  // E-commerce
  shopify: { industry: 'E-commerce', tags: ['e-commerce', 'landing-page', 'playful'] },
  stripe_atlas: { industry: 'Fintech', tags: ['editorial', 'minimal', 'landing-page'] },
  taobao: { industry: 'E-commerce', tags: ['e-commerce', 'mobile-first', 'playful'] },
  jd: { industry: 'E-commerce', tags: ['e-commerce', 'mobile-first', 'landing-page'] },

  // Mobility/Booking
  uber: { industry: 'Mobility/Booking', tags: ['mobile-first', 'minimal', 'dark-mode'] },
  booking: { industry: 'Mobility/Booking', tags: ['travel', 'landing-page', 'photography'] },
  ctrip: { industry: 'Mobility/Booking', tags: ['travel', 'landing-page', 'mobile-first'] },

  // Design Tools
  figma: { industry: 'Design Tools', tags: ['playful', 'gradient', 'web-first'] },
  framer: { industry: 'Design Tools', tags: ['gradient', 'playful', 'minimal'] },
}

/** 根据 specId 取得分类元数据（找不到则返回兜底） */
export function getSpecCategoryMeta(specId: string): { industry: SpecIndustry; tags: SpecTag[] } {
  return SPEC_CATEGORY_META[specId] ?? { industry: 'Other', tags: [] }
}

/** 取得 industry 显示名 */
export function getIndustryLabel(industry: SpecIndustry): string {
  return SPEC_INDUSTRIES.find(i => i.id === industry)?.label ?? industry
}
