/**
 * 视觉方向（Visual Direction）
 *
 * 与具体设计规范（DesignSpec）解耦：方向是"整体观感坐标"，可单独使用，
 * 也可叠加 DesignSpec 作为基线。用户在 HomeView 顶部选择方向后，
 * system prompt 会注入对应的字体/颜色/间距倾向。
 */
import type { ColorSet } from './designSpecs'

export type DirectionSpacingScale = {
  /** 基础间距单位（px） */
  base: number
  /** 间距倍率序列（用于 mt-* / py-* 等 Tailwind 语义） */
  scale: number[]
  /** 描述（人类可读） */
  hint: string
}

export type DirectionDensity = 'compact' | 'normal' | 'airy'

export interface VisualDirection {
  id: string
  name: string
  description: string
  emoji: string
  colors: ColorSet
  fontStack: string
  spacingScale: DirectionSpacingScale
  density: DirectionDensity
  /** 追加到 system prompt 的"方向补充指令"，影响最终设计 */
  systemPromptAddon: string
}

const SHARED_BORDER: ColorSet['border'] = '#e5e5e5'
const SHARED_ERROR: ColorSet['error'] = '#ef4444'
const SHARED_SUCCESS: ColorSet['success'] = '#22c55e'

export const VISUAL_DIRECTIONS: VisualDirection[] = [
  {
    id: 'editorial-monocle',
    name: 'Editorial Monocle',
    emoji: '📰',
    description: '编辑杂志风格，衬线标题，米黄/海军蓝基底，纸质感与排版克制',
    colors: {
      primary: '#1a3a5a',
      background: '#f4ede0',
      surface: '#ffffff',
      text: '#1a1a1a',
      textSecondary: '#5a4a3a',
      border: '#d4c9b0',
      accent: '#c4a060',
      error: SHARED_ERROR,
      success: SHARED_SUCCESS,
    },
    fontStack: "'Monocle', 'Georgia', 'Times New Roman', 'PingFang SC', serif",
    spacingScale: { base: 8, scale: [0, 4, 8, 16, 24, 40, 64, 96], hint: 'spacious' },
    density: 'normal',
    systemPromptAddon: `### 视觉方向：Editorial Monocle（编辑杂志）

- 排版是主角：标题用衬线字体，正文 16-18px，行高 1.6，字间距微负
- 网格用杂志 12 栏，强调栏间对齐与空白
- 摄影占满栏宽，文字环抱图片或反向留白
- 颜色克制：主色（深蓝/墨绿）+ 纸张米 + 一处金色强调，绝不超过 3 色
- 圆角 0，阴影尽量不用
- 装饰元素：横线分隔、引用块、首字下沉可选
- 整体节奏：慢呼吸，视觉锚点稀疏，文字与图像交替`,
  },
  {
    id: 'modern-minimal',
    name: 'Modern Minimal',
    emoji: '◻',
    description: '现代极简，黑白单色为主，宽松留白，几何克制',
    colors: {
      primary: '#0a0a0a',
      background: '#ffffff',
      surface: '#fafafa',
      text: '#0a0a0a',
      textSecondary: '#6b7280',
      border: SHARED_BORDER,
      accent: '#3b82f6',
      error: SHARED_ERROR,
      success: SHARED_SUCCESS,
    },
    fontStack: "'Inter', -apple-system, 'PingFang SC', system-ui, sans-serif",
    spacingScale: { base: 8, scale: [0, 4, 8, 12, 20, 32, 56, 96], hint: 'spacious' },
    density: 'airy',
    systemPromptAddon: `### 视觉方向：Modern Minimal（现代极简）

- 主色只有黑/白/灰，加 1 个微弱的蓝色作交互色
- 字体：Inter / system-ui，字间距微负（-0.2px ~ -0.5px）
- 圆角统一 8-12px，阴影克制
- 大留白：section 间距 96-128px，卡片内边距 24-32px
- 不用渐变，不用 emoji 作装饰
- CTA 必须有清晰的层级（主按钮 / 次按钮 / 文字链接）
- 信息密度低，单屏最多 1 个主操作`,
  },
  {
    id: 'warm-soft',
    name: 'Warm Soft',
    emoji: '🪶',
    description: '温暖柔和，奶油/陶土色，圆润饱满，亲和力强',
    colors: {
      primary: '#d97706',
      background: '#faf5ee',
      surface: '#ffffff',
      text: '#2a1f17',
      textSecondary: '#7a6450',
      border: '#e8d9c0',
      accent: '#e08856',
      error: SHARED_ERROR,
      success: '#5b8a3a',
    },
    fontStack: "'Nunito', 'Inter', -apple-system, 'PingFang SC', sans-serif",
    spacingScale: { base: 8, scale: [0, 4, 8, 12, 20, 28, 44, 64], hint: 'normal' },
    density: 'normal',
    systemPromptAddon: `### 视觉方向：Warm Soft（温暖柔和）

- 配色：奶油 / 陶土 / 浅焦糖，绝不出现纯黑与纯白
- 字体：Nunito / Inter，圆润字重（500-600）
- 圆角 12-20px，所有元素均带柔和感
- 阴影用 rgba(80,40,20,0.08) 8-16px 模糊
- 插画风装饰、轻微的手写感
- 颜色对比保持 WCAG AA，但绝不刺眼
- 节奏：呼吸柔和，避免硬切`,
  },
  {
    id: 'tech-utility',
    name: 'Tech Utility',
    emoji: '🛠',
    description: '科技工具风，深色画布，单色 + 数据驱动，信息密度高',
    colors: {
      primary: '#7c3aed',
      background: '#0a0a0f',
      surface: '#13131a',
      text: '#e5e7eb',
      textSecondary: '#9ca3af',
      border: '#1f1f2e',
      accent: '#818cf8',
      error: SHARED_ERROR,
      success: SHARED_SUCCESS,
    },
    fontStack: "'Inter', -apple-system, 'JetBrains Mono', 'PingFang SC', sans-serif",
    spacingScale: { base: 4, scale: [0, 2, 4, 8, 12, 20, 32, 48], hint: 'tight' },
    density: 'compact',
    systemPromptAddon: `### 视觉方向：Tech Utility（科技工具）

- 暗色优先（#0a0a0f 画布），表面阶梯 #13131a → #1f1f2e
- 字体：Inter 正文 + 等宽字体（JetBrains Mono / Geist Mono）用于代码/数据
- 数字使用 tabular-nums，对齐到小数点
- 圆角小（4-6px），边框 #1f1f2e 区分层次
- 高信息密度：表格、徽章、状态色
- 紫色作 CTA，绿色作成功，红色作错误，绝不混用
- 阴影几乎不用，靠背景阶梯 + 边框`,
  },
  {
    id: 'brutalist-experimental',
    name: 'Brutalist Experimental',
    emoji: '🧱',
    description: '粗野实验派，超大字号，黑白主色，裸露栅格与原始感',
    colors: {
      primary: '#000000',
      background: '#f4f4f0',
      surface: '#ffffff',
      text: '#0a0a0a',
      textSecondary: '#5a5a5a',
      border: '#0a0a0a',
      accent: '#ff5b00',
      error: SHARED_ERROR,
      success: SHARED_SUCCESS,
    },
    fontStack: "'Space Grotesk', 'Inter', system-ui, -apple-system, sans-serif",
    spacingScale: { base: 8, scale: [0, 4, 8, 16, 32, 64, 128, 192], hint: 'spacious' },
    density: 'normal',
    systemPromptAddon: `### 视觉方向：Brutalist Experimental（粗野实验）

- 黑白主色 + 1 个酸性橙（#ff5b00）作唯一强彩色
- 字号反差极大：H1 120-180px，正文 14-16px
- 字体：Space Grotesk / Inter，超大粗体
- 边框用 2-3px 实线，圆角 0
- 阴影用偏移式硬阴影（如 6px 6px 0 #000）
- 裸露栅格：可见的辅助线、未对齐的"故意偏移"
- 禁止渐变、禁止柔光、禁止 emoji
- 装饰元素：箭头、星号、手写备注
- 视觉留白非常大（128-192px section 间距）`,
  },
]

export const VISUAL_DIRECTION_LABELS: Record<string, string> =
  VISUAL_DIRECTIONS.reduce<Record<string, string>>((acc, d) => {
    acc[d.id] = `${d.emoji} ${d.name}`
    return acc
  }, {})

export function getDirectionById(id: string | null | undefined): VisualDirection | null {
  if (!id) return null
  return VISUAL_DIRECTIONS.find(d => d.id === id) ?? null
}
