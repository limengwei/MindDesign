<script setup lang="ts">
import { ref, computed } from 'vue'
import JSZip from 'jszip'
import { showSaveDialog, saveExportFile, saveExportFileBinary } from '../services/projectBridge'

const props = defineProps<{
  html: string | null
  projectName: string
}>()

const emit = defineEmits(['close'])

const copying = ref(false)
const downloadingIcons = ref(false)

const iconNames = computed(() => {
  if (!props.html) return []
  const matches = props.html.match(/class="material-symbols-outlined"[^>]*>([^<]+)/g)
  if (!matches) return []
  const names = new Set<string>()
  for (const m of matches) {
    const name = m.replace(/.*class="material-symbols-outlined"[^>]*>/, '').trim()
    if (name) names.add(name)
  }
  return [...names]
})

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

async function handleDownload() {
  if (!props.html) return
  const fileName = `${props.projectName || 'design'}.html`
  const path = await showSaveDialog('导出 HTML', fileName, [
    { DisplayName: 'HTML 文件', Pattern: '*.html' },
    { DisplayName: '所有文件', Pattern: '*.*' },
  ])
  if (!path) return
  await saveExportFile(path, props.html)
}

async function handleDownloadIcons() {
  if (iconNames.value.length === 0) return
  downloadingIcons.value = true

  try {
    const zip = new JSZip()
    const folder = zip.folder('icons')!

    const results = await Promise.allSettled(
      iconNames.value.map(async (name) => {
        const resp = await fetch(`/icons/${name}.svg`)
        if (!resp.ok) return
        const svg = await resp.text()
        folder.file(`${name}.svg`, svg)
      })
    )

    const successCount = results.filter(r => r.status === 'fulfilled').length
    if (successCount === 0) return

    const blob = await zip.generateAsync({ type: 'blob' })

    const base64 = await new Promise<string>((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => {
        const dataUrl = reader.result as string
        resolve(dataUrl.split(',')[1])
      }
      reader.readAsDataURL(blob)
    })

    const fileName = `${props.projectName || 'design'}-icons.zip`
    const path = await showSaveDialog('导出图标', fileName, [
      { DisplayName: 'ZIP 文件', Pattern: '*.zip' },
      { DisplayName: '所有文件', Pattern: '*.*' },
    ])
    if (!path) return
    await saveExportFileBinary(path, base64)
  } finally {
    downloadingIcons.value = false
  }
}
</script>

<template>
  <div class="dialog-overlay" @click.self="$emit('close')">
    <div class="dialog">
      <div class="dialog-header">
        <h2>导出 HTML</h2>
        <button class="close-btn" @click="$emit('close')">×</button>
      </div>

      <div class="dialog-body">
        <pre class="code-block">{{ html || '暂无 HTML 内容' }}</pre>
      </div>

      <div class="dialog-actions">
        <button v-if="iconNames.length > 0" class="btn btn-secondary" @click="handleDownloadIcons" :disabled="downloadingIcons">
          {{ downloadingIcons ? '打包中...' : `下载图标 (${iconNames.length})` }}
        </button>
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
.dialog-body { padding: 0 24px; flex: 1; overflow: auto; }
.code-block { background: var(--bg-canvas); color: #d4d4d4; padding: 16px; border-radius: var(--radius-md); font-size: var(--font-sm); line-height: 1.5; overflow: auto; max-height: 500px; white-space: pre-wrap; word-break: break-all; border: 1px solid var(--border-default); }
.dialog-actions { display: flex; justify-content: flex-end; gap: 10px; padding: 16px 24px 20px; }
</style>
