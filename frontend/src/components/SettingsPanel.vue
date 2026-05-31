<script setup lang="ts">
import { useLLMConfigStore } from '../stores/llmConfigStore'

const configStore = useLLMConfigStore()

function handleSave() {
  configStore.saveToStorage()
}

const emit = defineEmits<{
  close: []
}>()
</script>

<template>
  <div class="modal-overlay" @click.self="emit('close')">
    <div class="settings-panel">
      <div class="panel-header">
        <h3>API 设置</h3>
        <button class="close-btn" @click="emit('close')">&times;</button>
      </div>

      <div class="panel-body">
        <div class="form-group">
          <label>服务商</label>
          <select v-model="configStore.provider" @change="configStore.setProvider(configStore.provider)">
            <option value="openai">OpenAI</option>
            <option value="deepseek">DeepSeek (国内可用)</option>
            <option value="glm">智谱 GLM (国内可用)</option>
            <option value="custom">自定义 (OpenAI 兼容)</option>
          </select>
        </div>

        <div class="form-group">
          <label>API Key</label>
          <input
            type="password"
            v-model="configStore.apiKey"
            placeholder="sk-..."
            autocomplete="off"
          />
        </div>

        <div class="form-group">
          <label>Base URL</label>
          <input
            type="text"
            v-model="configStore.baseUrl"
            placeholder="https://api.openai.com/v1"
          />
          <span class="hint">支持任何 OpenAI 兼容的 API 地址</span>
        </div>

        <div class="form-group">
          <label>模型</label>
          <input
            type="text"
            v-model="configStore.model"
            placeholder="gpt-4o"
          />
        </div>

        <div class="status-bar" :class="{ configured: configStore.isConfigured }">
          <span class="status-dot"></span>
          {{ configStore.isConfigured ? '已配置 - 将使用真实 API' : '未配置 - 将使用模拟数据' }}
        </div>
      </div>

      <div class="panel-footer">
        <button class="btn btn-secondary" @click="emit('close')">取消</button>
        <button class="btn btn-primary" @click="handleSave(); emit('close')">保存</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.6); display: flex; align-items: center; justify-content: center; z-index: var(--z-dialog); }
.settings-panel { width: 440px; background: var(--bg-elevated); border-radius: var(--radius-lg); box-shadow: var(--shadow-lg); overflow: hidden; border: 1px solid var(--border-default); }
.panel-header { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; border-bottom: 1px solid var(--border-default); }
.panel-header h3 { font-size: var(--font-lg); font-weight: 600; color: var(--text-primary); }
.panel-body { padding: 20px; display: flex; flex-direction: column; gap: 16px; }
.status-bar { display: flex; align-items: center; gap: 8px; padding: 10px 12px; border-radius: var(--radius-md); font-size: var(--font-sm); background: #422006; color: #fbbf24; }
.status-bar.configured { background: #064e3b; color: #34d399; }
.status-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--color-warning); flex-shrink: 0; }
.status-bar.configured .status-dot { background: #10b981; }
.panel-footer { display: flex; justify-content: flex-end; gap: 8px; padding: 12px 20px; border-top: 1px solid var(--border-default); }
</style>
