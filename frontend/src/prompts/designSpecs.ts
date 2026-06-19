export interface ColorSet {
  primary: string
  background: string
  surface: string
  text: string
  textSecondary: string
  border: string
  accent: string
  error: string
  success: string
}

export interface DesignSpec {
  id: string
  name: string
  category: string
  description: string
  source: string
  colors: ColorSet
  fontStack: string
  borderRadius: string
  styleHint: string
  fullPrompt: string
  // ── DesignSpec v2 扩展字段（向前兼容，旧数据迁移由 migrateDesignSpec 完成） ──
  /** 行业 / 情绪标签，如 ['fintech','editorial']；v1 数据迁移时留空数组 */
  tags: string[]
  /** 行业分类，如 'Fintech' / 'Productivity'；v1 数据迁移时留空字符串，由具体规范数据补全 */
  industry: string
  /** 情绪关键词，如 ['professional','playful','bold']；v1 数据迁移时留空数组 */
  mood: string[]
  /** 深色模式配色（可选，结构同 colors）；v1 数据迁移时不设置 */
  darkMode?: ColorSet
  /** 浅色模式配色（可选，结构同 colors）；v1 数据迁移时把现有 colors 复制到此 */
  lightMode?: ColorSet
  /** 间距风格 */
  spacing: 'tight' | 'normal' | 'spacious'
  /** 信息密度 */
  density: 'compact' | 'normal' | 'airy'
}

export type DesignSpecId =
  | 'none' | 'custom'
  // Original 14
  | 'stripe' | 'linear' | 'apple' | 'vercel' | 'notion' | 'airbnb' | 'spotify'
  | 'nike' | 'figma' | 'supabase' | 'cursor' | 'framer' | 'tesla'
  // SaaS/Developer (新增)
  | 'github' | 'gitlab' | 'cloudflare' | 'datadog' | 'sentry' | 'hashicorp' | 'postman'
  // Fintech (新增)
  | 'plaid' | 'robinhood' | 'coinbase' | 'alipay' | 'wechatpay'
  // Consumer (新增)
  | 'adidas' | 'patagonia' | 'hermes' | 'rivian'
  // Media/AI (新增)
  | 'openai' | 'anthropic' | 'midjourney' | 'perplexity'
  // Social/Content (新增)
  | 'discord' | 'telegram' | 'slack' | 'twitterx' | 'substack' | 'arc'
  // E-commerce (新增)
  | 'shopify' | 'stripe_atlas' | 'taobao' | 'jd'
  // Mobility/Booking
  | 'uber' | 'booking' | 'ctrip'
  // Extra Fintech (新增)
  | 'klarna' | 'wise'
  // Extra Consumer (新增)
  | 'duolingo'
  // Extra Media (新增)
  | 'monocle' | 'the_verge'

export const DESIGN_SPEC_LABELS: Record<DesignSpecId, string> = {
  none: '🎨 不使用设计规范',
  custom: '📋 自定义导入',
  // Original 14
  stripe: '💳 Stripe',
  linear: '📊 Linear',
  apple: '🍎 Apple',
  vercel: '▲ Vercel',
  notion: '📝 Notion',
  airbnb: '🏠 Airbnb',
  spotify: '🎵 Spotify',
  nike: '✔ Nike',
  figma: '🎨 Figma',
  supabase: '⚡ Supabase',
  cursor: '💻 Cursor',
  framer: '✨ Framer',
  tesla: '🚗 Tesla',
  // SaaS/Developer
  github: '🐙 GitHub',
  gitlab: '🦊 GitLab',
  cloudflare: '☁ Cloudflare',
  datadog: '🐶 Datadog',
  sentry: '🛡 Sentry',
  hashicorp: '⛓ HashiCorp',
  postman: '📮 Postman',
  // Fintech
  plaid: '🏦 Plaid',
  robinhood: '🌲 Robinhood',
  coinbase: '🔵 Coinbase',
  alipay: '💙 支付宝',
  wechatpay: '💚 微信支付',
  // Consumer
  adidas: '🖤 Adidas',
  patagonia: '🏔 Patagonia',
  hermes: '🟠 Hermès',
  rivian: '🚙 Rivian',
  // Media/AI
  openai: '🌀 OpenAI',
  anthropic: '🪶 Anthropic',
  midjourney: '🎨 Midjourney',
  perplexity: '🧠 Perplexity',
  // Social/Content
  discord: '🎮 Discord',
  telegram: '✈ Telegram',
  slack: '💼 Slack',
  twitterx: '✕ Twitter/X',
  substack: '📰 Substack',
  arc: '🌈 Arc Browser',
  // E-commerce
  shopify: '🛍 Shopify',
  stripe_atlas: '🗺 Stripe Atlas',
  taobao: '🟠 淘宝',
  jd: '🔴 京东',
  // Mobility/Booking
  uber: '🚗 Uber',
  booking: '🌍 Booking.com',
  ctrip: '🏮 携程',
  // Extra Fintech
  klarna: '💗 Klarna',
  wise: '💱 Wise',
  // Extra Consumer
  duolingo: '🦉 Duolingo',
  // Extra Media
  monocle: '📰 Monocle',
  the_verge: '⚡ The Verge',
}

export const DESIGN_SPEC_CATEGORIES = [
  { id: 'builtin', label: '内置设计规范' },
  { id: 'custom', label: '自定义导入' },
]

// 说明：BUILT_IN_DESIGN_SPECS 数组内每个对象的 v2 字段（tags/industry/mood/spacing/density）
// 保持空（保持原样未补全），运行时由 migrateDesignSpec() / getDesignSpecV2() 补齐。
// BuiltInDesignSpecRaw 是"v1 形态"（缺 v2 必填字段），仅用于类型化 BUILT_IN_DESIGN_SPECS 字面量。
type BuiltInDesignSpecRaw = Omit<
  DesignSpec,
  'tags' | 'industry' | 'mood' | 'spacing' | 'density'
> & {
  tags?: string[]
  industry?: string
  mood?: string[]
  spacing?: 'tight' | 'normal' | 'spacious'
  density?: 'compact' | 'normal' | 'airy'
}

