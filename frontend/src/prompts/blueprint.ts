export interface BlueprintPage {
  name: string
  purpose: string
  keyComponents: string[]
  status: 'designed' | 'planned'
}

export type DecisionType = 'color' | 'typography' | 'layout' | 'interaction' | 'component'

export interface DesignDecision {
  id: string
  text: string
  type: DecisionType
  manual: boolean
}

export interface FeatureItem {
  id: string
  text: string
  manual: boolean
}

export interface ProductBlueprint {
  product: {
    name: string
    category: string
    targetUsers: string
    coreValue: string
    description: string
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
    confirmed: FeatureItem[]
    planned: FeatureItem[]
  }
  designDecisions: DesignDecision[]
  version: number
  lastUpdated: string
}

const DECISION_TYPE_LABELS: Record<DecisionType, string> = {
  color: '色彩',
  typography: '排版',
  layout: '布局',
  interaction: '交互',
  component: '组件',
}

export function getDecisionTypeLabel(type: DecisionType): string {
  return DECISION_TYPE_LABELS[type] ?? type
}

export const DECISION_TYPES: DecisionType[] = ['color', 'typography', 'layout', 'interaction', 'component']

export function genId(prefix = 'id'): string {
  const rand = Math.random().toString(36).slice(2, 8)
  return `${prefix}-${Date.now().toString(36)}-${rand}`
}

function normalizeFeatureList(list: unknown): FeatureItem[] {
  if (!Array.isArray(list)) return []
  return list.map((item) => {
    if (typeof item === 'string') {
      return { id: genId('feat'), text: item, manual: false }
    }
    if (item && typeof item === 'object') {
      const obj = item as Partial<FeatureItem>
      return {
        id: typeof obj.id === 'string' && obj.id ? obj.id : genId('feat'),
        text: typeof obj.text === 'string' ? obj.text : '',
        manual: typeof obj.manual === 'boolean' ? obj.manual : false,
      }
    }
    return { id: genId('feat'), text: '', manual: false }
  }).filter((f) => f.text.trim() !== '')
}

function isDecisionType(v: unknown): v is DecisionType {
  return typeof v === 'string' && (DECISION_TYPES as string[]).includes(v)
}

function normalizeDecisionList(list: unknown): DesignDecision[] {
  if (!Array.isArray(list)) return []
  const out: DesignDecision[] = []
  for (const item of list) {
    let d: DesignDecision
    if (typeof item === 'string') {
      d = { id: genId('dec'), text: item, type: 'layout', manual: false }
    } else if (item && typeof item === 'object') {
      const obj = item as Partial<DesignDecision>
      d = {
        id: typeof obj.id === 'string' && obj.id ? obj.id : genId('dec'),
        text: typeof obj.text === 'string' ? obj.text : '',
        type: isDecisionType(obj.type) ? obj.type : 'layout',
        manual: typeof obj.manual === 'boolean' ? obj.manual : false,
      }
    } else {
      d = { id: genId('dec'), text: '', type: 'layout', manual: false }
    }
    if (d.text.trim() !== '') out.push(d)
  }
  return out
}

export function createEmptyBlueprint(): ProductBlueprint {
  return {
    product: { name: '', category: '', targetUsers: '', coreValue: '', description: '' },
    visualSpec: { primaryColor: '', secondaryColor: '', styleKeywords: [], borderRadius: '' },
    pages: [],
    navigation: { type: '', structure: '' },
    features: { confirmed: [], planned: [] },
    designDecisions: [],
    version: 0,
    lastUpdated: '',
  }
}

export function normalizeBlueprint(bp: Partial<ProductBlueprint> | null | undefined): ProductBlueprint {
  const empty = createEmptyBlueprint()
  if (!bp) return empty
  return {
    product: { ...empty.product, ...bp.product },
    visualSpec: { ...empty.visualSpec, ...bp.visualSpec },
    pages: Array.isArray(bp.pages) ? bp.pages : [],
    navigation: { ...empty.navigation, ...bp.navigation },
    features: {
      confirmed: normalizeFeatureList(bp.features?.confirmed),
      planned: normalizeFeatureList(bp.features?.planned),
    },
    designDecisions: normalizeDecisionList(bp.designDecisions),
    version: bp.version ?? 0,
    lastUpdated: bp.lastUpdated ?? '',
  }
}

