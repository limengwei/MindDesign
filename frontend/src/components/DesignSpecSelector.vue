<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  BUILT_IN_DESIGN_SPECS,
  DESIGN_SPEC_LABELS,
  type DesignSpecId,
  type DesignSpec,
} from '../prompts/designSpecs'

const props = defineProps<{
  modelValue: DesignSpecId
}>()

const emit = defineEmits<{
  'update:modelValue': [value: DesignSpecId]
}>()

const showModal = ref(false)

const selectedSpec = computed<DesignSpec | null>(() => {
  if (props.modelValue === 'none' || props.modelValue === 'custom') return null
  return BUILT_IN_DESIGN_SPECS.find(s => s.id === props.modelValue) || null
})

const triggerLabel = computed(() => {
  return DESIGN_SPEC_LABELS[props.modelValue] || '选择设计规范'
})

function openModal() {
  showModal.value = true
}

function select(id: DesignSpecId) {
  emit('update:modelValue', id)
  showModal.value = false
}

function close() {
  showModal.value = false
}

function openSource(e: MouseEvent, url: string) {
  e.stopPropagation()
  window.open(url, '_blank')
}
</script>

<template>
  <div class="spec-selector">
    <div class="spec-trigger" @click="openModal">
      <span class="spec-trigger-text">{{ triggerLabel }}</span>
      <span class="spec-trigger-arrow">▸</span>
    </div>

    <div v-if="selectedSpec" class="spec-preview">
      <div class="spec-colors">
        <span class="color-dot" :style="{ backgroundColor: selectedSpec.colors.primary }" title="主色"></span>
        <span class="color-dot" :style="{ backgroundColor: selectedSpec.colors.background }" title="背景"></span>
        <span class="color-dot" :style="{ backgroundColor: selectedSpec.colors.surface }" title="表面"></span>
        <span class="color-dot" :style="{ backgroundColor: selectedSpec.colors.text }" title="文字"></span>
        <span class="color-dot" :style="{ backgroundColor: selectedSpec.colors.accent }" title="强调"></span>
      </div>
      <a :href="selectedSpec.source" target="_blank" class="spec-link">查看完整设计规范 →</a>
    </div>

    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showModal" class="modal-overlay" @click.self="close">
          <div class="modal">
            <div class="modal-header">
              <h3 class="modal-title">选择设计规范</h3>
              <button class="modal-close" @click="close">
                <img src="/icons/close.svg" alt="关闭" />
              </button>
            </div>

            <div class="modal-body">
              <div
                class="spec-card none-card"
                :class="{ active: modelValue === 'none' }"
                @click="select('none')"
              >
                <div class="spec-card-body">
                  <div class="spec-card-icon">🎨</div>
                  <div class="spec-card-info">
                    <div class="spec-card-name">不使用设计规范</div>
                    <div class="spec-card-desc">AI 自动选择配色方案</div>
                  </div>
                </div>
                <div v-if="modelValue === 'none'" class="spec-card-check">✓</div>
              </div>

              <div class="grid-section">
                <div class="spec-grid">
                  <div
                    v-for="spec in BUILT_IN_DESIGN_SPECS"
                    :key="spec.id"
                    class="spec-card"
                    :class="{ active: modelValue === spec.id }"
                    @click="select(spec.id as DesignSpecId)"
                  >
                    <button class="spec-card-link" @click="openSource($event, spec.source)" title="查看源站">
                      <img src="/icons/open_in_new.svg" alt="查看源站" />
                    </button>
                    <div class="spec-card-colors">
                      <span class="cdot" :style="{ backgroundColor: spec.colors.primary }"></span>
                      <span class="cdot" :style="{ backgroundColor: spec.colors.background }"></span>
                      <span class="cdot" :style="{ backgroundColor: spec.colors.surface }"></span>
                      <span class="cdot" :style="{ backgroundColor: spec.colors.accent }"></span>
                    </div>
                    <div class="spec-card-name">{{ spec.name }}</div>
                    <div class="spec-card-tag">{{ spec.category }}</div>
                    <div class="spec-card-desc">{{ spec.description }}</div>
                    <div v-if="modelValue === spec.id" class="spec-card-check">✓</div>
                  </div>
                </div>
              </div>

              <div
                class="spec-card custom-card"
                :class="{ active: modelValue === 'custom' }"
                @click="select('custom')"
              >
                <div class="spec-card-body">
                  <div class="spec-card-icon">📋</div>
                  <div class="spec-card-info">
                    <div class="spec-card-name">自定义导入</div>
                    <div class="spec-card-desc">粘贴 DESIGN.md 内容</div>
                  </div>
                </div>
                <div v-if="modelValue === 'custom'" class="spec-card-check">✓</div>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.spec-selector {
  position: relative;
}

