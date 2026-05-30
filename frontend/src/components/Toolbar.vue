<script setup lang="ts">
import { ref } from 'vue'
import { useCanvasStore, PAGE_DIMENSIONS } from '../stores/canvasStore'
import { useChatStore } from '../stores/chatStore'
import { useLLMConfigStore } from '../stores/llmConfigStore'
import ExportDialog from './ExportDialog.vue'
import SettingsPanel from './SettingsPanel.vue'
import { autoSave } from '../services/projectBridge'
import type { ProjectFile } from '../types/project'

const canvasStore = useCanvasStore()
const chatStore = useChatStore()
const llmConfigStore = useLLMConfigStore()

const showExportDialog = ref(false)
const showSettingsPanel = ref(false)

function handleExport() {
  showExportDialog.value = true
}

async function handleSave() {
  if (!canvasStore.cards.length && chatStore.messages.length === 0) return
  const data: ProjectFile = {
    formatVersion: 1,
    meta: { name: canvasStore.projectName, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), appVersion: '1.0.0' },
    canvas: { cards: canvasStore.cards, pageType: canvasStore.pageType, colorScheme: canvasStore.colorScheme, viewport: canvasStore.viewport },
    chat: chatStore.messages.map(m => ({ role: m.role, content: m.content, timestamp: m.timestamp })),
  }
  try {
    await autoSave(JSON.stringify(data))
    alert('已保存到 MindDesign 项目数据目录')
  } catch (e) {
    console.error('Save failed:', e)
    alert('保存失败，请检查应用权限')
  }
}

function handleNewProject() {
  if (chatStore.messages.length > 0) {
    if (!confirm('当前项目未保存，是否确认新建？')) return
  }
  canvasStore.reset()
  chatStore.reset()
}

defineExpose({ handleExport, handleNewProject })
</script>

<template>
  <div class="toolbar">
    <div class="toolbar-left">
      <span class="app-name">MindDesign</span>
      <span class="project-name" v-if="canvasStore.projectName">
        — {{ canvasStore.projectName }}
      </span>
    </div>

    <div class="toolbar-center">
      <button class="toolbar-btn" title="新建 (Ctrl+N)" @click="handleNewProject">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zM6 20V4h7v5h5v11H6zm2-6h3v-3h2v3h3v2h-3v3h-2v-3H8v-2z"/></svg>
      </button>
      <button class="toolbar-btn" title="保存 (Ctrl+S)" @click="handleSave">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z"/></svg>
      </button>
      <button class="toolbar-btn" title="导出 HTML" @click="handleExport">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
      </button>
    </div>

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
    </div>
  </div>

  <ExportDialog
    v-if="showExportDialog"
    :tree="canvasStore.currentTree"
    :project-name="canvasStore.projectName"
    @close="showExportDialog = false"
  />

  <SettingsPanel
    v-if="showSettingsPanel"
    @close="showSettingsPanel = false"
  />
</template>

<style scoped>
.toolbar {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  height: 44px;
  background: rgba(22, 33, 62, 0.75);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(42, 42, 74, 0.6);
  flex-shrink: 0;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.app-name {
  font-size: 13px;
  font-weight: 600;
  color: #818cf8;
}

.project-name {
  font-size: 12px;
  color: #6b7280;
}

.toolbar-center {
  display: flex;
  gap: 4px;
}

.toolbar-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: none;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #9ca3af;
  transition: all 0.15s;
}

.toolbar-btn:hover {
  background: rgba(42, 42, 74, 0.6);
  color: #e5e7eb;
}

.toolbar-btn.active {
  color: #34d399;
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.size-info {
  font-size: 11px;
  color: #6b7280;
}
</style>
