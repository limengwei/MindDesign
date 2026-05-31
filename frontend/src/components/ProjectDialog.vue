<script setup lang="ts">
import { ref } from 'vue'
import { type DesignSpecId } from '../prompts/designSpecs'
import DesignSpecSelector from './DesignSpecSelector.vue'

const emit = defineEmits(['create', 'close'])

const projectName = ref('')
const pageType = ref('app')
const description = ref('')
const designSpecId = ref<DesignSpecId>('none')

const pageTypes = [
  { value: 'app', label: '📱 移动 App', width: '375px' },
  { value: 'web', label: '🌐 网页', width: '1440px' },
  { value: 'desktop', label: '🖥 桌面应用', width: '1280px' },
]

function handleCreate() {
  emit('create', {
    name: projectName.value || '未命名项目',
    pageType: pageType.value,
    designSpecId: designSpecId.value,
    description: description.value,
  })
}
</script>

<template>
  <div class="dialog-overlay" @click.self="$emit('close')">
    <div class="dialog dialog-create">
      <h2 class="dialog-title">新建项目</h2>

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
        <button class="btn btn-primary" @click="handleCreate">开始设计</button>
      </div>
    </div>
  </div>
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
</style>