export function isBlueprintEmpty(bp: ProductBlueprint): boolean {
  if (!bp) return true
  return bp.version === 0 || (!bp.product?.name && !(bp.pages?.length > 0))
}

export function blueprintCharCount(bp: ProductBlueprint): number {
  return JSON.stringify(bp).length
}

const BLUEPRINT_CHAR_LIMIT = 2000
const BLUEPRINT_REBUILD_THRESHOLD = 1800

export function shouldAutoRebuild(bp: ProductBlueprint): boolean {
  return blueprintCharCount(bp) > BLUEPRINT_REBUILD_THRESHOLD
}

function normalizeText(s: string): string {
  return s.trim().toLowerCase()
}

function mergeFeatureList(current: FeatureItem[], incoming: FeatureItem[]): FeatureItem[] {
  const result: FeatureItem[] = []
  const seenText = new Set<string>()

  for (const item of current) {
    if (item.manual) {
      result.push({ ...item })
      seenText.add(normalizeText(item.text))
    }
  }

  for (const item of incoming) {
    const key = normalizeText(item.text)
    if (key === '') continue
    if (seenText.has(key)) continue
    result.push({ ...item, manual: false })
    seenText.add(key)
  }

  return result
}

function mergeDecisionList(current: DesignDecision[], incoming: DesignDecision[]): DesignDecision[] {
  const result: DesignDecision[] = []
  const seenText = new Set<string>()

  for (const item of current) {
    if (item.manual) {
      result.push({ ...item })
      seenText.add(normalizeText(item.text))
    }
  }

  for (const item of incoming) {
    const key = normalizeText(item.text)
    if (key === '') continue
    if (seenText.has(key)) continue
    result.push({ ...item, manual: false })
    seenText.add(key)
  }

  return result
}

export function mergeBlueprint(current: ProductBlueprint, incoming: ProductBlueprint): ProductBlueprint {
  return {
    product: { ...incoming.product },
    visualSpec: { ...incoming.visualSpec },
    pages: Array.isArray(incoming.pages) ? incoming.pages : [],
    navigation: { ...incoming.navigation },
    features: {
      confirmed: mergeFeatureList(current.features.confirmed, incoming.features.confirmed),
      planned: mergeFeatureList(current.features.planned, incoming.features.planned),
    },
    designDecisions: mergeDecisionList(current.designDecisions, incoming.designDecisions),
    version: (current.version || 0) + 1,
    lastUpdated: new Date().toISOString(),
  }
}

