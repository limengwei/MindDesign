<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useLLMConfigStore } from '../stores/llmConfigStore'
import { useCanvasStore, type ImageDataSource } from '../stores/canvasStore'
import { startMCP, stopMCP, isMCPRunning, getMCPPort, checkUpdate, downloadUpdate, installUpdate, type UpdateResult } from '../services/projectBridge'

const configStore = useLLMConfigStore()
const canvasStore = useCanvasStore()

function handleSave() {
  configStore.saveToStorage()
  // imageDataSource 已自动持久化（在 setImageDataSource 中）
}

const dataSourceOptions: Array<{ value: ImageDataSource; label: string; desc: string }> = [
  { value: 'placehold', label: 'placehold.co（默认，离线可用）', desc: '适合本地与快速预览' },
  { value: 'unsplash', label: 'Unsplash 关键词', desc: '在线真实图（需联网）' },
  { value: 'local', label: '本地占位资源', desc: '项目 assets 目录' },
]

// Phase 5 · Task 19：主题选项
const themeOptions: Array<{ id: string; value: boolean; label: string; desc: string }> = [
  { id: 'dark', value: true, label: '🌙 暗色', desc: '深色背景，护眼' },
  { id: 'light', value: false, label: '☀ 亮色', desc: '浅色背景，对比度高' },
]

const modKeyHint = computed(() => {
  if (typeof navigator === 'undefined') return 'Ctrl'
  return /Mac|iPhone|iPad/i.test(navigator.platform || navigator.userAgent) ? '⌘' : 'Ctrl'
})

const emit = defineEmits<{
  close: []
}>()

type TabType = 'api' | 'data' | 'appearance' | 'mcp' | 'about'
const activeTab = ref<TabType>('api')

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

// 更新相关
const updateInfo = ref<UpdateResult | null>(null)
const checkingUpdate = ref(false)
const downloading = ref(false)
const installing = ref(false)
const updateError = ref('')

onMounted(async () => {
  mcpRunning.value = await isMCPRunning()
  if (mcpRunning.value) {
    mcpPort.value = await getMCPPort()
  }
})

async function handleCheckUpdate() {
  checkingUpdate.value = true
  updateError.value = ''
  try {
    const result = await checkUpdate()
    if (result) {
      updateInfo.value = result
      if (!result.hasUpdate) {
        updateInfo.value = { ...result, releaseNotes: '当前已是最新版本' }
      }
    } else {
      updateError.value = '检查更新失败，请检查网络连接'
    }
  } catch (e: any) {
    updateError.value = e?.message || e || '检查更新失败'
  } finally {
    checkingUpdate.value = false
  }
}

