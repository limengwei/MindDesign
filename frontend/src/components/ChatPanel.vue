<script setup lang="ts">
import { ref, watch } from 'vue'
import { useChatStore, type Session } from '../stores/chatStore'
import { useCanvasStore } from '../stores/canvasStore'
import { sendMessageToLLM } from '../ai/chat'

const props = defineProps<{
  collapsed: boolean
}>()

const emit = defineEmits<{
  toggle: []
}>()

const chatStore = useChatStore()
const canvasStore = useCanvasStore()

const inputText = ref('')
const showSessionList = ref(false)

function buildCallOptions(selectedHtml?: string) {
  return {
    pageType: canvasStore.pageType,
    colorScheme: canvasStore.colorScheme,
    history: [] as Array<{ role: string; content: string }>,
    selectedHtml,
    onStreamingHTML: (html: string) => {
      const genId = canvasStore.generatingCardId
      if (genId) {
        const card = canvasStore.cards.find(c => c.id === genId)
        if (card) card.html = html
      }
    },
  }
}

watch(() => chatStore.pendingSend, async (text) => {
  if (!text) return
  chatStore.pendingSend = null
  await doGenerate(text)
})

async function doGenerate(text: string) {
  const session = chatStore.createSession(text)
  chatStore.addUserMessage(text)
  chatStore.setStreaming(true)

  const selectedId = canvasStore.selectedCardId
  const selectedCard = selectedId ? canvasStore.cards.find(c => c.id === selectedId) : null

  const card = canvasStore.addCard('', '', undefined, session.id, selectedCard?.id)
  chatStore.addCardToSession(card.id)

  canvasStore.setGeneratingCardId(card.id)

  try {
    const result = await sendMessageToLLM(text, buildCallOptions(selectedCard?.html))
    chatStore.addAssistantMessage(result.content, result.html || undefined)
    if (result.html) {
      canvasStore.updateCardContent(card.id, result.html, result.screenshot || '')
    }
  } catch (err) {
    chatStore.addAssistantMessage('抱歉，生成失败了，请重试。')
    console.error('LLM error:', err)
  } finally {
    canvasStore.setGeneratingCardId(null)
    chatStore.setStreaming(false)
  }
}

async function handleSend() {
  const text = inputText.value.trim()
  if (!text || chatStore.isStreaming) return
  inputText.value = ''
  await doGenerate(text)
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    handleSend()
  }
}

function handleSessionClick(session: Session) {
  chatStore.setActiveSession(session.id)
  showSessionList.value = false

  if (session.cardIds.length > 0) {
    const lastCardId = session.cardIds[session.cardIds.length - 1]
    canvasStore.selectCard(lastCardId)
  } else {
    canvasStore.selectCard(null)
  }
}

