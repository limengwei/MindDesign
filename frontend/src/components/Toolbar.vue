<script setup lang="ts">
import { ref } from 'vue'
import { useCanvasStore, PAGE_DIMENSIONS } from '../stores/canvasStore'
import { useLLMConfigStore } from '../stores/llmConfigStore'
import SettingsPanel from './SettingsPanel.vue'
import WindowControls from './WindowControls.vue'

defineEmits<{
  back: []
}>()

const canvasStore = useCanvasStore()
const llmConfigStore = useLLMConfigStore()
const showSettingsPanel = ref(false)
</script>

<template>
  <div class="toolbar">
    <div class="toolbar-left">
      <button class="toolbar-btn back-btn" title="返回主页" @click="$emit('back')">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
      </button>
      <span class="app-name">MindDesign</span>
      <span class="separator">—</span>
      <span class="project-name">{{ canvasStore.projectName }}</span>
    </div>

    <div class="toolbar-center"></div>

    <div class="toolbar-right">
      <span class="size-info">
        {{ PAGE_DIMENSIONS[canvasStore.pageType].width }} × {{ PAGE_DIMENSIONS[canvasStore.pageType].height }}
      </span>
      <button
        class="toolbar-btn"
        :class="{ active: llmConfigStore.isConfigured }"
        title="API 设置"
        @click="showSettingsPanel = true"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.49.49 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 0 0-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96a.49.49 0 0 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6A3.6 3.6 0 1 1 12 8.4a3.6 3.6 0 0 1 0 7.2z"/></svg>
      </button>
      <WindowControls />
    </div>
  </div>

  <SettingsPanel
    v-if="showSettingsPanel"
    @close="showSettingsPanel = false"
  />
</template>

<style scoped>
.toolbar { position: absolute; top: 0; left: 0; right: 0; z-index: var(--z-toolbar); display: flex; align-items: center; justify-content: space-between; padding: 0 16px; height: 44px; background: rgba(22, 33, 62, 0.75); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); border-bottom: 1px solid var(--border-subtle); flex-shrink: 0; --wails-draggable: drag; }
.toolbar-left { display: flex; align-items: center; gap: 8px; --wails-draggable: no-drag; }
.toolbar-center { flex: 1; }
.toolbar-right { display: flex; align-items: center; gap: 8px; --wails-draggable: no-drag; }
.back-btn { color: var(--text-secondary); }
.app-name { font-size: var(--font-base); font-weight: 600; color: var(--color-primary-light); }
.separator { color: #3a3a5c; font-size: var(--font-base); }
.project-name { font-size: var(--font-sm); color: var(--text-muted); }
.size-info { font-size: var(--font-xs); color: var(--text-muted); }
.toolbar-btn.active { color: #34d399; }
</style>