.spec-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 10px 14px;
  border: 1px solid #2a2a4a;
  border-radius: 8px;
  background: #16213e;
  cursor: pointer;
  transition: border-color 0.2s;
  user-select: none;
}
.spec-trigger:hover { border-color: #818cf8; }

.spec-trigger-text {
  font-size: 14px;
  color: #e5e7eb;
}

.spec-trigger-arrow {
  font-size: 12px;
  color: #9ca3af;
}

.spec-preview {
  margin-top: 10px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.spec-colors {
  display: flex;
  gap: 6px;
}

.color-dot {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 2px solid #2a2a4a;
  cursor: default;
  flex-shrink: 0;
}

.spec-link {
  color: #818cf8;
  font-size: 12px;
  text-decoration: none;
  white-space: nowrap;
}
.spec-link:hover { text-decoration: underline; }

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}

.modal {
  background: #1e1e36;
  border-radius: 16px;
  width: 700px;
  max-width: 92vw;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.5);
  border: 1px solid #2a2a4a;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px 16px;
  border-bottom: 1px solid #2a2a4a;
  flex-shrink: 0;
}

.modal-title {
  font-size: 18px;
  font-weight: 600;
  color: #e5e7eb;
  margin: 0;
}

.modal-close {
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  border-radius: 6px;
  transition: background 0.15s;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0.5;
}
.modal-close:hover { background: #2a2a4a; opacity: 1; }
.modal-close img { width: 18px; height: 18px; filter: invert(1); }

.modal-body {
  padding: 16px 24px 24px;
  overflow-y: auto;
  flex: 1;
}
.modal-body::-webkit-scrollbar { width: 6px; }
.modal-body::-webkit-scrollbar-track { background: transparent; }
.modal-body::-webkit-scrollbar-thumb { background: #2a2a4a; border-radius: 4px; }

.grid-section {
  margin: 16px 0;
}

.spec-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
  gap: 10px;
}

.spec-card {
  position: relative;
  padding: 14px;
  border: 1px solid #2a2a4a;
  border-radius: 10px;
  background: #16213e;
  cursor: pointer;
  transition: all 0.15s;
}
.spec-card:hover { border-color: #3a3a5c; background: #1a1a3e; }
.spec-card.active { border-color: #818cf8; background: #1e1b4b; }

.spec-card-icon {
  font-size: 20px;
}

.spec-card-colors {
  display: flex;
  gap: 4px;
  margin-bottom: 10px;
}
.spec-card-colors .cdot {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 1px solid rgba(255,255,255,0.08);
}

.spec-card-name {
  font-size: 13px;
  font-weight: 600;
  color: #e5e7eb;
}

.spec-card-tag {
  display: inline-block;
  font-size: 10px;
  font-weight: 500;
  color: #818cf8;
  background: rgba(129,140,248,0.12);
  padding: 2px 6px;
  border-radius: 4px;
  margin-top: 4px;
}

.spec-card-desc {
  font-size: 11px;
  color: #6b7280;
  margin-top: 6px;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.spec-card-info {
  flex: 1;
  min-width: 0;
}

.spec-card-body {
  display: flex;
  align-items: center;
  gap: 12px;
}

.spec-card-link {
  position: absolute;
  top: 8px;
  right: 8px;
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  opacity: 0;
  transition: all 0.15s;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2;
}
.spec-card:hover .spec-card-link { opacity: 0.5; }
.spec-card-link:hover { opacity: 1 !important; background: rgba(129,140,248,0.15); }
.spec-card-link img { width: 16px; height: 16px; filter: invert(1); }

.spec-card-check {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #818cf8;
  color: #fff;
  font-size: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.none-card,
.custom-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
