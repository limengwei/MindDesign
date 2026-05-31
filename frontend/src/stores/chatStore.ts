import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface Message {
  role: 'user' | 'assistant'
  content: string
  html?: string
  timestamp: string
}

export const useChatStore = defineStore('chat', () => {
  const messages = ref<Message[]>([])
  const isStreaming = ref(false)
  const pendingSend = ref<string | null>(null)

  function addUserMessage(content: string) {
    messages.value.push({ role: 'user', content, timestamp: new Date().toISOString() })
  }

  function addAssistantMessage(content: string, html?: string) {
    messages.value.push({ role: 'assistant', content, html, timestamp: new Date().toISOString() })
  }

  function setStreaming(val: boolean) { isStreaming.value = val }

  function reset() { messages.value = []; isStreaming.value = false }

  return { messages, isStreaming, pendingSend, addUserMessage, addAssistantMessage, setStreaming, reset }
})
