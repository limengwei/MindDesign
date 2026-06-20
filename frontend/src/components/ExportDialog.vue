<script setup lang="ts">
import { ref, computed } from 'vue'
import JSZip from 'jszip'
import { showSaveDialog, saveExportFile, saveExportFileBinary } from '../services/projectBridge'
import * as nativeBridge from '../services/nativeBridge'
import { useCanvasStore } from '../stores/canvasStore'
import { useLLMConfigStore } from '../stores/llmConfigStore'
import { buildSinglePageHtml, buildMultiPageHtml } from '../utils/exportHtml'
import { exportElementToPng, dataUrlToBlob } from '../utils/exportPng'
import { printHtmlAsPdf } from '../utils/exportPdf'
import { buildProjectZip } from '../utils/exportZip'
import { convertCode, type CodeFormat } from '../utils/exportCode'
import { migrateDesignSpec } from '../prompts/designSpecs'
import { createEmptyBlueprint } from '../prompts/blueprint'
import { exportSharePackage, blobToBase64 } from '../utils/sharePackage'

const props = defineProps<{
  html: string | null
  projectName: string
  cardLabel: string
}>()

const emit = defineEmits(['close'])

const canvasStore = useCanvasStore()

// Phase 3：4 个格式 tab + 4 个代码片段 tab
type FormatTab = 'html' | 'png' | 'pdf' | 'zip' | 'code'
const activeTab = ref<FormatTab>('html')
const codeTab = ref<CodeFormat>('tailwind')

// 各 tab 状态
const pngScale = ref<1 | 2 | 3>(2)
const pdfPaper = ref<'A4' | 'Letter'>('A4')
const pdfOrient = ref<'portrait' | 'landscape'>('portrait')
const zipIncludeIndex = ref(true)
const zipIncludePerPage = ref(true)
const zipIncludePreview = ref(true)
const zipIncludeSpec = ref(true)
const zipIncludeAssets = ref(false)

const copyStatus = ref<string>('')
const busy = ref<string>('')
const errorMsg = ref<string>('')

// 缩略图 dataURL（来自当前 page 截图）
const previewDataUrl = computed(() => {
  if (props.html) {
    // 用 canvasStore 中当前 page 截图（如有）
    return ''
  }
  return ''
})

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

// ── HTML Tab ──
const htmlExport = computed(() => {
  if (!props.html) return ''
  return buildSinglePageHtml(props.html, { pageName: props.cardLabel, projectName: props.projectName })
})

const multiPageHtml = computed(() => {
  if (!canvasStore.pages || canvasStore.pages.length === 0) return ''
  return buildMultiPageHtml(
    canvasStore.pages.map(p => ({ id: p.id, name: p.name, html: p.html })),
    props.projectName,
  )
})

// ── Code Tab ──
const codeOutput = computed(() => {
  if (!props.html) return ''
  const spec = canvasStore.getActiveSpec()
  return convertCode(codeTab.value, props.html, spec, { componentName: sanitizeComponentName(props.cardLabel) })
})

function sanitizeComponentName(name: string): string {
  const pascal = (name || 'DesignPage')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join('')
  return pascal || 'DesignPage'
}

// ── Actions ──
async function flashStatus(text: string) {
  copyStatus.value = text
  setTimeout(() => { copyStatus.value = '' }, 1500)
}

async function copyToClipboard(text: string) {
  if (!text) return
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    const ta = document.createElement('textarea')
    ta.value = text
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    document.body.removeChild(ta)
  }
  await flashStatus('已复制 ✓')
}

async function copyCurrentCode() {
  if (activeTab.value === 'html') await copyToClipboard(htmlExport.value)
  else await copyToClipboard(codeOutput.value)
}

async function copyMultiPage() {
  await copyToClipboard(multiPageHtml.value)
}

