import type { ElementTree } from '../types/element'
import type { PageType } from '../prompts/page-types'
import type { ColorScheme } from '../prompts/colors'
import { buildSystemPrompt } from '../prompts/system'
import { searchIcons, searchIconsToolDefinition } from './tools'
import { callOpenAICompatible, type ChatMessage, type ToolDefinition } from './llmClient'
import { useLLMConfigStore } from '../stores/llmConfigStore'

const MOCK_TREES: Record<string, ElementTree> = {
  button: {
    type: 'Frame',
    width: 200,
    height: 48,
    fill: '#EF4444',
    cornerRadius: 24,
    autoLayout: {
      direction: 'row',
      gap: 8,
      align: 'center',
    },
    children: [
      { type: 'Icon', name: 'search', size: 20, color: '#FFFFFF' },
      { type: 'Text', text: '搜索', fontSize: 16, fill: '#FFFFFF', fontWeight: 500 },
    ],
  },
  login: {
    type: 'Frame',
    width: 375,
    fill: '#FFFFFF',
    autoLayout: { direction: 'column', gap: 24, padding: 32 },
    children: [
      {
        type: 'Frame',
        autoLayout: { direction: 'column', gap: 8, align: 'center' },
        children: [
          { type: 'Icon', name: 'account_circle', size: 64, color: '#4F46E5' },
          { type: 'Text', text: '欢迎回来', fontSize: 28, fontWeight: 700, fill: '#1A1A1A', textAlign: 'center' },
        ],
      },
      {
        type: 'Frame',
        autoLayout: { direction: 'column', gap: 12 },
        children: [
          {
            type: 'Frame',
            autoLayout: { direction: 'row', gap: 12 },
            fill: '#F5F5F5',
            cornerRadius: 12,
            children: [
              { type: 'Icon', name: 'email', size: 24, color: '#666666' },
              { type: 'Text', text: '请输入邮箱', fontSize: 14, fill: '#999999' },
            ],
          },
          {
            type: 'Frame',
            autoLayout: { direction: 'row', gap: 12 },
            fill: '#F5F5F5',
            cornerRadius: 12,
            children: [
              { type: 'Icon', name: 'lock', size: 24, color: '#666666' },
              { type: 'Text', text: '请输入密码', fontSize: 14, fill: '#999999' },
              { type: 'Icon', name: 'visibility_off', size: 24, color: '#999999' },
            ],
          },
        ],
      },
      {
        type: 'Frame',
        width: 'fill',
        height: 48,
        cornerRadius: 24,
        fill: '#4F46E5',
        autoLayout: { direction: 'row', align: 'center' },
        children: [
          { type: 'Text', text: '登录', fontSize: 16, fill: '#FFFFFF', fontWeight: 600, textAlign: 'center' },
        ],
      },
      { type: 'Text', text: '忘记密码？', fontSize: 14, fill: '#4F46E5', textAlign: 'center' },
    ],
  },
  music: {
    type: 'Frame',
    width: 375,
    fill: '#121212',
    autoLayout: { direction: 'column', gap: 16, padding: 24 },
    children: [
      {
        type: 'Frame',
        autoLayout: { direction: 'row', gap: 12, align: 'center' },
        children: [
          { type: 'Text', text: '发现音乐', fontSize: 24, fontWeight: 700, fill: '#FFFFFF' },
        ],
      },
      {
        type: 'Frame',
        autoLayout: { direction: 'row', gap: 12, align: 'center' },
        fill: '#2A2A2A',
        cornerRadius: 12,
        children: [
          { type: 'Icon', name: 'search', size: 20, color: '#999999' },
          { type: 'Text', text: '搜索歌曲、歌手...', fontSize: 14, fill: '#999999' },
        ],
      },
      {
        type: 'Text', text: '为你推荐', fontSize: 18, fontWeight: 600, fill: '#FFFFFF',
      },
      {
        type: 'Frame',
        autoLayout: { direction: 'row', gap: 12 },
        children: [
          {
            type: 'Frame',
            autoLayout: { direction: 'column', gap: 8, align: 'center' },
            children: [
              { type: 'Ellipse', width: 60, height: 60, fill: '#818CF8' },
              { type: 'Text', text: '每日推荐', fontSize: 12, fill: '#E0E0E0' },
            ],
          },
          {
            type: 'Frame',
            autoLayout: { direction: 'column', gap: 8, align: 'center' },
            children: [
              { type: 'Ellipse', width: 60, height: 60, fill: '#34D399' },
              { type: 'Text', text: '热门歌曲', fontSize: 12, fill: '#E0E0E0' },
            ],
          },
          {
            type: 'Frame',
            autoLayout: { direction: 'column', gap: 8, align: 'center' },
            children: [
              { type: 'Ellipse', width: 60, height: 60, fill: '#F59E0B' },
              { type: 'Text', text: '新歌速递', fontSize: 12, fill: '#E0E0E0' },
            ],
          },
          {
            type: 'Frame',
            autoLayout: { direction: 'column', gap: 8, align: 'center' },
            children: [
              { type: 'Ellipse', width: 60, height: 60, fill: '#EF4444' },
              { type: 'Text', text: '排行榜', fontSize: 12, fill: '#E0E0E0' },
            ],
          },
        ],
      },
      {
        type: 'Frame',
        autoLayout: { direction: 'column', gap: 8 },
        children: [
          {
            type: 'Frame',
            autoLayout: { direction: 'row', gap: 12, align: 'center' },
            fill: '#2A2A2A',
            cornerRadius: 8,
            children: [
              { type: 'Icon', name: 'music_note', size: 24, color: '#818CF8' },
              { type: 'Text', text: '晴天 - 周杰伦', fontSize: 14, fill: '#E0E0E0' },
            ],
          },
          {
            type: 'Frame',
            autoLayout: { direction: 'row', gap: 12, align: 'center' },
            fill: '#2A2A2A',
            cornerRadius: 8,
            children: [
              { type: 'Icon', name: 'music_note', size: 24, color: '#818CF8' },
              { type: 'Text', text: '稻香 - 周杰伦', fontSize: 14, fill: '#E0E0E0' },
            ],
          },
        ],
      },
    ],
  },
}

