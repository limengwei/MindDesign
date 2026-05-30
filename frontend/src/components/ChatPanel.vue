<script setup lang="ts">
import { ref, watch } from 'vue'
import { useChatStore } from '../stores/chatStore'
import { useCanvasStore } from '../stores/canvasStore'
import { sendMessageToLLM } from '../ai/chat'

const chatStore = useChatStore()
const canvasStore = useCanvasStore()

const inputText = ref('')

// 监听 pendingSend 自动发送 ProjectDialog 的描述作为首条消息
watch(() => chatStore.pendingSend, async (text) => {
  if (!text) return
  chatStore.pendingSend = null
  chatStore.setStreaming(true)
  try {
    const history = chatStore.messages.map(m => ({ role: m.role, content: m.content }))
    const result = await sendMessageToLLM(text, {
      pageType: canvasStore.pageType,
      colorScheme: canvasStore.colorScheme,
      history,
      onStreamingTree: (tree) => {
        // 找到或更新最后一张流式卡片
        const cards = canvasStore.cards
        if (cards.length > 0) {
          cards[cards.length - 1].tree = tree
        } else {
          canvasStore.addCard(tree)
        }
      },
    })
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
    const history = chatStore.messages.map((m) => ({
      role: m.role,
      content: m.content,
    }))

    const result = await sendMessageToLLM(text, {
      pageType: canvasStore.pageType,
      colorScheme: canvasStore.colorScheme,
      history,
      onStreamingTree: (tree) => {
        // Streaming 过程中更新最后一张卡片
        const cards = canvasStore.cards
        if (cards.length > 0) {
          cards[cards.length - 1].tree = tree
        } else {
          canvasStore.addCard(tree)
        }
      },
    })

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
  <div class="chat-panel">
    <div class="chat-header">
      <span class="chat-title">MindDesign</span>
    </div>

    <div class="chat-messages">
      <div v-if="chatStore.messages.length === 0" class="chat-empty">
        <div class="empty-icon">✨</div>
        <p>描述你想要的界面，AI 将为你生成设计稿</p>
        <p class="empty-hint">例如："设计一个登录页面"</p>
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

    <div class="chat-input-area">
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
.chat-panel {
  flex: 0 0 300px;
  min-width: 260px;
  max-width: 420px;
  display: flex;
  flex-direction: column;
  background: #fafafa;
  border-right: 1px solid #e5e5e5;
}

.chat-header {
  padding: 16px 20px;
  border-bottom: 1px solid #e5e5e5;
  background: #fff;
}

.chat-title {
  font-size: 16px;
  font-weight: 600;
  color: #1a1a1a;
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.chat-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #999;
  text-align: center;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.chat-empty p {
  margin: 4px 0;
  font-size: 14px;
}

.empty-hint {
  font-size: 12px !important;
  color: #bbb !important;
}

.message {
  display: flex;
  gap: 10px;
  margin-bottom: 16px;
}

.message.user {
  flex-direction: row-reverse;
}

.message-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  flex-shrink: 0;
  background: #f0f0f0;
}

.message.user .message-avatar {
  background: #e8e0ff;
}

.message-content {
  max-width: 260px;
  padding: 10px 14px;
  border-radius: 12px;
  font-size: 14px;
  line-height: 1.5;
  word-break: break-word;
}

.message.user .message-content {
  background: #4f46e5;
  color: #fff;
  border-bottom-right-radius: 4px;
}

.message.assistant .message-content {
  background: #fff;
  color: #333;
  border: 1px solid #e5e5e5;
  border-bottom-left-radius: 4px;
}

.revert-btn {
  display: inline-block;
  margin-top: 8px;
  padding: 2px 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: #fafafa;
  font-size: 11px;
  color: #888;
  cursor: pointer;
  transition: all 0.15s;
}

.revert-btn:hover {
  background: #f0f0ff;
  border-color: #4f46e5;
  color: #4f46e5;
}

.streaming {
  display: flex;
  gap: 4px;
  padding: 14px 18px;
}

.dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #999;
  animation: blink 1.4s infinite both;
}

.dot:nth-child(2) { animation-delay: 0.2s; }
.dot:nth-child(3) { animation-delay: 0.4s; }

@keyframes blink {
  0%, 80%, 100% { opacity: 0.3; }
  40% { opacity: 1; }
}

.chat-input-area {
  display: flex;
  gap: 8px;
  padding: 12px 16px;
  border-top: 1px solid #e5e5e5;
  background: #fff;
}

.chat-input {
  flex: 1;
  padding: 10px 14px;
  border: 1px solid #ddd;
  border-radius: 10px;
  font-size: 14px;
  font-family: inherit;
  outline: none;
  resize: none;
  transition: border-color 0.2s;
}

.chat-input:focus {
  border-color: #4f46e5;
}

.chat-input:disabled {
  background: #f5f5f5;
}

.send-btn {
  width: 40px;
  height: 40px;
  border: none;
  border-radius: 10px;
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
  background: #4338ca;
}

.send-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}
</style>
