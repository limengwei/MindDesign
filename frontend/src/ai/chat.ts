import type { PageType } from '../prompts/page-types'
import type { ColorScheme } from '../prompts/colors'
import type { DesignSkill } from '../prompts/skills'
import type { ProductBlueprint } from '../prompts/blueprint'
import type { VisualDirection } from '../prompts/directions'
import type { BrandAsset } from '../prompts/brandAssets'
import { extractBlueprintUpdate } from '../prompts/blueprint'
import { buildSystemPrompt } from '../prompts/system'
import { searchIcons, searchIconsToolDefinition } from './tools'
import { callOpenAICompatible, callClaude, type ChatMessage, type ToolDefinition, type LLMResponse } from './llmClient'
import { useLLMConfigStore, type LLMConfig } from '../stores/llmConfigStore'

export interface DesignCritique {
  scores: {
    consistency: number
    hierarchy: number
    usability: number
    brand: number
    completeness: number
  }
  summary: string
  suggestions: string[]
}

export interface PreflightQuestion {
  key: string
  label: string
  type: 'select' | 'multiselect'
  options: Array<{ value: string; label: string }>
}

export interface PreflightData {
  type: 'preflight'
  brief_summary: string
  questions: PreflightQuestion[]
}

/** Phase 3：变体（来自 LLM 的 VARIANTS 块） */
export interface VariantResult {
  name?: string
  dimension?: 'colors' | 'layout' | 'tone' | 'mixed'
  html: string
  critique?: string
}

export interface LLMResult {
  content: string
  html: string | null
  screenshot: string
  critique?: DesignCritique | null
  preflight?: PreflightData | null
  blueprintUpdate?: { action: string; blueprint: ProductBlueprint } | null
  /** Phase 3：变体（仅在调用"生成 N 个变体"时填充） */
  variants?: VariantResult[] | null
}

const TOOLS: ToolDefinition[] = [
  {
    type: 'function',
    function: {
      name: searchIconsToolDefinition.name,
      description: searchIconsToolDefinition.description,
      parameters: searchIconsToolDefinition.parameters as Record<string, unknown>,
    },
  },
]

async function executeToolCall(name: string, args: string): Promise<string> {
  let parsed: Record<string, unknown>
  try { parsed = JSON.parse(args) } catch (err) {
    return `无效的参数格式: ${(err as Error).message}`
  }
  if (name === 'search_icons') {
    const results = await searchIcons(parsed.query as string, parsed.limit as number | undefined)
    const icons = results.map(r => `${r.name} (${r.keywords.join(', ')})`)
    if (icons.length === 0) return '未找到匹配的图标'
    return `找到的图标: ${icons.join('; ')}`
  }
  return `未知工具: ${name}`
}

/** 从 LLM 输出的文本中提取完整的 HTML 文档 */
function extractHTML(text: string): string | null {
  let cleaned = text.replace(/<!-- DESIGN_CRITIQUE[\s\S]*?DESIGN_CRITIQUE -->/g, '')
  cleaned = cleaned.replace(/<!-- PREFLIGHT[\s\S]*?PREFLIGHT -->/g, '')
  cleaned = cleaned.replace(/<!-- BLUEPRINT_UPDATE[\s\S]*?BLUEPRINT_UPDATE -->/g, '')
  cleaned = cleaned.replace(/<!-- VARIANTS[\s\S]*?VARIANTS -->/g, '')
  const md = cleaned.match(/```html?\s*([\s\S]*?)```/)
  if (md) cleaned = md[1]
  const md2 = cleaned.match(/```\s*([\s\S]*?)```/)
  if (md2) cleaned = md2[1]

  const doctype = cleaned.indexOf('<!DOCTYPE html>')
  const htmlTag = cleaned.indexOf('<html')
  if (doctype !== -1) return cleaned.substring(doctype).trim()
  if (htmlTag !== -1) return '<!DOCTYPE html>\n' + cleaned.substring(htmlTag).trim()

  return null
}

function extractCritique(text: string): DesignCritique | null {
  const match = text.match(/<!-- DESIGN_CRITIQUE\s*([\s\S]*?)\s*DESIGN_CRITIQUE -->/)
  if (!match) return null
  try {
    return JSON.parse(match[1].trim()) as DesignCritique
  } catch {
    return null
  }
}