function matchMock(userText: string): ElementTree {
  const lower = userText.toLowerCase()
  if (lower.includes('登录') || lower.includes('login')) return MOCK_TREES.login
  if (lower.includes('音乐') || lower.includes('music')) return MOCK_TREES.music
  return MOCK_TREES.button
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
  if (name === 'search_icons') {
    const parsed = JSON.parse(args)
    const results = await searchIcons(parsed.query, parsed.limit)
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
  onStreaming?: (text: string) => void
}

const MAX_TOOL_ROUNDS = 3

async function callRealLLM(
  userText: string,
  options: SendMessageOptions,
): Promise<{ content: string; tree: ElementTree | null }> {
  const configStore = useLLMConfigStore()
  const config = configStore.getConfig()
  const systemPrompt = buildSystemPrompt(options.pageType, options.colorScheme)

  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    ...options.history.map((m) => ({
      role: m.role as ChatMessage['role'],
      content: m.content,
    })),
    { role: 'user', content: userText },
  ]

  let fullContent = ''

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const response = await callOpenAICompatible(config, messages, TOOLS, {
      onContent: (chunk) => {
        fullContent += chunk
        options.onStreaming?.(fullContent)
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

function callMockLLM(userText: string): { content: string; tree: ElementTree } {
  const tree = matchMock(userText)
  let content = '已为你生成了设计稿。'
  if (userText.includes('登录')) content = '已为你设计了一个简约登录页面。'
  if (userText.includes('音乐')) content = '已为你设计了一个深色风格的音乐App首页。'
  return { content, tree }
}

export async function sendMessageToLLM(
  userText: string,
  options: SendMessageOptions,
): Promise<{ content: string; tree: ElementTree }> {
  const configStore = useLLMConfigStore()

  if (configStore.isConfigured) {
    try {
      const result = await callRealLLM(userText, options)
      if (result.tree) {
        return { content: result.content, tree: result.tree }
      }
      console.warn('LLM did not return a valid tree, falling back to mock')
    } catch (err) {
      console.error('LLM API error, falling back to mock:', err)
    }
  }

  await new Promise((r) => setTimeout(r, 600))
  return callMockLLM(userText)
}
