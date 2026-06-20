/**
 * Phase 5 · Task 19 — 全局快捷键 composable
 *
 * 提供两种使用方式：
 *
 * 1. `useGlobalShortcuts(emits)`
 *    - 直接把键盘事件绑到 App.vue 的 emits（最常见的"全局快捷键"用法）
 *    - 由组件传入 Vue 的 emits 函数，事件名一一对应
 *    - 自动跳过 INPUT / TEXTAREA / contenteditable 元素
 *    - 自动用 mod 键（macOS: ⌘，其他: Ctrl）
 *
 * 2. `useKeyboardShortcuts(options)`
 *    - 把事件派发到 window 上的 `md:xxx` 自定义事件
 *    - 任意组件可监听 `window.addEventListener('md:xxx', ...)`
 *    - 用于跨多个组件的快捷键、或 Wails3 菜单/快捷键/命令面板共用通道
 *
 * 暴露常量 `MOD_KEY_HINT`（'⌘' | 'Ctrl'），UI 上展示修饰键用。
 */
import { onBeforeUnmount, onMounted } from 'vue'

export type ShortcutEventName =
  | 'md:open-command-palette'
  | 'md:close-dialog'
  | 'md:new-page'
  | 'md:rename-page'
  | 'md:delete-page'
  | 'md:export-current'
  | 'md:open-export-dialog'
  | 'md:toggle-theme'
  | 'md:open-settings'
  | 'md:toggle-fullscreen-preview'
  | 'md:fix-by-spec'
  | 'md:select-page-index'

export interface ShortcutRegistration {
  /** e.g. 'k', 'n', 'e', '/', '1'..'9' */
  key: string
  /** 内部事件名（无 Cmd 修饰也会派发） */
  event: ShortcutEventName | string
  /** 是否需要在 INPUT 中也响应（默认 false） */
  allowInEditable?: boolean
  /** 自定义回调（可同时与 event 共存；会先于 event 派发） */
  callback?: (e: KeyboardEvent) => void
}

function isMac() {
  if (typeof navigator === 'undefined') return false
  return /Mac|iPhone|iPad/i.test(navigator.platform || navigator.userAgent)
}

function isEditableTarget(target: EventTarget | null) {
  if (!target) return false
  const el = target as HTMLElement
  if (!el.tagName) return false
  if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') return true
  if (el.isContentEditable) return true
  return false
}

/** 当前平台的修饰键显示名（用于 UI 提示） */
export const MOD_KEY_HINT: '⌘' | 'Ctrl' = isMac() ? '⌘' : 'Ctrl'

/** 事件名 → key 列表（用于 useGlobalShortcuts 把 emits 绑定到键位） */
const GLOBAL_SHORTCUTS: Array<{ key: string; event: string; allowInEditable?: boolean }> = [
  { key: 'k', event: 'open-command-palette', allowInEditable: true },
  { key: 'n', event: 'new-page' },
  { key: 'e', event: 'open-export' },
  { key: '/', event: 'toggle-theme' },
  { key: 'p', event: 'toggle-preview' },
  { key: 's', event: 'manual-save' },
]

/**
 * 把全局快捷键直接绑定到 App.vue 的 emits 对象。
 *
 * 用法：
 * ```ts
 * const emit = defineEmits<{
 *   'open-command-palette': []
 *   'new-page': []
 *   'open-export': []
 *   'toggle-theme': []
 *   'toggle-preview': []
 *   'manual-save': []
 * }>()
 * useGlobalShortcuts(emit)
 * ```
 */
export function useGlobalShortcuts(emits: Record<string, (...args: any[]) => void>) {
  function onKeydown(e: KeyboardEvent) {
    // Escape：永远响应（关闭弹窗）
    if (e.key === 'Escape') {
      // 不强制派发；调用方如果需要可以自行监听 keydown
      return
    }
    const mod = e.metaKey || e.ctrlKey
    if (!mod) return
    const editable = isEditableTarget(e.target)
    const key = e.key.toLowerCase()
    const reg = GLOBAL_SHORTCUTS.find(r => r.key === key)
    if (!reg) return
    if (editable && !reg.allowInEditable) return
    e.preventDefault()
    const handler = emits[reg.event]
    if (typeof handler === 'function') {
      try {
        handler()
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn('[useGlobalShortcuts] handler failed:', err)
      }
    }
  }

  onMounted(() => {
    window.addEventListener('keydown', onKeydown)
  })
  onBeforeUnmount(() => {
    window.removeEventListener('keydown', onKeydown)
  })
}

export interface UseKeyboardShortcutsOptions {
  /** 额外注册的快捷键（在默认快捷键之后追加） */
  extra?: ShortcutRegistration[]
}

export function useKeyboardShortcuts(options: UseKeyboardShortcutsOptions = {}) {
  const isMacPlatform = isMac()
  const registrations: ShortcutRegistration[] = [
    // Cmd/Ctrl + K  → 命令面板（toggle）
    { key: 'k', event: 'md:open-command-palette', allowInEditable: true },
    // Cmd/Ctrl + N  → 新建画板
    { key: 'n', event: 'md:new-page' },
    // Cmd/Ctrl + R  → 重命名当前画板（与浏览器刷新有冲突，使用 Shift 修饰会更稳）
    { key: 'r', event: 'md:rename-page' },
    // Cmd/Ctrl + E  → 导出当前画板 PNG（同时唤起导出弹窗）
    { key: 'e', event: 'md:open-export-dialog', allowInEditable: true },
    // Cmd/Ctrl + P  → 切换全屏预览
    { key: 'p', event: 'md:toggle-fullscreen-preview' },
    // Cmd/Ctrl + /  → 切换暗/亮主题
    { key: '/', event: 'md:toggle-theme' },
    // Cmd/Ctrl + ,  → 打开设置
    { key: ',', event: 'md:open-settings' },
    // Cmd/Ctrl + Shift + F  → 按规范修正（QA fix）
    { key: 'f', event: 'md:fix-by-spec' },
  ]

  // 1..9 切到第 N 个画板
  for (let i = 1; i <= 9; i++) {
    registrations.push({
      key: String(i),
      event: 'md:select-page-index',
      callback: () => {
        window.dispatchEvent(new CustomEvent('md:select-page-index', { detail: i }))
      },
    })
  }

  if (options.extra && options.extra.length) {
    registrations.push(...options.extra)
  }

  function onKeydown(e: KeyboardEvent) {
    const mod = e.metaKey || e.ctrlKey
    // Escape：永远响应（关闭弹窗 / 退出全屏）
    if (e.key === 'Escape') {
      window.dispatchEvent(new CustomEvent('md:close-dialog'))
      return
    }
    if (!mod) return
    const editable = isEditableTarget(e.target)
    const key = e.key.toLowerCase()
    const reg = registrations.find(r => r.key === key)
    if (!reg) return
    if (editable && !reg.allowInEditable) return
    e.preventDefault()
    if (reg.callback) reg.callback(e)
    // 默认事件（与 callback 并存；callback 已派发则只触发 callback 派发的事件）
    window.dispatchEvent(new CustomEvent(reg.event, { detail: { key: reg.key } }))
  }

  onMounted(() => {
    window.addEventListener('keydown', onKeydown)
  })
  onBeforeUnmount(() => {
    window.removeEventListener('keydown', onKeydown)
  })

  return {
    isMacPlatform,
    /** 当前平台的修饰键显示名 */
    modKeyLabel: MOD_KEY_HINT,
  }
}
