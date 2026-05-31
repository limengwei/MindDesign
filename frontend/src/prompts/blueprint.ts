export interface BlueprintPage {
  name: string
  purpose: string
  keyComponents: string[]
  status: 'designed' | 'planned'
}

export interface ProductBlueprint {
  product: {
    name: string
    category: string
    targetUsers: string
    coreValue: string
  }
  visualSpec: {
    primaryColor: string
    secondaryColor: string
    styleKeywords: string[]
    borderRadius: string
  }
  pages: BlueprintPage[]
  navigation: {
    type: string
    structure: string
  }
  features: {
    confirmed: string[]
    planned: string[]
  }
  designDecisions: string[]
  version: number
  lastUpdated: string
}

export function createEmptyBlueprint(): ProductBlueprint {
  return {
    product: { name: '', category: '', targetUsers: '', coreValue: '' },
    visualSpec: { primaryColor: '', secondaryColor: '', styleKeywords: [], borderRadius: '' },
    pages: [],
    navigation: { type: '', structure: '' },
    features: { confirmed: [], planned: [] },
    designDecisions: [],
    version: 0,
    lastUpdated: '',
  }
}

export function isBlueprintEmpty(bp: ProductBlueprint): boolean {
  return bp.version === 0 || (!bp.product.name && bp.pages.length === 0)
}

export function blueprintCharCount(bp: ProductBlueprint): number {
  return JSON.stringify(bp).length
}

const BLUEPRINT_CHAR_LIMIT = 2000
const BLUEPRINT_REBUILD_THRESHOLD = 1800

export function shouldAutoRebuild(bp: ProductBlueprint): boolean {
  return blueprintCharCount(bp) > BLUEPRINT_REBUILD_THRESHOLD
}

export function buildBlueprintPromptSection(bp: ProductBlueprint): string {
  if (isBlueprintEmpty(bp)) return ''

  const lines: string[] = [
    '## 当前产品设计蓝图',
    '',
    '你正在为以下产品设计 UI，请确保新页面与已有设计保持一致：',
    '',
  ]

  if (bp.product.name || bp.product.category || bp.product.targetUsers) {
    lines.push('### 产品概述')
    if (bp.product.name) lines.push(`- 产品名称：${bp.product.name}`)
    if (bp.product.category) lines.push(`- 类型：${bp.product.category}`)
    if (bp.product.targetUsers) lines.push(`- 目标用户：${bp.product.targetUsers}`)
    if (bp.product.coreValue) lines.push(`- 核心价值：${bp.product.coreValue}`)
    lines.push('')
  }

  if (bp.visualSpec.primaryColor || bp.visualSpec.styleKeywords.length) {
    lines.push('### 视觉规范')
    if (bp.visualSpec.primaryColor) lines.push(`- 主色：${bp.visualSpec.primaryColor}`)
    if (bp.visualSpec.secondaryColor) lines.push(`- 辅助色：${bp.visualSpec.secondaryColor}`)
    if (bp.visualSpec.styleKeywords.length) lines.push(`- 风格：${bp.visualSpec.styleKeywords.join('、')}`)
    if (bp.visualSpec.borderRadius) lines.push(`- 圆角：${bp.visualSpec.borderRadius}`)
    lines.push('')
  }

  if (bp.pages.length) {
    lines.push('### 已有页面')
    bp.pages.forEach((p, i) => {
      const status = p.status === 'designed' ? '已设计' : '规划中'
      const comps = p.keyComponents.length ? `（${p.keyComponents.join('、')}）` : ''
      lines.push(`${i + 1}. ${p.name} — ${p.purpose} ${comps} [${status}]`)
    })
    lines.push('')
  }

  if (bp.navigation.type || bp.navigation.structure) {
    lines.push('### 导航结构')
    if (bp.navigation.type) lines.push(`- 类型：${bp.navigation.type}`)
    if (bp.navigation.structure) lines.push(`- 结构：${bp.navigation.structure}`)
    lines.push('')
  }

  if (bp.features.confirmed.length || bp.features.planned.length) {
    lines.push('### 功能模块')
    if (bp.features.confirmed.length) lines.push(`- 已确认：${bp.features.confirmed.join('、')}`)
    if (bp.features.planned.length) lines.push(`- 规划中：${bp.features.planned.join('、')}`)
    lines.push('')
  }

  if (bp.designDecisions.length) {
    lines.push('### 设计决策')
    bp.designDecisions.forEach(d => lines.push(`- ${d}`))
    lines.push('')
  }

  return lines.join('\n')
}

export const BLUEPRINT_PROTOCOL = `
## 产品蓝图更新协议

每次生成设计稿后，你必须在自评之后输出蓝图更新，格式如下：

<!-- BLUEPRINT_UPDATE
{
  "action": "init" | "update" | "rebuild",
  "blueprint": { ... 完整蓝图JSON ... }
}
BLUEPRINT_UPDATE -->

### action 说明
- "init"：首次生成，创建完整蓝图
- "update"：增量更新，输出完整蓝图（前端直接替换）
- "rebuild"：重新整理蓝图（精炼压缩，控制在合理长度内）

### 蓝图更新规则
1. 首次生成时 action 为 "init"，创建完整蓝图
2. 后续生成时 action 为 "update"，更新相关字段后输出完整蓝图
3. 新增页面时，在 pages 数组中添加新条目，status 为 "designed"
4. 用户提到但未设计的页面，status 标记为 "planned"
5. 用户的明确偏好加入 designDecisions 数组
6. 每个页面描述保持简练（一句话说明用途）
7. 视觉规范从你实际使用的样式中提取
8. version 每次更新时 +1
9. 如果蓝图过长（超过合理范围），自动将 action 设为 "rebuild" 并精炼压缩内容
`

export function extractBlueprintUpdate(text: string): { action: string; blueprint: ProductBlueprint } | null {
  const match = text.match(/<!-- BLUEPRINT_UPDATE\s*([\s\S]*?)\s*BLUEPRINT_UPDATE -->/)
  if (!match) return null
  try {
    const data = JSON.parse(match[1].trim())
    if (data.action && data.blueprint) {
      return { action: data.action, blueprint: data.blueprint as ProductBlueprint }
    }
    return null
  } catch {
    return null
  }
}

export { BLUEPRINT_CHAR_LIMIT, BLUEPRINT_REBUILD_THRESHOLD }