export const BUILT_IN_DESIGN_SPECS: BuiltInDesignSpecRaw[] = [
  {
    id: 'stripe',
    name: 'Stripe',
    category: 'Fintech',
    description: '支付基础设施品牌，深海军蓝底色，标志性靛蓝渐变网格，薄字重编辑风格',
    source: 'https://getdesign.md/stripe/design-md',
    colors: {
      primary: '#533afd',
      background: '#ffffff',
      surface: '#f6f9fc',
      text: '#0d253d',
      textSecondary: '#64748d',
      border: '#e3e8ee',
      accent: '#ea2261',
      error: '#ef4444',
      success: '#22c55e',
    },
    fontStack: "'Inter', -apple-system, 'PingFang SC', sans-serif",
    borderRadius: '9999px',
    styleHint: 'pill-buttons, gradient-mesh-hero, thin-weight-typography, editorial-density',
    fullPrompt: `## 设计规范：Stripe 风格

你必须严格遵循以下设计语言生成 UI：

### 配色方案
- 主色（Primary/CTA）: #533afd（靛蓝）
- 页面背景: #ffffff
- 表面色: #f6f9fc（微蓝灰白）
- 正文色: #0d253d（深海军蓝，不是纯黑）
- 次要文字: #64748d
- 边框/分割线: #e3e8ee
- 强调色: #ea2261（红宝石，仅用于装饰，不用于按钮）
- 错误色: #ef4444，成功色: #22c55e

### 排版
- 字体: Inter（或系统字体），字重优先使用 300（thin）
- 大标题使用负字间距（letter-spacing: -1px 到 -0.2px）
- 标题 48-56px / 子标题 32px / 正文 15-16px / 辅助 13px

### 组件风格
- 按钮形状: 药丸形（border-radius: 9999px），紧凑内边距 8px 16px
- 主按钮: 背景 #533afd，白色文字
- 卡片: 圆角 12px，白色背景，1px #e3e8ee 边框
- 输入框: 圆角 6px，8px 12px 内边距

### 布局原则
- Hero 区域使用大面积渐变网格背景（奶油色/橙色/薰衣草/靛蓝/粉红横向渐变）
- 内容区留白充足，段落间距 96px
- 内容宽度约 1200px 居中
- 深色仪表盘面板使用 #1c1e54 背景`,
  },
  {
    id: 'linear',
    name: 'Linear',
    category: 'Productivity',
    description: '极简暗黑项目管理工具，近乎纯黑画布，薰衣草蓝单色点缀，密集产品截图驱动',
    source: 'https://getdesign.md/linear.app/design-md',
    colors: {
      primary: '#5e6ad2',
      background: '#010102',
      surface: '#0f1011',
      text: '#f7f8f8',
      textSecondary: '#8a8f98',
      border: '#23252a',
      accent: '#5e6ad2',
      error: '#ef4444',
      success: '#27a644',
    },
    fontStack: "'Inter', -apple-system, system-ui, sans-serif",
    borderRadius: '8px',
    styleHint: 'dark-canvas, lavender-accent, surface-ladder, negative-tracking, product-screenshot-driven',
    fullPrompt: `## 设计规范：Linear 风格

你必须严格遵循以下设计语言生成 UI：

### 配色方案
- 主色（Primary/CTA）: #5e6ad2（薰衣草蓝）
- 页面背景: #010102（近乎纯黑，带微蓝）
- 表面色阶梯: #0f1011 → #141516 → #18191a → #191a1b
- 正文色: #f7f8f8（浅灰白）
- 次要文字: #8a8f98
- 边框: #23252a（微亮线）
- 强调色: #5e6ad2（与主色相同，克制使用）
- 成功色: #27a644

### 排版
- 字体: Inter，标题 500-600 字重，正文 400
- 大标题使用激进负字间距（80px 标题 -3px，56px 标题 -1.8px）
- 标题 56-80px / 子标题 28px / 正文 16px / 辅助 12-14px

### 组件风格
- 按钮形状: 圆角 8px，紧凑 8px 14px 内边距
- 主按钮: 背景 #5e6ad2，白色文字
- 次按钮: 背景 #0f1011，浅灰文字
- 卡片: 背景 #0f1011，1px #23252a 边框，圆角 12px
- 深度通过表面阶梯实现，不使用阴影

### 布局原则
- 全暗黑画布，留白即黑
- 卡片组使用 surface-1 提升层次
- 内容宽度约 1280px
- 无装饰渐变、无多彩色块`,
  },
  {
    id: 'apple',
    name: 'Apple',
    category: 'Consumer Tech',
    description: '摄影优先的产品展示，纯白与近黑交替，SF Pro 字体负间距，单一蓝色交互色',
    source: 'https://getdesign.md/apple/design-md',
    colors: {
      primary: '#0066cc',
      background: '#ffffff',
      surface: '#f5f5f7',
      text: '#1d1d1f',
      textSecondary: '#7a7a7a',
      border: '#e0e0e0',
      accent: '#0066cc',
      error: '#ef4444',
      success: '#22c55e',
    },
    fontStack: "-apple-system, 'SF Pro Display', 'PingFang SC', sans-serif",
    borderRadius: '9999px',
    styleHint: 'photography-first, alternating-light-dark-tiles, single-blue-accent, tight-tracking, museum-gallery',
    fullPrompt: `## 设计规范：Apple 风格

你必须严格遵循以下设计语言生成 UI：

### 配色方案
- 主色（交互色）: #0066cc（Action Blue）
- 页面背景: #ffffff（纯白）或 #f5f5f7（羊皮纸白）
- 暗色区域背景: #272729
- 正文色: #1d1d1f（近黑，不是纯黑）
- 次要文字: #7a7a7a
- 边框: #e0e0e0
- 暗色区域文字: #ffffff

### 排版
- 字体: SF Pro Display / PingFang SC / system-ui
- 大标题使用微负字间距（-0.28px at 56px）
- 标题 40-56px / 副标题 28px / 正文 17px / 辅助 14px

### 组件风格
- 按钮: 药丸形（border-radius: 9999px）
- CTA 按钮: 背景 #0066cc 白色文字，或纯文字蓝色链接
- 暗色区域 CTA: 使用 #2997ff（更亮的蓝色）
- 无装饰渐变，无阴影在 UI chrome 上
- 产品图片可使用微妙投影 rgba(0,0,0,0.22) 3px 5px 30px

### 布局原则
- 全出血（edge-to-edge）产品瓷砖块，交替白/暗
- 每个区域约占一个视口高度
- 极低信息密度，大量留白
- UI chrome 极简，让产品图片说话`,
  },
  {
    id: 'vercel',
    name: 'Vercel',
    category: 'Developer Tools',
    description: '开发者平台，黑白精准配对，Geist 字体，多彩网格渐变作为唯一装饰',
    source: 'https://getdesign.md/vercel/design-md',
    colors: {
      primary: '#171717',
      background: '#ffffff',
      surface: '#fafafa',
      text: '#171717',
      textSecondary: '#888888',
      border: '#ebebeb',
      accent: '#0070f3',
      error: '#ee0000',
      success: '#0070f3',
    },
    fontStack: "'Geist', 'Inter', system-ui, -apple-system, sans-serif",
    borderRadius: '100px',
    styleHint: 'black-ink-cta, mesh-gradient-hero, monospace-labels, stacked-shadow, geometric-sans',
    fullPrompt: `## 设计规范：Vercel 风格

你必须严格遵循以下设计语言生成 UI：

### 配色方案
- 主色（Primary/CTA）: #171717（墨黑）
- 页面背景: #fafafa（98%灰白）
- 卡片背景: #ffffff（纯白）
- 正文色: #171717
- 次要文字: #888888
- 边框: #ebebeb
- 链接色: #0070f3
- 错误色: #ee0000

### 排版
- 字体: Geist / Inter / system-ui
- 大标题激进负字间距（-2.4px at 48px）
- 标题 48px / 子标题 32px / 正文 16px / 辅助 14px
- 技术标签使用等宽字体 Geist Mono

### 组件风格
- CTA 按钮: 药丸形（border-radius: 100px），黑色背景白色文字
- 次按钮: 白色背景，#171717 文字
- 卡片: 圆角 8-12px，使用堆叠阴影（多层 4-12% 黑色透明度）
- 输入框: 圆角 6px，高度 40px

### 布局原则
- Hero 区域可使用多彩网格渐变（青色/蓝色/品红/琥珀色）作为大气背景
- 内容宽度居中，间距充足
- 代码/技术内容使用等宽字体
- 极简黑白为主，颜色仅用于渐变装饰`,
  },
  {
    id: 'notion',
    name: 'Notion',
    category: 'Productivity',
    description: '温暖极简主义，衬线标题，柔和表面，友好且克制的协作工具美学',
    source: 'https://getdesign.md/notion/design-md',
    colors: {
      primary: '#2eaadc',
      background: '#ffffff',
      surface: '#f7f6f3',
      text: '#37352f',
      textSecondary: '#9b9a97',
      border: '#e9e9e7',
      accent: '#2eaadc',
      error: '#eb5757',
      success: '#0f7b6c',
    },
    fontStack: "-apple-system, 'PingFang SC', 'Microsoft YaHei', sans-serif",
    borderRadius: '8px',
    styleHint: 'warm-minimalism, serif-headings, soft-surfaces, friendly-collaboration, muted-palette',
    fullPrompt: `## 设计规范：Notion 风格

你必须严格遵循以下设计语言生成 UI：

### 配色方案
- 主色: #2eaadc（柔和天蓝）
- 页面背景: #ffffff
- 表面色: #f7f6f3（暖白）
- 正文色: #37352f（暖灰近黑）
- 次要文字: #9b9a97
- 边框: #e9e9e7
- 错误色: #eb5757，成功色: #0f7b6c

### 排版
- 字体: 系统默认字体，PingFang SC
- 标题可使用衬线字体增加温暖感
- 标题 30-40px / 正文 16px / 辅助 14px
- 行高宽松（1.5-1.7）

### 组件风格
- 按钮: 圆角 8px，温和配色
- 主按钮: 背景 #2eaadc 白色文字
- 卡片: 白色背景，1px #e9e9e7 边框，柔和阴影
- 输入框: 圆角 4-8px，浅灰边框
- 使用暖色调（米色/奶油色）作为背景装饰

### 布局原则
- 宽松的间距和行高
- 信息密度适中，不拥挤
- 侧边栏 + 主内容区布局
- 友好、温暖、克制的视觉风格`,
  },
  {
    id: 'airbnb',
    name: 'Airbnb',
    category: 'E-commerce',
    description: '温暖珊瑚色调，摄影驱动，圆角友好的旅行市场美学',
    source: 'https://getdesign.md/airbnb/design-md',
    colors: {
      primary: '#ff385c',
      background: '#ffffff',
      surface: '#f7f7f7',
      text: '#222222',
      textSecondary: '#717171',
      border: '#dddddd',
      accent: '#ff385c',
      error: '#ff385c',
      success: '#008a05',
    },
    fontStack: "'Circular', -apple-system, 'PingFang SC', sans-serif",
    borderRadius: '12px',
    styleHint: 'warm-coral, photography-driven, rounded-friendly, travel-marketplace, card-grid',
    fullPrompt: `## 设计规范：Airbnb 风格

你必须严格遵循以下设计语言生成 UI：

### 配色方案
- 主色: #ff385c（珊瑚红）
- 页面背景: #ffffff
- 表面色: #f7f7f7
- 正文色: #222222
- 次要文字: #717171
- 边框: #dddddd
- 错误/强调色: #ff385c
- 成功色: #008a05

### 排版
- 字体: Circular / system-ui / PingFang SC
- 标题 24-32px / 正文 16px / 辅助 14px
- 行高 1.4-1.5

### 组件风格
- 按钮: 圆角 8-12px
- 主按钮: 背景 #ff385c 白色文字，hover 变深
- 卡片: 白色背景，圆角 12px，柔和阴影
- 图片卡片为主，大圆角
- 搜索栏: 圆角药丸形

### 布局原则
- 图片驱动的卡片网格
- 大量使用高质量图片占位
- 友好、温暖、旅行感的视觉
- 间距宽松舒适`,
  },
  {
    id: 'spotify',
    name: 'Spotify',
    category: 'Media',
    description: '深色背景上的亮绿点缀，大胆排版，专辑封面驱动的音乐流媒体美学',
    source: 'https://getdesign.md/spotify/design-md',
    colors: {
      primary: '#1db954',
      background: '#121212',
      surface: '#282828',
      text: '#ffffff',
      textSecondary: '#b3b3b3',
      border: '#333333',
      accent: '#1db954',
      error: '#e91429',
      success: '#1db954',
    },
    fontStack: "'Circular', 'Inter', -apple-system, sans-serif",
    borderRadius: '8px',
    styleHint: 'dark-media, vibrant-green, bold-type, album-art-driven, music-streaming',
    fullPrompt: `## 设计规范：Spotify 风格

你必须严格遵循以下设计语言生成 UI：

### 配色方案
- 主色: #1db954（Spotify 绿）
- 页面背景: #121212（深灰黑）
- 表面色: #282828
- 正文色: #ffffff
- 次要文字: #b3b3b3
- 边框: #333333
- 错误色: #e91429
- 强调色: #1db954

### 排版
- 字体: Circular / Inter / system-ui
- 标题 24-48px 粗体，正文 14-16px
- 使用大胆、有力的排版

### 组件风格
- 按钮: 圆角 9999px（药丸形）
- 主按钮: 背景 #1db954，黑色文字
- 卡片: 背景 #282828，hover 变 #3e3e3e
- 底部固定播放栏: 背景 #181818
- 侧边导航: 深色 #000000

### 布局原则
- 暗色为主，绿色仅用于强调和 CTA
- 专辑封面/图片驱动的网格布局
- 固定底部播放控制栏
- 左侧导航栏 + 右侧主内容区`,
  },
  {
    id: 'nike',
    name: 'Nike',
    category: 'E-commerce',
    description: '单色 UI，巨大大写 Futura 字体，全出血摄影，运动零售美学',
    source: 'https://getdesign.md/nike/design-md',
    colors: {
      primary: '#111111',
      background: '#ffffff',
      surface: '#f5f5f5',
      text: '#111111',
      textSecondary: '#757575',
      border: '#e5e5e5',
      accent: '#111111',
      error: '#d43b2f',
      success: '#1db954',
    },
    fontStack: "'Futura', 'Helvetica Now', 'Inter', sans-serif",
    borderRadius: '30px',
    styleHint: 'monochrome, massive-uppercase, full-bleed-photography, athletic-retail, bold-type',
    fullPrompt: `## 设计规范：Nike 风格

你必须严格遵循以下设计语言生成 UI：

### 配色方案
- 主色: #111111（近黑）
- 页面背景: #ffffff
- 表面色: #f5f5f5
- 正文色: #111111
- 次要文字: #757575
- 边框: #e5e5e5
- 全局单色调，几乎没有彩色

### 排版
- 字体: Futura / Helvetica Now / Inter，全部大写标题
- 标题巨大（48-80px），全部大写，粗体
- 正文 16px，简洁直接

### 组件风格
- 按钮: 圆角 30px（大圆角）
- 主按钮: 黑色背景白色文字
- 次按钮: 白色背景黑色文字，黑色边框
- 产品卡片: 简洁白色背景，大产品图

### 布局原则
- 全出血大图摄影
- 巨大标题叠加大图
- 极简单色，运动感力量感
- 产品网格 2-4 列`,
  },
  {
    id: 'figma',
    name: 'Figma',
    category: 'Design Tools',
    description: '多彩活力的协作设计工具，鲜艳配色，专业且友好的界面',
    source: 'https://getdesign.md/figma/design-md',
    colors: {
      primary: '#0d99ff',
      background: '#ffffff',
      surface: '#f5f5f5',
      text: '#333333',
      textSecondary: '#888888',
      border: '#e5e5e5',
      accent: '#a259ff',
      error: '#f24822',
      success: '#14ae5c',
    },
    fontStack: "'Inter', -apple-system, 'PingFang SC', sans-serif",
    borderRadius: '8px',
    styleHint: 'vibrant-multi-color, playful-professional, design-tool, collaborative',
    fullPrompt: `## 设计规范：Figma 风格

你必须严格遵循以下设计语言生成 UI：

### 配色方案
- 主色: #0d99ff（Figma 蓝）
- 页面背景: #ffffff
- 表面色: #f5f5f5
- 正文色: #333333
- 次要文字: #888888
- 边框: #e5e5e5
- 多彩点缀: #a259ff（紫）、#f24822（红）、#0d99ff（蓝）、#14ae5c（绿）
- 错误色: #f24822，成功色: #14ae5c

### 排版
- 字体: Inter / system-ui
- 标题 24-40px / 正文 14-16px
- 友好且专业的语调

### 组件风格
- 按钮: 圆角 8px
- 主按钮: 背景 #0d99ff 白色文字
- 可使用多彩配色做装饰点缀
- 卡片: 白色背景，圆角 12px，柔和阴影

### 布局原则
- 活力多彩但不花哨
- 专业设计工具的视觉风格
- 清晰的功能分区
- 适当使用渐变和多彩元素`,
  },
  {
    id: 'supabase',
    name: 'Supabase',
    category: 'Backend & Database',
    description: '暗黑翡翠主题，代码优先的开源 Firebase 替代品，深色开发者工具美学',
    source: 'https://getdesign.md/supabase/design-md',
    colors: {
      primary: '#3ecf8e',
      background: '#1c1c1c',
      surface: '#232323',
      text: '#ededed',
      textSecondary: '#8f8f8f',
      border: '#333333',
      accent: '#3ecf8e',
      error: '#eb5757',
      success: '#3ecf8e',
    },
    fontStack: "'Inter', -apple-system, 'PingFang SC', sans-serif",
    borderRadius: '8px',
    styleHint: 'dark-emerald, code-first, open-source, developer-tool, dashboard-aesthetic',
    fullPrompt: `## 设计规范：Supabase 风格

你必须严格遵循以下设计语言生成 UI：

### 配色方案
- 主色: #3ecf8e（翡翠绿）
- 页面背景: #1c1c1c（深灰黑）
- 表面色: #232323
- 正文色: #ededed
- 次要文字: #8f8f8f
- 边框: #333333
- 错误色: #eb5757
- 代码区域背景更深 #171717

### 排版
- 字体: Inter / system-ui
- 标题 24-48px / 正文 14-16px
- 代码使用等宽字体

### 组件风格
- 按钮: 圆角 4-8px
- 主按钮: 背景 #3ecf8e 深色文字
- 卡片: 背景 #232323，边框 #333333
- 代码块: 深色背景 + 语法高亮
- 输入框: 深色背景 #171717

### 布局原则
- 暗色开发者工具美学
- 代码片段和仪表盘面板为主
- 翡翠绿仅用于 CTA 和强调
- 开源/技术感`,
  },
  {
    id: 'cursor',
    name: 'Cursor',
    category: 'Developer Tools',
    description: 'AI 代码编辑器，深色界面，渐变点缀，开发者中心的暗色主题',
    source: 'https://getdesign.md/cursor/design-md',
    colors: {
      primary: '#7c3aed',
      background: '#0a0a0f',
      surface: '#13131a',
      text: '#e5e7eb',
      textSecondary: '#6b7280',
      border: '#1f1f2e',
      accent: '#818cf8',
      error: '#ef4444',
      success: '#22c55e',
    },
    fontStack: "'Inter', -apple-system, 'PingFang SC', sans-serif",
    borderRadius: '8px',
    styleHint: 'dark-ide, gradient-accents, developer-centric, purple-indigo',
    fullPrompt: `## 设计规范：Cursor 风格

你必须严格遵循以下设计语言生成 UI：

### 配色方案
- 主色: #7c3aed（紫色）
- 页面背景: #0a0a0f（深黑）
- 表面色: #13131a
- 正文色: #e5e7eb
- 次要文字: #6b7280
- 边框: #1f1f2e
- 强调色: #818cf8（浅靛蓝）
- 错误色: #ef4444，成功色: #22c55e

### 排版
- 字体: Inter / system-ui
- 标题 24-40px / 正文 14-16px
- 代码使用等宽字体

### 组件风格
- 按钮: 圆角 8px
- 主按钮: 背景 #7c3aed 白色文字
- 卡片: 背景 #13131a，边框 #1f1f2e
- 可使用紫色到蓝色的渐变作为装饰
- 暗色 IDE 风格

### 布局原则
- 深色编辑器/IDE 美学
- 渐变用于大气装饰而非功能
- 紧凑但不拥挤的信息密度
- 开发者为中心的设计`,
  },
  {
    id: 'framer',
    name: 'Framer',
    category: 'Design Tools',
    description: '大胆黑白蓝，动效优先，设计导向的网站构建器美学',
    source: 'https://getdesign.md/framer/design-md',
    colors: {
      primary: '#0055ff',
      background: '#ffffff',
      surface: '#f5f5f5',
      text: '#000000',
      textSecondary: '#666666',
      border: '#e0e0e0',
      accent: '#0055ff',
      error: '#ff3333',
      success: '#00cc44',
    },
    fontStack: "'Inter', -apple-system, 'PingFang SC', sans-serif",
    borderRadius: '12px',
    styleHint: 'bold-black-blue, motion-first, design-forward, website-builder',
    fullPrompt: `## 设计规范：Framer 风格

你必须严格遵循以下设计语言生成 UI：

### 配色方案
- 主色: #0055ff（Framer 蓝）
- 页面背景: #ffffff
- 表面色: #f5f5f5
- 正文色: #000000（纯黑）
- 次要文字: #666666
- 边框: #e0e0e0
- 错误色: #ff3333，成功色: #00cc44

### 排版
- 字体: Inter / system-ui
- 大胆标题，可使用超大字号（60-80px）
- 正文 16px，行高 1.5

### 组件风格
- 按钮: 大圆角（12-16px）
- 主按钮: 背景 #0055ff 白色文字
- 暗色按钮: 纯黑背景白色文字
- 卡片: 白色背景，大圆角，柔和阴影
- 强调微动效和交互暗示（注意：禁止 fadeIn/fadeInUp 等从不可见到可见的入场动画，只使用从最终状态出发的微动效如轻微缩放、呼吸脉冲等）

### 布局原则
- 大胆的排版和颜色使用
- 黑白蓝为主色调
- 设计感强烈
- 微动效优先的交互暗示（禁止入场动画，只用微动效）`,
  },
  {
    id: 'tesla',
    name: 'Tesla',
    category: 'Automotive',
    description: '极致减法设计，电影级全视口摄影，无装饰的功能主义',
    source: 'https://getdesign.md/tesla/design-md',
    colors: {
      primary: '#ffffff',
      background: '#000000',
      surface: '#1a1a1a',
      text: '#ffffff',
      textSecondary: '#999999',
      border: '#333333',
      accent: '#ffffff',
      error: '#ff4444',
      success: '#00cc44',
    },
    fontStack: "'Inter', -apple-system, 'PingFang SC', sans-serif",
    borderRadius: '4px',
    styleHint: 'radical-subtraction, cinematic-photography, minimalist, futuristic, black-canvas',
    fullPrompt: `## 设计规范：Tesla 风格

你必须严格遵循以下设计语言生成 UI：

### 配色方案
- 主色: #ffffff（白色）
- 页面背景: #000000（纯黑）
- 表面色: #1a1a1a
- 正文色: #ffffff
- 次要文字: #999999
- 边框: #333333
- 极致黑白，几乎无彩色

### 排版
- 字体: system-ui / Inter
- 标题 40-60px，正文 16px
- 极简，大量留白

### 组件风格
- 按钮: 圆角极小（4px）或药丸形
- 主按钮: 白色边框透明背景白色文字，hover 白色背景黑色文字
- 无多余装饰
- 全出血图片/视频区域

### 布局原则
- 全视口高度的图片/视频区块
- 极致减法设计
- 电影级视觉感
- 功能主义，零装饰`,
  },

  // ════════════════ 新增 25+ 规范（Phase 2） ════════════════

  // ── SaaS/Developer ──────────────────────────────────────────
  {
    id: 'github',
    name: 'GitHub',
    category: 'Developer Tools',
    description: '深色代码协作平台，单色高对比，Octocat 字符点缀，开发者原生的暗色 UI',
    source: 'https://primer.style',
    colors: {
      primary: '#1f883d',
      background: '#0d1117',
      surface: '#161b22',
      text: '#e6edf3',
      textSecondary: '#7d8590',
      border: '#30363d',
      accent: '#58a6ff',
      error: '#f85149',
      success: '#3fb950',
    },
    fontStack: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', 'PingFang SC', sans-serif",
    borderRadius: '6px',
    styleHint: 'dark-canvas, code-first, monochrome-base, dev-collab, octocat-green',
    fullPrompt: `## 设计规范：GitHub 风格

你必须严格遵循以下设计语言生成 UI：

### 配色方案
- 主色: #1f883d（GitHub 绿，用于 PR/合并/成功）
- 页面背景: #0d1117（深色画布）
- 表面色: #161b22（卡片/容器）
- 正文色: #e6edf3
- 次要文字: #7d8590
- 链接色: #58a6ff
- 边框: #30363d
- 错误色: #f85149

### 排版
- 字体: -apple-system / Segoe UI / Inter
- 等宽字体用于代码、路径、commit hash
- 标题 20-32px / 正文 14px / 辅助 12px

### 组件风格
- 按钮: 圆角 6px
- 主按钮: 背景 #238636（更深绿）白色文字
- 次按钮: 透明背景 + #30363d 边框
- 危险按钮: 背景 #da3633
- 卡片: 背景 #161b22，边框 #30363d

### 布局原则
- 全暗色画布，信息密度高
- 代码块、PR/Issue 列表为主要单元
- 顶部导航 + 左侧仓库树 + 主内容`,
    tags: ['dark-mode', 'developer-friendly', 'open-source', 'data-dense', 'monochrome'],
    industry: 'SaaS/Developer',
    mood: ['serious', 'professional', 'technical', 'focused'],
    lightMode: {
      primary: '#1f883d', background: '#ffffff', surface: '#f6f8fa', text: '#1f2328',
      textSecondary: '#59636e', border: '#d1d9e0', accent: '#0969da',
      error: '#cf222e', success: '#1a7f37',
    },
    darkMode: {
      primary: '#238636', background: '#0d1117', surface: '#161b22', text: '#e6edf3',
      textSecondary: '#7d8590', border: '#30363d', accent: '#58a6ff',
      error: '#f85149', success: '#3fb950',
    },
    spacing: 'normal',
    density: 'compact',
  },
  {
    id: 'gitlab',
    name: 'GitLab',
    category: 'Developer Tools',
    description: '紫红色调 DevOps 平台，单色渐进，CI/CD 流水线驱动，工程师友好',
    source: 'https://design.gitlab.com',
    colors: {
      primary: '#7759c2',
      background: '#ffffff',
      surface: '#fbfafd',
      text: '#1f1e24',
      textSecondary: '#5e5c70',
      border: '#e5e4ea',
      accent: '#fc6d26',
      error: '#db3b21',
      success: '#1aaa55',
    },
    fontStack: "-apple-system, BlinkMacSystemFont, 'Inter', 'PingFang SC', sans-serif",
    borderRadius: '4px',
    styleHint: 'tanuki-purple, devops-pipeline, single-color-monochrome, dev-friendly',
    fullPrompt: `## 设计规范：GitLab 风格

你必须严格遵循以下设计语言生成 UI：

### 配色方案
- 主色: #7759c2（Tanuki 紫）
- 页面背景: #ffffff
- 表面色: #fbfafd
- 正文色: #1f1e24
- 次要文字: #5e5c70
- 链接/强调: #fc6d26（橙色，CI 状态用）
- 边框: #e5e4ea
- 错误色: #db3b21

### 排版
- 字体: -apple-system / Inter
- 标题 24-32px / 正文 14-16px
- 等宽字体用于代码

### 组件风格
- 按钮: 圆角 4px
- 主按钮: 背景 #7759c2 白色文字
- 次按钮: 白色背景 + 紫色边框
- 状态徽章: 圆形色块（成功绿/运行蓝/失败红/待办橙）
- 卡片: 白色背景，1px 边框

### 布局原则
- 流水线/阶段条为视觉特征
- 高信息密度
- 顶部导航 + 侧边栏 + 主内容`,
    tags: ['developer-friendly', 'open-source', 'data-dense', 'light-mode'],
    industry: 'SaaS/Developer',
    mood: ['professional', 'serious', 'technical', 'precise'],
    lightMode: {
      primary: '#7759c2', background: '#ffffff', surface: '#fbfafd', text: '#1f1e24',
      textSecondary: '#5e5c70', border: '#e5e4ea', accent: '#fc6d26',
      error: '#db3b21', success: '#1aaa55',
    },
    darkMode: {
      primary: '#a989f2', background: '#1a1a1a', surface: '#222227', text: '#ececef',
      textSecondary: '#9a9aa3', border: '#383838', accent: '#f78c40',
      error: '#ec5e44', success: '#52d273',
    },
    spacing: 'normal',
    density: 'compact',
  },
  {
    id: 'cloudflare',
    name: 'Cloudflare',
    category: 'Developer Tools',
    description: '橙黄网络基础设施品牌，仪表盘驱动，深色 + 鲜橙高对比',
    source: 'https://developers.cloudflare.com',
    colors: {
      primary: '#f38020',
      background: '#1d1d1d',
      surface: '#262626',
      text: '#ffffff',
      textSecondary: '#b3b3b3',
      border: '#3a3a3a',
      accent: '#fbad41',
      error: '#fa3f3f',
      success: '#13a463',
    },
    fontStack: "-apple-system, 'Inter', 'PingFang SC', sans-serif",
    borderRadius: '4px',
    styleHint: 'infrastructure-dashboard, dark-with-orange, data-dense, cdn-control',
    fullPrompt: `## 设计规范：Cloudflare 风格

你必须严格遵循以下设计语言生成 UI：

### 配色方案
- 主色: #f38020（Cloudflare 橙）
- 页面背景: #1d1d1d（深色）
- 表面色: #262626
- 正文色: #ffffff
- 次要文字: #b3b3b3
- 边框: #3a3a3a
- 强调色: #fbad41（浅橙）

### 排版
- 字体: -apple-system / Inter
- 标题 20-28px / 正文 14px / 辅助 12px
- 等宽数字（tabular-nums）用于指标

### 组件风格
- 按钮: 圆角 4px
- 主按钮: 背景 #f38020 深色文字
- 卡片: 背景 #262626 边框 #3a3a3a
- 表格: 紧凑行高，斑马纹可选

### 布局原则
- 网络/基础设施仪表盘
- 高密度表格、状态徽章、流量图
- 顶部导航 + 侧边栏 + 主内容`,
    tags: ['developer-friendly', 'data-dense', 'dark-mode', 'dashboard'],
    industry: 'SaaS/Developer',
    mood: ['serious', 'technical', 'precise', 'professional'],
    lightMode: {
      primary: '#f38020', background: '#ffffff', surface: '#f7f7f7', text: '#1d1d1d',
      textSecondary: '#5e6166', border: '#e0e0e0', accent: '#fbad41',
      error: '#fa3f3f', success: '#13a463',
    },
    darkMode: {
      primary: '#f38020', background: '#1d1d1d', surface: '#262626', text: '#ffffff',
      textSecondary: '#b3b3b3', border: '#3a3a3a', accent: '#fbad41',
      error: '#fa3f3f', success: '#13a463',
    },
    spacing: 'tight',
    density: 'compact',
  },
  {
    id: 'datadog',
    name: 'Datadog',
    category: 'Developer Tools',
    description: '紫红监控 SaaS，深色仪表盘，可视化图表密集，运维/SRE 工具美学',
    source: 'https://www.datadoghq.com/dg/monitor/',
    colors: {
      primary: '#632ca6',
      background: '#1b1c1f',
      surface: '#242529',
      text: '#e8e8e8',
      textSecondary: '#9ea1ab',
      border: '#36373c',
      accent: '#774aa4',
      error: '#e10d0d',
      success: '#7d3aaf',
    },
    fontStack: "'Inter', -apple-system, sans-serif",
    borderRadius: '4px',
    styleHint: 'observability-dashboard, sre-friendly, chart-dense, dark-with-purple',
    fullPrompt: `## 设计规范：Datadog 风格

你必须严格遵循以下设计语言生成 UI：

### 配色方案
- 主色: #632ca6（深紫）
- 页面背景: #1b1c1f
- 表面色: #242529
- 正文色: #e8e8e8
- 次要文字: #9ea1ab
- 边框: #36373c
- 数据可视化色板: #632ca6 / #f68d2e / #28b9b1 / #e10d0d

### 排版
- 字体: Inter
- 标题 18-24px / 正文 13-14px
- 数字使用等宽（tabular-nums）

### 组件风格
- 按钮: 圆角 4px
- 主按钮: 背景 #632ca6 白色文字
- 卡片: 背景 #242529，细边框
- 数据表/图表/状态徽章为主

### 布局原则
- 监控仪表盘，时间序列图、堆叠面积图为主
- 高信息密度
- 左侧导航 + 顶栏 + 多卡片网格`,
    tags: ['dark-mode', 'data-dense', 'dashboard', 'developer-friendly'],
    industry: 'SaaS/Developer',
    mood: ['serious', 'technical', 'precise', 'focused'],
    lightMode: {
      primary: '#632ca6', background: '#ffffff', surface: '#f5f5f7', text: '#16151a',
      textSecondary: '#5d5c66', border: '#dfdfe5', accent: '#774aa4',
      error: '#d6351d', success: '#7d3aaf',
    },
    darkMode: {
      primary: '#632ca6', background: '#1b1c1f', surface: '#242529', text: '#e8e8e8',
      textSecondary: '#9ea1ab', border: '#36373c', accent: '#774aa4',
      error: '#e10d0d', success: '#7d3aaf',
    },
    spacing: 'tight',
    density: 'compact',
  },
  {
    id: 'sentry',
    name: 'Sentry',
    category: 'Developer Tools',
    description: '暗紫红错误监控平台，单色调，开发者中心，事件驱动',
    source: 'https://sentry.io/branding/',
    colors: {
      primary: '#6c5fc7',
      background: '#2f2936',
      surface: '#3c3543',
      text: '#ebe9ef',
      textSecondary: '#a39fb1',
      border: '#4a4351',
      accent: '#f5544d',
      error: '#f5544d',
      success: '#3bb28f',
    },
    fontStack: "'Rubik', 'Inter', -apple-system, sans-serif",
    borderRadius: '6px',
    styleHint: 'error-monitoring, dark-violet, event-stream, dev-friendly',
    fullPrompt: `## 设计规范：Sentry 风格

你必须严格遵循以下设计语言生成 UI：

### 配色方案
- 主色: #6c5fc7（Sentry 紫）
- 页面背景: #2f2936
- 表面色: #3c3543
- 正文色: #ebe9ef
- 次要文字: #a39fb1
- 边框: #4a4351
- 错误/严重状态: #f5544d

### 排版
- 字体: Rubik / Inter
- 标题 20-32px / 正文 14px
- 堆栈/日志用等宽字体

### 组件风格
- 按钮: 圆角 6px
- 主按钮: 背景 #6c5fc7 白色文字
- 错误徽章: 红色填充，醒目
- 卡片: 背景 #3c3543 细边框

### 布局原则
- 错误流/事件列表为主
- 严重程度颜色编码（critical/error/warning/info）
- 暗色 + 紫色强调`,
    tags: ['dark-mode', 'developer-friendly', 'data-dense', 'dashboard'],
    industry: 'SaaS/Developer',
    mood: ['serious', 'technical', 'focused', 'professional'],
    lightMode: {
      primary: '#6c5fc7', background: '#ffffff', surface: '#f7f5fa', text: '#1d1825',
      textSecondary: '#5b5563', border: '#e0dde5', accent: '#f5544d',
      error: '#f5544d', success: '#3bb28f',
    },
    darkMode: {
      primary: '#6c5fc7', background: '#2f2936', surface: '#3c3543', text: '#ebe9ef',
      textSecondary: '#a39fb1', border: '#4a4351', accent: '#f5544d',
      error: '#f5544d', success: '#3bb28f',
    },
    spacing: 'normal',
    density: 'compact',
  },
  {
    id: 'hashicorp',
    name: 'HashiCorp',
    category: 'Developer Tools',
    description: '基础设施即代码品牌，经典黑白配，深红 / 紫罗兰强调，工程师工具美学',
    source: 'https://www.hashicorp.com/brand',
    colors: {
      primary: '#000000',
      background: '#ffffff',
      surface: '#fafafa',
      text: '#1a1a1a',
      textSecondary: '#5a5a5a',
      border: '#d8d8d8',
      accent: '#7c3aed',
      error: '#d73a49',
      success: '#28a745',
    },
    fontStack: "'Inter', -apple-system, sans-serif",
    borderRadius: '4px',
    styleHint: 'infrastructure-as-code, mono-with-accent, dev-tools, precise',
    fullPrompt: `## 设计规范：HashiCorp 风格

你必须严格遵循以下设计语言生成 UI：

### 配色方案
- 主色: #000000（纯黑）
- 页面背景: #ffffff
- 表面色: #fafafa
- 正文色: #1a1a1a
- 次要文字: #5a5a5a
- 边框: #d8d8d8
- 强调色: #7c3ed5（紫罗兰）
- 错误色: #d73a49

### 排版
- 字体: Inter
- 标题 24-36px / 正文 16px
- HCL/代码/配置使用等宽字体

### 组件风格
- 按钮: 圆角 4px，紧凑
- 主按钮: 黑色背景白色文字
- 次按钮: 白色背景黑色文字 + 边框
- 代码块: 等宽字体，浅灰背景

### 布局原则
- 文档/CLI/控制台美学
- 大量代码示例
- 信息密度中等，结构清晰`,
    tags: ['developer-friendly', 'open-source', 'data-dense', 'light-mode'],
    industry: 'SaaS/Developer',
    mood: ['serious', 'technical', 'precise', 'professional'],
    lightMode: {
      primary: '#000000', background: '#ffffff', surface: '#fafafa', text: '#1a1a1a',
      textSecondary: '#5a5a5a', border: '#d8d8d8', accent: '#7c3ed5',
      error: '#d73a49', success: '#28a745',
    },
    darkMode: {
      primary: '#ffffff', background: '#0d0d0d', surface: '#1a1a1a', text: '#f0f0f0',
      textSecondary: '#9a9a9a', border: '#2e2e2e', accent: '#a78bfa',
      error: '#f87171', success: '#4ade80',
    },
    spacing: 'normal',
    density: 'normal',
  },
  {
    id: 'postman',
    name: 'Postman',
    category: 'Developer Tools',
    description: 'API 测试协作平台，橙色为主，HTTP 方法语义色编码，开发者原生',
    source: 'https://www.postman.com',
    colors: {
      primary: '#ff6c37',
      background: '#ffffff',
      surface: '#f5f5f5',
      text: '#212121',
      textSecondary: '#6b6b6b',
      border: '#e0e0e0',
      accent: '#f76949',
      error: '#ff5c5c',
      success: '#43c463',
    },
    fontStack: "'Inter', -apple-system, sans-serif",
    borderRadius: '4px',
    styleHint: 'api-tool, orange-action, http-method-colored, dev-friendly',
    fullPrompt: `## 设计规范：Postman 风格

你必须严格遵循以下设计语言生成 UI：

### 配色方案
- 主色: #ff6c37（Postman 橙）
- 页面背景: #ffffff
- 表面色: #f5f5f5
- 正文色: #212121
- 次要文字: #6b6b6b
- 边框: #e0e0e0
- HTTP 方法色: GET 绿 #43c463 / POST 橙 #ff9800 / PUT 蓝 #2196f3 / DELETE 红 #f44336

### 排版
- 字体: Inter
- 标题 20-28px / 正文 14px
- URL/JSON 用等宽字体

### 组件风格
- 按钮: 圆角 4px
- 主按钮: 背景 #ff6c37 白色文字
- HTTP 方法徽章: 圆角小块，方法名彩色
- 卡片: 白色背景，细边框

### 布局原则
- 左侧集合树 + 右侧请求编辑 + 响应预览
- 三栏式 API 工具布局
- 高信息密度`,
    tags: ['developer-friendly', 'data-dense', 'light-mode', 'landing-page'],
    industry: 'SaaS/Developer',
    mood: ['playful', 'technical', 'professional', 'energetic'],
    lightMode: {
      primary: '#ff6c37', background: '#ffffff', surface: '#f5f5f5', text: '#212121',
      textSecondary: '#6b6b6b', border: '#e0e0e0', accent: '#f76949',
      error: '#ff5c5c', success: '#43c463',
    },
    darkMode: {
      primary: '#ff6c37', background: '#1f1f1f', surface: '#2a2a2a', text: '#f0f0f0',
      textSecondary: '#9a9a9a', border: '#3a3a3a', accent: '#f76949',
      error: '#ff5c5c', success: '#43c463',
    },
    spacing: 'normal',
    density: 'compact',
  },

  // ── Fintech ──────────────────────────────────────────────────
  {
    id: 'plaid',
    name: 'Plaid',
    category: 'Fintech',
    description: '暗黑金融 API 平台，深色背景，薄荷绿点缀，极简专业',
    source: 'https://plaid.com',
    colors: {
      primary: '#000000',
      background: '#0a0a0a',
      surface: '#161616',
      text: '#ffffff',
      textSecondary: '#9e9e9e',
      border: '#262626',
      accent: '#00d09c',
      error: '#ff5a5f',
      success: '#00d09c',
    },
    fontStack: "'Inter', -apple-system, sans-serif",
    borderRadius: '8px',
    styleHint: 'dark-fintech, mint-accent, monospace-data, data-dense',
    fullPrompt: `## 设计规范：Plaid 风格

你必须严格遵循以下设计语言生成 UI：

### 配色方案
- 主色: #000000（黑）
- 页面背景: #0a0a0a
- 表面色: #161616
- 正文色: #ffffff
- 次要文字: #9e9e9e
- 强调色: #00d09c（薄荷绿）
- 边框: #262626

### 排版
- 字体: Inter
- 数字使用等宽字体（tabular-nums）
- 标题 24-40px / 正文 16px / 辅助 13px

### 组件风格
- 按钮: 圆角 8px
- 主按钮: 白色背景黑色文字
- 次按钮: 透明背景 + 白色边框
- 卡片: 背景 #161616 细边框

### 布局原则
- 金融数据密集型仪表盘
- 大量图表、表格
- 暗色 + 薄荷绿强调`,
    tags: ['dark-mode', 'minimal', 'finance', 'data-dense'],
    industry: 'Fintech',
    mood: ['serious', 'professional', 'precise', 'trustworthy'],
    lightMode: {
      primary: '#000000', background: '#ffffff', surface: '#f5f5f5', text: '#0a0a0a',
      textSecondary: '#5a5a5a', border: '#e0e0e0', accent: '#00a87e',
      error: '#dc2626', success: '#00a87e',
    },
    darkMode: {
      primary: '#000000', background: '#0a0a0a', surface: '#161616', text: '#ffffff',
      textSecondary: '#9e9e9e', border: '#262626', accent: '#00d09c',
      error: '#ff5a5f', success: '#00d09c',
    },
    spacing: 'normal',
    density: 'normal',
  },
  {
    id: 'robinhood',
    name: 'Robinhood',
    category: 'Fintech',
    description: '股票交易 App，深绿主色（曾用过经典绿），财富增长视觉驱动',
    source: 'https://robinhood.com',
    colors: {
      primary: '#00c805',
      background: '#ffffff',
      surface: '#f7f7f7',
      text: '#0a0a0a',
      textSecondary: '#5a5a5a',
      border: '#e0e0e0',
      accent: '#00c805',
      error: '#ff5000',
      success: '#00c805',
    },
    fontStack: "'Inter', -apple-system, sans-serif",
    borderRadius: '8px',
    styleHint: 'stock-trading, growth-green, data-dense, mobile-first',
    fullPrompt: `## 设计规范：Robinhood 风格

你必须严格遵循以下设计语言生成 UI：

### 配色方案
- 主色: #00c805（Robinhood 绿/涨色）
- 页面背景: #ffffff
- 表面色: #f7f7f7
- 正文色: #0a0a0a
- 次要文字: #5a5a5a
- 边框: #e0e0e0
- 跌色: #ff5000

### 排版
- 字体: Inter
- 数字使用等宽（tabular-nums）
- 股票代码、金额特别突出
- 标题 18-32px / 正文 14-16px

### 组件风格
- 按钮: 圆角 8px
- 主按钮: 背景 #00c805 白色文字
- 涨跌徽章: 绿涨红跌
- 卡片: 白色背景，圆角 12px

### 布局原则
- 移动端优先
- 资产列表 / 持仓 / 行情
- 大字号突出资产价格`,
    tags: ['finance', 'mobile-first', 'data-dense', 'light-mode'],
    industry: 'Fintech',
    mood: ['bold', 'energetic', 'professional', 'trustworthy'],
    lightMode: {
      primary: '#00c805', background: '#ffffff', surface: '#f7f7f7', text: '#0a0a0a',
      textSecondary: '#5a5a5a', border: '#e0e0e0', accent: '#00c805',
      error: '#ff5000', success: '#00c805',
    },
    darkMode: {
      primary: '#00c805', background: '#000000', surface: '#161616', text: '#ffffff',
      textSecondary: '#a0a0a0', border: '#262626', accent: '#00c805',
      error: '#ff5000', success: '#00c805',
    },
    spacing: 'normal',
    density: 'compact',
  },
  {
    id: 'coinbase',
    name: 'Coinbase',
    category: 'Fintech',
    description: '加密货币交易所，蓝色单色，专业稳健，crypto 友好',
    source: 'https://www.coinbase.com',
    colors: {
      primary: '#0052ff',
      background: '#ffffff',
      surface: '#f5f8ff',
      text: '#050f58',
      textSecondary: '#5b616e',
      border: '#d0d4dc',
      accent: '#0052ff',
      error: '#cf202f',
      success: '#05b169',
    },
    fontStack: "'Inter', -apple-system, sans-serif",
    borderRadius: '8px',
    styleHint: 'crypto-blue, single-color, data-dense, exchange',
    fullPrompt: `## 设计规范：Coinbase 风格

你必须严格遵循以下设计语言生成 UI：

### 配色方案
- 主色: #0052ff（Coinbase 蓝）
- 页面背景: #ffffff
- 表面色: #f5f8ff
- 正文色: #050f58
- 次要文字: #5b616e
- 边框: #d0d4dc
- 涨色: #05b169，跌色: #cf202f

### 排版
- 字体: Inter
- 数字使用等宽
- 标题 24-32px / 正文 14-16px
- 加密货币代码、金额、地址突出

### 组件风格
- 按钮: 圆角 8px
- 主按钮: 背景 #0052ff 白色文字
- 卡片: 白色背景，圆角 12px
- 状态徽章: 圆形小块

### 布局原则
- 交易对列表 / 行情 / 资产组合
- 大量数据展示
- 专业可靠`,
    tags: ['crypto', 'finance', 'minimal', 'data-dense'],
    industry: 'Fintech',
    mood: ['trustworthy', 'professional', 'precise', 'serious'],
    lightMode: {
      primary: '#0052ff', background: '#ffffff', surface: '#f5f8ff', text: '#050f58',
      textSecondary: '#5b616e', border: '#d0d4dc', accent: '#0052ff',
      error: '#cf202f', success: '#05b169',
    },
    darkMode: {
      primary: '#1652f0', background: '#0a0b0d', surface: '#16181d', text: '#eef0f3',
      textSecondary: '#9aa0aa', border: '#2c2f36', accent: '#5885ff',
      error: '#f06464', success: '#26c281',
    },
    spacing: 'normal',
    density: 'compact',
  },
  {
    id: 'alipay',
    name: 'Alipay',
    category: 'Fintech',
    description: '支付宝蓝，生活服务生态，蓝色单色为主，移动支付场景优化',
    source: 'https://opendocs.alipay.com',
    colors: {
      primary: '#1677ff',
      background: '#f5f5f5',
      surface: '#ffffff',
      text: '#1a1a1a',
      textSecondary: '#666666',
      border: '#e5e5e5',
      accent: '#1677ff',
      error: '#ff4d4f',
      success: '#52c41a',
    },
    fontStack: "-apple-system, 'PingFang SC', 'Microsoft YaHei', sans-serif",
    borderRadius: '8px',
    styleHint: 'mobile-payment, life-services, blue-monochrome, super-app',
    fullPrompt: `## 设计规范：支付宝 风格

你必须严格遵循以下设计语言生成 UI：

### 配色方案
- 主色: #1677ff（支付宝蓝）
- 页面背景: #f5f5f5
- 卡片/表面: #ffffff
- 正文色: #1a1a1a
- 次要文字: #666666
- 边框: #e5e5e5
- 错误色: #ff4d4f
- 成功色: #52c41a

### 排版
- 字体: PingFang SC / 苹方
- 标题 18-24px / 正文 14-16px / 辅助 12px
- 中文优先

### 组件风格
- 按钮: 圆角 8px
- 主按钮: 背景 #1677ff 白色文字
- 卡片: 白色背景，圆角 8-12px
- 金刚区/宫格: 4-5 列等宽图标网格

### 布局原则
- 移动端超级 App 模式
- 顶部 Banner + 金刚区 + 卡片流
- 底部 Tab Bar`,
    tags: ['mobile-first', 'finance', 'landing-page', 'light-mode'],
    industry: 'Fintech',
    mood: ['trustworthy', 'professional', 'friendly', 'reliable'],
    lightMode: {
      primary: '#1677ff', background: '#f5f5f5', surface: '#ffffff', text: '#1a1a1a',
      textSecondary: '#666666', border: '#e5e5e5', accent: '#1677ff',
      error: '#ff4d4f', success: '#52c41a',
    },
    darkMode: {
      primary: '#4096ff', background: '#17171a', surface: '#202125', text: '#e8e8ea',
      textSecondary: '#9a9a9f', border: '#2c2c30', accent: '#4096ff',
      error: '#ff7875', success: '#73d13d',
    },
    spacing: 'normal',
    density: 'compact',
  },
  {
    id: 'wechatpay',
    name: 'WeChat Pay',
    category: 'Fintech',
    description: '微信支付绿，生活 + 社交 + 支付生态融合，圆润友好',
    source: 'https://pay.weixin.qq.com',
    colors: {
      primary: '#07c160',
      background: '#ededed',
      surface: '#ffffff',
      text: '#191919',
      textSecondary: '#888888',
      border: '#e5e5e5',
      accent: '#07c160',
      error: '#fa5151',
      success: '#07c160',
    },
    fontStack: "-apple-system, 'PingFang SC', 'Microsoft YaHei', sans-serif",
    borderRadius: '4px',
    styleHint: 'wechat-ecosystem, green-action, super-app, mobile-first',
    fullPrompt: `## 设计规范：微信支付 风格

你必须严格遵循以下设计语言生成 UI：

### 配色方案
- 主色: #07c160（微信绿）
- 页面背景: #ededed
- 卡片/表面: #ffffff
- 正文色: #191919
- 次要文字: #888888
- 边框: #e5e5e5
- 错误色: #fa5151

### 排版
- 字体: PingFang SC
- 标题 18-22px / 正文 14-16px / 辅助 12px

### 组件风格
- 按钮: 圆角 4px
- 主按钮: 背景 #07c160 白色文字
- 卡片: 白色背景，圆角 4-8px
- 微信风格: 简洁、圆角小、信息密度高

### 布局原则
- 微信小程序 / 公众号 H5 美学
- 移动端优先
- 顶部导航 + 主体 + 底部操作区`,
    tags: ['mobile-first', 'finance', 'social', 'light-mode'],
    industry: 'Fintech',
    mood: ['friendly', 'trustworthy', 'professional', 'approachable'],
    lightMode: {
      primary: '#07c160', background: '#ededed', surface: '#ffffff', text: '#191919',
      textSecondary: '#888888', border: '#e5e5e5', accent: '#07c160',
      error: '#fa5151', success: '#07c160',
    },
    darkMode: {
      primary: '#07c160', background: '#111111', surface: '#1c1c1e', text: '#e8e8e8',
      textSecondary: '#9a9a9a', border: '#2c2c2e', accent: '#07c160',
      error: '#fa5151', success: '#07c160',
    },
    spacing: 'normal',
    density: 'compact',
  },

  // ── Consumer ─────────────────────────────────────────────────
  {
    id: 'adidas',
    name: 'Adidas',
    category: 'Consumer',
    description: '三道杠运动品牌，黑色为主，全出血运动摄影，强劲排版',
    source: 'https://www.adidas.com',
    colors: {
      primary: '#000000',
      background: '#ffffff',
      surface: '#f5f5f5',
      text: '#000000',
      textSecondary: '#666666',
      border: '#e0e0e0',
      accent: '#000000',
      error: '#e4002b',
      success: '#00a651',
    },
    fontStack: "'Adineue', 'Helvetica Neue', 'Inter', sans-serif",
    borderRadius: '0px',
    styleHint: 'three-stripes, athletic-bold, monochrome, full-bleed-photo',
    fullPrompt: `## 设计规范：Adidas 风格

你必须严格遵循以下设计语言生成 UI：

### 配色方案
- 主色: #000000（纯黑）
- 页面背景: #ffffff
- 表面色: #f5f5f5
- 正文色: #000000
- 次要文字: #666666
- 边框: #e0e0e0
- 强调色（限时/活动）: #e4002b（红）

### 排版
- 字体: Adineue / Helvetica Neue
- 大写标题，巨大字号（48-96px）
- 标题粗体、字间距紧凑

### 组件风格
- 按钮: 直角（0 圆角）或极小圆角
- 主按钮: 黑色背景白色文字
- 次按钮: 白色背景 + 黑色边框
- 产品图: 全出血大图

### 布局原则
- 三道杠 logo 风格
- 全出血运动摄影
- 黑白为主，红色仅用于活动/限时`,
    tags: ['monochrome', 'photography', 'editorial', 'landing-page'],
    industry: 'Consumer',
    mood: ['bold', 'athletic', 'confident', 'energetic'],
    lightMode: {
      primary: '#000000', background: '#ffffff', surface: '#f5f5f5', text: '#000000',
      textSecondary: '#666666', border: '#e0e0e0', accent: '#e4002b',
      error: '#e4002b', success: '#00a651',
    },
    darkMode: {
      primary: '#ffffff', background: '#000000', surface: '#161616', text: '#ffffff',
      textSecondary: '#a0a0a0', border: '#262626', accent: '#ff3358',
      error: '#ff3358', success: '#00c267',
    },
    spacing: 'normal',
    density: 'normal',
  },
  {
    id: 'patagonia',
    name: 'Patagonia',
    category: 'Consumer',
    description: '户外环保品牌，照片写实 + 朴素排版，环保主义美学',
    source: 'https://www.patagonia.com',
    colors: {
      primary: '#1f3a2e',
      background: '#f4f1ea',
      surface: '#ffffff',
      text: '#1f1f1f',
      textSecondary: '#5a5a5a',
      border: '#d4cfc0',
      accent: '#1f3a2e',
      error: '#b3261e',
      success: '#1f3a2e',
    },
    fontStack: "'Helvetica Neue', 'Inter', sans-serif",
    borderRadius: '0px',
    styleHint: 'outdoor-eco, documentary-photo, plain-type, sustainability',
    fullPrompt: `## 设计规范：Patagonia 风格

你必须严格遵循以下设计语言生成 UI：

### 配色方案
- 主色: #1f3a2e（深森林绿）
- 页面背景: #f4f1ea（米色/本色纸）
- 卡片/表面: #ffffff
- 正文色: #1f1f1f
- 次要文字: #5a5a5a
- 边框: #d4cfc0

### 排版
- 字体: Helvetica Neue / Inter
- 朴素排版，无装饰字重
- 标题 24-40px / 正文 16px
- 行高 1.6+

### 组件风格
- 按钮: 直角（0 圆角）
- 主按钮: 深绿背景白色文字
- 次按钮: 透明背景 + 深绿边框
- 卡片: 白色或米色背景，无阴影

### 布局原则
- 环保主义、户外探险摄影
- 大图 + 朴素文字
- 反对过度设计`,
    tags: ['photography', 'editorial', 'landing-page', 'light-mode'],
    industry: 'Consumer',
    mood: ['authentic', 'serious', 'calm', 'earthy'],
    lightMode: {
      primary: '#1f3a2e', background: '#f4f1ea', surface: '#ffffff', text: '#1f1f1f',
      textSecondary: '#5a5a5a', border: '#d4cfc0', accent: '#1f3a2e',
      error: '#b3261e', success: '#1f3a2e',
    },
    darkMode: {
      primary: '#5da583', background: '#0f1714', surface: '#1a201c', text: '#e8e4dc',
      textSecondary: '#9a958a', border: '#2e332e', accent: '#5da583',
      error: '#e87a72', success: '#5da583',
    },
    spacing: 'spacious',
    density: 'normal',
  },
  {
    id: 'hermes',
    name: 'Hermès',
    category: 'Consumer',
    description: '法国奢侈品牌，橙色调，米色 / 棕色基底，杂志感编辑排版',
    source: 'https://www.hermes.com',
    colors: {
      primary: '#f15a29',
      background: '#f8f4ec',
      surface: '#ffffff',
      text: '#1a1a1a',
      textSecondary: '#5a4a3a',
      border: '#d8c9b0',
      accent: '#f15a29',
      error: '#b3261e',
      success: '#1a5a3a',
    },
    fontStack: "'Didot', 'Bodoni', 'Times New Roman', 'PingFang SC', serif",
    borderRadius: '0px',
    styleHint: 'luxury-editorial, serif-typography, orange-pop, minimal-layout',
    fullPrompt: `## 设计规范：Hermès 风格

你必须严格遵循以下设计语言生成 UI：

### 配色方案
- 主色: #f15a29（爱马仕橙）
- 页面背景: #f8f4ec（米色）
- 表面色: #ffffff
- 正文色: #1a1a1a
- 次要文字: #5a4a3a（暖棕）
- 边框: #d8c9b0

### 排版
- 字体: Didot / Bodoni（衬线）+ PingFang SC
- 标题使用衬线字体增加奢华感
- 标题 32-64px / 正文 16px
- 字间距宽松（letter-spacing: 2-4px）

### 组件风格
- 按钮: 直角（0 圆角）
- 主按钮: 橙色背景白色文字
- 次按钮: 透明背景 + 橙边框
- 卡片: 无阴影，无圆角

### 布局原则
- 杂志感编辑排版
- 大量留白
- 摄影 + 衬线标题`,
    tags: ['editorial', 'minimal', 'photography', 'landing-page'],
    industry: 'Consumer',
    mood: ['luxurious', 'calm', 'editorial', 'elegant'],
    lightMode: {
      primary: '#f15a29', background: '#f8f4ec', surface: '#ffffff', text: '#1a1a1a',
      textSecondary: '#5a4a3a', border: '#d8c9b0', accent: '#f15a29',
      error: '#b3261e', success: '#1a5a3a',
    },
    darkMode: {
      primary: '#ff7e4d', background: '#1c1814', surface: '#2a241c', text: '#f4ece0',
      textSecondary: '#a89a82', border: '#3a3328', accent: '#ff7e4d',
      error: '#e87a72', success: '#4a9a6a',
    },
    spacing: 'spacious',
    density: 'airy',
  },
  {
    id: 'rivian',
    name: 'Rivian',
    category: 'Consumer',
    description: '电动 SUV / 皮卡品牌，黄色圆点 logo，自然色调，户外冒险美学',
    source: 'https://rivian.com',
    colors: {
      primary: '#2c3a2e',
      background: '#f4f3ee',
      surface: '#ffffff',
      text: '#1a1a1a',
      textSecondary: '#5a5a5a',
      border: '#d4d3cd',
      accent: '#d4b43c',
      error: '#b3261e',
      success: '#2c3a2e',
    },
    fontStack: "'GT America', 'Inter', sans-serif",
    borderRadius: '8px',
    styleHint: 'ev-adventure, nature-photo, olive-base, yellow-accent',
    fullPrompt: `## 设计规范：Rivian 风格

你必须严格遵循以下设计语言生成 UI：

### 配色方案
- 主色: #2c3a2e（深橄榄绿）
- 页面背景: #f4f3ee（自然米色）
- 表面色: #ffffff
- 正文色: #1a1a1a
- 次要文字: #5a5a5a
- 强调色: #d4b43c（黄铜/芥末黄）
- 边框: #d4d3cd

### 排版
- 字体: GT America / Inter
- 标题 32-56px / 正文 16-18px
- 行高 1.5+

### 组件风格
- 按钮: 圆角 8px
- 主按钮: 深绿背景白色文字
- 次按钮: 透明背景 + 深绿边框
- 卡片: 白色或米色，圆角 8-12px

### 布局原则
- 户外冒险主题
- 自然摄影（山、林、海）
- 大量留白`,
    tags: ['photography', 'minimal', 'editorial', 'landing-page'],
    industry: 'Consumer',
    mood: ['adventurous', 'calm', 'premium', 'earthy'],
    lightMode: {
      primary: '#2c3a2e', background: '#f4f3ee', surface: '#ffffff', text: '#1a1a1a',
      textSecondary: '#5a5a5a', border: '#d4d3cd', accent: '#d4b43c',
      error: '#b3261e', success: '#2c3a2e',
    },
    darkMode: {
      primary: '#9ab07c', background: '#0f1310', surface: '#1a1f1c', text: '#e8e6df',
      textSecondary: '#9a978c', border: '#2a2e2c', accent: '#e8cc60',
      error: '#e87a72', success: '#9ab07c',
    },
    spacing: 'spacious',
    density: 'airy',
  },

  // ── Media/AI ─────────────────────────────────────────────────
  {
    id: 'openai',
    name: 'OpenAI',
    category: 'Media/AI',
    description: 'AI 研究公司，黑白极致简洁，渐变紫点缀，编辑排版',
    source: 'https://openai.com',
    colors: {
      primary: '#000000',
      background: '#ffffff',
      surface: '#f9f9f9',
      text: '#000000',
      textSecondary: '#5a5a5a',
      border: '#e5e5e5',
      accent: '#8e8aff',
      error: '#ef4146',
      success: '#10a37f',
    },
    fontStack: "'Inter', -apple-system, 'PingFang SC', sans-serif",
    borderRadius: '8px',
    styleHint: 'ai-research, mono-with-accent, editorial, clean-type',
    fullPrompt: `## 设计规范：OpenAI 风格

你必须严格遵循以下设计语言生成 UI：

### 配色方案
- 主色: #000000（黑）
- 页面背景: #ffffff
- 表面色: #f9f9f9
- 正文色: #000000
- 次要文字: #5a5a5a
- 强调色: #8e8aff（淡紫，AI 暗示）
- 边框: #e5e5e5
- 错误色: #ef4146

### 排版
- 字体: Inter
- 标题 32-64px / 正文 16-18px
- 行高 1.5-1.6
- 字间距 -1px（标题）

### 组件风格
- 按钮: 圆角 8px
- 主按钮: 黑色背景白色文字
- 次按钮: 白色背景黑色文字 + 边框
- 卡片: 白色背景，细边框

### 布局原则
- 极致简洁
- 大量留白
- 编辑式排版
- 紫渐变作为唯一装饰`,
    tags: ['minimal', 'ai', 'editorial', 'landing-page'],
    industry: 'Media/AI',
    mood: ['serious', 'professional', 'futuristic', 'calm'],
    lightMode: {
      primary: '#000000', background: '#ffffff', surface: '#f9f9f9', text: '#000000',
      textSecondary: '#5a5a5a', border: '#e5e5e5', accent: '#8e8aff',
      error: '#ef4146', success: '#10a37f',
    },
    darkMode: {
      primary: '#ffffff', background: '#000000', surface: '#0d0d0d', text: '#ffffff',
      textSecondary: '#a0a0a0', border: '#262626', accent: '#a8a4ff',
      error: '#ff5a5f', success: '#1fc28c',
    },
    spacing: 'spacious',
    density: 'airy',
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    category: 'Media/AI',
    description: 'AI 安全公司，橙褐陶土色调，编辑式排版，温暖专业',
    source: 'https://www.anthropic.com',
    colors: {
      primary: '#cd6336',
      background: '#faf9f5',
      surface: '#ffffff',
      text: '#141413',
      textSecondary: '#5a5a58',
      border: '#e8e6dc',
      accent: '#cd6336',
      error: '#b3261e',
      success: '#1a7f4a',
    },
    fontStack: "'Styrene B', 'Inter', -apple-system, sans-serif",
    borderRadius: '6px',
    styleHint: 'ai-safety, terracotta-warm, editorial, claude-conversational',
    fullPrompt: `## 设计规范：Anthropic 风格

你必须严格遵循以下设计语言生成 UI：

### 配色方案
- 主色: #cd6336（陶土橙）
- 页面背景: #faf9f5（米白）
- 表面色: #ffffff
- 正文色: #141413（近黑）
- 次要文字: #5a5a58
- 边框: #e8e6dc
- 错误色: #b3261e

### 排版
- 字体: Inter
- 标题 32-56px / 正文 17px
- 行高 1.55
- 编辑排版风格

### 组件风格
- 按钮: 圆角 6px
- 主按钮: 橙背景白色文字
- 次按钮: 透明背景 + 橙边框
- 卡片: 白色背景，圆角 6-8px

### 布局原则
- 温暖编辑式
- 大量留白
- 学术研究风格`,
    tags: ['editorial', 'ai', 'minimal', 'landing-page'],
    industry: 'Media/AI',
    mood: ['warm', 'serious', 'thoughtful', 'professional'],
    lightMode: {
      primary: '#cd6336', background: '#faf9f5', surface: '#ffffff', text: '#141413',
      textSecondary: '#5a5a58', border: '#e8e6dc', accent: '#cd6336',
      error: '#b3261e', success: '#1a7f4a',
    },
    darkMode: {
      primary: '#e88863', background: '#1a1814', surface: '#262420', text: '#f0eee5',
      textSecondary: '#a09c8e', border: '#38352d', accent: '#e88863',
      error: '#e87a72', success: '#5cb27f',
    },
    spacing: 'spacious',
    density: 'normal',
  },
  {
    id: 'midjourney',
    name: 'Midjourney',
    category: 'Media/AI',
    description: 'AI 图像生成，深色 + 渐变光晕，梦境美学，艺术驱动',
    source: 'https://www.midjourney.com',
    colors: {
      primary: '#8e8aff',
      background: '#0d0d0d',
      surface: '#1a1a1a',
      text: '#ffffff',
      textSecondary: '#a0a0a0',
      border: '#262626',
      accent: '#b76aff',
      error: '#ff5a5f',
      success: '#00d09c',
    },
    fontStack: "'Inter', -apple-system, sans-serif",
    borderRadius: '12px',
    styleHint: 'ai-art, dark-dreamy, gradient-glow, gallery-driven',
    fullPrompt: `## 设计规范：Midjourney 风格

你必须严格遵循以下设计语言生成 UI：

### 配色方案
- 主色: #8e8aff（淡紫）
- 页面背景: #0d0d0d（深黑）
- 表面色: #1a1a1a
- 正文色: #ffffff
- 次要文字: #a0a0a0
- 边框: #262626
- 强调色: #b76aff（紫）

### 排版
- 字体: Inter
- 标题 24-48px / 正文 14-16px
- 艺术化排版，可使用衬线字体增加梦幻感

### 组件风格
- 按钮: 圆角 12px
- 主按钮: 紫渐变背景白色文字
- 次按钮: 透明背景 + 紫色边框
- 卡片: 背景 #1a1a1a，圆角 12px

### 布局原则
- 暗色画廊美学
- 图像网格为主
- 紫/蓝渐变光晕装饰`,
    tags: ['dark-mode', 'ai', 'editorial', 'gradient'],
    industry: 'Media/AI',
    mood: ['dreamy', 'artistic', 'futuristic', 'playful'],
    lightMode: {
      primary: '#8e8aff', background: '#faf9f5', surface: '#ffffff', text: '#141413',
      textSecondary: '#5a5a58', border: '#e8e6dc', accent: '#b76aff',
      error: '#b3261e', success: '#1a7f4a',
    },
    darkMode: {
      primary: '#8e8aff', background: '#0d0d0d', surface: '#1a1a1a', text: '#ffffff',
      textSecondary: '#a0a0a0', border: '#262626', accent: '#b76aff',
      error: '#ff5a5f', success: '#00d09c',
    },
    spacing: 'spacious',
    density: 'airy',
  },
  {
    id: 'perplexity',
    name: 'Perplexity',
    category: 'Media/AI',
    description: 'AI 搜索答案引擎，深色为主，青绿点缀，信息密度高',
    source: 'https://www.perplexity.ai',
    colors: {
      primary: '#20808d',
      background: '#1f1f1f',
      surface: '#282828',
      text: '#f7f7f7',
      textSecondary: '#a3a3a3',
      border: '#3a3a3a',
      accent: '#20b8aa',
      error: '#ff5a5f',
      success: '#20b8aa',
    },
    fontStack: "'Inter', -apple-system, sans-serif",
    borderRadius: '8px',
    styleHint: 'ai-search, dark-with-teal, data-dense, citation-driven',
    fullPrompt: `## 设计规范：Perplexity 风格

你必须严格遵循以下设计语言生成 UI：

### 配色方案
- 主色: #20808d（青绿）
- 页面背景: #1f1f1f
- 表面色: #282828
- 正文色: #f7f7f7
- 次要文字: #a3a3a3
- 边框: #3a3a3a
- 强调色: #20b8aa

### 排版
- 字体: Inter
- 标题 20-32px / 正文 14-16px
- 来源/引用使用紧凑等宽

### 组件风格
- 按钮: 圆角 8px
- 主按钮: 青绿背景深色文字
- 卡片: 背景 #282828 细边框
- 引用块: 左侧细线 + 浅色背景

### 布局原则
- 搜索/问答驱动
- 暗色画布，青绿强调
- 来源引用密集`,
    tags: ['dark-mode', 'ai', 'data-dense', 'minimal'],
    industry: 'Media/AI',
    mood: ['serious', 'professional', 'precise', 'focused'],
    lightMode: {
      primary: '#20808d', background: '#ffffff', surface: '#f7f7f7', text: '#1a1a1a',
      textSecondary: '#5a5a5a', border: '#e0e0e0', accent: '#20b8aa',
      error: '#dc2626', success: '#0d9488',
    },
    darkMode: {
      primary: '#20808d', background: '#1f1f1f', surface: '#282828', text: '#f7f7f7',
      textSecondary: '#a3a3a3', border: '#3a3a3a', accent: '#20b8aa',
      error: '#ff5a5f', success: '#20b8aa',
    },
    spacing: 'normal',
    density: 'compact',
  },

  // ── Social/Content ───────────────────────────────────────────
  {
    id: 'discord',
    name: 'Discord',
    category: 'Social/Content',
    description: '游戏社交平台，紫蓝品牌色，深色为主，频道/语音频道架构',
    source: 'https://discord.com/branding',
    colors: {
      primary: '#5865f2',
      background: '#2c2f33',
      surface: '#36393f',
      text: '#ffffff',
      textSecondary: '#b9bbbe',
      border: '#202225',
      accent: '#eb459e',
      error: '#ed4245',
      success: '#3ba55d',
    },
    fontStack: "'gg sans', 'Inter', -apple-system, sans-serif",
    borderRadius: '8px',
    styleHint: 'gaming-chat, blurple, dark-channel, voice-first',
    fullPrompt: `## 设计规范：Discord 风格

你必须严格遵循以下设计语言生成 UI：

### 配色方案
- 主色: #5865f2（Blurple）
- 页面背景: #2c2f33
- 表面色: #36393f
- 正文色: #ffffff
- 次要文字: #b9bbbe
- 边框: #202225
- 强调色: #eb459e

### 排版
- 字体: 'gg sans' / Inter
- 标题 16-20px / 正文 14-15px
- 用户名、频道名高亮

### 组件风格
- 按钮: 圆角 8px
- 主按钮: 背景 #5865f2 白色文字
- 卡片: 背景 #36393f
- 用户头像: 圆形

### 布局原则
- 三栏：服务器列表 + 频道列表 + 消息
- 暗色 + Blurple 强调
- 语音/视频通话区域`,
    tags: ['dark-mode', 'chat', 'social', 'playful'],
    industry: 'Social/Content',
    mood: ['playful', 'casual', 'community', 'energetic'],
    lightMode: {
      primary: '#5865f2', background: '#ffffff', surface: '#f2f3f5', text: '#060607',
      textSecondary: '#4f5660', border: '#e3e5e8', accent: '#eb459e',
      error: '#ed4245', success: '#3ba55d',
    },
    darkMode: {
      primary: '#5865f2', background: '#2c2f33', surface: '#36393f', text: '#ffffff',
      textSecondary: '#b9bbbe', border: '#202225', accent: '#eb459e',
      error: '#ed4245', success: '#3ba55d',
    },
    spacing: 'tight',
    density: 'compact',
  },
  {
    id: 'telegram',
    name: 'Telegram',
    category: 'Social/Content',
    description: '即时通讯，蓝绿主色，云端原生，圆角气泡',
    source: 'https://telegram.org',
    colors: {
      primary: '#0088cc',
      background: '#ffffff',
      surface: '#f4f4f5',
      text: '#0a0a0a',
      textSecondary: '#707579',
      border: '#d6d6d6',
      accent: '#0088cc',
      error: '#e53935',
      success: '#4caf50',
    },
    fontStack: "-apple-system, 'Inter', 'PingFang SC', sans-serif",
    borderRadius: '12px',
    styleHint: 'messenger, blue-bubble, cloud-native, mobile-first',
    fullPrompt: `## 设计规范：Telegram 风格

你必须严格遵循以下设计语言生成 UI：

### 配色方案
- 主色: #0088cc（Telegram 蓝）
- 页面背景: #ffffff
- 表面色: #f4f4f5
- 正文色: #0a0a0a
- 次要文字: #707579
- 边框: #d6d6d6
- 错误色: #e53935

### 排版
- 字体: -apple-system / Inter
- 标题 16-20px / 正文 14-15px

### 组件风格
- 按钮: 圆角 12px
- 主按钮: 背景 #0088cc 白色文字
- 消息气泡: 圆角 12px，蓝底白字（自己）/ 灰底黑字（对方）
- 卡片: 白色背景，圆角 8px

### 布局原则
- 聊天列表 + 对话窗口
- 蓝绿色调
- 移动端优先`,
    tags: ['chat', 'social', 'mobile-first', 'light-mode'],
    industry: 'Social/Content',
    mood: ['friendly', 'casual', 'reliable', 'simple'],
    lightMode: {
      primary: '#0088cc', background: '#ffffff', surface: '#f4f4f5', text: '#0a0a0a',
      textSecondary: '#707579', border: '#d6d6d6', accent: '#0088cc',
      error: '#e53935', success: '#4caf50',
    },
    darkMode: {
      primary: '#40a7e3', background: '#0e1621', surface: '#17212b', text: '#f5f5f5',
      textSecondary: '#708499', border: '#0e1621', accent: '#40a7e3',
      error: '#ff6b6b', success: '#50c878',
    },
    spacing: 'normal',
    density: 'compact',
  },
  {
    id: 'slack',
    name: 'Slack',
    category: 'Social/Content',
    description: '企业协作平台，四色品牌（青/紫/绿/黄），频道化沟通',
    source: 'https://slack.com',
    colors: {
      primary: '#611f69',
      background: '#ffffff',
      surface: '#f8f8f8',
      text: '#1d1c1d',
      textSecondary: '#5a5a5a',
      border: '#e8e8e8',
      accent: '#ecb22e',
      error: '#e01e5a',
      success: '#2bac76',
    },
    fontStack: "'Slack-Lato', 'Lato', 'Inter', sans-serif",
    borderRadius: '8px',
    styleHint: 'work-chat, four-color-brand, channel-based, friendly',
    fullPrompt: `## 设计规范：Slack 风格

你必须严格遵循以下设计语言生成 UI：

### 配色方案
- 主色: #611f69（Aubergine 茄紫）
- 强调色四色: #36c5f0（青）/ #ecb22e（黄）/ #2bac76（绿）/ #e01e5a（红）
- 页面背景: #ffffff
- 表面色: #f8f8f8
- 正文色: #1d1c1d
- 次要文字: #5a5a5a
- 边框: #e8e8e8

### 排版
- 字体: Lato / Inter
- 标题 18-24px / 正文 15px
- 频道名 @ 提及高亮

### 组件风格
- 按钮: 圆角 8px
- 主按钮: 紫色背景白色文字
- 卡片: 白色背景，细边框
- 徽章: 彩色小圆点表示未读

### 布局原则
- 左侧工作区 + 频道 + 主消息区 + 右侧详情
- 四色点缀让频道分类清晰`,
    tags: ['chat', 'productivity', 'playful', 'light-mode'],
    industry: 'Social/Content',
    mood: ['friendly', 'casual', 'playful', 'professional'],
    lightMode: {
      primary: '#611f69', background: '#ffffff', surface: '#f8f8f8', text: '#1d1c1d',
      textSecondary: '#5a5a5a', border: '#e8e8e8', accent: '#ecb22e',
      error: '#e01e5a', success: '#2bac76',
    },
    darkMode: {
      primary: '#4a154b', background: '#1a1a1a', surface: '#222529', text: '#f5f5f5',
      textSecondary: '#9a9a9a', border: '#36373c', accent: '#ecb22e',
      error: '#e01e5a', success: '#2bac76',
    },
    spacing: 'normal',
    density: 'compact',
  },
  {
    id: 'twitterx',
    name: 'Twitter / X',
    category: 'Social/Content',
    description: 'X 社交平台，纯黑极简，对话驱动，单色高对比',
    source: 'https://x.com',
    colors: {
      primary: '#000000',
      background: '#ffffff',
      surface: '#f7f7f7',
      text: '#0f1419',
      textSecondary: '#5a5a5a',
      border: '#eff3f4',
      accent: '#1d9bf0',
      error: '#f4212e',
      success: '#00ba7c',
    },
    fontStack: "'TwitterChirp', -apple-system, 'Inter', sans-serif",
    borderRadius: '9999px',
    styleHint: 'social-feed, mono-black, conversation-driven, single-color',
    fullPrompt: `## 设计规范：Twitter/X 风格

你必须严格遵循以下设计语言生成 UI：

### 配色方案
- 主色: #000000（纯黑）
- 页面背景: #ffffff
- 表面色: #f7f7f7
- 正文色: #0f1419
- 次要文字: #5a5a5a
- 链接/品牌: #1d9bf0（X 蓝）
- 边框: #eff3f4
- 错误: #f4212e
- 成功/转发: #00ba7c

### 排版
- 字体: TwitterChirp / -apple-system
- 标题 20-32px / 正文 15-17px
- 用户名 @ handle 灰色

### 组件风格
- 按钮: 圆角 9999px（药丸形）
- 主按钮: 黑色背景白色文字
- 次按钮: 透明 + 黑色边框
- 卡片: 白色背景，无圆角

### 布局原则
- 三栏：导航 + 信息流 + 推荐
- 推文卡片用 1px 灰色边框分隔
- 极简黑白`,
    tags: ['social', 'minimal', 'dark-mode', 'monochrome'],
    industry: 'Social/Content',
    mood: ['bold', 'casual', 'editorial', 'energetic'],
    lightMode: {
      primary: '#000000', background: '#ffffff', surface: '#f7f7f7', text: '#0f1419',
      textSecondary: '#5a5a5a', border: '#eff3f4', accent: '#1d9bf0',
      error: '#f4212e', success: '#00ba7c',
    },
    darkMode: {
      primary: '#ffffff', background: '#000000', surface: '#16181c', text: '#e7e9ea',
      textSecondary: '#71767b', border: '#2f3336', accent: '#1d9bf0',
      error: '#f4212e', success: '#00ba7c',
    },
    spacing: 'normal',
    density: 'compact',
  },
  {
    id: 'substack',
    name: 'Substack',
    category: 'Social/Content',
    description: '邮件订阅出版平台，橙红色调，杂志感编辑排版，纯净阅读',
    source: 'https://substack.com',
    colors: {
      primary: '#ff6719',
      background: '#ffffff',
      surface: '#faf9f6',
      text: '#1a1a1a',
      textSecondary: '#5a5a5a',
      border: '#e5e3da',
      accent: '#ff6719',
      error: '#b3261e',
      success: '#0d8050',
    },
    fontStack: "'Charter', 'Georgia', 'PingFang SC', serif",
    borderRadius: '4px',
    styleHint: 'newsletter, magazine-editorial, serif-type, reading-first',
    fullPrompt: `## 设计规范：Substack 风格

你必须严格遵循以下设计语言生成 UI：

### 配色方案
- 主色: #ff6719（橙红）
- 页面背景: #ffffff
- 表面色: #faf9f6（米色）
- 正文色: #1a1a1a
- 次要文字: #5a5a5a
- 边框: #e5e3da

### 排版
- 字体: Charter / Georgia（衬线）+ PingFang SC
- 标题 28-48px / 正文 18-20px
- 行高 1.7+
- 阅读优先

### 组件风格
- 按钮: 圆角 4px
- 主按钮: 橙红背景白色文字
- 次按钮: 透明背景 + 橙红边框
- 卡片: 白色或米色，无圆角或极小

### 布局原则
- 文章/帖子为主
- 杂志感编辑排版
- 衬线字体营造阅读氛围`,
    tags: ['editorial', 'media', 'minimal', 'landing-page'],
    industry: 'Social/Content',
    mood: ['editorial', 'calm', 'authentic', 'thoughtful'],
    lightMode: {
      primary: '#ff6719', background: '#ffffff', surface: '#faf9f6', text: '#1a1a1a',
      textSecondary: '#5a5a5a', border: '#e5e3da', accent: '#ff6719',
      error: '#b3261e', success: '#0d8050',
    },
    darkMode: {
      primary: '#ff7e3d', background: '#1a1814', surface: '#262420', text: '#f0eee5',
      textSecondary: '#a09c8e', border: '#38352d', accent: '#ff7e3d',
      error: '#e87a72', success: '#3aa678',
    },
    spacing: 'spacious',
    density: 'normal',
  },
  {
    id: 'arc',
    name: 'Arc Browser',
    category: 'Social/Content',
    description: 'Arc 浏览器，渐变紫色单色，现代化浏览器美学，工具栏 + 空间',
    source: 'https://arc.net',
    colors: {
      primary: '#5b3aff',
      background: '#fafaf6',
      surface: '#ffffff',
      text: '#1a1a1a',
      textSecondary: '#5a5a5a',
      border: '#e5e3da',
      accent: '#ff5b3a',
      error: '#e53935',
      success: '#4caf50',
    },
    fontStack: "'Inter', -apple-system, sans-serif",
    borderRadius: '12px',
    styleHint: 'browser-tool, gradient-purple, playful-modern, space-driven',
    fullPrompt: `## 设计规范：Arc Browser 风格

你必须严格遵循以下设计语言生成 UI：

### 配色方案
- 主色: #5b3aff（Arc 紫）
- 页面背景: #fafaf6（米白）
- 表面色: #ffffff
- 正文色: #1a1a1a
- 次要文字: #5a5a5a
- 强调色: #ff5b3a（橙红）
- 边框: #e5e3da

### 排版
- 字体: Inter
- 标题 20-40px / 正文 14-16px
- 现代、圆润

### 组件风格
- 按钮: 圆角 12px
- 主按钮: 紫色背景白色文字
- 次按钮: 透明背景 + 紫边框
- 卡片: 白色背景，圆角 12-16px
- 侧边栏: 圆角悬浮卡片

### 布局原则
- 浏览器美学
- 侧边栏 + 主内容
- 紫渐变作为唯一装饰`,
    tags: ['editorial', 'playful', 'minimal', 'gradient'],
    industry: 'Social/Content',
    mood: ['playful', 'modern', 'innovative', 'casual'],
    lightMode: {
      primary: '#5b3aff', background: '#fafaf6', surface: '#ffffff', text: '#1a1a1a',
      textSecondary: '#5a5a5a', border: '#e5e3da', accent: '#ff5b3a',
      error: '#e53935', success: '#4caf50',
    },
    darkMode: {
      primary: '#8a73ff', background: '#1a1a1f', surface: '#262630', text: '#f0f0f0',
      textSecondary: '#9a9aa3', border: '#383842', accent: '#ff7b5a',
      error: '#ff6b6b', success: '#6ecf6e',
    },
    spacing: 'normal',
    density: 'normal',
  },

  // ── E-commerce ───────────────────────────────────────────────
  {
    id: 'shopify',
    name: 'Shopify',
    category: 'E-commerce',
    description: '电商 SaaS 平台，绿色主色，友好专业，商户后台美学',
    source: 'https://polaris.shopify.com',
    colors: {
      primary: '#008060',
      background: '#f6f6f7',
      surface: '#ffffff',
      text: '#1a1a1a',
      textSecondary: '#5a5a5a',
      border: '#e1e3e5',
      accent: '#5c6ac4',
      error: '#bf0711',
      success: '#008060',
    },
    fontStack: "-apple-system, 'Inter', sans-serif",
    borderRadius: '8px',
    styleHint: 'merchant-friendly, green-action, e-commerce-backstage, approachable',
    fullPrompt: `## 设计规范：Shopify 风格

你必须严格遵循以下设计语言生成 UI：

### 配色方案
- 主色: #008060（Shopify 绿）
- 页面背景: #f6f6f7
- 表面色: #ffffff
- 正文色: #1a1a1a
- 次要文字: #5a5a5a
- 边框: #e1e3e5
- 强调色: #5c6ac4（Indigo）

### 排版
- 字体: -apple-system / Inter
- 标题 16-20px / 正文 14px
- 等宽字体用于 SKU/订单号

### 组件风格
- 按钮: 圆角 8px
- 主按钮: 背景 #008060 白色文字
- 次按钮: 白色背景 + 绿边框
- 卡片: 白色背景，圆角 8px

### 布局原则
- 商户后台美学
- 顶栏 + 侧边栏 + 列表/详情
- 数据 + 订单驱动`,
    tags: ['e-commerce', 'landing-page', 'playful', 'data-dense'],
    industry: 'E-commerce',
    mood: ['friendly', 'professional', 'reliable', 'approachable'],
    lightMode: {
      primary: '#008060', background: '#f6f6f7', surface: '#ffffff', text: '#1a1a1a',
      textSecondary: '#5a5a5a', border: '#e1e3e5', accent: '#5c6ac4',
      error: '#bf0711', success: '#008060',
    },
    darkMode: {
      primary: '#00a47a', background: '#1a1a1a', surface: '#262626', text: '#f0f0f0',
      textSecondary: '#9a9a9a', border: '#3a3a3a', accent: '#7c8aff',
      error: '#e34850', success: '#00a47a',
    },
    spacing: 'normal',
    density: 'compact',
  },
  {
    id: 'stripe_atlas',
    name: 'Stripe Atlas',
    category: 'Fintech',
    description: '创业服务，编辑式排版，渐进式引导，深蓝单色',
    source: 'https://stripe.com/atlas',
    colors: {
      primary: '#635bff',
      background: '#ffffff',
      surface: '#f6f9fc',
      text: '#0a2540',
      textSecondary: '#425466',
      border: '#e3e8ee',
      accent: '#80e9ff',
      error: '#ed5f74',
      success: '#22c55e',
    },
    fontStack: "'Inter', -apple-system, sans-serif",
    borderRadius: '9999px',
    styleHint: 'startup-launch, editorial-onboarding, mesh-gradient, professional',
    fullPrompt: `## 设计规范：Stripe Atlas 风格

你必须严格遵循以下设计语言生成 UI：

### 配色方案
- 主色: #635bff（Stripe Atlas 紫）
- 页面背景: #ffffff
- 表面色: #f6f9fc
- 正文色: #0a2540
- 次要文字: #425466
- 边框: #e3e8ee
- 强调色: #80e9ff（青色，渐变点缀）

### 排版
- 字体: Inter
- 标题 32-56px / 正文 17px
- 行高 1.5

### 组件风格
- 按钮: 圆角 9999px
- 主按钮: 紫色背景白色文字
- 次按钮: 白色背景 + 紫边框
- 卡片: 白色背景，圆角 12px

### 布局原则
- 编辑式排版
- 渐进式引导
- 创业故事 + 数字证据`,
    tags: ['editorial', 'minimal', 'landing-page', 'gradient'],
    industry: 'Fintech',
    mood: ['professional', 'editorial', 'innovative', 'trustworthy'],
    lightMode: {
      primary: '#635bff', background: '#ffffff', surface: '#f6f9fc', text: '#0a2540',
      textSecondary: '#425466', border: '#e3e8ee', accent: '#80e9ff',
      error: '#ed5f74', success: '#22c55e',
    },
    darkMode: {
      primary: '#7e76ff', background: '#0a0a0f', surface: '#16161e', text: '#f0f0f0',
      textSecondary: '#9a9aa3', border: '#262630', accent: '#80e9ff',
      error: '#ff5a5f', success: '#4ade80',
    },
    spacing: 'spacious',
    density: 'normal',
  },
  {
    id: 'taobao',
    name: 'Taobao',
    category: 'E-commerce',
    description: '淘宝橙，电商超级 App，商品流驱动，移动优先',
    source: 'https://taobao.com',
    colors: {
      primary: '#ff5000',
      background: '#f5f5f5',
      surface: '#ffffff',
      text: '#1a1a1a',
      textSecondary: '#666666',
      border: '#e5e5e5',
      accent: '#ff5000',
      error: '#ff0036',
      success: '#07c160',
    },
    fontStack: "-apple-system, 'PingFang SC', 'Microsoft YaHei', sans-serif",
    borderRadius: '4px',
    styleHint: 'super-app, orange-action, mobile-first, e-commerce-feed',
    fullPrompt: `## 设计规范：淘宝 风格

你必须严格遵循以下设计语言生成 UI：

### 配色方案
- 主色: #ff5000（淘宝橙）
- 页面背景: #f5f5f5
- 卡片/表面: #ffffff
- 正文色: #1a1a1a
- 次要文字: #666666
- 边框: #e5e5e5
- 错误/降价: #ff0036
- 成功: #07c160

### 排版
- 字体: PingFang SC
- 标题 16-20px / 正文 13-15px
- 价格: 红色加大

### 组件风格
- 按钮: 圆角 4px（淘宝风）
- 主按钮: 橙背景白色文字
- 商品卡片: 双列网格，图片 + 标题 + 价格 + 销量
- 金刚区: 4 列宫格图标

### 布局原则
- 移动端超级 App
- 顶部搜索栏 + Banner + 金刚区 + 商品瀑布流
- 底部 Tab Bar`,
    tags: ['e-commerce', 'mobile-first', 'landing-page', 'playful'],
    industry: 'E-commerce',
    mood: ['energetic', 'playful', 'friendly', 'busy'],
    lightMode: {
      primary: '#ff5000', background: '#f5f5f5', surface: '#ffffff', text: '#1a1a1a',
      textSecondary: '#666666', border: '#e5e5e5', accent: '#ff5000',
      error: '#ff0036', success: '#07c160',
    },
    darkMode: {
      primary: '#ff7035', background: '#1a1a1a', surface: '#262626', text: '#f0f0f0',
      textSecondary: '#9a9a9a', border: '#3a3a3a', accent: '#ff7035',
      error: '#ff3358', success: '#3acc85',
    },
    spacing: 'tight',
    density: 'compact',
  },
  {
    id: 'jd',
    name: 'JD.com',
    category: 'E-commerce',
    description: '京东红，自营电商，正品保障视觉驱动，商品流 + 服务承诺',
    source: 'https://jd.com',
    colors: {
      primary: '#e1251b',
      background: '#f5f5f5',
      surface: '#ffffff',
      text: '#1a1a1a',
      textSecondary: '#666666',
      border: '#e5e5e5',
      accent: '#e1251b',
      error: '#e1251b',
      success: '#07c160',
    },
    fontStack: "-apple-system, 'PingFang SC', 'Microsoft YaHei', sans-serif",
    borderRadius: '4px',
    styleHint: 'self-operated, red-trust, e-commerce, mobile-first',
    fullPrompt: `## 设计规范：京东 风格

你必须严格遵循以下设计语言生成 UI：

### 配色方案
- 主色: #e1251b（京东红）
- 页面背景: #f5f5f5
- 卡片/表面: #ffffff
- 正文色: #1a1a1a
- 次要文字: #666666
- 边框: #e5e5e5
- 强调色: #e1251b

### 排版
- 字体: PingFang SC
- 标题 16-22px / 正文 13-15px
- 价格突出显示

### 组件风格
- 按钮: 圆角 4px
- 主按钮: 红背景白色文字
- 商品卡片: 白色背景，圆角 4-8px
- 物流徽章: 自营/211/次日达等小标签

### 布局原则
- 移动端 + PC 双布局
- 顶部搜索 + 分类导航 + 商品流
- 自营服务承诺视觉强`,
    tags: ['e-commerce', 'mobile-first', 'landing-page', 'light-mode'],
    industry: 'E-commerce',
    mood: ['professional', 'reliable', 'busy', 'trustworthy'],
    lightMode: {
      primary: '#e1251b', background: '#f5f5f5', surface: '#ffffff', text: '#1a1a1a',
      textSecondary: '#666666', border: '#e5e5e5', accent: '#e1251b',
      error: '#e1251b', success: '#07c160',
    },
    darkMode: {
      primary: '#ff3a30', background: '#1a1a1a', surface: '#262626', text: '#f0f0f0',
      textSecondary: '#9a9a9a', border: '#3a3a3a', accent: '#ff3a30',
      error: '#ff3a30', success: '#3acc85',
    },
    spacing: 'tight',
    density: 'compact',
  },

  // ── Mobility/Booking ─────────────────────────────────────────
  {
    id: 'uber',
    name: 'Uber',
    category: 'Mobility/Booking',
    description: '出行 App，纯黑主色，移动优先，地图 + 车辆信息驱动',
    source: 'https://www.uber.com',
    colors: {
      primary: '#000000',
      background: '#ffffff',
      surface: '#f6f6f6',
      text: '#000000',
      textSecondary: '#5e5e5e',
      border: '#e2e2e2',
      accent: '#000000',
      error: '#e11900',
      success: '#06c167',
    },
    fontStack: "'Uber Move', 'Inter', -apple-system, sans-serif",
    borderRadius: '8px',
    styleHint: 'ride-hailing, mono-black, map-centric, mobile-first',
    fullPrompt: `## 设计规范：Uber 风格

你必须严格遵循以下设计语言生成 UI：

### 配色方案
- 主色: #000000（Uber 黑）
- 页面背景: #ffffff
- 表面色: #f6f6f6
- 正文色: #000000
- 次要文字: #5e5e5e
- 边框: #e2e2e2
- 错误: #e11900
- 成功: #06c167

### 排版
- 字体: Uber Move / Inter
- 标题 18-32px / 正文 14-16px
- 数字使用等宽（车费/距离）

### 组件风格
- 按钮: 圆角 8px
- 主按钮: 黑色背景白色文字
- 次按钮: 白色背景 + 黑边框
- 卡片: 白色背景，圆角 8-12px

### 布局原则
- 地图为主视觉
- 底部滑出面板
- 移动端优先`,
    tags: ['mobile-first', 'minimal', 'dark-mode', 'monochrome'],
    industry: 'Mobility/Booking',
    mood: ['professional', 'bold', 'reliable', 'simple'],
    lightMode: {
      primary: '#000000', background: '#ffffff', surface: '#f6f6f6', text: '#000000',
      textSecondary: '#5e5e5e', border: '#e2e2e2', accent: '#000000',
      error: '#e11900', success: '#06c167',
    },
    darkMode: {
      primary: '#ffffff', background: '#000000', surface: '#161616', text: '#ffffff',
      textSecondary: '#a0a0a0', border: '#262626', accent: '#ffffff',
      error: '#ff4d4d', success: '#3acc85',
    },
    spacing: 'normal',
    density: 'normal',
  },
  {
    id: 'booking',
    name: 'Booking.com',
    category: 'Mobility/Booking',
    description: '酒店预订平台，深蓝主色，蓝色单色 + 黄色 CTA，列表/卡片驱动',
    source: 'https://www.booking.com',
    colors: {
      primary: '#003580',
      background: '#f5f5f5',
      surface: '#ffffff',
      text: '#1a1a1a',
      textSecondary: '#5a5a5a',
      border: '#e7e7e7',
      accent: '#febb02',
      error: '#cc0000',
      success: '#008009',
    },
    fontStack: "-apple-system, 'BlinkMacSystemFont', 'Inter', sans-serif",
    borderRadius: '4px',
    styleHint: 'hotel-booking, dark-blue, yellow-cta, travel-listings',
    fullPrompt: `## 设计规范：Booking.com 风格

你必须严格遵循以下设计语言生成 UI：

### 配色方案
- 主色: #003580（深蓝）
- 页面背景: #f5f5f5
- 表面色: #ffffff
- 正文色: #1a1a1a
- 次要文字: #5a5a5a
- 边框: #e7e7e7
- CTA / 价格: #febb02（黄）

### 排版
- 字体: -apple-system / Inter
- 标题 20-32px / 正文 14-16px
- 酒店名加粗，价格突出

### 组件风格
- 按钮: 圆角 4px
- 主按钮: 蓝色背景白色文字
- 价格/优惠按钮: 黄色背景深色文字
- 卡片: 白色背景，圆角 4-8px
- 评分徽章: 蓝色背景白色数字

### 布局原则
- 搜索栏 + 筛选侧边栏 + 列表结果
- 大量酒店卡片网格
- 顶部蓝色品牌区`,
    tags: ['travel', 'landing-page', 'photography', 'light-mode'],
    industry: 'Mobility/Booking',
    mood: ['trustworthy', 'professional', 'friendly', 'reliable'],
    lightMode: {
      primary: '#003580', background: '#f5f5f5', surface: '#ffffff', text: '#1a1a1a',
      textSecondary: '#5a5a5a', border: '#e7e7e7', accent: '#febb02',
      error: '#cc0000', success: '#008009',
    },
    darkMode: {
      primary: '#1a4d99', background: '#1a1a1a', surface: '#262626', text: '#f0f0f0',
      textSecondary: '#9a9a9a', border: '#3a3a3a', accent: '#febb02',
      error: '#ff4d4d', success: '#3acc85',
    },
    spacing: 'normal',
    density: 'compact',
  },
  {
    id: 'ctrip',
    name: 'Ctrip',
    category: 'Mobility/Booking',
    description: '携程蓝，出行旅游超级 App，蓝色单色 + 橙色点缀，机票/酒店/旅游',
    source: 'https://ctrip.com',
    colors: {
      primary: '#2577e3',
      background: '#f5f5f5',
      surface: '#ffffff',
      text: '#1a1a1a',
      textSecondary: '#666666',
      border: '#e5e5e5',
      accent: '#ff7800',
      error: '#ff0036',
      success: '#07c160',
    },
    fontStack: "-apple-system, 'PingFang SC', 'Microsoft YaHei', sans-serif",
    borderRadius: '4px',
    styleHint: 'travel-super-app, blue-orange, mobile-first, list-driven',
    fullPrompt: `## 设计规范：携程 风格

你必须严格遵循以下设计语言生成 UI：

### 配色方案
- 主色: #2577e3（携程蓝）
- 页面背景: #f5f5f5
- 卡片/表面: #ffffff
- 正文色: #1a1a1a
- 次要文字: #666666
- 边框: #e5e5e5
- 强调/优惠: #ff7800（橙）
- 错误/降价: #ff0036

### 排版
- 字体: PingFang SC
- 标题 16-22px / 正文 13-15px
- 价格: 红色加粗

### 组件风格
- 按钮: 圆角 4px
- 主按钮: 蓝背景白色文字
- 卡片: 白色背景，圆角 4-8px
- 业务 Tab: 顶部 Tab 切换（机票/酒店/火车票）

### 布局原则
- 移动端超级 App
- 顶部搜索 + 业务 Tab + 列表
- 大量列表 + 卡片`,
    tags: ['travel', 'mobile-first', 'landing-page', 'light-mode'],
    industry: 'Mobility/Booking',
    mood: ['professional', 'reliable', 'friendly', 'busy'],
    lightMode: {
      primary: '#2577e3', background: '#f5f5f5', surface: '#ffffff', text: '#1a1a1a',
      textSecondary: '#666666', border: '#e5e5e5', accent: '#ff7800',
      error: '#ff0036', success: '#07c160',
    },
    darkMode: {
      primary: '#4a8dee', background: '#1a1a1a', surface: '#262626', text: '#f0f0f0',
      textSecondary: '#9a9a9a', border: '#3a3a3a', accent: '#ff9933',
      error: '#ff3358', success: '#3acc85',
    },
    spacing: 'normal',
    density: 'compact',
  },
  {
    id: 'klarna',
    name: 'Klarna',
    category: 'Fintech',
    description: 'BNPL 先买后付，粉色品牌色，友好年轻，电商支付驱动',
    source: 'https://klarna.com',
    colors: {
      primary: '#ffb3c7',
      background: '#fff5f8',
      surface: '#ffffff',
      text: '#1a1a1a',
      textSecondary: '#5a5a5a',
      border: '#ffd6e1',
      accent: '#ffa8c5',
      error: '#e63946',
      success: '#06a77d',
    },
    fontStack: "'Klarna Sans', 'Inter', -apple-system, sans-serif",
    borderRadius: '12px',
    styleHint: 'bnpl-pink, friendly-young, e-commerce-pay, playful-rounded',
    fullPrompt: `## 设计规范：Klarna 风格

你必须严格遵循以下设计语言生成 UI：

### 配色方案
- 主色: #ffb3c7（Klarna 粉）
- 页面背景: #fff5f8（浅粉）
- 表面色: #ffffff
- 正文色: #1a1a1a
- 次要文字: #5a5a5a
- 边框: #ffd6e1
- 强调色: #ffa8c5

### 排版
- 字体: Klarna Sans / Inter
- 标题 24-40px / 正文 16px
- 友好年轻化语调

### 组件风格
- 按钮: 圆角 12px（药丸形）
- 主按钮: 粉色背景深色文字
- 卡片: 白色背景，圆角 12-16px
- 大量圆角

### 布局原则
- 移动端优先
- 卡片堆叠
- 友好年轻`,
    tags: ['finance', 'landing-page', 'playful', 'mobile-first'],
    industry: 'Fintech',
    mood: ['playful', 'friendly', 'energetic', 'casual'],
    lightMode: {
      primary: '#ffb3c7', background: '#fff5f8', surface: '#ffffff', text: '#1a1a1a',
      textSecondary: '#5a5a5a', border: '#ffd6e1', accent: '#ffa8c5',
      error: '#e63946', success: '#06a77d',
    },
    darkMode: {
      primary: '#ff8aab', background: '#1a1014', surface: '#262026', text: '#f5f0f2',
      textSecondary: '#a098a0', border: '#3a2a32', accent: '#ff8aab',
      error: '#ff5a5f', success: '#3acc85',
    },
    spacing: 'normal',
    density: 'normal',
  },
  {
    id: 'wise',
    name: 'Wise',
    category: 'Fintech',
    description: '跨境汇款，明黄绿主色，单色透明感，现代国际支付美学',
    source: 'https://wise.com',
    colors: {
      primary: '#9fe870',
      background: '#f7f7f7',
      surface: '#ffffff',
      text: '#163300',
      textSecondary: '#5a5a5a',
      border: '#e0e0e0',
      accent: '#b6f24a',
      error: '#d33a3a',
      success: '#9fe870',
    },
    fontStack: "'Inter', -apple-system, sans-serif",
    borderRadius: '8px',
    styleHint: 'cross-border-pay, lime-green, transparent, modern-international',
    fullPrompt: `## 设计规范：Wise 风格

你必须严格遵循以下设计语言生成 UI：

### 配色方案
- 主色: #9fe870（Wise 亮绿）
- 页面背景: #f7f7f7
- 表面色: #ffffff
- 正文色: #163300（深绿黑）
- 次要文字: #5a5a5a
- 边框: #e0e0e0
- 强调色: #b6f24a

### 排版
- 字体: Inter
- 数字使用等宽（汇率/金额）
- 标题 24-36px / 正文 16px

### 组件风格
- 按钮: 圆角 8px
- 主按钮: 亮绿背景深色文字
- 卡片: 白色背景，圆角 8-12px
- 货币转换条: 显眼的绿色框

### 布局原则
- 跨境汇款流为主
- 货币选择器、汇率展示
- 现代国际感`,
    tags: ['finance', 'minimal', 'data-dense', 'light-mode'],
    industry: 'Fintech',
    mood: ['friendly', 'professional', 'modern', 'trustworthy'],
    lightMode: {
      primary: '#9fe870', background: '#f7f7f7', surface: '#ffffff', text: '#163300',
      textSecondary: '#5a5a5a', border: '#e0e0e0', accent: '#b6f24a',
      error: '#d33a3a', success: '#9fe870',
    },
    darkMode: {
      primary: '#9fe870', background: '#0d1505', surface: '#1a2010', text: '#e8f0d8',
      textSecondary: '#9aa090', border: '#2e3520', accent: '#b6f24a',
      error: '#ff5a5f', success: '#9fe870',
    },
    spacing: 'normal',
    density: 'normal',
  },
  {
    id: 'duolingo',
    name: 'Duolingo',
    category: 'Consumer',
    description: '语言学习 App，绿 + 金色品牌，可爱玩偶，gamified 视觉',
    source: 'https://design.duolingo.com',
    colors: {
      primary: '#58cc02',
      background: '#ffffff',
      surface: '#f7f7f7',
      text: '#1a1a1a',
      textSecondary: '#5a5a5a',
      border: '#e5e5e5',
      accent: '#ffc800',
      error: '#ff4b4b',
      success: '#58cc02',
    },
    fontStack: "'DIN Round', 'Nunito', 'Inter', sans-serif",
    borderRadius: '16px',
    styleHint: 'gamified-green, playful-edu, mascot-driven, friendly-bold',
    fullPrompt: `## 设计规范：Duolingo 风格

你必须严格遵循以下设计语言生成 UI：

### 配色方案
- 主色: #58cc02（Duolingo 绿）
- 页面背景: #ffffff
- 表面色: #f7f7f7
- 正文色: #1a1a1a
- 次要文字: #5a5a5a
- 强调色: #ffc800（金色，奖牌/连胜）
- 边框: #e5e5e5
- 错误色: #ff4b4b

### 排版
- 字体: DIN Round / Nunito
- 标题粗体、圆润
- 标题 24-40px / 正文 16px

### 组件风格
- 按钮: 圆角 16px（胖圆角）
- 主按钮: 绿色背景白色文字，下方有厚边框（"3D 按钮"）
- 卡片: 白色背景，圆角 16px
- 进度条: 绿色填充 + 金色奖章

### 布局原则
- 学习单元/关卡卡片堆叠
- Streak 火焰、XP 徽章
- 玩偶吉祥物装饰`,
    tags: ['mobile-first', 'playful', 'landing-page', 'light-mode'],
    industry: 'Consumer',
    mood: ['playful', 'energetic', 'friendly', 'casual'],
    lightMode: {
      primary: '#58cc02', background: '#ffffff', surface: '#f7f7f7', text: '#1a1a1a',
      textSecondary: '#5a5a5a', border: '#e5e5e5', accent: '#ffc800',
      error: '#ff4b4b', success: '#58cc02',
    },
    darkMode: {
      primary: '#58cc02', background: '#0d1505', surface: '#1a2010', text: '#e8f0d8',
      textSecondary: '#9aa090', border: '#2e3520', accent: '#ffc800',
      error: '#ff4b4b', success: '#58cc02',
    },
    spacing: 'normal',
    density: 'compact',
  },
  {
    id: 'monocle',
    name: 'Monocle',
    category: 'Media/AI',
    description: '杂志 / 媒体品牌，编辑式排版，米黄 + 海军蓝，纸质感',
    source: 'https://monocle.com',
    colors: {
      primary: '#1a3a5a',
      background: '#f4ede0',
      surface: '#ffffff',
      text: '#1a1a1a',
      textSecondary: '#5a4a3a',
      border: '#d4c9b0',
      accent: '#c4a060',
      error: '#b3261e',
      success: '#1a5a3a',
    },
    fontStack: "'Monocle', 'Georgia', 'Times New Roman', serif",
    borderRadius: '0px',
    styleHint: 'editorial-magazine, serif-type, paper-texture, navy-cream',
    fullPrompt: `## 设计规范：Monocle 风格

你必须严格遵循以下设计语言生成 UI：

### 配色方案
- 主色: #1a3a5a（Monocle 海军蓝）
- 页面背景: #f4ede0（米黄纸）
- 表面色: #ffffff
- 正文色: #1a1a1a
- 次要文字: #5a4a3a
- 边框: #d4c9b0
- 强调色: #c4a060（金棕）

### 排版
- 字体: 衬线（Monocle / Georgia）
- 标题 24-48px / 正文 14-16px
- 行高 1.6
- 字间距 -0.5px

### 组件风格
- 按钮: 直角（0 圆角）
- 主按钮: 海军蓝背景米色文字
- 次按钮: 透明背景 + 海军蓝边框
- 卡片: 白色或米色，无圆角

### 布局原则
- 杂志网格，多列布局
- 大量留白
- 摄影 + 衬线标题
- 印刷感、纸质感`,
    tags: ['editorial', 'photography', 'minimal', 'media'],
    industry: 'Media/AI',
    mood: ['editorial', 'calm', 'thoughtful', 'premium'],
    lightMode: {
      primary: '#1a3a5a', background: '#f4ede0', surface: '#ffffff', text: '#1a1a1a',
      textSecondary: '#5a4a3a', border: '#d4c9b0', accent: '#c4a060',
      error: '#b3261e', success: '#1a5a3a',
    },
    darkMode: {
      primary: '#6088b0', background: '#1a1a1a', surface: '#262626', text: '#e8e4dc',
      textSecondary: '#a0988a', border: '#3a3328', accent: '#d4b070',
      error: '#e87a72', success: '#4a9a6a',
    },
    spacing: 'spacious',
    density: 'normal',
  },
  {
    id: 'the_verge',
    name: 'The Verge',
    category: 'Media/AI',
    description: '科技媒体，黑橙配色，大标题 + 大量科技产品摄影，编辑驱动',
    source: 'https://theverge.com',
    colors: {
      primary: '#ff6600',
      background: '#1a1a1a',
      surface: '#262626',
      text: '#ffffff',
      textSecondary: '#cccccc',
      border: '#3a3a3a',
      accent: '#ff9933',
      error: '#ff3333',
      success: '#39ff14',
    },
    fontStack: "'Verdana', 'Helvetica', 'Inter', sans-serif",
    borderRadius: '0px',
    styleHint: 'tech-media, orange-on-black, editorial-headlines, photo-heavy',
    fullPrompt: `## 设计规范：The Verge 风格

你必须严格遵循以下设计语言生成 UI：

### 配色方案
- 主色: #ff6600（Verge 橙）
- 页面背景: #1a1a1a
- 表面色: #262626
- 正文色: #ffffff
- 次要文字: #cccccc
- 边框: #3a3a3a
- 强调色: #ff9933

### 排版
- 字体: Verdana / Helvetica
- 巨大粗体标题（40-80px）
- 正文 16-18px
- 行高 1.5

### 组件风格
- 按钮: 直角（0 圆角）
- 主按钮: 橙色背景黑色文字
- 卡片: 背景 #262626，无圆角
- 头条大图占满

### 布局原则
- 新闻媒体网格
- 大量科技产品摄影
- 大标题 + 头条
- 暗色背景`,
    tags: ['editorial', 'media', 'dark-mode', 'photography'],
    industry: 'Media/AI',
    mood: ['bold', 'editorial', 'energetic', 'serious'],
    lightMode: {
      primary: '#ff6600', background: '#ffffff', surface: '#f5f5f5', text: '#1a1a1a',
      textSecondary: '#5a5a5a', border: '#e0e0e0', accent: '#ff9933',
      error: '#dc2626', success: '#16a34a',
    },
    darkMode: {
      primary: '#ff6600', background: '#1a1a1a', surface: '#262626', text: '#ffffff',
      textSecondary: '#cccccc', border: '#3a3a3a', accent: '#ff9933',
      error: '#ff3333', success: '#39ff14',
    },
    spacing: 'normal',
    density: 'compact',
  },
]

