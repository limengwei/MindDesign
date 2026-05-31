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
.dialog-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: var(--z-dialog); }
.dialog { background: var(--bg-surface); border-radius: var(--radius-xl); width: 700px; max-width: 95vw; max-height: 85vh; display: flex; flex-direction: column; box-shadow: var(--shadow-lg); border: 1px solid var(--border-default); }
.dialog-header { display: flex; align-items: center; justify-content: space-between; padding: 20px 24px 16px; }
.dialog-header h2 { font-size: var(--font-xl); font-weight: 600; color: var(--text-primary); }
.close-btn { width: 32px; height: 32px; border: none; background: var(--border-default); border-radius: 50%; font-size: 18px; cursor: pointer; display: flex; align-items: center; justify-content: center; color: var(--text-secondary); }
.close-btn:hover { background: #3a3a5c; color: var(--text-primary); }
.preview-iframe { width: 100%; height: 400px; border: 1px solid var(--border-default); border-radius: var(--radius-md); background: #fff; }
.code-block { background: var(--bg-canvas); color: #d4d4d4; padding: 16px; border-radius: var(--radius-md); font-size: var(--font-sm); line-height: 1.5; overflow: auto; max-height: 400px; white-space: pre-wrap; word-break: break-all; border: 1px solid var(--border-default); }
.empty-msg { color: var(--text-muted); text-align: center; padding: 40px 0; }
</style>
