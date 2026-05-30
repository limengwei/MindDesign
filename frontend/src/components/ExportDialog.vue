<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Leafer } from 'leafer-ui'
import '@leafer-in/export'
import { generateHTML } from '../export/toHTML'
import { buildTree } from '../canvas/renderer'
import type { ElementTree } from '../types/element'

const props = defineProps<{
  tree: ElementTree | null
  projectName: string
}>()

const emit = defineEmits(['close'])

const htmlCode = ref('')
const activeTab = ref<'preview' | 'code'>('preview')
const copying = ref(false)
const exporting = ref(false)

onMounted(async () => {
  if (props.tree) {
    htmlCode.value = await generateHTML(props.tree, props.projectName)
  }
})

async function handleCopy() {
  copying.value = true
  try {
    await navigator.clipboard.writeText(htmlCode.value)
  } catch {
    const ta = document.createElement('textarea')
    ta.value = htmlCode.value
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    document.body.removeChild(ta)
  }
  setTimeout(() => { copying.value = false }, 1500)
}

function handleDownloadHTML() {
  const blob = new Blob([htmlCode.value], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${props.projectName || 'design'}.html`
  a.click()
  URL.revokeObjectURL(url)
}

async function handleDownloadPNG() {
  if (!props.tree) return
  exporting.value = true
  try {
    const container = document.createElement('div')
    container.style.width = '1px'
    container.style.height = '1px'
    container.style.position = 'fixed'
    container.style.left = '-9999px'
    document.body.appendChild(container)

    const leafer = new Leafer({ view: container })
    const root = await buildTree(props.tree)
    leafer.add(root)

    await new Promise(r => setTimeout(r, 200))

    const result = await (root as any).export('png', { pixelRatio: 2 })
    leafer.destroy()
    document.body.removeChild(container)

    if (result?.data) {
      const a = document.createElement('a')
      a.href = result.data
      a.download = `${props.projectName || 'design'}.png`
      a.click()
    }
  } catch (e) {
    console.error('PNG export failed:', e)
    alert('导出 PNG 失败，请尝试导出 HTML')
  } finally {
    exporting.value = false
  }
}
</script>

<template>
  <div class="dialog-overlay" @click.self="$emit('close')">
    <div class="dialog">
      <div class="dialog-header">
        <h2>导出设计稿</h2>
        <button class="close-btn" @click="$emit('close')">×</button>
      </div>

      <div class="tabs">
        <button :class="['tab', { active: activeTab === 'preview' }]" @click="activeTab = 'preview'">HTML 预览</button>
        <button :class="['tab', { active: activeTab === 'code' }]" @click="activeTab = 'code'">HTML 代码</button>
      </div>

      <div class="dialog-body">
        <div v-if="activeTab === 'preview'" class="preview-area">
          <iframe
            v-if="htmlCode"
            :srcdoc="htmlCode"
            class="preview-iframe"
            sandbox="allow-same-origin"
          ></iframe>
        </div>
        <div v-else class="code-area">
          <pre class="code-block"><code>{{ htmlCode }}</code></pre>
        </div>
      </div>

      <div class="dialog-actions">
        <button class="btn btn-secondary" @click="$emit('close')">关闭</button>
        <button class="btn btn-secondary" @click="handleCopy">
          {{ copying ? '已复制!' : '复制代码' }}
        </button>
        <button class="btn btn-secondary" @click="handleDownloadPNG" :disabled="exporting || !tree">
          {{ exporting ? '导出中...' : '下载 PNG' }}
        </button>
        <button class="btn btn-primary" @click="handleDownloadHTML">下载 HTML</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dialog-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.dialog {
  background: #1e1e36;
  border-radius: 16px;
  width: 720px;
  max-width: 90vw;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
  border: 1px solid #2a2a4a;
}

.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  border-bottom: 1px solid #2a2a4a;
}

.dialog-header h2 {
  font-size: 16px;
  font-weight: 600;
  margin: 0;
  color: #e5e7eb;
}

.close-btn {
  width: 28px;
  height: 28px;
  border: none;
  background: #2a2a4a;
  border-radius: 50%;
  font-size: 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #9ca3af;
}

.close-btn:hover {
  background: #3a3a5c;
  color: #e5e7eb;
}

.tabs {
  display: flex;
  padding: 8px 24px 0;
  gap: 4px;
}

.tab {
  padding: 8px 16px;
  border: none;
  background: none;
  font-size: 13px;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  color: #6b7280;
}

.tab.active {
  color: #818cf8;
  border-bottom-color: #818cf8;
}

.dialog-body {
  flex: 1;
  overflow: auto;
  padding: 16px 24px;
  min-height: 300px;
}

.preview-area {
  height: 100%;
}

.preview-iframe {
  width: 100%;
  height: 400px;
  border: 1px solid #2a2a4a;
  border-radius: 8px;
  background: #0f0f23;
}

.code-area {
  height: 100%;
}

.code-block {
  background: #0f0f23;
  color: #d4d4d4;
  padding: 16px;
  border-radius: 8px;
  font-size: 12px;
  line-height: 1.5;
  overflow: auto;
  max-height: 400px;
  white-space: pre-wrap;
  word-break: break-all;
  border: 1px solid #2a2a4a;
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 16px 24px;
  border-top: 1px solid #2a2a4a;
}

.btn {
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  border: none;
  transition: all 0.2s;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondary {
  background: #2a2a4a;
  color: #9ca3af;
}

.btn-secondary:hover:not(:disabled) {
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