// ── HTML 下载 ──
async function downloadHtml() {
  if (!htmlExport.value) return
  const fileName = `${props.projectName || 'design'}-${props.cardLabel || 'design'}.html`
  const path = await showSaveDialog('导出 HTML', fileName, [
    { DisplayName: 'HTML 文件', Pattern: '*.html' },
  ])
  if (!path) return
  await saveExportFile(path, htmlExport.value)
}

async function downloadMultiPage() {
  if (!multiPageHtml.value) return
  const fileName = `${props.projectName || 'design'}-all.html`
  const path = await showSaveDialog('导出多页 HTML', fileName, [
    { DisplayName: 'HTML 文件', Pattern: '*.html' },
  ])
  if (!path) return
  await saveExportFile(path, multiPageHtml.value)
}

// ── Icons ZIP（兼容 Phase 1/2）──
async function downloadIcons() {
  if (iconNames.value.length === 0) return
  busy.value = 'icons'
  try {
    const zip = new JSZip()
    const folder = zip.folder('icons')!
    const results = await Promise.allSettled(
      iconNames.value.map(async (name) => {
        const resp = await fetch(`/icons/${name}.svg`)
        if (!resp.ok) return
        const svg = await resp.text()
        folder.file(`${name}.svg`, svg)
      }),
    )
    if (results.every(r => r.status === 'rejected')) return
    const blob = await zip.generateAsync({ type: 'blob' })
    const base64 = await new Promise<string>((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => {
        const dataUrl = reader.result as string
        resolve(dataUrl.split(',')[1])
      }
      reader.readAsDataURL(blob)
    })
    const fileName = `${props.projectName || 'design'}-${props.cardLabel || 'icons'}-icons.zip`
    const path = await showSaveDialog('导出图标', fileName, [
      { DisplayName: 'ZIP 文件', Pattern: '*.zip' },
    ])
    if (!path) return
    await saveExportFileBinary(path, base64)
  } finally {
    busy.value = ''
  }
}

// ── PNG Tab ──
async function downloadPng() {
  if (!props.html) return
  busy.value = 'png'
  errorMsg.value = ''
  try {
    // 把当前 HTML 渲染到隐藏元素再导出
    const container = document.createElement('div')
    container.style.cssText = 'position:fixed;left:-9999px;top:0;background:#fff;'
    const shadow = container.attachShadow({ mode: 'open' })
    const iframe = document.createElement('iframe')
    iframe.style.cssText = 'width:1280px;height:800px;border:none;background:#fff;'
    iframe.setAttribute('sandbox', 'allow-same-origin')
    iframe.srcdoc = htmlExport.value
    shadow.appendChild(iframe)
    document.body.appendChild(container)
    await new Promise<void>((resolve) => { iframe.onload = () => resolve() })
    const doc = iframe.contentDocument!
    await new Promise(r => setTimeout(r, 200))
    const dataUrl = await exportElementToPng(doc.body, {
      scale: pngScale.value,
      width: doc.body.scrollWidth || 1280,
      height: doc.body.scrollHeight || 800,
      backgroundColor: '#ffffff',
    })
    document.body.removeChild(container)
    const fileName = `${props.projectName || 'design'}-${props.cardLabel || 'design'}-${pngScale.value}x.png`
    const path = await showSaveDialog('导出 PNG', fileName, [
      { DisplayName: 'PNG 文件', Pattern: '*.png' },
    ])
    if (!path) return
    // Phase 5 · Task 20：统一走 nativeBridge.saveAsFile（web 端用 <a download>，原生端 TODO）
    const blob = dataUrlToBlob(dataUrl)
    nativeBridge.saveAsFile(blob, fileName)
    // 同时通过 bridge 备份
    try {
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader()
        reader.onloadend = () => {
          const d = reader.result as string
          resolve(d.split(',')[1])
        }
        reader.readAsDataURL(blob)
      })
      await saveExportFileBinary(path, base64)
    } catch { /* ignore */ }
  } catch (e) {
    errorMsg.value = 'PNG 导出失败：' + ((e as Error).message || String(e))
  } finally {
    busy.value = ''
  }
}

