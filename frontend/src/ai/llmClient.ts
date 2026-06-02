import type { LLMConfig } from '../stores/llmConfigStore'

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string
  tool_call_id?: string
  tool_calls?: ToolCall[]
  reasoning_content?: string
}

export interface ToolCall {
  id: string
  type: 'function'
  function: {
    name: string
    arguments: string
  }
}

export interface ToolDefinition {
  type: 'function'
  function: {
    name: string
    description: string
    parameters: Record<string, unknown>
  }
}

export interface LLMResponse {
  content: string | null
  tool_calls?: ToolCall[]
  finish_reason: string
  reasoning_content?: string
}

export async function callOpenAICompatible(
  config: LLMConfig,
  messages: ChatMessage[],
  tools?: ToolDefinition[],
): Promise<LLMResponse> {
  const url = `${config.baseUrl.replace(/\/$/, '')}/chat/completions`

  const body: Record<string, unknown> = {
    model: config.model,
    messages,
  }

  if (tools && tools.length > 0) {
    body.tools = tools
    body.tool_choice = 'auto'
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${config.apiKey}`,
  }

  const resp = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })

  if (!resp.ok) {
    const errorText = await resp.text()
    throw new Error(`API request failed (${resp.status}): ${errorText}`)
  }

  const data = await resp.json()
  const choice = data.choices?.[0]
  if (!choice) throw new Error('No choices in response')

  const message = choice.message

  const toolCalls: ToolCall[] | undefined = message.tool_calls?.length
    ? message.tool_calls
    : undefined

  return {
    content: message.content || null,
    tool_calls: toolCalls,
    finish_reason: choice.finish_reason || '',
    reasoning_content: message.reasoning_content || undefined,
  }
}

/** 将内部 ChatMessage 转换为 Claude API 格式 */
interface ClaudeMessage {
  role: 'user' | 'assistant'
  content: string | ClaudeContentBlock[]
}

interface ClaudeContentBlock {
  type: 'text' | 'tool_use' | 'tool_result'
  text?: string
  id?: string
  name?: string
  input?: Record<string, unknown>
  tool_use_id?: string
  content?: string
}

interface ClaudeTool {
  name: string
  description: string
  input_schema: Record<string, unknown>
}

function convertToClaudeMessages(messages: ChatMessage[]): { system: string; messages: ClaudeMessage[] } {
  let system = ''
  const result: ClaudeMessage[] = []

  for (const msg of messages) {
    if (msg.role === 'system') {
      system = msg.content
      continue
    }

    if (msg.role === 'user') {
      result.push({ role: 'user', content: msg.content })
      continue
    }

    if (msg.role === 'assistant') {
      if (msg.tool_calls && msg.tool_calls.length > 0) {
        // 带 tool_use 的 assistant 消息
        const blocks: ClaudeContentBlock[] = []
        if (msg.content) {
          blocks.push({ type: 'text', text: msg.content })
        }
        for (const tc of msg.tool_calls) {
          let input: Record<string, unknown>
          try { input = JSON.parse(tc.function.arguments) } catch { input = {} }
          blocks.push({ type: 'tool_use', id: tc.id, name: tc.function.name, input })
        }
        result.push({ role: 'assistant', content: blocks })
      } else {
        result.push({ role: 'assistant', content: msg.content })
      }
      continue
    }

    if (msg.role === 'tool') {
      // Claude 中 tool_result 必须跟在 assistant tool_use 后面
      // 用 user 消息包裹 tool_result
      result.push({
        role: 'user',
        content: [{
          type: 'tool_result',
          tool_use_id: msg.tool_call_id || '',
          content: msg.content,
        }],
      })
    }
  }

  return { system, messages: result }
}

function convertToolsToClaude(tools: ToolDefinition[]): ClaudeTool[] {
  return tools.map(t => ({
    name: t.function.name,
    description: t.function.description,
    input_schema: t.function.parameters,
  }))
}

export async function callClaude(
  config: LLMConfig,
  messages: ChatMessage[],
  tools?: ToolDefinition[],
): Promise<LLMResponse> {
  const url = `${config.baseUrl.replace(/\/$/, '')}/messages`

  const { system, messages: claudeMessages } = convertToClaudeMessages(messages)

  const body: Record<string, unknown> = {
    model: config.model,
    max_tokens: 16384,
    messages: claudeMessages,
  }
  if (system) body.system = system

  const claudeTools = tools ? convertToolsToClaude(tools) : undefined
  if (claudeTools && claudeTools.length > 0) {
    body.tools = claudeTools
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-api-key': config.apiKey,
    'anthropic-version': '2023-06-01',
  }

  const resp = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })

  if (!resp.ok) {
    const errorText = await resp.text()
    throw new Error(`Claude API request failed (${resp.status}): ${errorText}`)
  }

  const data = await resp.json()

  // 解析 Claude 响应
  let content: string | null = null
  const toolCalls: ToolCall[] = []

  for (const block of data.content || []) {
    if (block.type === 'text') {
      content = (content || '') + block.text
    } else if (block.type === 'tool_use') {
      toolCalls.push({
        id: block.id,
        type: 'function',
        function: {
          name: block.name,
          arguments: JSON.stringify(block.input),
        },
      })
    }
  }

  return {
    content,
    tool_calls: toolCalls.length > 0 ? toolCalls : undefined,
    finish_reason: data.stop_reason || '',
    reasoning_content: undefined,
  }
}