function formatTime(iso: string) {
  const d = new Date(iso)
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${hh}:${mm}`
}
</script>

<template>
  <div class="chat-history-panel" :class="{ collapsed }">
    <div class="chat-history-header">
      <span class="chat-history-title">{{ chatStore.activeSession ? chatStore.activeSession.title : '对话记录' }}</span>
      <div class="header-btns">
        <button
          v-if="!collapsed"
          class="toggle-btn"
          title="会话列表"
          @click="showSessionList = !showSessionList"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"/></svg>
        </button>
        <button class="toggle-btn" @click="emit('toggle')" :title="collapsed ? '展开' : '收起'">
          <svg v-if="collapsed" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>
          <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>
        </button>
      </div>
    </div>

    <div v-if="!collapsed && showSessionList" class="session-list">
      <div v-if="chatStore.sessions.length === 0" class="chat-empty">
        <div class="empty-icon">✨</div>
        <p>还没有对话记录</p>
      </div>
      <div
        v-for="session in [...chatStore.sessions].reverse()"
        :key="session.id"
        :class="['session-item', { active: session.id === chatStore.activeSessionId }]"
        @click="handleSessionClick(session)"
      >
        <div class="session-title">{{ session.title }}</div>
        <div class="session-meta">
          <span class="session-time">{{ formatTime(session.createdAt) }}</span>
          <span v-if="session.cardIds.length" class="session-card-count">{{ session.cardIds.length }} 个设计稿</span>
        </div>
      </div>
    </div>

    <div v-else-if="!collapsed" class="chat-messages">
      <div v-if="!chatStore.activeSession" class="chat-empty">
        <div class="empty-icon">✨</div>
        <p>描述你想要的界面</p>
        <p class="empty-hint">AI 将为你生成设计稿</p>
      </div>

      <template v-if="chatStore.activeSession">
        <div
          v-for="(msg, idx) in chatStore.messages"
          :key="idx"
          :class="['message', msg.role]"
        >
          <div class="message-avatar">
            {{ msg.role === 'user' ? '👤' : '🤖' }}
          </div>
          <div class="message-content">
            {{ msg.content }}
          </div>
        </div>
      </template>

      <div v-if="chatStore.isStreaming" class="message assistant">
        <div class="message-avatar">🤖</div>
        <div class="message-content streaming">
          <span class="dot"></span>
          <span class="dot"></span>
          <span class="dot"></span>
        </div>
      </div>
    </div>
  </div>

  <div class="chat-input-float">
    <div class="input-wrapper">
      <textarea
        v-model="inputText"
        class="chat-input"
        placeholder="描述你想要的界面..."
        rows="1"
        :disabled="chatStore.isStreaming"
        @keydown="handleKeydown"
      />
      <button
        class="send-btn"
        :disabled="!inputText.trim() || chatStore.isStreaming"
        @click="handleSend"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <path d="M3.4 20.4l17.45-7.48a1 1 0 000-1.84L3.4 3.6a.993.993 0 00-1.39.91L2 9.12c0 .5.37.93.87.99L17 12 2.87 13.88c-.5.07-.87.5-.87 1l.01 4.61c0 .71.73 1.2 1.39.91z"/>
        </svg>
      </button>
    </div>
  </div>
</template>

<style scoped>
.chat-history-panel {
  position: absolute;
  top: 56px;
  left: 12px;
  bottom: 80px;
  width: 300px;
  z-index: 90;
  display: flex;
  flex-direction: column;
  background: rgba(30, 30, 54, 0.85);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-radius: 12px;
  border: 1px solid rgba(42, 42, 74, 0.6);
  overflow: hidden;
  transition: width 0.3s ease, bottom 0.3s ease;
}

.chat-history-panel.collapsed {
  width: 40px;
  bottom: 80px;
}

.chat-history-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  border-bottom: 1px solid rgba(42, 42, 74, 0.6);
  flex-shrink: 0;
}

.chat-history-title {
  font-size: 13px;
  font-weight: 600;
  color: #e5e7eb;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  margin-right: 4px;
}

.collapsed .chat-history-title {
  display: none;
}

.header-btns {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}

.toggle-btn {
  width: 24px;
  height: 24px;
  border: none;
  background: none;
  color: #9ca3af;
  cursor: pointer;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.collapsed .toggle-btn {
  margin: 0 auto;
}

.toggle-btn:hover {
  background: rgba(42, 42, 74, 0.6);
  color: #e5e7eb;
}

.session-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.session-item {
  padding: 10px 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.15s;
  margin-bottom: 4px;
}

.session-item:hover {
  background: rgba(42, 42, 74, 0.6);
}

.session-item.active {
  background: rgba(79, 70, 229, 0.2);
  border: 1px solid rgba(79, 70, 229, 0.4);
}

.session-title {
  font-size: 13px;
  color: #e5e7eb;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-bottom: 4px;
}

.session-meta {
  display: flex;
  gap: 8px;
  font-size: 11px;
  color: #6b7280;
}

.session-card-count {
  color: #818cf8;
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
}

.chat-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #6b7280;
  text-align: center;
}

.empty-icon {
  font-size: 36px;
  margin-bottom: 12px;
}

.chat-empty p {
  margin: 3px 0;
  font-size: 13px;
}

.empty-hint {
  font-size: 11px !important;
  color: #4b5563 !important;
}

.message {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.message.user {
  flex-direction: row-reverse;
}

.message-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  flex-shrink: 0;
  background: #2a2a4a;
}

.message.user .message-avatar {
  background: #312e81;
}

.message-content {
  max-width: 220px;
  padding: 8px 12px;
  border-radius: 10px;
  font-size: 13px;
  line-height: 1.5;
  word-break: break-word;
}

.message.user .message-content {
  background: #4f46e5;
  color: #fff;
  border-bottom-right-radius: 4px;
}

.message.assistant .message-content {
  background: rgba(22, 33, 62, 0.8);
  color: #e5e7eb;
  border: 1px solid rgba(42, 42, 74, 0.6);
  border-bottom-left-radius: 4px;
}

.streaming {
  display: flex;
  gap: 4px;
  padding: 12px 16px;
}

.dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #6b7280;
  animation: blink 1.4s infinite both;
}

.dot:nth-child(2) { animation-delay: 0.2s; }
.dot:nth-child(3) { animation-delay: 0.4s; }

@keyframes blink {
  0%, 80%, 100% { opacity: 0.3; }
  40% { opacity: 1; }
}

.chat-input-float {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 95;
  width: 560px;
  max-width: calc(100vw - 40px);
}

.input-wrapper {
  display: flex;
  gap: 8px;
  padding: 10px 14px;
  background: rgba(30, 30, 54, 0.9);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-radius: 14px;
  border: 1px solid rgba(42, 42, 74, 0.6);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

.chat-input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid transparent;
  border-radius: 8px;
  font-size: 14px;
  font-family: inherit;
  outline: none;
  resize: none;
  transition: border-color 0.2s;
  background: rgba(22, 33, 62, 0.6);
  color: #e5e7eb;
}

.chat-input::placeholder {
  color: #6b7280;
}

.chat-input:focus {
  border-color: #818cf8;
}

.chat-input:disabled {
  color: #4b5563;
}

.send-btn {
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 8px;
  background: #4f46e5;
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
  flex-shrink: 0;
}

.send-btn:hover:not(:disabled) {
  background: #6366f1;
}

.send-btn:disabled {
  background: #3a3a5c;
  cursor: not-allowed;
}
</style>
