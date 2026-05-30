<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useCanvasStore, PAGE_DIMENSIONS } from './stores/canvasStore'
import { useChatStore } from './stores/chatStore'
import { setupAutoSave, checkAutoSave, clearAutoSave } from './stores/autoSave'
import Toolbar from './components/Toolbar.vue'
import ChatPanel from './components/ChatPanel.vue'
import CanvasWrapper from './canvas/CanvasWrapper.vue'
import ProjectDialog from './components/ProjectDialog.vue'

const canvasStore = useCanvasStore()
const chatStore = useChatStore()
const showProjectDialog = ref(true)
const chatCollapsed = ref(false)

const pageDimensions = computed(() => PAGE_DIMENSIONS[canvasStore.pageType])

function handleProjectCreate(config: { name: string; pageType: string; colorScheme: string; description: string }) {
  canvasStore.reset()
  canvasStore.setProjectName(config.name)
  canvasStore.setPageType(config.pageType as any)
  canvasStore.setColorScheme(config.colorScheme as any)
  showProjectDialog.value = false

  // 如果用户填了描述，将其作为首条对话发送
  if (config.description.trim()) {
    chatStore.addUserMessage(config.description)
    // ChatPanel 监听此字段自动发送
    chatStore.pendingSend = config.description
  }
}

function handleKeydown(e: KeyboardEvent) {
  const mod = e.ctrlKey || e.metaKey
  if (mod && e.key === 's' && !e.shiftKey) {
    e.preventDefault()
    document.querySelector<HTMLButtonElement>('.toolbar-btn[title="保存 (Ctrl+S)"]')?.click()
  }
  if (mod && e.key === 'o') {
    e.preventDefault()
    if (chatStore.messages.length > 0) {
      if (!confirm('当前项目未保存，是否确认新建？')) return
    }
    canvasStore.reset()
    chatStore.reset()
  }
  if (mod && e.key === 'n') {
    e.preventDefault()
    showProjectDialog.value = true
  }
}

onMounted(async () => {
  setupAutoSave()

  window.addEventListener('keydown', handleKeydown)

  const autoSaveData = await checkAutoSave()
  if (autoSaveData) {
    const shouldRecover = confirm('检测到上次未正常关闭的项目，是否恢复？')
    if (shouldRecover) {
      if (autoSaveData.canvas.pageType) {
        canvasStore.setPageType(autoSaveData.canvas.pageType)
      }
      if (autoSaveData.canvas.colorScheme) {
        canvasStore.setColorScheme(autoSaveData.canvas.colorScheme)
      }
      if (autoSaveData.canvas.cards) {
        canvasStore.cards = autoSaveData.canvas.cards
      }
      if (autoSaveData.canvas.viewport) {
        canvasStore.setViewport(
          autoSaveData.canvas.viewport.zoom,
          autoSaveData.canvas.viewport.scrollX,
          autoSaveData.canvas.viewport.scrollY,
        )
      }
      if (autoSaveData.meta.name) {
        canvasStore.setProjectName(autoSaveData.meta.name)
      }
      if (autoSaveData.chat) {
        for (const msg of autoSaveData.chat) {
          chatStore.messages.push(msg as any)
        }
      }
      showProjectDialog.value = false
    } else {
      await clearAutoSave()
    }
  }
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <div class="app-root">
    <CanvasWrapper
      :page-width="pageDimensions.width"
      :page-height="pageDimensions.height"
    />

    <Toolbar />

    <ChatPanel
      :collapsed="chatCollapsed"
      @toggle="chatCollapsed = !chatCollapsed"
    />

    <ProjectDialog
      v-if="showProjectDialog"
      @create="handleProjectCreate"
      @close="showProjectDialog = false"
    />
  </div>
</template>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body, #app {
  width: 100%;
  height: 100%;
  overflow: hidden;
  font-family: -apple-system, 'PingFang SC', 'Microsoft YaHei', 'Noto Sans SC', sans-serif;
}

body {
  background: #1a1a2e;
}
</style>

<style scoped>
.app-root {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
}
</style>
