export type PageType = 'app' | 'web' | 'desktop'

export const PAGE_TYPE_LABELS: Record<PageType, string> = {
  app: '移动 App',
  web: '网页',
  desktop: '桌面应用',
}

export const PAGE_TYPE_CONSTRAINTS: Record<PageType, string> = {
  app: `## 移动 App 设计规范

- 画布宽度: 375px（iPhone 标准尺寸）
- 画布高度: 自动扩展（无固定高度）
- 安全区域: 顶部状态栏区域 44px，底部 Home Indicator 区域 34px
- 导航模式: 底部 Tab 导航（4-5 个图标），或顶部导航栏
- 圆角: 组件使用 8-16px 圆角
- 字体大小: 标题 18-24px，正文 14-16px，辅助文字 12px
- 列表项高度: 48-56px
- 底部操作栏: 固定在屏幕底部，高度 48-64px
- 顶部导航栏: 标题居中，左侧返回/右侧操作图标`,

  web: `## 网页设计规范

- 画布宽度: 1440px（桌面端标准宽度）
- 导航: 顶部导航栏 + 侧边栏，或仅顶部导航
- 布局: 多列布局（2-4 列网格）
- 间距: 使用 16-32px 作为基础间距单位
- 卡片: 圆角 8-12px，带阴影层级
- 响应式考虑: 内容宽度控制在 1200px 内居中
- 页脚: 包含链接、版权信息
- Hero 区域: 可包含大标题、副标题、CTA 按钮`,

  desktop: `## 桌面应用设计规范

- 画布宽度: 1280px
- 布局: 侧边栏（240-280px）+ 主内容区
- 菜单: 顶部菜单栏或侧边栏导航
- 表格/列表: 行高 40-48px
- 模态框: 居中显示，背景半透明遮罩
- 面板: 可折叠/可拖拽边界的侧边面板`,
}
