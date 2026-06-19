<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useCanvasStore } from '../stores/canvasStore'
import {
  BUILT_IN_DESIGN_SPECS,
  DESIGN_SPEC_LABELS,
  type DesignSpecId,
} from '../prompts/designSpecs'
import { saveProject } from '../stores/autoSave'

const emit = defineEmits<{
  close: []
}>()

const canvasStore = useCanvasStore()
const localSpecId = ref<string>(canvasStore.designSpecId)
const localCustomContent = ref(canvasStore.customDesignContent)
const showCustomEditor = ref(localSpecId.value === 'custom')

const currentSpec = computed(() => {
  if (localSpecId.value === 'none' || localSpecId.value === 'custom') return null
  return BUILT_IN_DESIGN_SPECS.find(s => s.id === localSpecId.value) || null
})

const currentLabel = computed(() => {
  return (DESIGN_SPEC_LABELS as Record<string, string>)[localSpecId.value] || '选择设计规范'
})

function selectSpec(id: string) {
  localSpecId.value = id
  showCustomEditor.value = id === 'custom'
}

function handleSave() {
  canvasStore.setDesignSpecId(localSpecId.value)
  canvasStore.setCustomDesignContent(localCustomContent.value)
  saveProject()
  emit('close')
}

function handleCancel() {
  emit('close')
}
</script>

<template>
  <div class="modal-overlay" @click.self="handleCancel">
    <div class="editor-panel">
      <div class="panel-header">
        <h3 class="panel-title">设计规范</h3>
        <button class="close-btn" @click="handleCancel">&times;</button>
      </div>

      <div class="panel-body">
        <div class="current-spec">
          <span class="current-label">当前规范</span>
          <span class="current-value">{{ currentLabel }}</span>
          <div v-if="currentSpec" class="current-colors">
            <span class="color-dot" :style="{ backgroundColor: currentSpec.colors.primary }" title="主色"></span>
            <span class="color-dot" :style="{ backgroundColor: currentSpec.colors.background }" title="背景"></span>
            <span class="color-dot" :style="{ backgroundColor: currentSpec.colors.surface }" title="表面"></span>
            <span class="color-dot" :style="{ backgroundColor: currentSpec.colors.text }" title="文字"></span>
            <span class="color-dot" :style="{ backgroundColor: currentSpec.colors.accent }" title="强调"></span>
          </div>
        </div>

        <div class="spec-grid">
          <div
            class="spec-card none-card"
            :class="{ active: localSpecId === 'none' }"
            @click="selectSpec('none')"
          >
            <div class="spec-card-icon">🎨</div>
            <div class="spec-card-name">不使用规范</div>
            <div class="spec-card-desc">AI 自动选择配色</div>
            <div v-if="localSpecId === 'none'" class="spec-card-check">✓</div>
          </div>

          <div
            v-for="spec in BUILT_IN_DESIGN_SPECS"
            :key="spec.id"
            class="spec-card"
            :class="{ active: localSpecId === spec.id }"
            @click="selectSpec(spec.id as DesignSpecId)"
          >
            <div class="spec-card-colors">
              <span class="cdot" :style="{ backgroundColor: spec.colors.primary }"></span>
              <span class="cdot" :style="{ backgroundColor: spec.colors.background }"></span>
              <span class="cdot" :style="{ backgroundColor: spec.colors.surface }"></span>
              <span class="cdot" :style="{ backgroundColor: spec.colors.accent }"></span>
            </div>
            <div class="spec-card-name">{{ spec.name }}</div>
            <div class="spec-card-tag">{{ spec.category }}</div>
            <div v-if="localSpecId === spec.id" class="spec-card-check">✓</div>
          </div>

          <div
            class="spec-card custom-card"
            :class="{ active: localSpecId === 'custom' }"
            @click="selectSpec('custom')"
          >
            <div class="spec-card-icon">📋</div>
            <div class="spec-card-name">自定义导入</div>
            <div class="spec-card-desc">粘贴 DESIGN.md</div>
            <div v-if="localSpecId === 'custom'" class="spec-card-check">✓</div>
          </div>
        </div>

        <div v-if="showCustomEditor" class="custom-editor">
          <label class="editor-label">自定义设计规范内容</label>
          <textarea
            v-model="localCustomContent"
            class="custom-textarea"
            placeholder="在此粘贴自定义设计规范内容（如 DESIGN.md）..."
            rows="8"
          ></textarea>
          <span class="editor-hint">支持 Markdown 格式，AI 将严格遵循此规范生成设计</span>
        </div>
      </div>

      <div class="panel-footer">
        <button class="btn btn-secondary" @click="handleCancel">取消</button>
        <button class="btn btn-primary" @click="handleSave">应用</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.6); display: flex; align-items: center; justify-content: center; z-index: var(--z-modal); }
