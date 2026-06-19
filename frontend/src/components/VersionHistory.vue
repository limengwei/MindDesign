<script setup lang="ts">
/**
 * Phase 4 · Task 16：版本历史时间线
 *
 * - 画板右键"查看历史"时弹出
 * - 左侧缩略图 / 右侧时间线
 * - 每条记录三个按钮：回滚 / 对比 / 复制为新变体
 * - "对比"打开左右双 iframe DiffViewer
 */
import { computed, ref } from 'vue'
import { useCanvasStore, type Version } from '../stores/canvasStore'
import { saveProject } from '../stores/autoSave'

const props = defineProps<{
  pageId: string
}>()

const emit = defineEmits<{
  close: []
}>()

const canvasStore = useCanvasStore()

const page = computed(() => canvasStore.pages.find(p => p.id === props.pageId) || null)

/** 倒序时间线（最新在前） */
const timeline = computed<Version[]>(() => {
  if (!page.value) return []
  return [...page.value.versions].reverse()
})

/** DiffViewer 状态 */
const diffState = ref<{ a: Version | null; b: Version | null }>({ a: null, b: null })
const diffOpen = computed(() => diffState.value.a !== null && diffState.value.b !== null)

function openDiff(v: Version) {
  if (!page.value) return
  const list = [...page.value.versions]
  if (list.length < 1) return
  // 默认：与"上一版"对比；若已是最新则与"下一版"对比
  const idx = list.findIndex(x => x.id === v.id)
  const other = list[idx + 1] || list[idx - 1] || list[0]
  if (!other) return
  diffState.value = { a: other, b: v }
}

function closeDiff() {
  diffState.value = { a: null, b: null }
}

async function rollback(v: Version) {
  if (!page.value) return
  if (!confirm(`确定回滚到 v${v.version} 吗？当前版本会先自动保存。`)) return
  canvasStore.rollbackToVersion(page.value.id, v.id)
  closeDiff()
  emit('close')
  await saveProject()
}

async function copyAsVariant(v: Version) {
  if (!page.value) return
  const variant = canvasStore.copyVersionAsVariant(page.value.id, v.id)
  if (variant) {
    alert(`已创建变体：${variant.label || `v${variant.version}`}`)
    await saveProject()
  }
}

