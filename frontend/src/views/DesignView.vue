<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useCanvasStore, PAGE_DIMENSIONS } from '../stores/canvasStore'
import { useChatStore } from '../stores/chatStore'
import { readFile } from '../services/projectBridge'
import type { ProjectFile } from '../types/project'
import Toolbar from '../components/Toolbar.vue'
import ChatPanel from '../components/ChatPanel.vue'
import CanvasWrapper from '../canvas/CanvasWrapper.vue'
import ExportDialog from '../components/ExportDialog.vue'
import SettingsPanel from '../components/SettingsPanel.vue'

const route = useRoute()
const router = useRouter()
const canvasStore = useCanvasStore()
const chatStore = useChatStore()
const chatCollapsed = ref(false)
const showExportDialog = ref(false)
const showSettingsPanel = ref(false)
const exportCardId = ref<string | null>(null)

const pageDimensions = computed(() => PAGE_DIMENSIONS[canvasStore.pageType])

function loadProjectData(data: ProjectFile) {
  canvasStore.reset()
  chatStore.reset()

  if (data.meta.name) canvasStore.setProjectName(data.meta.name)
  if (data.meta.createdAt) canvasStore.setCreatedAt(data.meta.createdAt)
  if (data.canvas.pageType) canvasStore.setPageType(data.canvas.pageType)
  if (data.canvas.colorScheme) canvasStore.setColorScheme(data.canvas.colorScheme)
  if (data.canvas.designSpecId) canvasStore.setDesignSpecId(data.canvas.designSpecId)
  if (data.canvas.customDesignContent) canvasStore.setCustomDesignContent(data.canvas.customDesignContent)
  if (data.canvas.cards) canvasStore.cards = data.canvas.cards
  if (data.canvas.viewport) {
    canvasStore.setViewport(data.canvas.viewport.zoom, data.canvas.viewport.scrollX, data.canvas.viewport.scrollY)
  }
  if (data.sessions) {
    chatStore.sessions = data.sessions
    if (chatStore.sessions.length > 0) {
      chatStore.setActiveSession(chatStore.sessions[chatStore.sessions.length - 1].id)
    }
  }
}

onMounted(async () => {
  const filePath = route.query.path as string | undefined
  if (!filePath) {
    router.replace({ name: 'home' })
    return
  }

  try {
    const json = await readFile(filePath)
    const data = JSON.parse(json) as ProjectFile
    loadProjectData(data)
    canvasStore.setCurrentFilePath(filePath)
  } catch (e) {
    console.error('Failed to load project:', e)
  }
})

function handleBackToHome() {
  router.push({ name: 'home' })
}

function handleExportCard(cardId: string) {
  exportCardId.value = cardId
  showExportDialog.value = true
}
</script>

<template>
  <div class="design-root">
    <CanvasWrapper
      :page-width="pageDimensions.width"
      :page-height="pageDimensions.height"
      @export-card="handleExportCard"
    />

    <Toolbar @back="handleBackToHome" />

    <ChatPanel
      :collapsed="chatCollapsed"
      @toggle="chatCollapsed = !chatCollapsed"
    />

    <ExportDialog
      v-if="showExportDialog"
      :html="canvasStore.cards.find(c => c.id === exportCardId)?.html ?? null"
      :project-name="canvasStore.projectName"
      @close="showExportDialog = false"
    />

    <SettingsPanel
      v-if="showSettingsPanel"
      @close="showSettingsPanel = false"
    />
  </div>
</template>

<style scoped>
.design-root {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
}
</style>
