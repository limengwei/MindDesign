<script setup lang="ts">
import { ref, computed } from 'vue'
import { type DesignSpecId } from '../prompts/designSpecs'
import DesignSpecSelector from './DesignSpecSelector.vue'
import { importSharePackage, exportSharePackage, type ShareableProjectData } from '../utils/sharePackage'
import { useCanvasStore } from '../stores/canvasStore'
import SharePreview from './SharePreview.vue'

const emit = defineEmits(['create', 'close', 'importShare', 'restoreShare'])

const projectName = ref('')
const pageType = ref('app')
const description = ref('')
const designSpecId = ref<DesignSpecId>('none')
const importing = ref(false)
const importError = ref('')
const shareImport = ref<ShareableProjectData | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
/** Phase 4 · Task 18：分享包预览弹窗 */
const showSharePreview = ref(false)

const pageTypes = [
  { value: 'app', label: '📱 移动 App', width: '375px' },
  { value: 'web', label: '🌐 网页', width: '1440px' },
  { value: 'desktop', label: '🖥 桌面应用', width: '1280px' },
]

const canvasStore = useCanvasStore()

function handleCreate() {
  if (shareImport.value) {
    // 从分享包恢复
    emit('restoreShare', shareImport.value, {
      name: projectName.value || '分享项目',
      pageType: pageType.value,
      designSpecId: designSpecId.value,
      description: description.value,
    })
    return
  }
  emit('create', {
    name: projectName.value || '未命名项目',
    pageType: pageType.value,
    designSpecId: designSpecId.value,
    description: description.value,
  })
}

function triggerImport() {
  importError.value = ''
  fileInput.value?.click()
}

async function onFileChange(e: Event) {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return
  if (!file.name.endsWith('.mindshare')) {
    importError.value = '请选择 .mindshare 文件'
    target.value = ''
    return
  }
  importing.value = true
  try {
    const data = await importSharePackage(file)
    shareImport.value = data
    importError.value = ''
    // 自动填一些字段
    const proj = (data.project as any) || {}
    if (proj.name) projectName.value = String(proj.name) + '（分享）'
    if (proj.pageType && ['app', 'web', 'desktop'].includes(proj.pageType)) {
      pageType.value = proj.pageType
    }
    if (proj.designSpec?.id) designSpecId.value = proj.designSpec.id
  } catch (err) {
    importError.value = '解析失败：' + ((err as Error).message || String(err))
  } finally {
    importing.value = false
    target.value = ''
  }
}

// Phase 4 · Task 18：导出当前项目为分享包
const exporting = ref(false)
async function handleExportShare() {
  exporting.value = true
  try {
    // 构造项目元数据（canvasStore 未暴露 projectMeta，直接用原始字段组装）
    const projectMeta = {
      name: canvasStore.projectName,
      type: canvasStore.pageType,
      designSpecId: canvasStore.designSpecId,
      designSpec: canvasStore.getActiveSpec?.() || null,
      createdAt: canvasStore.pages[0]?.createdAt || new Date().toISOString(),
    }
    const blob = await exportSharePackage({
      project: projectMeta,
      pages: canvasStore.pages,
      cards: canvasStore.cards,
    })
    const fileName = (canvasStore.projectName || 'MindDesign 项目') + '.mindshare'
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  } catch (err) {
    alert('导出失败：' + ((err as Error).message || String(err)))
  } finally {
    exporting.value = false
  }
}

// Phase 4 · Task 18：分享包预览"应用为新项目"
function applyShare(data: ShareableProjectData) {
  showSharePreview.value = false
  shareImport.value = data
  // 复用 restoreShare 事件
  emit('restoreShare', data, {
    name: (data.project as any)?.name ? (data.project as any).name + '（分享）' : '分享项目',
    pageType: pageType.value,
    designSpecId: designSpecId.value,
    description: description.value,
  })
}

/** Phase 4 · Task 18：分享包画板数（兼容 pages / sessions / cards） */
const shareImportPageCount = computed(() => {
  const si = shareImport.value
  if (!si) return 0
  if (Array.isArray(si.pages)) return si.pages.length
  if (Array.isArray(si.sessions)) return si.sessions.length
  if (Array.isArray(si.cards)) return si.cards.length
  return 0
})
</script>