function formatTime(iso: string) {
  const d = new Date(iso)
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}`
}
</script>

<template>
  <div v-if="page" class="vh-overlay" @click.self="emit('close')">
    <div class="vh-modal">
      <div class="vh-header">
        <h3>📜 版本历史 — {{ page.name }}</h3>
        <button class="vh-close" @click="emit('close')">×</button>
      </div>
      <div v-if="timeline.length === 0" class="vh-empty">该画板暂无历史版本</div>
      <div v-else class="vh-timeline">
        <div
          v-for="(v, i) in timeline"
          :key="v.id"
          class="vh-item"
        >
          <div class="vh-item-thumb">
            <img v-if="v.screenshot" :src="v.screenshot" :alt="`v${v.version}`" />
            <div v-else class="vh-item-thumb-empty">v{{ v.version }}</div>
          </div>
          <div class="vh-item-body">
            <div class="vh-item-head">
              <span class="vh-version">v{{ v.version }}</span>
              <span class="vh-time">{{ formatTime(v.createdAt) }}</span>
              <span v-if="i === 0" class="vh-latest">最新</span>
            </div>
            <div class="vh-summary">{{ v.summary }}</div>
            <div v-if="v.critique" class="vh-critique">📊 {{ v.critique }}</div>
            <div class="vh-actions">
              <button class="vh-btn" @click="rollback(v)">↩ 回滚</button>
              <button class="vh-btn" @click="openDiff(v)">⚖ 对比</button>
              <button class="vh-btn" @click="copyAsVariant(v)">📋 复制为新变体</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- DiffViewer：左右 iframe -->
    <div v-if="diffOpen" class="vh-diff-overlay" @click.self="closeDiff">
      <div class="vh-diff-modal">
        <div class="vh-diff-header">
          <h3>⚖ 版本对比</h3>
          <button class="vh-close" @click="closeDiff">×</button>
        </div>
        <div class="vh-diff-body">
          <div class="vh-diff-side">
            <div class="vh-diff-label">v{{ diffState.a?.version }} · {{ diffState.a?.summary }}</div>
            <iframe sandbox="allow-same-origin" :srcdoc="diffState.a?.html" class="vh-diff-frame" />
          </div>
          <div class="vh-diff-side">
            <div class="vh-diff-label">v{{ diffState.b?.version }} · {{ diffState.b?.summary }}</div>
            <iframe sandbox="allow-same-origin" :srcdoc="diffState.b?.html" class="vh-diff-frame" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.vh-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 1100; }
.vh-modal { width: 720px; max-width: 95vw; max-height: 85vh; background: var(--bg-elevated); border: 1px solid var(--border-default); border-radius: 12px; display: flex; flex-direction: column; box-shadow: 0 12px 48px rgba(0,0,0,0.5); overflow: hidden; }
.vh-header { display: flex; align-items: center; justify-content: space-between; padding: 14px 20px; border-bottom: 1px solid var(--border-default); }
.vh-header h3 { margin: 0; font-size: 16px; font-weight: 600; color: var(--text-primary); }
.vh-close { width: 28px; height: 28px; border-radius: 50%; background: var(--border-default); color: var(--text-secondary); border: none; font-size: 18px; cursor: pointer; }
.vh-close:hover { background: #3a3a5c; color: #fff; }
.vh-empty { padding: 40px; text-align: center; color: var(--text-muted); font-size: 13px; }
.vh-timeline { flex: 1; overflow-y: auto; padding: 16px 20px; display: flex; flex-direction: column; gap: 12px; }
.vh-item { display: flex; gap: 12px; padding: 10px; background: var(--bg-surface); border: 1px solid var(--border-default); border-radius: 8px; }
.vh-item-thumb { width: 80px; height: 100px; flex-shrink: 0; background: #0f0f23; border-radius: 6px; overflow: hidden; display: flex; align-items: center; justify-content: center; }
.vh-item-thumb img { width: 100%; height: 100%; object-fit: cover; }
.vh-item-thumb-empty { font-size: 14px; color: var(--text-muted); font-weight: 600; }
.vh-item-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px; }
.vh-item-head { display: flex; align-items: center; gap: 8px; font-size: 12px; }
.vh-version { font-weight: 700; color: var(--color-primary-light); }
.vh-time { color: var(--text-muted); }
.vh-latest { background: rgba(34,197,94,0.15); color: #22c55e; padding: 1px 6px; border-radius: 4px; font-size: 10px; font-weight: 600; }
.vh-summary { font-size: 12px; color: var(--text-primary); }
.vh-critique { font-size: 11px; color: var(--text-secondary); line-height: 1.4; }
.vh-actions { display: flex; gap: 6px; margin-top: 4px; }
.vh-btn { padding: 4px 10px; border-radius: 6px; border: 1px solid var(--border-default); background: transparent; color: var(--text-secondary); font-size: 11px; cursor: pointer; font-family: inherit; }
.vh-btn:hover { color: var(--text-primary); border-color: var(--border-hover); }

/* DiffViewer */
.vh-diff-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.75); display: flex; align-items: center; justify-content: center; z-index: 1200; }
.vh-diff-modal { width: 1400px; max-width: 96vw; height: 85vh; background: var(--bg-elevated); border: 1px solid var(--border-default); border-radius: 12px; display: flex; flex-direction: column; box-shadow: 0 12px 48px rgba(0,0,0,0.5); overflow: hidden; }
.vh-diff-header { display: flex; align-items: center; justify-content: space-between; padding: 12px 20px; border-bottom: 1px solid var(--border-default); }
.vh-diff-header h3 { margin: 0; font-size: 15px; font-weight: 600; color: var(--text-primary); }
.vh-diff-body { flex: 1; display: grid; grid-template-columns: 1fr 1fr; gap: 8px; padding: 12px; overflow: hidden; }
.vh-diff-side { display: flex; flex-direction: column; min-width: 0; }
.vh-diff-label { font-size: 12px; color: var(--text-secondary); padding: 4px 8px; background: var(--bg-surface); border-radius: 4px; margin-bottom: 4px; }
.vh-diff-frame { flex: 1; width: 100%; border: 1px solid var(--border-default); border-radius: 6px; background: #fff; }
</style>
