import type { PageType } from './page-types'

export type SkillCategory = 'design' | 'marketing' | 'operation' | 'engineering' | 'product'

export interface DesignSkill {
  id: string
  name: string
  icon: string
  category: SkillCategory
  description: string
  examplePrompt: string
  defaultPageType: PageType
  systemPromptAddons: string
  preflightEnabled: boolean
}

export const SKILL_CATEGORIES: Record<SkillCategory, string> = {
  design: '设计',
  marketing: '营销',
  operation: '运营',
  engineering: '工程',
  product: '产品',
}

export const BUILT_IN_SKILLS: DesignSkill[] = [
  {
    id: 'web-prototype',
    name: '网页原型',
    icon: 'language',
    category: 'design',
    description: '快速生成网页原型设计',
    examplePrompt: '设计一个 SaaS 产品官网首页',
    defaultPageType: 'web',
    preflightEnabled: true,
    systemPromptAddons: `## Skill: 网页原型设计

你正在设计一个网页原型，请严格遵循以下规范：

### 布局模式
- 顶部导航栏高度 64-80px，包含 Logo、导航链接、CTA 按钮
- Hero 区域高度 400-600px，包含大标题、副标题、主操作按钮
- 内容区宽度控制在 1200px 内居中
- 页脚高度 200-300px，包含链接分组、版权信息

### 组件规范
- 卡片圆角 8-12px，内边距 24-32px
- 按钮高度 40-48px，圆角 6-8px
- 输入框高度 40-44px
- 间距单位使用 8px 的倍数`,
  },
  {
    id: 'mobile-app',
    name: '移动端 App',
    icon: 'smartphone',
    category: 'design',
    description: '设计移动端 App 界面',
    examplePrompt: '设计一个社交 App 的个人主页',
    defaultPageType: 'app',
    preflightEnabled: true,
    systemPromptAddons: `## Skill: 移动端 App 界面设计

你正在设计一个移动端 App 界面，请严格遵循以下规范：

### 导航模式
- 底部 Tab 导航（4-5 个图标），高度 83px（含 Home Indicator 区域）
- 或顶部导航栏，高度 44px，标题居中

### 列表和卡片
- 列表项高度固定 56-72px
- 卡片圆角 12-16px，内边距 16px
- 卡片之间间距 12px

### 输入和操作
- 所有可点击元素最小 44×44px
- 主按钮高度 48-52px，圆角 24-26px（药丸形）
- 输入框高度 48px，圆角 12px

### 移动端特有
- 顶部状态栏区域预留 44px（显示时间、信号、电量）
- 底部安全区域预留 34px（Home Indicator）
- 内容区左右边距 16-20px
- 使用 Material Symbols 图标`,
  },
  {
    id: 'dashboard',
    name: '数据仪表盘',
    icon: 'dashboard',
    category: 'design',
    description: '设计数据仪表盘界面',
    examplePrompt: '设计一个电商运营数据仪表盘',
    defaultPageType: 'desktop',
    preflightEnabled: true,
    systemPromptAddons: `## Skill: 数据仪表盘设计

你正在设计一个数据仪表盘，请严格遵循以下规范：

### 布局模式
- 左侧导航栏宽度 240-280px
- 顶部标题栏高度 56-64px
- 主内容区使用网格布局，间距 16-24px

### 数据组件
- 统计卡片高度 120-160px，圆角 12px
- 图表区域高度 300-400px
- 表格行高 48-56px
- 筛选栏高度 48px

### 数据展示
- 关键指标使用大号数字（32-48px）
- 趋势用颜色区分：绿色上涨、红色下跌
- 使用 Material Symbols 图标辅助说明`,
  },
  {
    id: 'landing-page',
    name: '落地页',
    icon: 'web',
    category: 'design',
    description: '设计产品落地页',
    examplePrompt: '设计一个 AI 写作助手的落地页',
    defaultPageType: 'web',
    preflightEnabled: true,
    systemPromptAddons: `## Skill: 落地页设计

你正在设计一个产品落地页，请严格遵循以下规范：

### 页面结构
- Hero 区域：大标题 + 副标题 + CTA 按钮，高度 500-700px
- 特性展示区：3-4 个特性卡片，网格布局
- 社会证明：用户评价、数据展示
- CTA 区域：再次强调核心价值，引导转化
- 页脚：链接、版权

### 视觉风格
- Hero 区域可使用渐变背景或大图
- CTA 按钮使用高对比度颜色，圆角 8-12px
- 特性卡片圆角 12-16px，带微妙阴影
- 整体留白充足，段落间距 64-96px`,
  },
  {
    id: 'wireframe',
    name: '线框图',
    icon: 'grain',
    category: 'design',
    description: '设计低保真线框图',
    examplePrompt: '设计一个电商购物流程的线框图',
    defaultPageType: 'web',
    preflightEnabled: false,
    systemPromptAddons: `## Skill: 线框图设计

你正在设计一个低保真线框图，请严格遵循以下规范：

### 视觉风格
- 使用灰色调：#333（边框/文字）、#999（次要文字）、#E0E0E0（填充）、#F5F5F5（背景）
- 不使用彩色，不使用渐变
- 图片区域用灰色方块 + 图标占位
- 文字用横线或灰色文字块表示

### 组件样式
- 所有元素使用黑色边框（1px solid #333），无填充色或浅灰填充
- 按钮用矩形边框 + 文字，圆角 4px
- 输入框用矩形边框，圆角 4px
- 卡片用矩形边框，无阴影`,
  },
  {
    id: 'design-critique',
    name: '设计评审',
    icon: 'palette',
    category: 'design',
    description: '对现有设计进行专业评审',
    examplePrompt: '评审这个登录页面的设计',
    defaultPageType: 'web',
    preflightEnabled: false,
    systemPromptAddons: `## Skill: 设计评审

你正在进行专业的设计评审，请从以下维度分析用户提供的 HTML 设计稿：

### 评审维度
1. 视觉一致性：颜色、间距、字号是否统一
2. 信息层级：内容的主次关系是否清晰
3. 可用性：交互元素是否易于操作
4. 品牌契合度：风格是否一致
5. 无障碍：对比度、可读性是否达标

### 输出格式
- 先给出整体评分（1-10）
- 然后逐维度分析，指出优点和问题
- 最后给出 3-5 条具体改进建议
- 如果用户要求，可以输出改进后的 HTML`,
  },
  {
    id: 'social-carousel',
    name: '社交媒体轮播图',
    icon: 'photo_library',
    category: 'marketing',
    description: '设计社交媒体轮播图',
    examplePrompt: '设计一组 5 页的产品发布轮播图',
    defaultPageType: 'app',
    preflightEnabled: true,
    systemPromptAddons: `## Skill: 社交媒体轮播图设计

你正在设计社交媒体轮播图，请严格遵循以下规范：

### 尺寸规范
- 宽度 1080px，高度 1080px（正方形）
- 或宽度 1080px，高度 1350px（竖版 4:5）

### 设计原则
- 每页聚焦一个核心信息
- 视觉风格保持统一（颜色、字体、排版）
- 使用大号标题和简洁图标
- 页码指示器（1/5, 2/5...）放在底部
- 第一页需要特别吸引眼球`,
  },
  {
    id: 'email-template',
    name: '邮件模板',
    icon: 'email',
    category: 'marketing',
    description: '设计邮件营销模板',
    examplePrompt: '设计一封产品发布通知邮件',
    defaultPageType: 'web',
    preflightEnabled: false,
    systemPromptAddons: `## Skill: 邮件模板设计

你正在设计一个邮件模板，请严格遵循以下规范：

### 布局规范
- 内容宽度 600px 居中
- 使用表格布局（邮件兼容性）
- 左右边距 20-32px
- 行间距 20-28px

### 组件规范
- 标题字号 24-32px
- 正文字号 14-16px
- CTA 按钮高度 44-52px，圆角 4-8px
- 图片宽度 100%，圆角 0-4px`,
  },
  {
    id: 'poster',
    name: '海报/宣传图',
    icon: 'brush',
    category: 'marketing',
    description: '设计海报或宣传图',
    examplePrompt: '设计一张科技大会的宣传海报',
    defaultPageType: 'app',
    preflightEnabled: true,
    systemPromptAddons: `## Skill: 海报/宣传图设计

你正在设计一张海报/宣传图，请严格遵循以下规范：

### 尺寸规范
- 竖版海报：宽 750px，高 1334px
- 横版海报：宽 1200px，高 628px

### 设计原则
- 标题醒目，字号 48-72px
- 关键信息突出（时间、地点、主题）
- 使用大色块或渐变背景
- 品牌元素（Logo）放在角落
- 整体视觉冲击力强`,
  },
  {
    id: 'kanban-board',
    name: '看板',
    icon: 'view_kanban',
    category: 'operation',
    description: '设计任务看板界面',
    examplePrompt: '设计一个项目管理看板',
    defaultPageType: 'desktop',
    preflightEnabled: false,
    systemPromptAddons: `## Skill: 看板设计

你正在设计一个任务看板，请严格遵循以下规范：

### 布局模式
- 横向多列布局（待办、进行中、已完成等）
- 列宽 280-320px，间距 16px
- 卡片宽度填满列宽，高度自适应

### 卡片设计
- 圆角 8-12px，内边距 12-16px
- 优先级用颜色标签区分
- 标签使用药丸形小标签`,
  },
  {
    id: 'data-report',
    name: '数据报告',
    icon: 'bar_chart',
    category: 'operation',
    description: '设计数据报告页面',
    examplePrompt: '设计一份月度销售数据报告',
    defaultPageType: 'web',
    preflightEnabled: true,
    systemPromptAddons: `## Skill: 数据报告设计

你正在设计一份数据报告页面，请严格遵循以下规范：

### 页面结构
- 报告标题 + 日期范围
- 核心指标摘要（3-5 个大数字卡片）
- 趋势图表区域
- 明细表格
- 结论与建议

### 数据展示
- 核心指标数字 32-48px，加粗
- 变化率用颜色和箭头表示
- 图表区域高度 300-400px
- 表格行高 40-48px`,
  },
  {
    id: 'invoice',
    name: '发票/收据',
    icon: 'receipt',
    category: 'operation',
    description: '设计发票或收据模板',
    examplePrompt: '设计一张订单发票模板',
    defaultPageType: 'web',
    preflightEnabled: false,
    systemPromptAddons: `## Skill: 发票/收据设计

你正在设计一张发票或收据，请严格遵循以下规范：

### 布局规范
- A4 尺寸比例：宽 794px，高 1123px
- 白色背景，黑色文字
- 内边距 40-60px

### 内容结构
- 顶部：公司 Logo + 名称
- 信息区：发票编号、日期、客户信息
- 明细表格：商品/服务名称、数量、单价、金额
- 底部：合计金额、备注、签章区域`,
  },
  {
    id: 'prd-document',
    name: '产品需求文档',
    icon: 'description',
    category: 'product',
    description: '设计产品需求文档页面',
    examplePrompt: '设计一个功能需求文档的展示页面',
    defaultPageType: 'web',
    preflightEnabled: false,
    systemPromptAddons: `## Skill: 产品需求文档

你正在设计一个产品需求文档页面，请严格遵循以下规范：

### 文档结构
- 标题 + 版本号
- 目录导航（侧边或顶部）
- 需求概述、背景、目标
- 功能详述（用户故事 + 验收标准）
- 非功能性需求
- 里程碑与排期

### 排版规范
- 标题层级清晰（H1 > H2 > H3）
- 列表项使用有序或无序列表
- 表格展示结构化数据
- 重要信息使用高亮或提示框`,
  },
  {
    id: 'user-flow',
    name: '用户流程图',
    icon: 'account_tree',
    category: 'product',
    description: '设计用户流程图',
    examplePrompt: '设计一个用户注册登录的流程图',
    defaultPageType: 'web',
    preflightEnabled: false,
    systemPromptAddons: `## Skill: 用户流程图

你正在设计一个用户流程图，请严格遵循以下规范：

### 流程图规范
- 使用圆角矩形表示操作步骤
- 使用菱形表示判断节点
- 使用箭头连接各步骤
- 起始节点用圆角胶囊形
- 结束节点用圆形

### 样式
- 节点背景色统一，判断节点用不同颜色
- 连接线使用箭头，标注条件文字
- 每个节点内文字简洁（2-5 个字）`,
  },
  {
    id: 'competitor-analysis',
    name: '竞品分析看板',
    icon: 'compare',
    category: 'product',
    description: '设计竞品分析看板',
    examplePrompt: '设计一个在线教育产品的竞品分析看板',
    defaultPageType: 'desktop',
    preflightEnabled: true,
    systemPromptAddons: `## Skill: 竞品分析看板

你正在设计一个竞品分析看板，请严格遵循以下规范：

### 布局模式
- 左侧导航栏（竞品列表）
- 主内容区使用网格或表格对比
- 右侧可展示评分雷达图

### 对比维度
- 功能对比矩阵
- 定价对比表
- 优势劣势分析
- 评分对比`,
  },
  {
    id: 'api-docs',
    name: 'API 文档页',
    icon: 'code',
    category: 'engineering',
    description: '设计 API 文档页面',
    examplePrompt: '设计一个 REST API 文档页面',
    defaultPageType: 'web',
    preflightEnabled: false,
    systemPromptAddons: `## Skill: API 文档页

你正在设计一个 API 文档页面，请严格遵循以下规范：

### 页面结构
- 左侧导航栏（API 列表）宽度 260px
- 主内容区展示 API 详情
- 右侧可展示请求/响应示例

### API 卡片
- 方法标签（GET 绿色、POST 蓝色、PUT 橙色、DELETE 红色）
- 端点路径用等宽字体
- 参数表格：名称、类型、必填、描述
- 请求/响应示例用代码块展示`,
  },
  {
    id: 'status-page',
    name: '系统状态页',
    icon: 'monitor_heart',
    category: 'engineering',
    description: '设计系统状态页面',
    examplePrompt: '设计一个云服务的系统状态页',
    defaultPageType: 'web',
    preflightEnabled: false,
    systemPromptAddons: `## Skill: 系统状态页

你正在设计一个系统状态页面，请严格遵循以下规范：

### 页面结构
- 顶部：总体状态指示（全部正常/部分故障/全面故障）
- 当前事件列表
- 各服务状态卡片
- 历史事件时间线

### 状态颜色
- 正常：绿色 #22c55e
- 性能下降：黄色 #f59e0b
- 部分故障：橙色 #f97316
- 全面故障：红色 #ef4444
- 维护中：蓝色 #3b82f6`,
  },
  {
    id: 'changelog',
    name: '更新日志页',
    icon: 'update',
    category: 'engineering',
    description: '设计产品更新日志页面',
    examplePrompt: '设计一个产品的更新日志页面',
    defaultPageType: 'web',
    preflightEnabled: false,
    systemPromptAddons: `## Skill: 更新日志页

你正在设计一个产品更新日志页面，请严格遵循以下规范：

### 页面结构
- 时间线布局，最新在上
- 每个版本一个卡片
- 版本号 + 日期 + 类型标签

### 更新类型标签
- 新功能（Feature）：蓝色
- 改进（Improvement）：绿色
- 修复（Bug Fix）：橙色
- 破坏性变更（Breaking）：红色

### 排版
- 版本号 20-24px 加粗
- 更新项使用列表
- 重要更新加粗或高亮`,
  },
  {
    id: 'magazine-page',
    name: '杂志排版页',
    icon: 'auto_stories',
    category: 'marketing',
    description: '设计杂志风格排版页',
    examplePrompt: '设计一个科技主题的杂志排版页',
    defaultPageType: 'web',
    preflightEnabled: true,
    systemPromptAddons: `## Skill: 杂志排版页

你正在设计一个杂志风格排版页，请严格遵循以下规范：

### 排版原则
- 大标题使用衬线字体或粗体 36-72px
- 正文使用舒适的阅读字号 16-18px，行高 1.6-1.8
- 段落间距 24-32px
- 使用首字下沉（Drop Cap）效果

### 布局
- 内容宽度 680-800px 居中
- 图文混排：文字环绕图片
- 引用使用特殊样式（左边框 + 斜体）
- 分栏布局（2-3 栏）展示辅助内容`,
  },
]

export function getSkillById(id: string): DesignSkill | undefined {
  return BUILT_IN_SKILLS.find(s => s.id === id)
}

export function getSkillsByCategory(category: SkillCategory): DesignSkill[] {
  return BUILT_IN_SKILLS.filter(s => s.category === category)
}
