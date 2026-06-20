<script setup lang="ts">
/**
 * Phase 5 · Task 19 + 20：
 *   - 全局快捷键 + 命令面板（useGlobalShortcuts + 6 个 emit）
 *   - 桌面原生能力：启动时打印平台信息，命令面板快捷键提示
 */
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useCanvasStore } from './stores/canvasStore'
import { saveNow } from './stores/autoSave'
import { useGlobalShortcuts, MOD_KEY_HINT } from './composables/useKeyboardShortcuts'
import * as nativeBridge from './services/nativeBridge'
import CommandPalette from './components/CommandPalette.vue'
import ExportDialog from './components/ExportDialog.vue'

const route = useRoute()
const router = useRouter()
const canvasStore = useCanvasStore()

// ── 全局 UI 状态 ──
const paletteOpen = ref(false)
const exportOpen = ref(false)
const previewMode = ref(false)
const showShortcuts = ref(false)
const showShortcutHint = ref(false)
/** 在模板里可以直接用 {{ modKeyHint }} 访问 */
const modKeyHint = MOD_KEY_HINT

// ── 全局快捷键：6 个事件 ──
useGlobalShortcuts({
  'open-command-palette': () => { paletteOpen.value = true },
  'new-page': () => handleNewPage(),
  'open-export': () => { exportOpen.value = true },
  'toggle-theme': () => { canvasStore.toggleDarkMode() },
  'toggle-preview': () => { previewMode.value = !previewMode.value },
  'manual-save': () => { void saveNow() },
})

// ── 事件处理 ──
function handleNewPage() {
  if (route.name === 'design') {
    // 在 Design 视图：直接 addPage 并自动切到新页
    const p = canvasStore.addPage()
    if (p) canvasStore.selectCard(p.id)
  } else {
    // 其它页面：跳到 home（让用户点进 Design）
    router.push({ name: 'home' })
  }
  paletteOpen.value = false
}

function handlePaletteClose() { paletteOpen.value = false }
function handleExportFromPalette() {
  paletteOpen.value = false
  exportOpen.value = true
}
function handleShowShortcuts() {
  paletteOpen.value = false
  showShortcuts.value = true
}
function handlePaletteNewPage() {
  handleNewPage()
}
function handlePaletteExport() {
  handleExportFromPalette()
}

/** 当前 route 命中的页面卡片（用于 ExportDialog 接收 html / 标题） */
const exportHtml = computed<string | null>(() => {
  const id = canvasStore.selectedCardId
  if (id) {
    const card = canvasStore.cards.find(c => c.id === id)
    if (card?.html) return card.html
  }
  // 退而求其次：最后一张有 html 的卡片
  for (let i = canvasStore.cards.length - 1; i >= 0; i--) {
    if (canvasStore.cards[i]?.html) return canvasStore.cards[i]!.html
  }
  return null
})
const exportLabel = computed(() => {
  const id = canvasStore.selectedCardId
  if (id) {
    const card = canvasStore.cards.find(c => c.id === id)
    if (card?.label) return card.label
  }
  return '设计稿'
})

// ── 启动：打印平台信息 ──
onMounted(() => {
  // eslint-disable-next-line no-console
  console.info(
    '[MindDesign] platform:',
    nativeBridge.getOSName(),
    'native:',
    nativeBridge.isTauriOrWails(),
  )
})
</script>

<template>
  <router-view />

  <!-- Phase 5 · Task 19：命令面板 -->
  <CommandPalette
    v-if="paletteOpen"
    @close="handlePaletteClose"
    @new-page="handlePaletteNewPage"
    @export-current="handlePaletteExport"
    @show-shortcuts="handleShowShortcuts"
  />

  <!-- Phase 5 · Task 19：导出对话框（由 Cmd/Ctrl+E 唤起） -->
  <ExportDialog
    v-if="exportOpen"
    :html="exportHtml"
    :project-name="canvasStore.projectName"
    :card-label="exportLabel"
    @close="exportOpen = false"
  />

  <!-- Phase 5 · Task 19：快捷键提示（顶部状态条，hover 显示完整列表） -->
  <div class="md-shortcut-bar" @mouseenter="showShortcutHint = true" @mouseleave="showShortcutHint = false">
    <span class="md-shortcut-pill"><kbd>{{ modKeyHint }}</kbd><span>K</span></span>
    <span class="md-shortcut-text">命令面板</span>
    <Transition name="md-shortcut-fade">
      <div v-if="showShortcutHint" class="md-shortcut-hint">
        <div class="md-shortcut-hint-title">快捷键</div>
        <div class="md-shortcut-hint-row"><kbd>{{ modKeyHint }} K</kbd><span>打开 / 关闭命令面板</span></div>
        <div class="md-shortcut-hint-row"><kbd>{{ modKeyHint }} N</kbd><span>新建画板</span></div>
        <div class="md-shortcut-hint-row"><kbd>{{ modKeyHint }} E</kbd><span>打开导出对话框</span></div>
        <div class="md-shortcut-hint-row"><kbd>{{ modKeyHint }} /</kbd><span>切换明暗主题</span></div>
        <div class="md-shortcut-hint-row"><kbd>{{ modKeyHint }} P</kbd><span>进入 / 退出预览模式</span></div>
        <div class="md-shortcut-hint-row"><kbd>{{ modKeyHint }} S</kbd><span>手动触发保存</span></div>
        <div class="md-shortcut-hint-row"><kbd>ESC</kbd><span>关闭弹窗</span></div>
      </div>
    </Transition>
  </div>

  <!-- 快捷键帮助弹窗（保留旧版：从命令面板 → "显示快捷键帮助" 唤起） -->
  <div v-if="showShortcuts" class="shortcuts-overlay" @click.self="showShortcuts = false">
    <div class="shortcuts-modal">
      <div class="shortcuts-header">
        <h3>⌨ 快捷键</h3>
        <button class="shortcuts-close" @click="showShortcuts = false">×</button>
      </div>
      <div class="shortcuts-body">
        <div class="shortcut-row">
          <kbd>{{ modKeyHint }} + K</kbd><span>打开 / 关闭命令面板</span>
        </div>
        <div class="shortcut-row">
          <kbd>{{ modKeyHint }} + N</kbd><span>新建画板（在 Design 视图）</span>
        </div>
        <div class="shortcut-row">
          <kbd>{{ modKeyHint }} + E</kbd><span>打开导出对话框</span>
        </div>
        <div class="shortcut-row">
          <kbd>{{ modKeyHint }} + /</kbd><span>切换暗色 / 亮色主题</span>
        </div>
        <div class="shortcut-row">
          <kbd>{{ modKeyHint }} + P</kbd><span>进入 / 退出预览模式</span>
        </div>
        <div class="shortcut-row">
          <kbd>{{ modKeyHint }} + S</kbd><span>手动触发保存</span>
        </div>
        <div class="shortcut-row">
          <kbd>↑</kbd><kbd>↓</kbd><span>命令面板中上下选择</span>
        </div>
        <div class="shortcut-row">
          <kbd>↵</kbd><span>命令面板中执行</span>
        </div>
        <div class="shortcut-row">
          <kbd>ESC</kbd><span>关闭命令面板 / 弹窗</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style>
