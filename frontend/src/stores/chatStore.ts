import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface Message {
  role: 'user' | 'assistant'
  content: string
  html?: string
  timestamp: string
}

export interface Session {
  id: string
  title: string
  messages: Message[]
  cardIds: string[]
  createdAt: string
}

export const useChatStore = defineStore('chat', () => {
  const sessions = ref<Session[]>([])
  const activeSessionId = ref<string | null>(null)
  const isStreaming = ref(false)
  const pendingSend = ref<string | null>(null)

  const activeSession = computed(() =>
    sessions.value.find(s => s.id === activeSessionId.value) || null
  )

  const messages = computed(() => activeSession.value?.messages || [])

  function createSession(firstMessage: string): Session {
    const session: Session = {
      id: `session-${Date.now()}`,
      title: firstMessage.slice(0, 30) + (firstMessage.length > 30 ? '...' : ''),
      messages: [],
      cardIds: [],
      createdAt: new Date().toISOString(),
    }
    sessions.value.push(session)
    activeSessionId.value = session.id
    return session
  }

  function addUserMessage(content: string) {
    if (!activeSession.value) return
    activeSession.value.messages.push({ role: 'user', content, timestamp: new Date().toISOString() })
  }

  function addAssistantMessage(content: string, html?: string) {
    if (!activeSession.value) return
    activeSession.value.messages.push({ role: 'assistant', content, html, timestamp: new Date().toISOString() })
  }

  function addCardToSession(cardId: string) {
    if (activeSession.value && !activeSession.value.cardIds.includes(cardId)) {
      activeSession.value.cardIds.push(cardId)
    }
  }

  function setActiveSession(id: string | null) {
    activeSessionId.value = id
  }

  function setStreaming(val: boolean) { isStreaming.value = val }

  function reset() { sessions.value = []; activeSessionId.value = null; isStreaming.value = false }

  return {
    sessions, activeSessionId, activeSession, messages,
    isStreaming, pendingSend,
    createSession, addUserMessage, addAssistantMessage, addCardToSession,
    setActiveSession, setStreaming, reset,
  }
})
