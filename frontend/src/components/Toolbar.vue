<script setup lang="ts">
import { ref } from 'vue'
import { useCanvasStore, PAGE_DIMENSIONS } from '../stores/canvasStore'
import { useChatStore } from '../stores/chatStore'
import ExportDialog from './ExportDialog.vue'

const canvasStore = useCanvasStore()
const chatStore = useChatStore()

const showExportDialog = ref(false)

function handleExport() {
  showExportDialog.value = true
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
      <button class="toolbar-btn" title="保存 (Ctrl+S)">
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
    </div>
  </div>

  <ExportDialog
    v-if="showExportDialog"
    :tree="canvasStore.currentTree"
    :project-name="canvasStore.projectName"
    @close="showExportDialog = false"
  />
</template>

<style scoped>
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  height: 40px;
  background: #ffffff;
  border-bottom: 1px solid #e5e5e5;
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
  color: #4f46e5;
}

.project-name {
  font-size: 12px;
  color: #999;
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
  color: #666;
  transition: all 0.15s;
}

.toolbar-btn:hover {
  background: #f0f0f0;
  color: #333;
}

.toolbar-right {
  display: flex;
  align-items: center;
}

.size-info {
  font-size: 11px;
  color: #999;
}
</style>
