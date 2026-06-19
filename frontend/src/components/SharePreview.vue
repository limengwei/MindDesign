<script setup lang="ts">
/**
 * Phase 4 · Task 18：分享包预览
 *
 * - 展示分享包元信息：项目名 / 画板数 / 组件数 / 缩略图
 * - "应用为新项目" 按钮
 * - 暂不实现 Web 预览链接（按设计说明留到后续）
 */
import { computed } from 'vue'
import type { ShareableProjectData } from '../utils/sharePackage'

const props = defineProps<{
  data: ShareableProjectData
}>()

const emit = defineEmits<{
  apply: [data: ShareableProjectData]
  close: []
}>()

const projectName = computed(() => (props.data.project as any)?.name || '未命名项目')
const pageCount = computed(() => {
  const sessions = (props.data as any).sessions
  if (Array.isArray(sessions)) return sessions.length
  const cards = (props.data as any).cards
  if (Array.isArray(cards)) return cards.length
  return 0
})
const componentCount = computed(() => Array.isArray(props.data.components) ? props.data.components.length : 0)

const sessions = computed<any[]>(() => Array.isArray((props.data as any).sessions) ? (props.data as any).sessions : [])
const components = computed<any[]>(() => Array.isArray(props.data.components) ? props.data.components : [])

/** 取第一张缩略图 */
const thumbnail = computed(() => {
  for (const s of sessions.value) {
    if (s?.screenshot) return s.screenshot
  }
  for (const c of components.value) {
    if (c?.screenshot) return c.screenshot
  }
  return null
})

function apply() {
  emit('apply', props.data)
}
</script>

<template>
  <div class="sp-overlay" @click.self="emit('close')">
    <div class="sp-modal">
      <div class="sp-header">
        <h3>📦 分享包预览</h3>
        <button class="sp-close" @click="emit('close')">×</button>
      </div>
      <div class="sp-body">
        <div class="sp-info">
          <div class="sp-name">{{ projectName }}</div>
          <div class="sp-meta">
            <span class="sp-meta-item">📐 画板：<strong>{{ pageCount }}</strong></span>
            <span class="sp-meta-item">🧩 组件：<strong>{{ componentCount }}</strong></span>
          </div>
        </div>
        <div v-if="thumbnail" class="sp-thumb">
          <img :src="thumbnail" :alt="projectName" />
        </div>
        <div v-else class="sp-thumb-empty">暂无预览图</div>
        <div v-if="components.length > 0" class="sp-component-list">
          <div class="sp-section-title">组件列表</div>
          <div class="sp-chips">
            <div v-for="c in components.slice(0, 24)" :key="c.id" class="sp-chip">
              {{ c.name || c.id }}
            </div>
            <div v-if="components.length > 24" class="sp-chip more">+{{ components.length - 24 }}</div>
          </div>
        </div>
        <div v-if="sessions.length > 0" class="sp-session-list">
          <div class="sp-section-title">画板列表</div>
          <div class="sp-sessions">
            <div v-for="(s, i) in sessions.slice(0, 6)" :key="i" class="sp-session">
              <div v-if="s?.screenshot" class="sp-session-thumb">
                <img :src="s.screenshot" :alt="`画板 ${i + 1}`" />
              </div>
              <div v-else class="sp-session-thumb empty">#{{ i + 1 }}</div>
              <div class="sp-session-label">{{ s?.summary || s?.name || `画板 ${i + 1}` }}</div>
            </div>
          </div>
        </div>
      </div>
      <div class="sp-footer">
        <button class="btn btn-secondary" @click="emit('close')">取消</button>
        <button class="btn btn-primary" @click="apply">📥 应用为新项目</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.sp-overlay { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.7); display: flex; align-items: center; justify-content: center; z-index: var(--z-dialog); }
.sp-modal { width: 640px; max-width: 95vw; max-height: 85vh; background: var(--bg-elevated); border: 1px solid var(--border-default); border-radius: 12px; display: flex; flex-direction: column; box-shadow: 0 12px 48px rgba(0, 0, 0, 0.5); overflow: hidden; }
.sp-header { display: flex; align-items: center; justify-content: space-between; padding: 14px 20px; border-bottom: 1px solid var(--border-default); }
.sp-header h3 { margin: 0; font-size: 16px; font-weight: 600; color: var(--text-primary); }
.sp-close { width: 28px; height: 28px; border-radius: 50%; background: var(--border-default); color: var(--text-secondary); border: none; font-size: 18px; cursor: pointer; }
.sp-close:hover { background: #3a3a5c; color: #fff; }
.sp-body { flex: 1; overflow-y: auto; padding: 16px 20px; display: flex; flex-direction: column; gap: 14px; }
.sp-info { display: flex; flex-direction: column; gap: 6px; }
.sp-name { font-size: 18px; font-weight: 700; color: var(--text-primary); }
.sp-meta { display: flex; gap: 16px; font-size: 12px; color: var(--text-secondary); }
.sp-meta-item strong { color: var(--text-primary); font-weight: 600; }
.sp-thumb { width: 100%; aspect-ratio: 16 / 9; background: #fff; border-radius: 8px; overflow: hidden; }
.sp-thumb img { width: 100%; height: 100%; object-fit: contain; }
.sp-thumb-empty { width: 100%; aspect-ratio: 16 / 9; background: var(--bg-surface); border: 1px dashed var(--border-default); border-radius: 8px; display: flex; align-items: center; justify-content: center; color: var(--text-muted); font-size: 12px; }
.sp-section-title { font-size: 12px; font-weight: 600; color: var(--text-secondary); margin-bottom: 6px; }
.sp-chips { display: flex; flex-wrap: wrap; gap: 4px; }
.sp-chip { padding: 3px 8px; border-radius: 4px; background: var(--bg-surface); border: 1px solid var(--border-default); font-size: 11px; color: var(--text-secondary); }
.sp-chip.more { color: var(--text-muted); }
.sp-sessions { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.sp-session { display: flex; flex-direction: column; gap: 4px; }
.sp-session-thumb { aspect-ratio: 16 / 10; background: #fff; border-radius: 4px; overflow: hidden; display: flex; align-items: center; justify-content: center; }
.sp-session-thumb img { width: 100%; height: 100%; object-fit: cover; }
.sp-session-thumb.empty { background: var(--bg-surface); color: var(--text-muted); font-size: 12px; font-weight: 600; }
.sp-session-label { font-size: 11px; color: var(--text-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sp-footer { display: flex; justify-content: flex-end; gap: 8px; padding: 12px 20px; border-top: 1px solid var(--border-default); }
.btn { padding: 8px 16px; border-radius: 6px; border: 1px solid var(--border-default); background: transparent; color: var(--text-secondary); font-size: 12px; cursor: pointer; font-family: inherit; }
.btn:hover { color: var(--text-primary); border-color: var(--border-hover); }
.btn-primary { background: var(--color-primary); color: #fff; border-color: var(--color-primary); }
.btn-primary:hover { background: var(--color-primary-hover); }
</style>