// ── PDF Tab ──
function downloadPdf() {
  if (!htmlExport.value) return
  printHtmlAsPdf(htmlExport.value, {
    paperSize: pdfPaper.value,
    orientation: pdfOrient.value,
    title: `${props.projectName}-${props.cardLabel}`,
  })
}

// ── ZIP Tab ──
async function downloadZip() {
  if (!props.html) return
  busy.value = 'zip'
  errorMsg.value = ''
  try {
    const pages = canvasStore.pages && canvasStore.pages.length > 0
      ? canvasStore.pages
      : [{ id: 'page-only', name: props.cardLabel || 'page', html: props.html, screenshot: '' }]
    const pagesInput = await Promise.all(
      pages.map(async (p: any) => {
        // 若没截图，则生成
        let screenshot = p.screenshot || ''
        if (!screenshot && p.html) {
          // 复用 canvas store 中的截图（若有）
        }
        return { id: p.id, name: p.name, html: p.html || '', screenshot }
      }),
    )
    const spec = {
      project: props.projectName,
      meta: { createdAt: canvasStore.createdAt || new Date().toISOString() },
      pageType: canvasStore.pageType,
      colorScheme: canvasStore.colorScheme,
      pages: pagesInput.map(p => ({ id: p.id, name: p.name })),
      blueprint: canvasStore.productBlueprint || createEmptyBlueprint(),
      designSpec: canvasStore.getActiveSpec() ? migrateDesignSpec(canvasStore.getActiveSpec()!) : null,
    }
    const blob = await buildProjectZip({
      projectName: props.projectName,
      pages: pagesInput,
      includeIndex: zipIncludeIndex.value,
      includePerPageHtml: zipIncludePerPage.value,
      includePreview: zipIncludePreview.value,
      includeSpec: zipIncludeSpec.value,
      includeAssets: zipIncludeAssets.value,
      designSpec: spec,
    })
    const reader = new FileReader()
    const base64 = await new Promise<string>((resolve) => {
      reader.onloadend = () => {
        const d = reader.result as string
        resolve(d.split(',')[1])
      }
      reader.readAsDataURL(blob)
    })
    const fileName = `${props.projectName || 'design'}-export.zip`
    const path = await showSaveDialog('导出 ZIP', fileName, [
      { DisplayName: 'ZIP 文件', Pattern: '*.zip' },
    ])
    if (!path) return
    await saveExportFileBinary(path, base64)
  } catch (e) {
    errorMsg.value = 'ZIP 导出失败：' + ((e as Error).message || String(e))
  } finally {
    busy.value = ''
  }
}

// Phase 4 · Task 18：分享包（去除 LLM API Key）
async function downloadSharePackage() {
  busy.value = 'share'
  errorMsg.value = ''
  try {
    const llmStore = useLLMConfigStore()
    const config = llmStore.getConfig()
    const blob = await exportSharePackage({
      project: {
        name: props.projectName,
        pageType: canvasStore.pageType,
        colorScheme: canvasStore.colorScheme,
        designSpec: canvasStore.getActiveSpec() ? migrateDesignSpec(canvasStore.getActiveSpec()!) : null,
        blueprint: canvasStore.productBlueprint || createEmptyBlueprint(),
      },
      cards: canvasStore.cards,
      sessions: canvasStore.pages,
      llmConfig: config,
    })
    const base64 = await blobToBase64(blob)
    const fileName = `${props.projectName || 'mindshare'}.mindshare`
    const path = await showSaveDialog('导出分享包', fileName, [
      { DisplayName: 'MindShare 文件', Pattern: '*.mindshare' },
    ])
    if (!path) return
    await saveExportFileBinary(path, base64)
  } catch (e) {
    errorMsg.value = '分享包导出失败：' + ((e as Error).message || String(e))
  } finally {
    busy.value = ''
  }
}

