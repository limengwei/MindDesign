export type ColorScheme = 'auto' | 'light' | 'dark' | 'brand'

export const COLOR_SCHEME_LABELS: Record<ColorScheme, string> = {
  auto: 'AI 自动选择',
  light: '浅色模式',
  dark: '深色模式',
  brand: '品牌色自定义',
}

export const COLOR_CONSTRAINTS: Record<ColorScheme, string> = {
  auto: `## 配色方案（由 AI 自动选择）
- 选择一套和谐的主色 + 辅助色
- 首次生成后，用户可以通过对话调整颜色`,

  light: `## 浅色模式配色规范
- 背景色: #FFFFFF 或 #F5F5F5
- 主色: 选择一个品牌色（如 #4F46E5 / #0EA5E9 / #10B981）
- 文字色: #1A1A1A（主标题）/ #666666（正文）/ #999999（辅助）
- 分割线: #EEEEEE
- 卡片背景: #FFFFFF，阴影 rgba(0,0,0,0.08)
- 错误色: #EF4444，成功色: #22C55E，警告色: #F59E0B`,

  dark: `## 深色模式配色规范
- 背景色: #121212 或 #1E1E1E
- 卡片/表面色: #2A2A2A
- 主色: 亮色版本（如 #818CF8 / #38BDF8 / #34D399）
- 文字色: #FFFFFF（标题）/ #E0E0E0（正文）/ #999999（辅助）
- 分割线: #333333
- 图标和文字确保足够对比度`,

  brand: `## 品牌色模式
- 用户在对话中指定品牌色
- AI 根据品牌色自动生成完整色板
- 确保无障碍对比度（WCAG AA 级别，对比度 >= 4.5:1）`,
}
