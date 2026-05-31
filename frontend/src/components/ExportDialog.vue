<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{
  html: string | null
  projectName: string
}>()

const emit = defineEmits(['close'])

const activeTab = ref<'preview' | 'code'>('preview')
const copying = ref(false)

async function handleCopy() {
  copying.value = true
  try {
    await navigator.clipboard.writeText(props.html || '')
  } catch {
    const ta = document.createElement('textarea')
    ta.value = props.html || ''
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    document.body.removeChild(ta)
  }
  setTimeout(() => { copying.value = false }, 1500)
}

function handleDownload() {
  if (!props.html) return
  const blob = new Blob([props.html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${props.projectName || 'design'}.html`
  a.click()
  URL.revokeObjectURL(url)
}
</script>

<template>
  <div class="dialog-overlay" @click.self="$emit('close')">
    <div class="dialog">
      <div class="dialog-header">
        <h2>导出 HTML</h2>
        <button class="close-btn" @click="$emit('close')">×</button>
      </div>

      <div class="tabs">
        <button :class="['tab', { active: activeTab === 'preview' }]" @click="activeTab = 'preview'">预览</button>
        <button :class="['tab', { active: activeTab === 'code' }]" @click="activeTab = 'code'">代码</button>
      </div>

      <div class="dialog-body">
        <div v-if="activeTab === 'preview'" class="preview-area">
          <iframe v-if="html" :srcdoc="html" class="preview-iframe" sandbox="allow-same-origin"></iframe>
          <p v-else class="empty-msg">暂无 HTML 内容</p>
        </div>
        <div v-else class="code-area">
          <pre class="code-block">{{ html || '暂无 HTML 内容' }}</pre>
        </div>
      </div>

      <div class="dialog-actions">
        <button class="btn btn-secondary" @click="handleCopy">{{ copying ? '已复制 ✓' : '复制代码' }}</button>
        <button class="btn btn-primary" @click="handleDownload" :disabled="!html">下载 .html</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dialog-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.dialog { background: #16213e; border-radius: 16px; width: 700px; max-width: 95vw; max-height: 85vh; display: flex; flex-direction: column; box-shadow: 0 20px 60px rgba(0,0,0,0.3); border: 1px solid #2a2a4a; }
.dialog-header { display: flex; align-items: center; justify-content: space-between; padding: 20px 24px 16px; }
.dialog-header h2 { font-size: 18px; font-weight: 600; color: #e5e7eb; }
.close-btn { width: 32px; height: 32px; border: none; background: #2a2a4a; border-radius: 50%; font-size: 18px; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #9ca3af; }
.close-btn:hover { background: #3a3a5c; color: #e5e7eb; }
.tabs { display: flex; padding: 0 24px; gap: 4px; }
.tab { padding: 8px 16px; border: none; background: none; font-size: 13px; cursor: pointer; border-bottom: 2px solid transparent; color: #6b7280; }
.tab.active { color: #818cf8; border-bottom-color: #818cf8; }
.dialog-body { flex: 1; overflow: auto; padding: 16px 24px; min-height: 300px; }
.preview-iframe { width: 100%; height: 400px; border: 1px solid #2a2a4a; border-radius: 8px; background: #fff; }
.code-block { background: #0f0f23; color: #d4d4d4; padding: 16px; border-radius: 8px; font-size: 12px; line-height: 1.5; overflow: auto; max-height: 400px; white-space: pre-wrap; word-break: break-all; border: 1px solid #2a2a4a; }
.empty-msg { color: #6b7280; text-align: center; padding: 40px 0; }
.dialog-actions { display: flex; justify-content: flex-end; gap: 8px; padding: 16px 24px; border-top: 1px solid #2a2a4a; }
.btn { padding: 8px 16px; border-radius: 8px; font-size: 13px; font-weight: 500; cursor: pointer; border: none; transition: all 0.2s; }
.btn-secondary { background: #2a2a4a; color: #9ca3af; }
.btn-secondary:hover { background: #3a3a5c; }
.btn-primary { background: #4f46e5; color: #fff; }
.btn-primary:hover { background: #6366f1; }
.btn-primary:disabled { background: #334155; cursor: not-allowed; }
</style>
