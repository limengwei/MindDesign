<script setup lang="ts">
import { ref, watch } from 'vue'
import { useChatStore } from '../stores/chatStore'
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
let streamingCardId: string | null = null

function buildCallOptions() {
  streamingCardId = null
  return {
    pageType: canvasStore.pageType,
    colorScheme: canvasStore.colorScheme,
    history: chatStore.messages.map(m => ({ role: m.role, content: m.content })),
    onStreamingHTML: (html: string) => {
      if (streamingCardId) {
        canvasStore.updateLastCardHtml(html)
      } else {
        streamingCardId = canvasStore.addCard(html, '').id
      }
    },
  }
}

watch(() => chatStore.pendingSend, async (text) => {
  if (!text) return
  chatStore.pendingSend = null
  chatStore.setStreaming(true)
  canvasStore.setGenerating(true)
  try {
    const result = await sendMessageToLLM(text, buildCallOptions())
    const html = result.html ?? ''
    chatStore.addAssistantMessage(result.content, html)
    if (html && !streamingCardId) {
      canvasStore.addCard(html, result.screenshot || '')
    }
  } catch (err) {
    chatStore.addAssistantMessage('抱歉，生成失败了，请重试。')
    console.error('LLM error:', err)
  } finally {
    chatStore.setStreaming(false)
    canvasStore.setGenerating(false)
  }
})

async function handleSend() {
  const text = inputText.value.trim()
  if (!text || chatStore.isStreaming) return

  inputText.value = ''
  chatStore.addUserMessage(text)
  chatStore.setStreaming(true)
  canvasStore.setGenerating(true)

  try {
    const result = await sendMessageToLLM(text, buildCallOptions())
    const html = result.html ?? ''
    chatStore.addAssistantMessage(result.content, html)
    if (html && !streamingCardId) {
      canvasStore.addCard(html, result.screenshot || '')
    }
  } catch (err) {
    chatStore.addAssistantMessage('抱歉，生成失败了，请重试。')
    console.error('LLM error:', err)
  } finally {
    chatStore.setStreaming(false)
    canvasStore.setGenerating(false)
  }
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    handleSend()
  }
}

function handleRevert(idx: number) {
  const msg = chatStore.messages[idx]
  if (msg?.role === 'assistant' && msg.html) {
    canvasStore.addCard(msg.html, '', '回溯设计稿')
    chatStore.messages = chatStore.messages.slice(0, idx + 1)
  }
}
</script>

<template>
  <div class="chat-history-panel" :class="{ collapsed }">
    <div class="chat-history-header">
      <span class="chat-history-title">对话记录</span>
      <button class="toggle-btn" @click="emit('toggle')" :title="collapsed ? '展开' : '收起'">
        <svg v-if="collapsed" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>
        <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>
      </button>
    </div>

    <div v-if="!collapsed" class="chat-messages">
      <div v-if="chatStore.messages.length === 0" class="chat-empty">
        <div class="empty-icon">✨</div>
        <p>描述你想要的界面</p>
        <p class="empty-hint">AI 将为你生成设计稿</p>
      </div>

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
          <button
            v-if="msg.role === 'assistant' && msg.html"
            class="revert-btn"
            title="回退到此版本"
            @click="handleRevert(idx)"
          >
            ↩ 回退
          </button>
        </div>
      </div>

      <div v-if="chatStore.isStreaming" class="message assistant">
        <div class="message-avatar">🤖</div>
        <div class="message-content streaming">
          <span class="dot"></span><span class="dot"></span><span class="dot"></span>
        </div>
      </div>
    </div>

    <div v-if="!collapsed" class="chat-input-area">
      <textarea
        v-model="inputText"
        class="chat-input"
        placeholder="描述你想要的界面..."
        rows="1"
        :disabled="chatStore.isStreaming"
        @keydown="handleKeydown"
      ></textarea>
      <button
        class="send-btn"
        :disabled="!inputText.trim() || chatStore.isStreaming"
        @click="handleSend"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M3.4 20.4l17.45-7.48a1 1 0 000-1.84L3.4 3.6a.993.993 0 00-1.39.91L2 9.12c0 .5.37.93.87.99L17 12 2.87 13.88c-.5.07-.87.5-.87 1l.01 4.61c0 .71.73 1.2 1.39.91z"/>
        </svg>
      </button>
    </div>
  </div>
