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
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.settings-panel {
  width: 440px;
  background: #1e1e36;
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
  overflow: hidden;
  border: 1px solid #2a2a4a;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid #2a2a4a;
}

.panel-header h3 {
  font-size: 15px;
  font-weight: 600;
  color: #e5e7eb;
}

.close-btn {
  width: 28px;
  height: 28px;
  border: none;
  background: none;
  font-size: 18px;
  color: #6b7280;
  cursor: pointer;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  background: #2a2a4a;
  color: #e5e7eb;
}

.panel-body {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-group label {
  font-size: 13px;
  font-weight: 500;
  color: #9ca3af;
}

.form-group input,
.form-group select {
  padding: 8px 12px;
  border: 1px solid #2a2a4a;
  border-radius: 8px;
  font-size: 13px;
  font-family: inherit;
  outline: none;
  transition: border-color 0.2s;
  background: #16213e;
  color: #e5e7eb;
}

.form-group input::placeholder {
  color: #4b5563;
}

.form-group select option {
  background: #16213e;
  color: #e5e7eb;
}

.form-group input:focus,
.form-group select:focus {
  border-color: #818cf8;
}

.hint {
  font-size: 11px;
  color: #6b7280;
}

.status-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 8px;
  font-size: 12px;
  background: #422006;
  color: #fbbf24;
}

.status-bar.configured {
  background: #064e3b;
  color: #34d399;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #f59e0b;
  flex-shrink: 0;
}

.status-bar.configured .status-dot {
  background: #10b981;
}

.panel-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 20px;
  border-top: 1px solid #2a2a4a;
}

.btn {
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  border: none;
  transition: all 0.15s;
}

.btn-secondary {
  background: #2a2a4a;
  color: #9ca3af;
}

.btn-secondary:hover {
  background: #3a3a5c;
}

.btn-primary {
  background: #4f46e5;
  color: #fff;
}

.btn-primary:hover {
  background: #6366f1;
}
</style>
