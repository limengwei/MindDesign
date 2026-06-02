<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useCanvasStore, PAGE_DIMENSIONS } from '../stores/canvasStore'
import { useChatStore } from '../stores/chatStore'
import { readProject, loadCardScreenshots } from '../services/projectBridge'
import type { ProjectMeta, ProjectCards, ProjectSessions } from '../types/project'
import type { CanvasCard } from '../stores/canvasStore'
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
const previewHtml = ref<string | null>(null)
const previewContainerRef = ref<HTMLDivElement | null>(null)
const previewScale = ref(1)
const previewPageWidth = ref(375)

function updatePreviewScale() {
  if (!previewContainerRef.value) return
  const containerWidth = previewContainerRef.value.clientWidth
  if (containerWidth <= 0 || previewPageWidth.value <= 0) return
  previewScale.value = Math.min(containerWidth / previewPageWidth.value, 1)
}

const previewScaledWidth = computed(() => Math.ceil(previewPageWidth.value * previewScale.value))

const previewSrcdoc = computed(() => {
  if (!previewHtml.value) return null
  const style = '<style>html{overflow-x:hidden!important;}::-webkit-scrollbar{width:6px;height:6px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.15);border-radius:3px}::-webkit-scrollbar-thumb:hover{background:rgba(255,255,255,0.3)}</style>'
  if (previewHtml.value.includes('</head>')) {
    return previewHtml.value.replace('</head>', style + '</head>')
  }
  return style + previewHtml.value
})

const pageDimensions = computed(() => PAGE_DIMENSIONS[canvasStore.pageType])

function loadProjectData(bundle: { project: ProjectMeta | null; cards: ProjectCards | null; sessions: ProjectSessions | null }, screenshots?: Record<string, string>) {
  canvasStore.reset()
  chatStore.reset()

  const proj = bundle.project
  if (proj) {
    if (proj.meta?.name) canvasStore.setProjectName(proj.meta.name)
    if (proj.meta?.createdAt) canvasStore.setCreatedAt(proj.meta.createdAt)
    if (proj.canvas?.pageType) canvasStore.setPageType(proj.canvas.pageType)
    if (proj.canvas?.colorScheme) canvasStore.setColorScheme(proj.canvas.colorScheme)
    if (proj.canvas?.designSpecId) canvasStore.setDesignSpecId(proj.canvas.designSpecId)
    if (proj.canvas?.customDesignContent) canvasStore.setCustomDesignContent(proj.canvas.customDesignContent)
    if (proj.canvas?.viewport) {
      canvasStore.setViewport(proj.canvas.viewport.zoom, proj.canvas.viewport.scrollX, proj.canvas.viewport.scrollY)
    }
    if (proj.productBlueprint) {
      canvasStore.setProductBlueprint(proj.productBlueprint)
    }
  }

  const rawCards = (bundle as any).cards
  if (rawCards) {
    const cards: CanvasCard[] = Array.isArray(rawCards) ? rawCards : rawCards.cards
    if (screenshots) {
      for (const card of cards) {
        if (screenshots[card.id]) {
          card.screenshot = screenshots[card.id]
        }
      }
    }
    canvasStore.cards = cards
  }

  if (bundle.sessions?.sessions) {
    chatStore.sessions = bundle.sessions.sessions
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
    const bundle = await readProject(filePath)
    let screenshots: Record<string, string> | undefined
    const rawCards = (bundle as any).cards
    const cardsArray: any[] | null = Array.isArray(rawCards) ? rawCards : (rawCards?.cards ?? null)
    if (cardsArray && cardsArray.length) {
      const cardIds = cardsArray.map((c: any) => c.id)
      screenshots = await loadCardScreenshots(filePath, cardIds)
    }
    loadProjectData(bundle as any, screenshots)
    canvasStore.setCurrentFilePath(filePath)
  } catch (e) {
    console.error('Failed to load project:', e)
  }
})

function handleBackToHome() {
  canvasStore.reset()
  chatStore.reset()
  router.push({ name: 'home' })
}

function handleExportCard(cardId: string) {
  exportCardId.value = cardId
  showExportDialog.value = true
}

function handlePreviewCard(cardId: string) {
  const card = canvasStore.cards.find(c => c.id === cardId)
  if (card?.html) {
    previewPageWidth.value = card.width || pageDimensions.value.width
    previewHtml.value = card.html
    nextTick(() => {
      updatePreviewScale()
      window.addEventListener('resize', updatePreviewScale)
    })
  }
}

function closePreview() {
  previewHtml.value = null
  window.removeEventListener('resize', updatePreviewScale)
}
</script>

<template>
  <div class="design-root">
    <CanvasWrapper
      :page-width="pageDimensions.width"
      :page-height="pageDimensions.height"
      @export-card="handleExportCard"
      @preview-card="handlePreviewCard"
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

    <div v-if="previewHtml" class="preview-overlay">
      <div class="preview-topbar">
        <span class="preview-title">全屏预览</span>
        <button class="preview-close-btn" @click="closePreview">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div ref="previewContainerRef" class="preview-container">
        <div class="preview-scaler" :style="{ width: previewScaledWidth + 'px' }">
          <div :style="{ width: previewPageWidth + 'px', transform: `scale(${previewScale})`, transformOrigin: 'top left' }">
            <iframe :srcdoc="previewSrcdoc ?? undefined" class="preview-iframe" sandbox="allow-same-origin allow-scripts"></iframe>
          </div>
        </div>
      </div>
    </div>

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
.preview-overlay { position: fixed; inset: 0; z-index: 9999; background: #0f0f23; display: flex; flex-direction: column; }
.preview-topbar { display: flex; align-items: center; justify-content: space-between; padding: 8px 16px; background: rgba(22,33,62,0.95); border-bottom: 1px solid #2a2a4a; flex-shrink: 0; }
.preview-title { font-size: 14px; font-weight: 600; color: #e2e8f0; }
.preview-close-btn { background: none; border: none; color: #94a3b8; cursor: pointer; padding: 4px; border-radius: 6px; display: flex; align-items: center; justify-content: center; }
.preview-close-btn:hover { color: #fff; background: rgba(255,255,255,0.1); }
.preview-container { flex: 1; overflow: hidden; display: flex; justify-content: center; }
.preview-scaler { flex-shrink: 0; }
.preview-iframe { width: 100%; height: calc(100vh - 45px); border: none; background: #fff; }
</style>