async function handleDownloadAndInstall() {
  if (!updateInfo.value?.downloadURL) return
  downloading.value = true
  updateError.value = ''
  try {
    const installerPath = await downloadUpdate(updateInfo.value.downloadURL)
    installing.value = true
    await installUpdate(installerPath)
  } catch (e: any) {
    updateError.value = e?.message || e || '更新失败'
    downloading.value = false
    installing.value = false
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

      <div class="tab-bar">
        <button
          v-for="tab in ([
            { key: 'api', label: 'API 配置' },
            { key: 'data', label: '数据源' },
            { key: 'appearance', label: '外观' },
            { key: 'mcp', label: 'MCP 服务' },
            { key: 'about', label: '关于' },
          ] as { key: TabType; label: string }[])"
          :key="tab.key"
          class="tab-btn"
          :class="{ active: activeTab === tab.key }"
          @click="activeTab = tab.key"
        >{{ tab.label }}</button>
      </div>

      <div class="panel-body">
        <!-- API 配置 Tab -->
        <div v-show="activeTab === 'api'" class="tab-content">
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
        </div>

        <!-- 数据源 Tab -->
        <div v-show="activeTab === 'data'" class="tab-content">
        <p class="section-desc">选择设计稿中占位图片的数据源。修改后将作用于后续生成与导出。</p>
        <div class="form-group">
          <label>图片数据源</label>
          <div class="radio-pill-group">
            <label
              v-for="opt in dataSourceOptions"
              :key="opt.value"
              :class="['data-source-pill', { active: canvasStore.imageDataSource === opt.value }]"
            >
              <input
                type="radio"
                :value="opt.value"
                :checked="canvasStore.imageDataSource === opt.value"
                @change="canvasStore.setImageDataSource(opt.value)"
              />
              <span class="ds-label">{{ opt.label }}</span>
              <span class="ds-desc">{{ opt.desc }}</span>
            </label>
          </div>
        </div>
        </div>

        <!-- 外观 Tab (Phase 5 · Task 19) -->
        <div v-show="activeTab === 'appearance'" class="tab-content">
          <p class="section-desc">外观设置仅影响 UI 主题，不影响导出 HTML。</p>
          <div class="form-group">
            <label>主题</label>
            <div class="radio-pill-group">
              <label
                v-for="opt in themeOptions"
                :key="opt.id"
                :class="['data-source-pill', { active: canvasStore.isDarkMode === opt.value }]"
              >
                <input
                  type="radio"
                  :value="opt.value"
                  :checked="canvasStore.isDarkMode === opt.value"
                  @change="canvasStore.setDarkMode(opt.value)"
                />
                <span class="ds-label">{{ opt.label }}</span>
                <span class="ds-desc">{{ opt.desc }}</span>
              </label>
            </div>
            <p class="hint" style="margin-top: 12px;">快捷键：<kbd>{{ modKeyHint }}+/</kbd> 切换主题</p>
          </div>
        </div>

        <!-- MCP 服务 Tab -->
        <div v-show="activeTab === 'mcp'" class="tab-content">
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

        <!-- 关于 Tab -->
        <div v-show="activeTab === 'about'" class="tab-content">

        <div v-if="!updateInfo" class="update-section">
          <button class="btn btn-secondary" @click="handleCheckUpdate" :disabled="checkingUpdate" style="width: 100%;">
            {{ checkingUpdate ? '检查中...' : '检查更新' }}
          </button>
        </div>

        <div v-else class="update-section">
          <div class="update-info">
            <span class="update-version">当前版本：{{ updateInfo.currentVersion }}</span>
            <span v-if="updateInfo.hasUpdate" class="update-new">最新版本：{{ updateInfo.latestVersion }}</span>
          </div>
          <p v-if="updateInfo.releaseNotes" class="update-notes">{{ updateInfo.releaseNotes }}</p>
          <div v-if="updateError" class="update-error">{{ updateError }}</div>
          <div v-if="updateInfo.hasUpdate" class="update-actions">
            <button
              class="btn btn-primary"
              @click="handleDownloadAndInstall"
              :disabled="downloading || installing"
              style="width: 100%;"
            >
              {{ downloading ? '下载中...' : (installing ? '安装中...' : '立即更新') }}
            </button>
          </div>
        </div>
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
.tab-bar { display: flex; gap: 0; padding: 0 20px; border-bottom: 1px solid var(--border-default); background: var(--bg-surface); }
.tab-btn { padding: 10px 20px; font-size: var(--font-sm); font-weight: 500; color: var(--text-muted); background: none; border: none; cursor: pointer; position: relative; transition: color var(--transition-fast); font-family: var(--font-family); }
.tab-btn:hover { color: var(--text-secondary); }
.tab-btn.active { color: var(--color-primary-light); }
.tab-btn.active::after { content: ''; position: absolute; bottom: -1px; left: 20px; right: 20px; height: 2px; background: var(--color-primary-light); border-radius: 1px; }
.close-btn { width: 28px; height: 28px; border: none; background: none; color: var(--text-muted); font-size: 18px; cursor: pointer; border-radius: var(--radius-sm); display: flex; align-items: center; justify-content: center; transition: all var(--transition-fast); }
.close-btn:hover { background: var(--bg-hover); color: var(--text-primary); }
.panel-body { padding: 20px; display: flex; flex-direction: column; gap: 16px; overflow-y: auto; flex: 1; min-height: 0; }
.tab-content { display: flex; flex-direction: column; gap: 16px; }
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
.radio-pill-group { display: flex; flex-direction: column; gap: 6px; }
.data-source-pill { display: flex; flex-direction: column; gap: 2px; padding: 8px 12px; border-radius: var(--radius-md); border: 1px solid var(--border-default); cursor: pointer; transition: all var(--transition-fast); }
.data-source-pill:hover { border-color: var(--border-hover); background: var(--bg-hover); }
.data-source-pill.active { border-color: var(--color-primary); background: rgba(79, 70, 229, 0.1); }
.data-source-pill input { display: none; }
.ds-label { font-size: var(--font-sm); font-weight: 500; color: var(--text-primary); }
.ds-desc { font-size: var(--font-xs); color: var(--text-muted); }
.update-section { display: flex; flex-direction: column; gap: 10px; }
.update-info { display: flex; flex-direction: column; gap: 4px; font-size: var(--font-sm); color: var(--text-secondary); }
.update-new { color: var(--color-primary-light); font-weight: 600; }
.update-notes { font-size: var(--font-xs); color: var(--text-muted); margin: 0; line-height: 1.6; white-space: pre-wrap; max-height: 120px; overflow-y: auto; padding: 8px; background: var(--bg-surface); border-radius: var(--radius-sm); border: 1px solid var(--border-default); }
.update-error { font-size: var(--font-sm); color: #ef4444; background: rgba(239,68,68,0.1); padding: 8px 12px; border-radius: var(--radius-md); }
.update-actions { display: flex; gap: 8px; }
</style>