</template>

<style scoped>
:root { --chat-panel-bg: #0b0f1a; --chat-header-bg: #111827; --chat-border: #1e293b; --chat-msg-user-bg: #4f46e5; --chat-msg-user-text: #fff; --chat-msg-ai-bg: #1e293b; --chat-msg-ai-text: #e2e8f0; --chat-msg-empty-text: #64748b; --chat-input-bg: #1e293b; --chat-input-border: #334155; --chat-input-focus: #4f46e5; --chat-input-text: #e2e8f0; --chat-input-placeholder: #475569; --chat-send-bg: #4f46e5; --chat-send-hover: #6366f1; --chat-send-disabled: #334155; --chat-avatar-ai-bg: #1e293b; --chat-avatar-user-bg: #c7d2fe; --chat-revert-border: #334155; }

.chat-history-panel { width: 320px; display: flex; flex-direction: column; background: var(--chat-panel-bg); border-right: 1px solid var(--chat-border); position: absolute; top: 44px; left: 0; bottom: 0; z-index: 50; }
.chat-history-panel.collapsed { width: 48px; }

.chat-history-header { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; background: var(--chat-header-bg); border-bottom: 1px solid var(--chat-border); }
.chat-history-title { font-size: 13px; font-weight: 600; color: #9ca3af; }
.collapsed .chat-history-title { display: none; }
.toggle-btn { width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; background: none; border: none; color: #6b7280; cursor: pointer; border-radius: 4px; }
.toggle-btn:hover { color: #9ca3af; background: rgba(255,255,255,0.05); }

.chat-messages { flex: 1; overflow-y: auto; padding: 16px; }
.chat-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: var(--chat-msg-empty-text); text-align: center; }
.empty-icon { font-size: 40px; margin-bottom: 12px; }
.chat-empty p { margin: 2px 0; font-size: 13px; }
.empty-hint { font-size: 11px !important; color: #475569 !important; }

.message { display: flex; gap: 8px; margin-bottom: 14px; }
.message.user { flex-direction: row-reverse; }
.message-avatar { width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 14px; flex-shrink: 0; background: var(--chat-avatar-ai-bg); }
.message.user .message-avatar { background: var(--chat-avatar-user-bg); }
.message-content { max-width: 240px; padding: 8px 12px; border-radius: 10px; font-size: 13px; line-height: 1.5; word-break: break-word; }
.message.user .message-content { background: var(--chat-msg-user-bg); color: var(--chat-msg-user-text); border-bottom-right-radius: 4px; }
.message.assistant .message-content { background: var(--chat-msg-ai-bg); color: var(--chat-msg-ai-text); border: 1px solid var(--chat-border); border-bottom-left-radius: 4px; }

.revert-btn { display: inline-block; margin-top: 8px; padding: 2px 8px; border: 1px solid var(--chat-revert-border); border-radius: 4px; background: none; font-size: 11px; color: #9ca3af; cursor: pointer; }
.revert-btn:hover { background: rgba(99,102,241,0.15); border-color: #4f46e5; color: #818cf8; }

.streaming { display: flex; gap: 4px; padding: 12px 16px; }
.dot { width: 5px; height: 5px; border-radius: 50%; background: #64748b; animation: blink 1.4s infinite both; }
.dot:nth-child(2) { animation-delay: 0.2s; }
.dot:nth-child(3) { animation-delay: 0.4s; }
@keyframes blink { 0%, 80%, 100% { opacity: 0.3; } 40% { opacity: 1; } }

.chat-input-area { display: flex; gap: 8px; padding: 12px 16px; background: var(--chat-header-bg); border-top: 1px solid var(--chat-border); }
.chat-input { flex: 1; padding: 10px 14px; background: var(--chat-input-bg); border: 1px solid var(--chat-input-border); border-radius: 8px; font-size: 13px; font-family: inherit; color: var(--chat-input-text); outline: none; resize: none; }
.chat-input::placeholder { color: var(--chat-input-placeholder); }
.chat-input:focus { border-color: var(--chat-input-focus); }
.send-btn { width: 38px; height: 38px; border: none; border-radius: 8px; background: var(--chat-send-bg); color: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.send-btn:hover:not(:disabled) { background: var(--chat-send-hover); }
.send-btn:disabled { background: var(--chat-send-disabled); cursor: not-allowed; }
</style>