export function getDesignSpecById(id: string): DesignSpec | null {
  if (id === 'none' || id === 'custom') return null
  const raw = BUILT_IN_DESIGN_SPECS.find(s => s.id === id) as DesignSpec | undefined
  return raw ?? null
}

export function buildDesignSpecPrompt(specId: string, customContent?: string): string {
  if (specId === 'none') return ''
  if (specId === 'custom') {
    if (!customContent) return ''
    return `## 自定义设计规范

用户提供了以下自定义设计规范，你必须严格遵循：

${customContent}`
  }
  const spec = getDesignSpecById(specId)
  return spec ? spec.fullPrompt : ''
}

// ── DesignSpec v2 迁移 ──────────────────────────────────────────────
// DesignSpec v2 即"包含 tags / industry / mood / darkMode / lightMode / spacing / density 字段"的 DesignSpec。
// 结构上与 DesignSpec 保持一致，无需新类型；通过字段是否存在 / 取值来识别 v2 形态。
export type DesignSpecV2 = DesignSpec

/**
 * 把任意 v1 / v2 的 DesignSpec 规范化为 v2 形态（不修改入参，返回新对象）。
 *
 * 规则：
 * - 若 `lightMode` 不存在：把现有 `colors` 复制为 `lightMode`（深浅同源，最小侵入）；
 *   `darkMode` 留空（v1 数据没有深色配色，由调用方按需补全）。
 * - `industry` 留空字符串（由具体规范数据补全，避免在这里硬编码）。
 * - `mood` 留空数组。
 * - `tags` 留空数组。
 * - `spacing` 默认为 `'normal'`。
 * - `density` 默认为 `'normal'`。
 *
 * BUILT_IN_DESIGN_SPECS 的原数据不在本函数内改写；调用方在选择/使用规范时主动调用本函数。
 */
export function migrateDesignSpec(spec: DesignSpec): DesignSpec {
  const colorsCopy: ColorSet = { ...spec.colors }
  return {
    ...spec,
    colors: colorsCopy,
    lightMode: spec.lightMode ? { ...spec.lightMode } : { ...colorsCopy },
    darkMode: spec.darkMode ? { ...spec.darkMode } : undefined,
    tags: Array.isArray(spec.tags) ? [...spec.tags] : [],
    industry: typeof spec.industry === 'string' ? spec.industry : '',
    mood: Array.isArray(spec.mood) ? [...spec.mood] : [],
    spacing: spec.spacing ?? 'normal',
    density: spec.density ?? 'normal',
  }
}

/**
 * 取 v2 形态的 DesignSpec（运行时归一化）。
 * 用于选择器/构建 prompt 的入口：保证下游消费者拿到的 spec 一定带 v2 字段。
 */
export function getDesignSpecV2(id: string): DesignSpec | null {
  const spec = getDesignSpecById(id)
  return spec ? migrateDesignSpec(spec) : null
}