const tabItems: Array<{ id: FormatTab; label: string; icon: string }> = [
  { id: 'html', label: 'HTML', icon: '📄' },
  { id: 'png', label: 'PNG', icon: '🖼' },
  { id: 'pdf', label: 'PDF', icon: '📑' },
  { id: 'zip', label: 'ZIP', icon: '🗜' },
  { id: 'code', label: '代码片段', icon: '🧩' },
]

const codeTabs: Array<{ id: CodeFormat; label: string }> = [
  { id: 'tailwind', label: 'Tailwind' },
  { id: 'css-vars', label: 'CSS Variables' },
  { id: 'vue', label: 'Vue SFC' },
  { id: 'react', label: 'React' },
]
</script>

<template>
  <div class="dialog-overlay" @click.self="$emit('close')">
    <div class="dialog">
      <div class="dialog-header">
        <h2>导出 — {{ cardLabel || '未命名' }}</h2>
        <button class="close-btn" @click="$emit('close')">×</button>
      </div>

      <div class="format-tabs">
        <button
          v-for="t in tabItems"
          :key="t.id"
          :class="['format-tab', { active: activeTab === t.id }]"
          @click="activeTab = t.id"
        >
          <span class="format-tab-icon">{{ t.icon }}</span>
          <span>{{ t.label }}</span>
        </button>
      </div>

      <div class="dialog-body">
        <!-- HTML tab -->
        <div v-if="activeTab === 'html'">
          <div class="format-row">
            <span class="format-label">单页 HTML</span>
            <button class="btn btn-secondary" @click="downloadHtml" :disabled="!html">下载 .html</button>
          </div>
          <pre class="code-block">{{ htmlExport || '暂无 HTML 内容' }}</pre>
          <div v-if="canvasStore.pages.length > 1" class="format-row" style="margin-top: 12px;">
            <span class="format-label">多页项目（首页 index.html 入口）</span>
            <button class="btn btn-secondary" @click="downloadMultiPage">下载 index.html</button>
          </div>
          <div v-if="canvasStore.pages.length > 1">
            <details class="multipage-details">
              <summary>查看多页 HTML（{{ canvasStore.pages.length }} 页）</summary>
              <pre class="code-block">{{ multiPageHtml }}</pre>
            </details>
          </div>
        </div>

        <!-- PNG tab -->
        <div v-else-if="activeTab === 'png'">
          <div class="format-row">
            <span class="format-label">像素倍率</span>
            <div class="radio-group">
              <label v-for="s in [1, 2, 3] as const" :key="s" :class="['radio-pill', { active: pngScale === s }]">
                <input type="radio" :value="s" v-model="pngScale" /> {{ s }}x
              </label>
            </div>
          </div>
          <div class="format-row">
            <span class="format-label">预览</span>
            <div class="preview-box">
              <div v-if="!html" class="preview-empty">暂无设计稿</div>
              <div v-else class="preview-info">将以 {{ pngScale }}x 像素比导出整页 PNG，分辨率更高但文件更大。</div>
            </div>
          </div>
          <div v-if="errorMsg" class="error-msg">⚠ {{ errorMsg }}</div>
          <div class="format-actions">
            <button class="btn btn-primary" :disabled="!html || busy === 'png'" @click="downloadPng">
              {{ busy === 'png' ? '导出中...' : '下载 .png' }}
            </button>
          </div>
        </div>

        <!-- PDF tab -->
        <div v-else-if="activeTab === 'pdf'">
          <div class="format-row">
            <span class="format-label">纸张大小</span>
            <div class="radio-group">
              <label v-for="p in ['A4', 'Letter'] as const" :key="p" :class="['radio-pill', { active: pdfPaper === p }]">
                <input type="radio" :value="p" v-model="pdfPaper" /> {{ p }}
              </label>
            </div>
          </div>
          <div class="format-row">
            <span class="format-label">方向</span>
            <div class="radio-group">
              <label v-for="o in ['portrait', 'landscape'] as const" :key="o" :class="['radio-pill', { active: pdfOrient === o }]">
                <input type="radio" :value="o" v-model="pdfOrient" /> {{ o === 'portrait' ? '纵向' : '横向' }}
              </label>
            </div>
          </div>
          <div class="format-row">
            <span class="format-label">说明</span>
            <div class="preview-info">弹出打印对话框，请选择"另存为 PDF"。</div>
          </div>
          <div class="format-actions">
            <button class="btn btn-primary" :disabled="!html" @click="downloadPdf">打印 / 另存 PDF</button>
          </div>
        </div>

        <!-- ZIP tab -->
        <div v-else-if="activeTab === 'zip'">
          <div class="format-row">
            <span class="format-label">包含资源</span>
            <div class="checkbox-group">
              <label class="check-pill"><input type="checkbox" v-model="zipIncludeIndex" /> index.html 多页入口</label>
              <label class="check-pill"><input type="checkbox" v-model="zipIncludePerPage" /> 每页独立 .html（pages/）</label>
              <label class="check-pill"><input type="checkbox" v-model="zipIncludePreview" /> preview.png（首页截图）</label>
              <label class="check-pill"><input type="checkbox" v-model="zipIncludeSpec" /> design-spec.json</label>
              <label class="check-pill"><input type="checkbox" v-model="zipIncludeAssets" /> assets/ 占位目录</label>
            </div>
          </div>
          <div v-if="errorMsg" class="error-msg">⚠ {{ errorMsg }}</div>
          <div class="format-actions">
            <button class="btn btn-primary" :disabled="!html || busy === 'zip'" @click="downloadZip">
              {{ busy === 'zip' ? '打包中...' : '下载 .zip' }}
            </button>
            <button class="btn btn-secondary" :disabled="busy === 'share'" @click="downloadSharePackage" title="去除 LLM API Key 后打包为 .mindshare">
              {{ busy === 'share' ? '导出中...' : '📤 分享包（不含 API Key）' }}
            </button>
          </div>
        </div>

        <!-- Code tab -->
        <div v-else-if="activeTab === 'code'">
          <div class="code-tabs">
            <button
              v-for="t in codeTabs"
              :key="t.id"
              :class="['code-tab', { active: codeTab === t.id }]"
              @click="codeTab = t.id"
            >{{ t.label }}</button>
          </div>
          <pre class="code-block code-block-code">{{ codeOutput || '请先生成设计稿' }}</pre>
        </div>
      </div>

      <div class="dialog-actions">
        <span class="status-text">{{ copyStatus }}</span>
        <button v-if="iconNames.length > 0" class="btn btn-secondary" :disabled="busy === 'icons'" @click="downloadIcons">
          {{ busy === 'icons' ? '打包中...' : `下载图标 (${iconNames.length})` }}
        </button>
        <button class="btn btn-secondary" @click="copyCurrentCode" :disabled="!html">
          复制代码
        </button>
        <button v-if="activeTab === 'html' && canvasStore.pages.length > 1" class="btn btn-secondary" @click="copyMultiPage">
          复制多页 HTML
        </button>
        <button class="btn btn-primary" :disabled="!html" @click="downloadHtml">下载 .html</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dialog-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: var(--z-dialog); }