function extractPreflight(text: string): PreflightData | null {
  const match = text.match(/<!-- PREFLIGHT\s*([\s\S]*?)\s*PREFLIGHT -->/)
  if (!match) return null
  try {
    const data = JSON.parse(match[1].trim())
    if (data.type === 'preflight' && Array.isArray(data.questions)) {
      return data as PreflightData
    }
    return null
  } catch {
    return null
  }
}

/** Phase 3：从 VARIANTS 块抽取多个变体 */
function extractVariants(text: string): VariantResult[] | null {
  const match = text.match(/<!-- VARIANTS\s*([\s\S]*?)\s*VARIANTS -->/)
  if (!match) return null
  try {
    const data = JSON.parse(match[1].trim())
    if (Array.isArray(data)) {
      return data.map((v: any) => ({
        name: v.name,
        dimension: v.dimension,
        html: String(v.html || ''),
        critique: v.critique,
      })).filter(v => !!v.html)
    }
    return null
  } catch {
    return null
  }
}

function stripDSML(text: string): string {
  if (!text.includes('DSML')) return text
  const pipe = '[\\|\uFF5C]'
  return text.replace(new RegExp(`</?${pipe}*${pipe}DSML${pipe}*${pipe}[^>]*>`, 'g'), '').trim()
}

function parseDSMLToolCalls(text: string): { name: string; args: string }[] | null {
  if (!text.includes('DSML')) return null
  const pipe = '[\\|\uFF5C]'
  const calls: { name: string; args: string }[] = []
  const invokeRegex = new RegExp(`<${pipe}*${pipe}DSML${pipe}*${pipe}invoke\\s+name="([^"]+)">([\\s\\S]*?)<\\/${pipe}*${pipe}DSML${pipe}*${pipe}invoke>`, 'g')
  let match
  while ((match = invokeRegex.exec(text)) !== null) {
    const name = match[1]
    const body = match[2]
    const params: Record<string, unknown> = {}
    const paramRegex = new RegExp(`<${pipe}*${pipe}DSML${pipe}*${pipe}parameter\\s+name="([^"]+)"[^>]*>([^<]*)<\\/${pipe}*${pipe}DSML${pipe}*${pipe}parameter>`, 'g')
    let pm
    while ((pm = paramRegex.exec(body)) !== null) {
      const val = pm[2].trim()
      const num = Number(val)
      params[pm[1]] = !isNaN(num) && val !== '' ? num : val
    }
    calls.push({ name, args: JSON.stringify(params) })
  }
  return calls.length > 0 ? calls : null
}

/** 变体生成模式系统指令 */
const VARIANTS_PROTOCOL = `
## 变体生成模式

为该画板生成 3 个变体，差异维度：颜色 / 布局骨架 / 文案语气。

每个变体输出一份独立 HTML，并附上名称（变体 1 / 变体 2 / 变体 3）与 dimension。

输出格式（在 HTML 之后）：

<!-- VARIANTS
[
  { "name": "变体 1", "dimension": "colors", "html": "<!DOCTYPE html>...完整 HTML...", "critique": "一句话点评" },
  { "name": "变体 2", "dimension": "layout", "html": "...", "critique": "..." },
  { "name": "变体 3", "dimension": "tone", "html": "...", "critique": "..." }
]
VARIANTS -->
`

export interface SendMessageOptions {
  pageType: PageType
  colorScheme: ColorScheme
  designSpecId?: string
  customDesignContent?: string
  history: Array<{ role: string; content: string }>
  selectedHtml?: string
  skill?: DesignSkill | null
  isFirstMessage?: boolean
  blueprint?: ProductBlueprint | null
  direction?: VisualDirection | null
  brandAsset?: BrandAsset | null
  /** Phase 3：是否使用变体生成模式（替换单 HTML 输出为多 variants 块） */
  variantsMode?: boolean
  /** Phase 4 · Task 17：组件清单（注入到 system prompt） */
  components?: { id?: string; name: string; html: string }[] | null
  /** Phase 4 · Task 17：用户"已选"组件（id + name + 简短描述，注入到 system prompt） */
  selectedComponents?: { id: string; name: string; snippet: string }[] | null
  /** Phase 4 · Task 20：参考图（dataURL 列表） */
  referenceImages?: string[]
  /** Phase 4 · Task 15：QA 报告追加（把 QA 结果追加到 system prompt） */
  qaReport?: string | null
}

const MAX_TOOL_ROUNDS = 8
const MAX_TOOL_CALLS = 2

