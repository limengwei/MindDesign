<script setup lang="ts">
/**
 * Phase 4 · Task 17：组件库面板
 *
 * - 左侧分类导航（按 DesignSpec 分组）
 * - 右侧缩略图网格
 * - 拖拽组件到画布 → 触发 instantiate（将组件 HTML 注入到当前画板）
 * - 也支持"插入到 prompt"按钮（不影响画布）
 */
import { ref, computed } from 'vue'
import { useComponentStore, type StoredComponent } from '../stores/componentStore'
import { useCanvasStore } from '../stores/canvasStore'
import { getDesignSpecById } from '../prompts/designSpecs'

const props = defineProps<{
  /** 拖入画布时的回调（由父组件提供，本组件 emit drag 事件） */
  draggable?: boolean
}>()

const emit = defineEmits<{
  close: []
  insertToPrompt: [component: StoredComponent]
}>()

const componentStore = useComponentStore()
const canvasStore = useCanvasStore()

const activeCategory = ref<string>('__all__')

/** 按 designSpecId 分组（带 "全部" + "未分类"） */
const groupedComponents = computed(() => {
  const groups: Array<{ key: string; label: string; items: StoredComponent[] }> = []
  groups.push({ key: '__all__', label: `全部 (${componentStore.components.length})`, items: componentStore.components })
  // 按 designSpecId
  const bySpec = new Map<string, StoredComponent[]>()
  for (const c of componentStore.components) {
    const key = c.designSpecId || '__none__'
    if (!bySpec.has(key)) bySpec.set(key, [])
    bySpec.get(key)!.push(c)
  }
  for (const [key, items] of bySpec) {
    const spec = key === '__none__' ? null : getDesignSpecById(key as any)
    const label = spec ? spec.name : '未关联规范'
    groups.push({ key, label: `${label} (${items.length})`, items })
  }
  return groups
})

const currentItems = computed(() => {
  const g = groupedComponents.value.find(g => g.key === activeCategory.value)
  return g?.items || []
})

function specName(id?: string) {
  if (!id) return null
  const spec = getDesignSpecById(id as any)
  return spec?.name || id
}

/** 拖入画布 */
function onDragStart(e: DragEvent, c: StoredComponent) {
  if (!e.dataTransfer) return
  e.dataTransfer.effectAllowed = 'copy'
  e.dataTransfer.setData('application/x-md-component', c.id)
  // 兼容一些浏览器需要 text/plain
  e.dataTransfer.setData('text/plain', c.id)
}

function onItemClick(c: StoredComponent) {
  emit('insertToPrompt', c)
}

function removeComp(c: StoredComponent) {
  if (confirm(`确定从组件库移除 "${c.name}"？`)) {
    componentStore.removeComponent(c.id)
  }
}

/** 复制 html 到剪贴板 */
async function copyHtml(c: StoredComponent) {
  try {
    await navigator.clipboard.writeText(c.html)
  } catch {
    // ignore
  }
}
</script>