.shortcuts-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 9998; }
.shortcuts-modal { width: 480px; max-width: 92vw; background: var(--bg-elevated); border: 1px solid var(--border-default); border-radius: 12px; box-shadow: 0 12px 48px rgba(0,0,0,0.5); overflow: hidden; }
.shortcuts-header { display: flex; align-items: center; justify-content: space-between; padding: 14px 20px; border-bottom: 1px solid var(--border-default); }
.shortcuts-header h3 { font-size: 15px; font-weight: 600; color: var(--text-primary); margin: 0; }
.shortcuts-close { width: 28px; height: 28px; border-radius: 50%; background: var(--border-default); color: var(--text-secondary); border: none; font-size: 16px; cursor: pointer; }
.shortcuts-body { padding: 16px 20px; display: flex; flex-direction: column; gap: 10px; }
.shortcut-row { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--text-secondary); }
.shortcut-row kbd { padding: 2px 8px; background: var(--bg-surface); border: 1px solid var(--border-default); border-bottom-width: 2px; border-radius: 4px; font-family: ui-monospace, SFMono-Regular, monospace; font-size: 11px; color: var(--text-primary); }
.shortcut-row span { margin-left: 6px; }

/* Phase 5 · Task 19：顶部状态条（快捷键提示） */
.md-shortcut-bar { position: fixed; top: 50px; right: 12px; z-index: 9000; display: flex; align-items: center; gap: 6px; padding: 4px 10px; background: rgba(20, 20, 36, 0.75); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); border: 1px solid var(--border-subtle); border-radius: 999px; font-size: 12px; color: var(--text-secondary); user-select: none; cursor: default; }
.md-shortcut-pill { display: inline-flex; align-items: center; gap: 2px; padding: 2px 6px; background: var(--bg-surface); border: 1px solid var(--border-default); border-radius: 6px; font-family: ui-monospace, SFMono-Regular, monospace; font-size: 11px; color: var(--text-primary); }
.md-shortcut-pill kbd { font-family: inherit; font-size: inherit; }
.md-shortcut-pill span { margin-left: 2px; }
.md-shortcut-text { font-size: 11px; }
.md-shortcut-hint { position: absolute; top: calc(100% + 8px); right: 0; width: 280px; padding: 12px 14px; background: var(--bg-elevated); border: 1px solid var(--border-default); border-radius: 10px; box-shadow: 0 8px 24px rgba(0,0,0,0.4); display: flex; flex-direction: column; gap: 6px; }
.md-shortcut-hint-title { font-size: 12px; font-weight: 600; color: var(--text-primary); margin-bottom: 4px; }
.md-shortcut-hint-row { display: flex; align-items: center; gap: 6px; font-size: 11px; color: var(--text-secondary); }
.md-shortcut-hint-row kbd { padding: 1px 6px; background: var(--bg-surface); border: 1px solid var(--border-default); border-radius: 4px; font-family: ui-monospace, SFMono-Regular, monospace; font-size: 10px; color: var(--text-primary); }
.md-shortcut-hint-row span { margin-left: 4px; }
.md-shortcut-fade-enter-active, .md-shortcut-fade-leave-active { transition: opacity 0.15s ease, transform 0.15s ease; }
.md-shortcut-fade-enter-from, .md-shortcut-fade-leave-to { opacity: 0; transform: translateY(-4px); }
</style>