function callLLM(config: LLMConfig, messages: ChatMessage[], tools?: ToolDefinition[]): Promise<LLMResponse> {
  if (config.protocol === 'claude') {
    return callClaude(config, messages, tools)
  }
  return callOpenAICompatible(config, messages, tools)
}

async function callRealLLM(userText: string, options: SendMessageOptions): Promise<LLMResult> {
  const configStore = useLLMConfigStore()
  const config = configStore.getConfig()
  let systemPrompt = buildSystemPrompt(
    options.pageType,
    options.colorScheme,
    options.designSpecId,
    options.customDesignContent,
    options.skill,
    options.isFirstMessage,
    options.blueprint,
    options.direction,
    options.brandAsset,
    options.components ?? null,
  )

  // Phase 4 · Task 17：把用户"已选"组件清单追加到 system prompt
  if (options.selectedComponents && options.selectedComponents.length > 0) {
    systemPrompt += '\n\n## 当前用户已选组件清单（请优先使用）\n' +
      options.selectedComponents
        .map(c => `- [id=${c.id}] ${c.name}：${c.snippet}`)
        .join('\n')
  }
  // Phase 3：变体模式追加系统指令
  if (options.variantsMode) {
    systemPrompt = systemPrompt + '\n\n' + VARIANTS_PROTOCOL
  }
  // Phase 4 · Task 15：QA 报告追加
  if (options.qaReport) {
    systemPrompt = systemPrompt + '\n\n## 自动质检反馈\n\n系统对你的设计稿进行了 DOM/Token/A11y 三类质检，请根据以下问题修正：\n\n' + options.qaReport + '\n\n请输出一份修正后的完整 HTML（不要 markdown 包裹）。'
  }

  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
  ]

  if (options.selectedHtml) {
    messages.push({
      role: 'user',
      content: `以下是我当前的设计稿 HTML，请基于它进行修改：\n\n${options.selectedHtml}`,
    })
    messages.push({
      role: 'assistant',
      content: '好的，我已经了解了你当前的设计稿，请告诉我你想要做哪些修改。',
    })
  }

  // Phase 4 · Task 20：参考图
  if (options.referenceImages && options.referenceImages.length > 0) {
    for (const dataUrl of options.referenceImages) {
      messages.push({
        role: 'user',
        content: [
          { type: 'text', text: '以下是一张参考图，请在生成 HTML 前先分析它（主色 / 布局骨架 / 关键组件）：' },
          { type: 'image_url', image_url: { url: dataUrl } },
        ] as any,
      })
    }
  }

  messages.push({ role: 'user', content: userText })

  let toolCallCount = 0

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const allowTools = toolCallCount < MAX_TOOL_CALLS
    const toolsToUse = allowTools ? TOOLS : undefined

    console.log('[LLM] === round', round, 'start === tools allowed:', allowTools, 'tool calls so far:', toolCallCount)
    console.log('[LLM] messages count:', messages.length)

    const response = await callLLM(config, messages, toolsToUse)

    console.log('[LLM] round', round, 'response.content:', response.content?.slice(0, 200))
    console.log('[LLM] round', round, 'tool_calls:', response.tool_calls?.map(tc => tc.function.name))

    if (response.tool_calls && response.tool_calls.length > 0) {
      toolCallCount++
      const assistantMsg: ChatMessage = { role: 'assistant', content: response.content || '', tool_calls: response.tool_calls }
      if (response.reasoning_content) assistantMsg.reasoning_content = response.reasoning_content
      messages.push(assistantMsg)
      for (const tc of response.tool_calls) {
        console.log('[LLM] executing tool:', tc.function.name, 'args:', tc.function.arguments.slice(0, 100))
        const result = await executeToolCall(tc.function.name, tc.function.arguments)
        console.log('[LLM] tool result:', result.slice(0, 200))
        messages.push({ role: 'tool', content: result, tool_call_id: tc.id })
      }
      continue
    }

    const finalContent = response.content || ''

    const dsmlCalls = parseDSMLToolCalls(finalContent)
    console.log('[LLM] round', round, 'dsmlCalls:', dsmlCalls?.length ?? null, 'toolCallCount:', toolCallCount, 'limit:', MAX_TOOL_CALLS + 2)
    if (dsmlCalls && dsmlCalls.length > 0 && toolCallCount < MAX_TOOL_CALLS + 2) {
      console.log('[LLM] round', round, 'detected DSML tool calls:', dsmlCalls.length)
      toolCallCount++
      const fakeToolCalls = dsmlCalls.map((c, i) => ({
        id: `dsml-${round}-${i}`,
        type: 'function' as const,
        function: { name: c.name, arguments: c.args },
      }))
      const dsmlAssistantMsg: ChatMessage = { role: 'assistant', content: finalContent, tool_calls: fakeToolCalls }
      if (response.reasoning_content) dsmlAssistantMsg.reasoning_content = response.reasoning_content
      messages.push(dsmlAssistantMsg)
      for (const tc of fakeToolCalls) {
        console.log('[LLM] executing DSML tool:', tc.function.name, 'args:', tc.function.arguments.slice(0, 100))
        const result = await executeToolCall(tc.function.name, tc.function.arguments)
        console.log('[LLM] DSML tool result:', result.slice(0, 200))
        messages.push({ role: 'tool', content: result, tool_call_id: tc.id })
      }
      continue
    }

    // DSML tool call 超限但内容仍全是 DSML 标签，追加提示让模型直接输出 HTML
    if (dsmlCalls && dsmlCalls.length > 0 && toolCallCount >= MAX_TOOL_CALLS + 2) {
      console.log('[LLM] round', round, 'DSML limit reached, asking model to output HTML directly')
      messages.push({ role: 'assistant', content: finalContent })
      messages.push({ role: 'user', content: '请停止搜索图标，直接使用已有的图标结果输出完整的 HTML 设计稿。如果缺少某个图标，用 design_services 替代。' })
      continue
    }

    let html = extractHTML(stripDSML(finalContent))
    const critique = extractCritique(finalContent)
    const preflight = extractPreflight(finalContent)
    const blueprintUpdate = extractBlueprintUpdate(finalContent)
    const variants = options.variantsMode ? extractVariants(finalContent) : null
    console.log('[LLM] round', round, 'finalContent length:', finalContent.length, 'html extracted:', !!html, 'variants:', variants?.length ?? 0)

    // LLM 输出了 critique/blueprint 但没有 HTML，追问一轮让它补充
    if (!html && !preflight && !variants && !options.variantsMode && round < MAX_TOOL_ROUNDS - 1) {
      console.log('[LLM] round', round, 'no HTML found, asking model to output HTML')
      messages.push({ role: 'assistant', content: finalContent })
      messages.push({ role: 'user', content: '你的回复中没有包含 HTML 设计稿。请直接输出完整的 HTML 文件（以 <!DOCTYPE html> 开头），不需要重复设计评审和蓝图。' })
      continue
    }

    return {
      content: html ? '已为你生成了设计稿。' : finalContent,
      html,
      screenshot: '',
      critique,
      preflight,
      blueprintUpdate,
      variants
    }
  }

  // 达到最大轮次，用最后一条 assistant 消息的内容
  const lastAssistantMsg = messages.filter(m => m.role === 'assistant').pop()
  const lastContent = lastAssistantMsg?.content || ''

  const html = extractHTML(stripDSML(lastContent))
  const critique = extractCritique(lastContent)
  const preflight = extractPreflight(lastContent)
  const blueprintUpdate = extractBlueprintUpdate(lastContent)
  const variants = options.variantsMode ? extractVariants(lastContent) : null
  console.log('[LLM] max rounds reached, content length:', lastContent.length, 'html extracted:', !!html)
  return {
    content: html ? '已为你生成了设计稿。' : lastContent,
    html,
    screenshot: '',
    critique,
    preflight,
    blueprintUpdate,
    variants
  }
}

export async function sendMessageToLLM(
  userText: string,
  options: SendMessageOptions,
): Promise<LLMResult> {
  const configStore = useLLMConfigStore()

  if (configStore.isConfigured) {
    try {
      const result = await callRealLLM(userText, options)
      if (result.html || result.preflight || (options.variantsMode && result.variants)) return result
      return {
        content: result.content || 'AI 已回复，但未能生成设计稿，请重试。',
        html: null,
        screenshot: '',
        critique: result.critique,
        preflight: result.preflight,
        blueprintUpdate: result.blueprintUpdate,
        variants: result.variants,
      }
    } catch (err) {
      const msg = (err as Error).message || String(err)
      return { content: `❌ API 错误: ${msg}`, html: null, screenshot: '' }
    }
  }

  return {
    content: '⚠️ 未配置 AI 服务。请点击右上角齿轮图标设置 API Key。',
    html: null,
    screenshot: '',
  }
}