<template>
  <div class="cl-panel">
    <div class="cl-header">
      <h3>🧩 组件库 <span class="cl-count">{{ componentStore.components.length }}</span></h3>
      <button class="cl-close" @click="emit('close')">×</button>
    </div>
    <div class="cl-body">
      <!-- 左侧分类导航 -->
      <div class="cl-sidebar">
        <div
          v-for="g in groupedComponents"
          :key="g.key"
          :class="['cl-cat-item', { active: activeCategory === g.key }]"
          @click="activeCategory = g.key"
        >
          {{ g.label }}
        </div>
      </div>
      <!-- 右侧缩略图网格 -->
      <div class="cl-grid">
        <div v-if="currentItems.length === 0" class="cl-empty">
          该分组下暂无组件。
          <br /><br />
          在画板上右键 → "另存为组件" 添加。
        </div>
        <div
          v-for="c in currentItems"
          :key="c.id"
          class="cl-card"
          :draggable="props.draggable !== false"
          @dragstart="onDragStart($event, c)"
          @click="onItemClick(c)"
          :title="`${c.name} · 拖到画布或点击插入 prompt`"
        >
          <div class="cl-thumb">
            <iframe
              sandbox="allow-same-origin"
              :srcdoc="c.html"
              class="cl-thumb-frame"
            />
          </div>
          <div class="cl-meta">
            <div class="cl-name">{{ c.name }}</div>
            <div class="cl-spec">{{ specName(c.designSpecId) }}</div>
            <div class="cl-actions">
              <button class="cl-btn" @click.stop="copyHtml(c)">📋 复制</button>
              <button class="cl-btn danger" @click.stop="removeComp(c)">🗑 移除</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.cl-panel { position: fixed; top: 0; right: 0; bottom: 0; width: 480px; max-width: 90vw; background: var(--bg-elevated); border-left: 1px solid var(--border-default); box-shadow: -8px 0 24px rgba(0,0,0,0.4); z-index: 1000; display: flex; flex-direction: column; }
.cl-header { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border-bottom: 1px solid var(--border-default); }
.cl-header h3 { margin: 0; font-size: 14px; font-weight: 600; color: var(--text-primary); }
.cl-count { font-size: 11px; font-weight: 400; color: var(--text-muted); margin-left: 4px; }
.cl-close { width: 28px; height: 28px; border-radius: 50%; background: var(--border-default); color: var(--text-secondary); border: none; font-size: 18px; cursor: pointer; }
.cl-close:hover { background: #3a3a5c; color: #fff; }
.cl-body { flex: 1; display: grid; grid-template-columns: 120px 1fr; overflow: hidden; }
.cl-sidebar { background: var(--bg-surface); border-right: 1px solid var(--border-default); padding: 8px 0; overflow-y: auto; }
.cl-cat-item { padding: 8px 12px; font-size: 12px; color: var(--text-secondary); cursor: pointer; transition: background 0.1s; }
.cl-cat-item:hover { background: rgba(255,255,255,0.04); color: var(--text-primary); }
.cl-cat-item.active { background: rgba(129,140,248,0.18); color: var(--color-primary-light); border-left: 2px solid var(--color-primary); }
.cl-grid { flex: 1; overflow-y: auto; padding: 12px; display: grid; grid-template-columns: 1fr 1fr; gap: 12px; align-content: start; }
.cl-empty { grid-column: 1 / -1; padding: 40px 20px; text-align: center; font-size: 12px; color: var(--text-muted); line-height: 1.6; }
.cl-card { background: var(--bg-surface); border: 1px solid var(--border-default); border-radius: 8px; overflow: hidden; cursor: grab; transition: all 0.15s; display: flex; flex-direction: column; }
.cl-card:hover { border-color: var(--color-primary-light); transform: translateY(-2px); }
.cl-card:active { cursor: grabbing; }
.cl-thumb { width: 100%; aspect-ratio: 4 / 3; background: #fff; overflow: hidden; }
.cl-thumb-frame { width: 200%; height: 200%; transform: scale(0.5); transform-origin: 0 0; border: 0; pointer-events: none; }
.cl-meta { padding: 8px 10px; display: flex; flex-direction: column; gap: 4px; }
.cl-name { font-size: 12px; font-weight: 600; color: var(--text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cl-spec { font-size: 10px; color: var(--text-muted); }
.cl-actions { display: flex; gap: 4px; margin-top: 4px; }
.cl-btn { flex: 1; padding: 3px 6px; border-radius: 4px; border: 1px solid var(--border-default); background: transparent; color: var(--text-secondary); font-size: 10px; cursor: pointer; font-family: inherit; }
.cl-btn:hover { color: var(--text-primary); border-color: var(--border-hover); }
.cl-btn.danger { color: #fca5a5; border-color: rgba(239,68,68,0.3); }
.cl-btn.danger:hover { background: rgba(239,68,68,0.15); }
</style>
