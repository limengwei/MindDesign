<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useLLMConfigStore } from '../stores/llmConfigStore'
import { startMCP, stopMCP, isMCPRunning, getMCPPort } from '../services/projectBridge'

const configStore = useLLMConfigStore()

function handleSave() {
  configStore.saveToStorage()
}

const emit = defineEmits<{
  close: []
}>()

const mcpRunning = ref(false)
const mcpPort = ref(9527)

onMounted(async () => {
  mcpRunning.value = await isMCPRunning()
  if (mcpRunning.value) {
    mcpPort.value = await getMCPPort()
  }
})

async function toggleMCP() {
  if (mcpRunning.value) {
    await stopMCP()
    mcpRunning.value = false
  } else {
    try {
      await startMCP(mcpPort.value)
      mcpRunning.value = true
    } catch (e: any) {
      alert(e?.message || e || '启动 MCP 服务失败')
    }
  }
}
</script>

<template>
  <div class="modal-overlay" @click.self="emit('close')">
    <div class="settings-panel">
      <div class="panel-header">
        <h3>设置</h3>
        <button class="close-btn" @click="emit('close')">&times;</button>
      </div>

      <div class="panel-body">
        <h4 class="section-title">API 配置</h4>
        <div class="form-group">
          <label>协议</label>
          <select v-model="configStore.protocol">
            <option value="openai">OpenAI 兼容</option>
            <option value="claude">Claude (Anthropic)</option>
          </select>
          <span class="hint">选择 API 使用的通信协议</span>
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
          <span class="hint">OpenAI 协议示例：https://api.openai.com/v1、https://api.deepseek.com/v1</span>
        </div>

        <div class="form-group">
          <label>模型</label>
          <input
            type="text"
            v-model="configStore.model"
            placeholder="gpt-4o"
          />
          <span class="hint">如 gpt-4o、deepseek-chat、glm-4-plus、claude-sonnet-4-20250514 等</span>
        </div>

        <div class="status-bar" :class="{ configured: configStore.isConfigured }">
          <span class="status-dot"></span>
          {{ configStore.isConfigured ? '已配置' : '未配置' }}
        </div>

        <div class="divider"></div>

        <h4 class="section-title">MCP 服务</h4>
        <p class="section-desc">启动后，开发工具（Trae、Cursor 等）可通过 MCP 协议读取设计稿数据。</p>

        <div class="form-group">
          <label>端口</label>
          <input
            type="number"
            v-model.number="mcpPort"
            :disabled="mcpRunning"
            placeholder="9527"
            min="1024"
            max="65535"
          />
        </div>

        <div class="status-bar" :class="{ configured: mcpRunning }">
          <span class="status-dot"></span>
          <span v-if="mcpRunning">运行中 — http://localhost:{{ mcpPort }}/mcp</span>
          <span v-else>未启动</span>
        </div>

        <button class="btn" :class="mcpRunning ? 'btn-danger' : 'btn-primary'" @click="toggleMCP" style="width: 100%; margin-top: 8px;">
          {{ mcpRunning ? '停止 MCP 服务' : '启动 MCP 服务' }}
        </button>

        <div v-if="mcpRunning" class="mcp-config-hint">
          <span class="hint">在 Trae 的 MCP 配置中添加：</span>
          <pre class="code-block">{
  "mcpServers": {
    "minddesign": {
      "url": "http://localhost:{{ mcpPort }}/mcp"
    }
  }
}</pre>
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
.settings-panel { width: 640px; max-height: 80vh; display: flex; flex-direction: column; background: var(--bg-elevated); border-radius: var(--radius-lg); box-shadow: var(--shadow-lg); overflow: hidden; border: 1px solid var(--border-default); }
.panel-header { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; border-bottom: 1px solid var(--border-default); }
.panel-header h3 { font-size: var(--font-lg); font-weight: 600; color: var(--text-primary); margin: 0; }
.close-btn { width: 28px; height: 28px; border: none; background: none; color: var(--text-muted); font-size: 18px; cursor: pointer; border-radius: var(--radius-sm); display: flex; align-items: center; justify-content: center; transition: all var(--transition-fast); }
.close-btn:hover { background: var(--bg-hover); color: var(--text-primary); }
.panel-body { padding: 20px; display: flex; flex-direction: column; gap: 16px; overflow-y: auto; flex: 1; min-height: 0; }
.form-group { display: flex; flex-direction: column; gap: 6px; }
.form-group label { font-size: var(--font-sm); font-weight: 500; color: var(--text-secondary); }
.form-group input,
.form-group select { width: 100%; padding: 8px 12px; border: 1px solid var(--border-default); border-radius: var(--radius-md); font-size: var(--font-md); font-family: var(--font-family); outline: none; transition: border-color var(--transition-fast); background: var(--bg-surface); color: var(--text-primary); }
.form-group input::placeholder { color: var(--text-placeholder); }
.form-group input:focus,
.form-group select:focus { border-color: var(--border-hover); }
.form-group select { cursor: pointer; appearance: none; background-image: url("data:image/svg+xml,%3Csvg width='12' height='12' viewBox='0 0 24 24' fill='%239ca3af' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M7 10l5 5 5-5z'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 10px center; padding-right: 28px; }
.form-group select option { background: var(--bg-elevated); color: var(--text-primary); }
.hint { font-size: var(--font-xs); color: var(--text-muted); }
.status-bar { display: flex; align-items: center; gap: 8px; padding: 10px 12px; border-radius: var(--radius-md); font-size: var(--font-sm); background: #422006; color: #fbbf24; }
.status-bar.configured { background: #064e3b; color: #34d399; }
.status-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--color-warning); flex-shrink: 0; }
.status-bar.configured .status-dot { background: #10b981; }
.panel-footer { display: flex; justify-content: flex-end; gap: 8px; padding: 12px 20px; border-top: 1px solid var(--border-default); }
.btn { padding: 7px 16px; border-radius: var(--radius-md); font-size: var(--font-md); font-family: var(--font-family); font-weight: 500; cursor: pointer; border: 1px solid transparent; transition: all var(--transition-fast); }
.btn-secondary { background: transparent; color: var(--text-secondary); border-color: var(--border-default); }
.btn-secondary:hover { background: var(--bg-hover); color: var(--text-primary); border-color: var(--border-hover); }
.btn-primary { background: var(--color-primary); color: #fff; }
.btn-primary:hover { background: var(--color-primary-hover); }
.btn-danger { background: #dc2626; color: #fff; }
.btn-danger:hover { background: #b91c1c; }
.section-title { font-size: var(--font-sm); font-weight: 600; color: var(--text-primary); margin: 0; }
.section-desc { font-size: var(--font-xs); color: var(--text-muted); margin: 0; }
.divider { height: 1px; background: var(--border-default); margin: 4px 0; }
.mcp-config-hint { display: flex; flex-direction: column; gap: 6px; }
.code-block { font-size: var(--font-xs); background: var(--bg-surface); border: 1px solid var(--border-default); border-radius: var(--radius-md); padding: 10px 12px; color: var(--text-secondary); margin: 0; white-space: pre; overflow-x: auto; font-family: 'Consolas', 'Monaco', monospace; line-height: 1.5; }
.form-group input:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
