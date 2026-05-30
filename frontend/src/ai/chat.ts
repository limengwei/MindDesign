import type { ElementTree } from '../types/element'
import type { PageType } from '../prompts/page-types'
import type { ColorScheme } from '../prompts/colors'
import { buildSystemPrompt } from '../prompts/system'
import { searchIcons, searchIconsToolDefinition } from './tools'
import { callOpenAICompatible, type ChatMessage, type ToolDefinition } from './llmClient'
import { useLLMConfigStore } from '../stores/llmConfigStore'
import { matchMock } from './mockData'

export interface LLMResult {
  content: string
  tree: ElementTree | null
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
  try {
    parsed = JSON.parse(args)
  } catch (err) {
    return `无效的参数格式: ${(err as Error).message}`
  }

  if (name === 'search_icons') {
    const results = await searchIcons(parsed.query as string, parsed.limit as number | undefined)
    const icons = results.map((r) => `${r.name} (${r.keywords.join(', ')})`)
    return icons.length > 0
      ? `找到的图标: ${icons.join('; ')}`
      : '未找到匹配的图标，请尝试其他关键词'
  }
  return `未知工具: ${name}`
}

function extractElementTree(text: string): ElementTree | null {
  const jsonPatterns = [
    /```json\s*([\s\S]*?)```/,
    /```\s*([\s\S]*?)```/,
    /(\{[\s\S]*"type"\s*:\s*"(Frame|Rect|Text|Icon|Ellipse|Group|Box|Path|Line)"[\s\S]*\})/,
  ]

  for (const pattern of jsonPatterns) {
    const match = text.match(pattern)
    if (match?.[1]) {
      try {
        const parsed = JSON.parse(match[1].trim())
        if (parsed.type) return parsed as ElementTree
      } catch {}
    }
  }

  try {
    const start = text.indexOf('{')
    const end = text.lastIndexOf('}')
    if (start !== -1 && end > start) {
      const candidate = text.substring(start, end + 1)
      const parsed = JSON.parse(candidate)
      if (parsed.type) return parsed as ElementTree
    }
  } catch {}

  return null
}

export interface SendMessageOptions {
  pageType: PageType
  colorScheme: ColorScheme
  history: Array<{ role: string; content: string }>
  currentTree?: ElementTree | null
  onStreaming?: (text: string) => void
  onStreamingTree?: (tree: ElementTree) => void
}

const MAX_TOOL_ROUNDS = 3

async function callRealLLM(
  userText: string,
  options: SendMessageOptions,
): Promise<LLMResult> {
  const configStore = useLLMConfigStore()
  const config = configStore.getConfig()
  const systemPrompt = buildSystemPrompt(options.pageType, options.colorScheme)

  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
  ]

  if (options.currentTree) {
    messages.push({
      role: 'system',
      content: `当前画布上的设计稿 JSON 如下，用户可能会要求你在此基础上修改：\n${JSON.stringify(options.currentTree)}`,
    })
  }

  messages.push(
    ...options.history.map((m) => ({
      role: m.role as ChatMessage['role'],
      content: m.content,
    })),
    { role: 'user', content: userText },
  )

  let fullContent = ''

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const response = await callOpenAICompatible(config, messages, TOOLS, {
      onContent: (chunk) => {
        fullContent += chunk
        options.onStreaming?.(fullContent)
        const partialTree = extractElementTree(fullContent)
        if (partialTree) {
          options.onStreamingTree?.(partialTree)
        }
      },
    })

    if (response.tool_calls && response.tool_calls.length > 0) {
      messages.push({
        role: 'assistant',
        content: response.content || '',
        tool_calls: response.tool_calls,
      })

      for (const tc of response.tool_calls) {
        const result = await executeToolCall(tc.function.name, tc.function.arguments)
        messages.push({
          role: 'tool',
          content: result,
          tool_call_id: tc.id,
        })
      }
      continue
    }

    const finalContent = response.content || fullContent
    const tree = extractElementTree(finalContent)
    return { content: tree ? '已为你生成了设计稿。' : finalContent, tree }
  }

  const tree = extractElementTree(fullContent)
  return { content: tree ? '已为你生成了设计稿。' : fullContent, tree }
}

export async function sendMessageToLLM(
  userText: string,
  options: SendMessageOptions,
): Promise<LLMResult> {
  const configStore = useLLMConfigStore()

  if (configStore.isConfigured) {
    try {
      const result = await callRealLLM(userText, options)
      if (result.tree) {
        return result
      }
      const msg = result.content || 'AI 已回复，但未能生成设计稿，请重试。'
      return { content: msg, tree: matchMock(userText) }
    } catch (err) {
      const msg = (err as Error).message || String(err)
      return { content: `❌ API 错误: ${msg}`, tree: null }
    }
  }

  return {
    content: '⚠️ 未配置 AI 服务。请点击右上角齿轮图标设置 API Key。支持 DeepSeek / 智谱 GLM / OpenAI。',
    tree: null,
  }
}
