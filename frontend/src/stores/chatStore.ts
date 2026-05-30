import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { ElementTree } from '../types/element'

export interface Message {
  role: 'user' | 'assistant'
  content: string
  tree?: ElementTree
  timestamp: string
}

export const useChatStore = defineStore('chat', () => {
  const messages = ref<Message[]>([])
  const isStreaming = ref(false)
  const pendingSend = ref<string | null>(null)

  function addUserMessage(content: string) {
    messages.value.push({
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
    })
  }

  function addAssistantMessage(content: string, tree?: ElementTree) {
    messages.value.push({
      role: 'assistant',
      content,
      tree,
      timestamp: new Date().toISOString(),
    })
  }

  function updateLastAssistantMessage(content: string, tree?: ElementTree) {
    const lastIdx = messages.value.length - 1
    if (lastIdx >= 0 && messages.value[lastIdx].role === 'assistant') {
      messages.value[lastIdx].content = content
      if (tree) messages.value[lastIdx].tree = tree
    }
  }

  function setStreaming(val: boolean) {
    isStreaming.value = val
  }

  function reset() {
    messages.value = []
    isStreaming.value = false
  }

  return {
    messages,
    isStreaming,
    pendingSend,
    addUserMessage,
    addAssistantMessage,
    updateLastAssistantMessage,
    setStreaming,
    reset,
  }
})
