import type { PageType } from '../prompts/page-types'
import type { ColorScheme } from '../prompts/colors'
import { buildSystemPrompt } from '../prompts/system'
import { searchIcons, searchIconsToolDefinition } from './tools'
import { callOpenAICompatible, type ChatMessage, type ToolDefinition } from './llmClient'
import { useLLMConfigStore } from '../stores/llmConfigStore'

export interface LLMResult {
  content: string
  html: string | null
  screenshot: string
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
  // 移除 markdown 包裹
  let cleaned = text
  const md = cleaned.match(/```html?\s*([\s\S]*?)```/)
  if (md) cleaned = md[1]
  const md2 = cleaned.match(/```\s*([\s\S]*?)```/)
  if (md2) cleaned = md2[1]

  // 尝试找到 <!DOCTYPE html> 或 <html> 标签
  const doctype = cleaned.indexOf('<!DOCTYPE html>')
  const htmlTag = cleaned.indexOf('<html')
  if (doctype !== -1) return cleaned.substring(doctype).trim()
  if (htmlTag !== -1) return '<!DOCTYPE html>\n' + cleaned.substring(htmlTag).trim()

  return null
}

export interface SendMessageOptions {
  pageType: PageType
  colorScheme: ColorScheme
  history: Array<{ role: string; content: string }>
  selectedHtml?: string
  onStreamingHTML?: (html: string) => void
}

const MAX_TOOL_ROUNDS = 3

async function callRealLLM(userText: string, options: SendMessageOptions): Promise<LLMResult> {
  const configStore = useLLMConfigStore()
  const config = configStore.getConfig()
  const systemPrompt = buildSystemPrompt(options.pageType, options.colorScheme)

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

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const response = await callOpenAICompatible(config, messages, TOOLS, {
      onContent: (chunk) => {
        fullContent += chunk
        const html = extractHTML(fullContent)
        if (html) options.onStreamingHTML?.(html)
      },
    })

    if (response.tool_calls && response.tool_calls.length > 0) {
      messages.push({ role: 'assistant', content: response.content || '', tool_calls: response.tool_calls })
      for (const tc of response.tool_calls) {
        const result = await executeToolCall(tc.function.name, tc.function.arguments)
        messages.push({ role: 'tool', content: result, tool_call_id: tc.id })
      }
      continue
    }

    const finalContent = response.content || fullContent
    const html = extractHTML(finalContent)
    return { content: html ? '已为你生成了设计稿。' : finalContent, html, screenshot: '' }
  }

  const html = extractHTML(fullContent)
  return { content: html ? '已为你生成了设计稿。' : fullContent, html, screenshot: '' }
}

export async function sendMessageToLLM(
  userText: string,
  options: SendMessageOptions,
): Promise<LLMResult> {
  const configStore = useLLMConfigStore()

  if (configStore.isConfigured) {
    try {
      const result = await callRealLLM(userText, options)
      if (result.html) return result
      return { content: result.content || 'AI 已回复，但未能生成设计稿，请重试。', html: null, screenshot: '' }
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
