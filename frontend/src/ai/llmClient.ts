import type { LLMConfig } from '../stores/llmConfigStore'

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string
  tool_call_id?: string
  tool_calls?: ToolCall[]
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
}

export interface StreamCallbacks {
  onContent?: (text: string) => void
  onToolCall?: (toolCall: ToolCall) => void
}

export async function callOpenAICompatible(
  config: LLMConfig,
  messages: ChatMessage[],
  tools?: ToolDefinition[],
  callbacks?: StreamCallbacks,
): Promise<LLMResponse> {
  const url = `${config.baseUrl.replace(/\/$/, '')}/chat/completions`

  const body: Record<string, unknown> = {
    model: config.model,
    messages,
    stream: true,
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

  return parseSSEStream(resp, callbacks)
}

async function parseSSEStream(
  resp: Response,
  callbacks?: StreamCallbacks,
): Promise<LLMResponse> {
  const reader = resp.body!.getReader()
  const decoder = new TextDecoder()

  let content = ''
  const toolCallsMap = new Map<number, ToolCall>()
  let finishReason = ''

  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || trimmed === 'data: [DONE]') continue
      if (!trimmed.startsWith('data: ')) continue

      try {
        const data = JSON.parse(trimmed.slice(6))
        const delta = data.choices?.[0]?.delta
        if (!delta) continue

        finishReason = data.choices?.[0]?.finish_reason || finishReason

        if (delta.content) {
          content += delta.content
          callbacks?.onContent?.(delta.content)
        }

        if (delta.tool_calls) {
          for (const tc of delta.tool_calls) {
            const idx = tc.index ?? 0
            if (!toolCallsMap.has(idx)) {
              toolCallsMap.set(idx, {
                id: tc.id || '',
                type: 'function',
                function: { name: '', arguments: '' },
              })
            }
            const existing = toolCallsMap.get(idx)!
            if (tc.id) existing.id = tc.id
            if (tc.function?.name) existing.function.name += tc.function.name
            if (tc.function?.arguments) existing.function.arguments += tc.function.arguments
          }
        }
      } catch {}
    }
  }

  const toolCalls = toolCallsMap.size > 0
    ? Array.from(toolCallsMap.values())
    : undefined

  if (toolCalls) {
    for (const tc of toolCalls) {
      callbacks?.onToolCall?.(tc)
    }
  }

  return {
    content: content || null,
    tool_calls: toolCalls,
    finish_reason: finishReason,
  }
}
