<script setup lang="ts">
import { ref } from 'vue'

const emit = defineEmits(['create', 'close'])

const projectName = ref('')
const pageType = ref('app')
const colorScheme = ref('auto')
const description = ref('')

const pageTypes = [
  { value: 'app', label: '📱 移动 App', width: '375px' },
  { value: 'web', label: '🌐 网页', width: '1440px' },
  { value: 'desktop', label: '🖥 桌面应用', width: '1280px' },
]

const colorSchemes = [
  { value: 'auto', label: '🎨 自动' },
  { value: 'light', label: '☀️ 浅色' },
  { value: 'dark', label: '🌙 深色' },
  { value: 'brand', label: '🏷️ 品牌' },
]

function handleCreate() {
  emit('create', {
    name: projectName.value || '未命名项目',
    pageType: pageType.value,
    colorScheme: colorScheme.value,
    description: description.value,
  })
}
</script>

<template>
  <div class="dialog-overlay" @click.self="$emit('close')">
    <div class="dialog">
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
        <label>配色方案</label>
        <div class="option-grid">
          <button
            v-for="cs in colorSchemes"
            :key="cs.value"
            :class="['option-card small', { active: colorScheme === cs.value }]"
            @click="colorScheme = cs.value"
          >
            {{ cs.label }}
          </button>
        </div>
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
.dialog-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.dialog {
  background: #fff;
  border-radius: 16px;
  padding: 32px;
  width: 480px;
  max-width: 90vw;
  max-height: 85vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
}

.dialog-title {
  font-size: 20px;
  font-weight: 600;
  margin: 0 0 24px;
  color: #1a1a1a;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: #666;
  margin-bottom: 8px;
}

.input {
  width: 100%;
  padding: 10px 14px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s;
  box-sizing: border-box;
}

.input:focus {
  border-color: #4f46e5;
}

.textarea {
  resize: vertical;
  font-family: inherit;
}

.option-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.option-card {
  flex: 1;
  padding: 12px;
  border: 2px solid #e5e5e5;
  border-radius: 10px;
  background: #fff;
  cursor: pointer;
  text-align: center;
  transition: all 0.2s;
}

.option-card:hover {
  border-color: #c0c0c0;
}

.option-card.active {
  border-color: #4f46e5;
  background: #f0f0ff;
}

.option-card.small {
  padding: 8px 12px;
}

.option-label {
  font-size: 14px;
  font-weight: 500;
}

.option-hint {
  font-size: 12px;
  color: #999;
  margin-top: 4px;
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 24px;
}

.btn {
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  border: none;
  transition: all 0.2s;
}

.btn-secondary {
  background: #f0f0f0;
  color: #666;
}

.btn-secondary:hover {
  background: #e0e0e0;
}

.btn-primary {
  background: #4f46e5;
  color: #fff;
}

.btn-primary:hover {
  background: #4338ca;
}
</style>