export function buildBlueprintPromptSection(bp: ProductBlueprint): string {
  if (isBlueprintEmpty(bp)) return ''

  const lines: string[] = [
    '## 当前产品设计蓝图',
    '',
    '你正在为以下产品设计 UI，请确保新页面与已有设计保持一致：',
    '',
  ]

  if (bp.product?.name || bp.product?.category || bp.product?.targetUsers || bp.product?.description) {
    lines.push('### 产品概述')
    if (bp.product.description) lines.push(`- 产品描述：${bp.product.description}`)
    if (bp.product.name) lines.push(`- 产品名称：${bp.product.name}`)
    if (bp.product.category) lines.push(`- 类型：${bp.product.category}`)
    if (bp.product.targetUsers) lines.push(`- 目标用户：${bp.product.targetUsers}`)
    if (bp.product.coreValue) lines.push(`- 核心价值：${bp.product.coreValue}`)
    lines.push('')
  }

  if (bp.visualSpec?.primaryColor || bp.visualSpec?.styleKeywords?.length) {
    lines.push('### 视觉规范')
    if (bp.visualSpec.primaryColor) lines.push(`- 主色：${bp.visualSpec.primaryColor}`)
    if (bp.visualSpec.secondaryColor) lines.push(`- 辅助色：${bp.visualSpec.secondaryColor}`)
    if (bp.visualSpec.styleKeywords.length) lines.push(`- 风格：${bp.visualSpec.styleKeywords.join('、')}`)
    if (bp.visualSpec.borderRadius) lines.push(`- 圆角：${bp.visualSpec.borderRadius}`)
    lines.push('')
  }

  if (bp.pages?.length) {
    lines.push('### 已有页面')
    bp.pages.forEach((p, i) => {
      const status = p.status === 'designed' ? '已设计' : '规划中'
      const comps = p.keyComponents?.length ? `（${p.keyComponents.join('、')}）` : ''
      lines.push(`${i + 1}. ${p.name} — ${p.purpose} ${comps} [${status}]`)
    })
    lines.push('')
  }

  if (bp.navigation?.type || bp.navigation?.structure) {
    lines.push('### 导航结构')
    if (bp.navigation.type) lines.push(`- 类型：${bp.navigation.type}`)
    if (bp.navigation.structure) lines.push(`- 结构：${bp.navigation.structure}`)
    lines.push('')
  }

  if (bp.features?.confirmed?.length || bp.features?.planned?.length) {
    lines.push('### 功能模块')
    if (bp.features.confirmed.length) {
      lines.push(`- 已确认：${bp.features.confirmed.map((f) => f.text).join('、')}`)
    }
    if (bp.features.planned.length) {
      lines.push(`- 规划中：${bp.features.planned.map((f) => f.text).join('、')}`)
    }
    lines.push('')
  }

  if (bp.designDecisions?.length) {
    lines.push('### 设计决策')
    for (const type of DECISION_TYPES) {
      const group = bp.designDecisions.filter((d) => d.type === type)
      if (group.length) {
        lines.push(`- ${DECISION_TYPE_LABELS[type]}：${group.map((d) => d.text).join('；')}`)
      }
    }
    const others = bp.designDecisions.filter((d) => !DECISION_TYPES.includes(d.type))
    if (others.length) {
      lines.push(`- 其他：${others.map((d) => d.text).join('；')}`)
    }
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
- "update"：增量更新，输出完整蓝图（前端按合并策略处理）
- "rebuild"：重新整理蓝图（精炼压缩，控制在合理长度内）

### 蓝图更新规则
1. 首次生成时 action 为 "init"，创建完整蓝图
2. 后续生成时 action 为 "update"，输出完整蓝图（前端会保留用户手动维护的项）
3. 新增页面时，在 pages 数组中添加新条目，status 为 "designed"
4. 用户提到但未设计的页面，status 标记为 "planned"
5. 用户的明确偏好加入 designDecisions 数组
6. 每个页面描述保持简练（一句话说明用途）
7. 视觉规范从你实际使用的样式中提取
8. version 每次更新时 +1
9. 如果蓝图过长（超过合理范围），自动将 action 设为 "rebuild" 并精炼压缩内容
10. product.description 必须填写：用一段话（50-150 字）说明产品是什么、解决什么问题、核心价值主张；后续更新时若产品定位无变化则保持不变

### features 与 designDecisions 的项结构（必须遵守）
features.confirmed 与 features.planned 的每一项为对象：
{ "id": "feat-001", "text": "用户登录", "manual": false }
designDecisions 的每一项为对象：
{ "id": "dec-color-01", "text": "主色使用 #6366F1 体现科技感", "type": "color", "manual": false }

- id 必须为稳定字符串（如 feat-001、dec-color-01），便于前端去重
- designDecisions.type 取值：color | typography | layout | interaction | component
- manual 字段：LLM 生成的项必须为 false；**绝对不得**输出 manual 为 true 的项，也不得删除 blueprint 中已存在的 manual: true 项（如不确定则原样保留）

### 蓝图的目的
蓝图用于为后续新页面设计提供一致性上下文，避免功能缺失或风格漂移。请确保每次输出都如实反映当前已设计稿的功能与设计决策。
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
