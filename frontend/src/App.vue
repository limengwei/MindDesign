<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
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

const pageDimensions = computed(() => PAGE_DIMENSIONS[canvasStore.pageType])

function handleProjectCreate(config: { name: string; pageType: string; colorScheme: string; description: string }) {
  canvasStore.reset()
  canvasStore.setProjectName(config.name)
  canvasStore.setPageType(config.pageType as any)
  canvasStore.setColorScheme(config.colorScheme as any)
  showProjectDialog.value = false
}

onMounted(async () => {
  setupAutoSave()

  const autoSaveData = await checkAutoSave()
  if (autoSaveData) {
    const shouldRecover = confirm('检测到上次未正常关闭的项目，是否恢复？')
    if (shouldRecover) {
      if (autoSaveData.canvas.tree) {
        canvasStore.setTree(autoSaveData.canvas.tree)
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
</script>

<template>
  <div class="app-root">
    <Toolbar />
    <div class="app-layout">
      <ChatPanel />
      <CanvasWrapper
        :tree="canvasStore.currentTree"
        :page-width="pageDimensions.width"
        :page-height="pageDimensions.height"
      />
    </div>

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
  background: #ffffff;
}
</style>

<style scoped>
.app-root {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
}

.app-layout {
  flex: 1;
  display: flex;
  overflow: hidden;
}
</style>
