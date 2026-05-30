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

function buildCallOptions() {
  return {
    pageType: canvasStore.pageType,
    colorScheme: canvasStore.colorScheme,
    history: chatStore.messages.map(m => ({ role: m.role, content: m.content })),
    currentTree: canvasStore.currentTree,
    onStreamingTree: (tree: Parameters<typeof canvasStore.addCard>[0]) => {
      const cards = canvasStore.cards
      if (cards.length > 0) {
        cards[cards.length - 1].tree = tree
      } else {
        canvasStore.addCard(tree)
      }
    },
  }
}

watch(() => chatStore.pendingSend, async (text) => {
  if (!text) return
  chatStore.pendingSend = null
  chatStore.setStreaming(true)
  try {
    const result = await sendMessageToLLM(text, buildCallOptions())
    chatStore.addAssistantMessage(result.content, result.tree || undefined)
    if (result.tree) canvasStore.addCard(result.tree)
  } catch (err) {
    chatStore.addAssistantMessage('抱歉，生成失败了，请重试。')
    console.error('LLM error:', err)
  } finally {
    chatStore.setStreaming(false)
  }
})

async function handleSend() {
  const text = inputText.value.trim()
  if (!text || chatStore.isStreaming) return

  inputText.value = ''
  chatStore.addUserMessage(text)
  chatStore.setStreaming(true)

  try {
    const result = await sendMessageToLLM(text, buildCallOptions())
    chatStore.addAssistantMessage(result.content, result.tree || undefined)
    if (result.tree) {
      canvasStore.addCard(result.tree)
    }
  } catch (err) {
    chatStore.addAssistantMessage('抱歉，生成失败了，请重试。')
    console.error('LLM error:', err)
  } finally {
    chatStore.setStreaming(false)
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
  if (msg?.role === 'assistant' && msg.tree) {
    canvasStore.addCard(msg.tree, '回溯设计稿')
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
            v-if="msg.role === 'assistant' && msg.tree"
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
      ></textarea>
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
}

.collapsed .chat-history-title {
  display: none;
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

.revert-btn {
  display: inline-block;
  margin-top: 6px;
  padding: 2px 8px;
  border: 1px solid #3a3a5c;
  border-radius: 4px;
  background: rgba(30, 30, 54, 0.6);
  font-size: 11px;
  color: #9ca3af;
  cursor: pointer;
  transition: all 0.15s;
}

.revert-btn:hover {
  background: rgba(42, 42, 74, 0.6);
  border-color: #818cf8;
  color: #818cf8;
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
