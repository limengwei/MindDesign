import type { PageType } from '../prompts/page-types'
import type { ColorScheme } from '../prompts/colors'
import type { DesignSpecId } from '../prompts/designSpecs'
import type { DesignSkill } from '../prompts/skills'
import type { ProductBlueprint } from '../prompts/blueprint'
import { extractBlueprintUpdate } from '../prompts/blueprint'
import { buildSystemPrompt } from '../prompts/system'
import { searchIcons, searchIconsToolDefinition } from './tools'
import { callOpenAICompatible, type ChatMessage, type ToolDefinition } from './llmClient'
import { useLLMConfigStore } from '../stores/llmConfigStore'

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

export interface LLMResult {
  content: string
  html: string | null
  screenshot: string
  critique?: DesignCritique | null
  preflight?: PreflightData | null
  blueprintUpdate?: { action: string; blueprint: ProductBlueprint } | null
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
    return icons.length > 0 ? `找到的图标: ${icons.join('; ')}` : '未找到匹配的图标'
  }
  return `未知工具: ${name}`
}

/** 从 LLM 输出的文本中提取完整的 HTML 文档 */
function extractHTML(text: string): string | null {
  let cleaned = text.replace(/<!-- DESIGN_CRITIQUE[\s\S]*?DESIGN_CRITIQUE -->/g, '')
  cleaned = cleaned.replace(/<!-- PREFLIGHT[\s\S]*?PREFLIGHT -->/g, '')
  cleaned = cleaned.replace(/<!-- BLUEPRINT_UPDATE[\s\S]*?BLUEPRINT_UPDATE -->/g, '')
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

function parseDSMLToolCalls(text: string): { name: string; args: string }[] | null {
  if (!text.includes('DSML')) return null
  const calls: { name: string; args: string }[] = []
  const invokeRegex = /<\|*\|DSML\|*\|invoke\s+name="([^"]+)">([\s\S]*?)<\/\|*\|DSML\|*\|invoke>/g
  let match
  while ((match = invokeRegex.exec(text)) !== null) {
    const name = match[1]
    const body = match[2]
    const params: Record<string, unknown> = {}
    const paramRegex = /<\|*\|DSML\|*\|parameter\s+name="([^"]+)"[^>]*>([^<]*)<\/\|*\|DSML\|*\|parameter>/g
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

export interface SendMessageOptions {
  pageType: PageType
  colorScheme: ColorScheme
  designSpecId?: DesignSpecId
  customDesignContent?: string
  history: Array<{ role: string; content: string }>
  selectedHtml?: string
  onStreamingHTML?: (html: string) => void
  skill?: DesignSkill | null
  isFirstMessage?: boolean
  blueprint?: ProductBlueprint | null
}

const MAX_TOOL_ROUNDS = 8
const MAX_TOOL_CALLS = 2

async function callRealLLM(userText: string, options: SendMessageOptions): Promise<LLMResult> {
  const configStore = useLLMConfigStore()
  const config = configStore.getConfig()
  const systemPrompt = buildSystemPrompt(options.pageType, options.colorScheme, options.designSpecId, options.customDesignContent, options.skill, options.isFirstMessage, options.blueprint)

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

  messages.push({ role: 'user', content: userText })

  let fullContent = ''
  let toolCallCount = 0

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const allowTools = toolCallCount < MAX_TOOL_CALLS
    const toolsToUse = allowTools ? TOOLS : undefined

    console.log('[LLM] === round', round, 'start === tools allowed:', allowTools, 'tool calls so far:', toolCallCount)
    console.log('[LLM] messages count:', messages.length)

    const response = await callOpenAICompatible(config, messages, toolsToUse, {
      onContent: (chunk) => {
        fullContent += chunk
        const html = extractHTML(fullContent)
        if (html) options.onStreamingHTML?.(html)
      },
    })

    console.log('[LLM] round', round, 'response.content:', response.content?.slice(0, 200))
    console.log('[LLM] round', round, 'tool_calls:', response.tool_calls?.map(tc => tc.function.name))
    console.log('[LLM] round', round, 'fullContent so far:', fullContent.length, 'chars')

    if (response.tool_calls && response.tool_calls.length > 0) {
      toolCallCount++
      messages.push({ role: 'assistant', content: response.content || '', tool_calls: response.tool_calls })
      for (const tc of response.tool_calls) {
        console.log('[LLM] executing tool:', tc.function.name, 'args:', tc.function.arguments.slice(0, 100))
        const result = await executeToolCall(tc.function.name, tc.function.arguments)
        console.log('[LLM] tool result:', result.slice(0, 200))
        messages.push({ role: 'tool', content: result, tool_call_id: tc.id })
      }
      continue
    }

    const finalContent = response.content || fullContent

    const dsmlCalls = parseDSMLToolCalls(finalContent)
    if (dsmlCalls && dsmlCalls.length > 0 && toolCallCount < MAX_TOOL_CALLS + 2) {
      console.log('[LLM] round', round, 'detected DSML tool calls:', dsmlCalls.length)
      toolCallCount++
      const fakeToolCalls = dsmlCalls.map((c, i) => ({
        id: `dsml-${round}-${i}`,
        type: 'function' as const,
        function: { name: c.name, arguments: c.args },
      }))
      messages.push({ role: 'assistant', content: finalContent, tool_calls: fakeToolCalls })
      for (const tc of fakeToolCalls) {
        console.log('[LLM] executing DSML tool:', tc.function.name, 'args:', tc.function.arguments.slice(0, 100))
        const result = await executeToolCall(tc.function.name, tc.function.arguments)
        console.log('[LLM] DSML tool result:', result.slice(0, 200))
        messages.push({ role: 'tool', content: result, tool_call_id: tc.id })
      }
      fullContent = ''
      continue
    }

    const html = extractHTML(finalContent)
    const critique = extractCritique(finalContent)
    const preflight = extractPreflight(finalContent)
    const blueprintUpdate = extractBlueprintUpdate(finalContent)
    console.log('[LLM] round', round, 'finalContent length:', finalContent.length, 'html extracted:', !!html, 'critique:', !!critique, 'preflight:', !!preflight, 'blueprint:', !!blueprintUpdate)
    if (!html && finalContent) {
      console.log('[LLM] raw content (first 500):', finalContent.slice(0, 500))
    }
    return { content: html ? '已为你生成了设计稿。' : finalContent, html, screenshot: '', critique, preflight, blueprintUpdate }
  }

  const html = extractHTML(fullContent)
  const critique = extractCritique(fullContent)
  const preflight = extractPreflight(fullContent)
  const blueprintUpdate = extractBlueprintUpdate(fullContent)
  console.log('[LLM] max rounds reached, fullContent length:', fullContent.length, 'html extracted:', !!html)
  return { content: html ? '已为你生成了设计稿。' : fullContent, html, screenshot: '', critique, preflight, blueprintUpdate }
}

export async function sendMessageToLLM(
  userText: string,
  options: SendMessageOptions,
): Promise<LLMResult> {
  const configStore = useLLMConfigStore()

  if (configStore.isConfigured) {
    try {
      const result = await callRealLLM(userText, options)
      if (result.html || result.preflight) return result
      return { content: result.content || 'AI 已回复，但未能生成设计稿，请重试。', html: null, screenshot: '', critique: result.critique, preflight: result.preflight, blueprintUpdate: result.blueprintUpdate }
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
