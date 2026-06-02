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
