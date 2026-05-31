export interface DesignSpec {
  id: string
  name: string
  category: string
  description: string
  source: string
  colors: {
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
  fontStack: string
  borderRadius: string
  styleHint: string
  fullPrompt: string
}

export type DesignSpecId = 'none' | 'stripe' | 'linear' | 'apple' | 'vercel' | 'notion' | 'airbnb' | 'spotify' | 'nike' | 'figma' | 'supabase' | 'cursor' | 'framer' | 'tesla' | 'custom'

export const DESIGN_SPEC_LABELS: Record<DesignSpecId, string> = {
  none: '🎨 不使用设计规范',
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
  custom: '📋 自定义导入',
}

export const DESIGN_SPEC_CATEGORIES = [
  { id: 'builtin', label: '内置设计规范' },
  { id: 'custom', label: '自定义导入' },
]

export const BUILT_IN_DESIGN_SPECS: DesignSpec[] = [
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
- 强调动效和交互感

### 布局原则
- 大胆的排版和颜色使用
- 黑白蓝为主色调
- 设计感强烈
- 动效优先的交互暗示`,
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
]

export function getDesignSpecById(id: DesignSpecId): DesignSpec | null {
  if (id === 'none' || id === 'custom') return null
  return BUILT_IN_DESIGN_SPECS.find(s => s.id === id) || null
}

export function buildDesignSpecPrompt(specId: DesignSpecId, customContent?: string): string {
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