.editor-panel { width: 680px; max-width: 92vw; max-height: 85vh; background: var(--bg-elevated); border-radius: var(--radius-xl); box-shadow: var(--shadow-xl); border: 1px solid var(--border-default); display: flex; flex-direction: column; overflow: hidden; }
.panel-header { display: flex; align-items: center; justify-content: space-between; padding: 18px 24px 14px; border-bottom: 1px solid var(--border-default); flex-shrink: 0; }
.panel-title { font-size: var(--font-lg); font-weight: 600; color: var(--text-primary); margin: 0; }
.close-btn { width: 28px; height: 28px; border: none; background: none; color: var(--text-muted); font-size: 18px; cursor: pointer; border-radius: var(--radius-sm); display: flex; align-items: center; justify-content: center; transition: all var(--transition-fast); }
.close-btn:hover { background: var(--bg-hover); color: var(--text-primary); }
.panel-body { padding: 16px 24px; overflow-y: auto; flex: 1; }

.current-spec { display: flex; align-items: center; gap: 12px; padding: 12px 14px; background: var(--bg-surface); border: 1px solid var(--border-default); border-radius: var(--radius-md); margin-bottom: 16px; }
.current-label { font-size: var(--font-sm); color: var(--text-secondary); }
.current-value { font-size: var(--font-md); font-weight: 600; color: var(--text-primary); flex: 1; }
.current-colors { display: flex; gap: 6px; }
.color-dot { width: 20px; height: 20px; border-radius: 50%; border: 2px solid var(--border-default); }

.spec-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 10px; margin-bottom: 16px; }
.spec-card { position: relative; padding: 12px; border: 1px solid var(--border-default); border-radius: 10px; background: var(--bg-surface); cursor: pointer; transition: all var(--transition-fast); }
.spec-card:hover { border-color: #3a3a5c; background: #1a1a3e; }
.spec-card.active { border-color: var(--color-primary-light); background: #1e1b4b; }
.spec-card-icon { font-size: 20px; margin-bottom: 6px; }
.spec-card-colors { display: flex; gap: 4px; margin-bottom: 8px; }
.spec-card-colors .cdot { width: 14px; height: 14px; border-radius: 50%; border: 1px solid rgba(255,255,255,0.08); }
.spec-card-name { font-size: var(--font-sm); font-weight: 600; color: var(--text-primary); }
.spec-card-tag { display: inline-block; font-size: 10px; font-weight: 500; color: var(--color-primary-light); background: rgba(129,140,248,0.12); padding: 2px 6px; border-radius: 4px; margin-top: 4px; }
.spec-card-desc { font-size: var(--font-xs); color: var(--text-muted); margin-top: 4px; line-height: 1.3; }
.spec-card-check { position: absolute; top: 6px; right: 6px; width: 18px; height: 18px; border-radius: 50%; background: var(--color-primary-light); color: #fff; font-size: 10px; display: flex; align-items: center; justify-content: center; }

.custom-editor { display: flex; flex-direction: column; gap: 8px; padding-top: 4px; }
.editor-label { font-size: var(--font-sm); font-weight: 500; color: var(--text-secondary); }
.custom-textarea { width: 100%; padding: 10px 14px; border: 1px solid var(--border-default); border-radius: var(--radius-md); font-size: var(--font-md); font-family: 'Menlo', 'Consolas', monospace; outline: none; resize: vertical; background: var(--bg-surface); color: var(--text-primary); line-height: 1.6; min-height: 120px; }
.custom-textarea::placeholder { color: var(--text-placeholder); }
.custom-textarea:focus { border-color: var(--border-hover); }
.editor-hint { font-size: var(--font-xs); color: var(--text-muted); }

.panel-footer { display: flex; justify-content: flex-end; gap: 8px; padding: 12px 24px 16px; border-top: 1px solid var(--border-default); }
.btn { padding: 8px 20px; border-radius: var(--radius-md); font-size: var(--font-md); font-family: var(--font-family); font-weight: 500; cursor: pointer; border: 1px solid transparent; transition: all var(--transition-fast); }
.btn-secondary { background: transparent; color: var(--text-secondary); border-color: var(--border-default); }
.btn-secondary:hover { background: var(--bg-hover); color: var(--text-primary); border-color: var(--border-hover); }
.btn-primary { background: var(--color-primary); color: #fff; }
.btn-primary:hover { background: var(--color-primary-hover); }
</style>