.dialog { background: var(--bg-surface); border-radius: var(--radius-xl); width: 760px; max-width: 95vw; max-height: 88vh; display: flex; flex-direction: column; box-shadow: var(--shadow-lg); border: 1px solid var(--border-default); }
.dialog-header { display: flex; align-items: center; justify-content: space-between; padding: 18px 24px 12px; }
.dialog-header h2 { font-size: var(--font-lg); font-weight: 600; color: var(--text-primary); }
.close-btn { width: 32px; height: 32px; border: none; background: var(--border-default); border-radius: 50%; font-size: 18px; cursor: pointer; display: flex; align-items: center; justify-content: center; color: var(--text-secondary); }
.close-btn:hover { background: #3a3a5c; color: var(--text-primary); }
.format-tabs { display: flex; gap: 4px; padding: 0 24px 12px; border-bottom: 1px solid var(--border-subtle); }
.format-tab { display: flex; align-items: center; gap: 4px; padding: 6px 14px; background: transparent; border: 1px solid var(--border-default); border-radius: 8px; cursor: pointer; color: var(--text-secondary); font-size: 13px; transition: all 0.15s; font-family: inherit; }
.format-tab:hover { color: var(--text-primary); border-color: var(--border-hover); }
.format-tab.active { background: var(--color-primary); color: #fff; border-color: var(--color-primary); }
.format-tab-icon { font-size: 14px; }

.dialog-body { padding: 16px 24px; flex: 1; overflow: auto; }
.code-block { background: var(--bg-canvas); color: #d4d4d4; padding: 16px; border-radius: var(--radius-md); font-size: 12px; line-height: 1.5; overflow: auto; max-height: 360px; white-space: pre-wrap; word-break: break-all; border: 1px solid var(--border-default); font-family: 'SF Mono', 'Cascadia Code', 'Consolas', monospace; }
.code-block-code { max-height: 420px; }

.format-row { display: flex; align-items: center; gap: 12px; margin-bottom: 10px; flex-wrap: wrap; }
.format-label { font-size: 12px; color: var(--text-secondary); min-width: 64px; }
.format-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 12px; }
.radio-group { display: flex; gap: 6px; }
.radio-pill { display: inline-flex; align-items: center; gap: 4px; padding: 4px 10px; border-radius: 6px; border: 1px solid var(--border-default); background: transparent; color: var(--text-secondary); cursor: pointer; font-size: 12px; }
.radio-pill:hover { border-color: var(--border-hover); color: var(--text-primary); }
.radio-pill.active { background: var(--color-primary); color: #fff; border-color: var(--color-primary); }
.radio-pill input { display: none; }

.checkbox-group { display: flex; flex-direction: column; gap: 6px; }
.check-pill { display: flex; align-items: center; gap: 6px; padding: 6px 10px; border-radius: 6px; border: 1px solid var(--border-default); cursor: pointer; color: var(--text-secondary); font-size: 12px; }
.check-pill input { accent-color: var(--color-primary); }

.preview-box { flex: 1; min-width: 280px; }
.preview-info { font-size: 12px; color: var(--text-muted); padding: 12px; background: var(--bg-canvas); border-radius: 6px; border: 1px dashed var(--border-default); }
.preview-empty { font-size: 12px; color: var(--text-muted); padding: 12px; }

.code-tabs { display: flex; gap: 4px; margin-bottom: 8px; }
.code-tab { padding: 4px 12px; border: 1px solid var(--border-default); background: transparent; color: var(--text-secondary); border-radius: 6px; font-size: 12px; cursor: pointer; font-family: inherit; }
.code-tab:hover { color: var(--text-primary); }
.code-tab.active { background: var(--color-primary); color: #fff; border-color: var(--color-primary); }

.multipage-details summary { cursor: pointer; font-size: 12px; color: var(--text-muted); margin-top: 8px; }
.multipage-details summary:hover { color: var(--text-primary); }
.multipage-details[open] pre { margin-top: 8px; }

.error-msg { color: #fca5a5; background: rgba(239,68,68,0.1); padding: 8px 12px; border-radius: 6px; font-size: 12px; margin: 8px 0; }

.dialog-actions { display: flex; justify-content: flex-end; gap: 8px; padding: 14px 24px 18px; border-top: 1px solid var(--border-subtle); align-items: center; }
.status-text { font-size: 12px; color: #34d399; margin-right: auto; }
.btn { padding: 8px 16px; border: none; border-radius: var(--radius-md); font-size: var(--font-sm); font-weight: 500; cursor: pointer; transition: background 0.15s, opacity 0.15s; font-family: inherit; }
.btn:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-secondary { background: var(--border-default); color: var(--text-secondary); }
.btn-secondary:hover:not(:disabled) { background: #3a3a5c; color: var(--text-primary); }
.btn-primary { background: var(--color-primary); color: #fff; }
.btn-primary:hover:not(:disabled) { background: var(--color-primary-hover); }
</style>