<template>
  <div class="dialog-overlay" @click.self="$emit('close')">
    <div class="dialog dialog-create">
      <h2 class="dialog-title">{{ shareImport ? '从分享包恢复' : '新建项目' }}</h2>

      <div v-if="!shareImport" class="form-group import-group">
        <div class="import-row">
          <button class="btn btn-secondary import-btn" :disabled="importing" @click="triggerImport">
            📥 导入 .mindshare 分享包
          </button>
          <input
            ref="fileInput"
            type="file"
            accept=".mindshare"
            style="display:none"
            @change="onFileChange"
          />
          <!-- Phase 4 · Task 18：导出当前项目为分享包 -->
          <button class="btn btn-secondary import-btn" :disabled="exporting" @click="handleExportShare" v-if="canvasStore.projectName">
            📤 导出分享包
          </button>
        </div>
        <p v-if="importing" class="hint">解析中…</p>
        <p v-if="exporting" class="hint">导出中…</p>
        <p v-if="importError" class="hint error">⚠ {{ importError }}</p>
      </div>

      <div v-if="shareImport" class="share-preview">
        <div class="share-row">📦 已加载分享包：<strong>{{ (shareImport.project as any)?.name || '未命名' }}</strong></div>
        <div class="share-row">画板数：{{ shareImportPageCount }}</div>
        <div class="share-row-actions">
          <button class="btn btn-secondary" @click="showSharePreview = true">🔍 预览</button>
          <button class="btn btn-secondary" @click="shareImport = null">取消导入</button>
        </div>
      </div>

      <div class="form-group">
        <label>项目名称</label>
        <input
          v-model="projectName"
          type="text"
          placeholder="输入项目名称..."
          class="input"
          @keyup.enter="handleCreate"
        />
      </div>

      <div class="form-group">
        <label>页面类型</label>
        <div class="option-grid">
          <button
            v-for="pt in pageTypes"
            :key="pt.value"
            :class="['option-card', { active: pageType === pt.value }]"
            @click="pageType = pt.value"
          >
            <div class="option-label">{{ pt.label }}</div>
            <div class="option-hint">{{ pt.width }}</div>
          </button>
        </div>
      </div>

      <div class="form-group">
        <label>设计规范</label>
        <DesignSpecSelector v-model="designSpecId" />
      </div>

      <div class="form-group">
        <label>描述你想要的页面</label>
        <textarea
          v-model="description"
          placeholder="例如：一个简约的医疗健康App首页..."
          class="input textarea"
          rows="3"
        ></textarea>
      </div>

      <div class="dialog-actions">
        <button class="btn btn-secondary" @click="$emit('close')">取消</button>
        <button class="btn btn-primary" @click="handleCreate">{{ shareImport ? '恢复并开始' : '开始设计' }}</button>
      </div>
    </div>
  </div>

  <!-- Phase 4 · Task 18：分享包预览弹窗 -->
  <SharePreview
    v-if="showSharePreview && shareImport"
    :data="shareImport"
    @close="showSharePreview = false"
    @apply="applyShare"
  />
</template>

<style scoped>
.dialog-overlay { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.7); display: flex; align-items: center; justify-content: center; z-index: var(--z-dialog); }
.dialog { background: var(--bg-elevated); border-radius: var(--radius-xl); padding: 32px; width: 480px; max-width: 90vw; box-shadow: var(--shadow-lg); border: 1px solid var(--border-default); }
.dialog-create { width: 560px; max-height: 85vh; overflow-y: auto; }
.dialog-title { font-size: var(--font-2xl); font-weight: 600; margin: 0 0 24px; color: var(--text-primary); }
.option-grid { display: flex; flex-wrap: wrap; gap: 8px; }
.option-card { flex: 1 1 0; min-width: 100px; padding: 12px 8px; border: 2px solid var(--border-default); border-radius: 10px; background: var(--bg-surface); cursor: pointer; text-align: center; transition: all var(--transition-normal); color: var(--text-primary); }
.option-card:hover { border-color: #3a3a5c; }
.option-card.active { border-color: var(--color-primary-light); background: #1e1b4b; }
.option-card.small { flex: 0 1 auto; min-width: 80px; padding: 8px 12px; white-space: nowrap; }
.option-label { font-size: var(--font-md); font-weight: 500; }
.option-hint { font-size: var(--font-sm); color: var(--text-muted); margin-top: 4px; }
.dialog-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 24px; }
.import-group { padding: 12px; background: var(--bg-surface); border: 1px dashed var(--border-default); border-radius: 8px; margin-bottom: 16px; text-align: center; }
.import-row { display: flex; gap: 8px; }
.import-btn { flex: 1; }
.hint { font-size: 11px; color: var(--text-muted); margin-top: 6px; }
.hint.error { color: #fca5a5; }
.share-preview { padding: 12px; background: var(--bg-surface); border: 1px solid var(--border-default); border-radius: 8px; margin-bottom: 16px; }
.share-row { font-size: 12px; color: var(--text-secondary); margin-bottom: 4px; }
.share-row strong { color: var(--text-primary); }
.share-row-actions { display: flex; gap: 6px; margin-top: 8px; }
.share-row-actions .btn { flex: 1; }
</style>
