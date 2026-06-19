/**
 * Phase 5 · Task 20 — 桌面原生能力桥
 *
 * 提供一组"如果运行在原生壳（Tauri / Wails / 未来其它）中则调用原生 API，
 * 否则在浏览器中走降级实现"的统一接口。前端代码不应该直接判断平台，
 * 全部走这里即可。
 *
 * 当前实现：
 *  - `isTauriOrWails()`  → 检测 `window.__TAURI__` 或 `window.go` 是否存在
 *  - `getOSName()`       → 平台名（mac / win / linux / web）
 *  - `openInBrowser(url)`→ web 用 `window.open`；原生端预留 TODO
 *  - `saveAsFile(blob, filename)` → web 用 `<a download>`；原生端预留 TODO
 *
 * 不引入新 npm 依赖；所有检测仅靠 `window` 全局对象。
 */

export type OSName = 'mac' | 'win' | 'linux' | 'web'

interface MaybeWindow {
  __TAURI__?: unknown
  __TAURI_INTERNALS__?: unknown
  go?: unknown
}

/**
 * 是否在 Tauri / Wails 之类的原生壳中运行。
 * - Tauri v1/v2 在 window 上挂 `__TAURI__` / `__TAURI_INTERNALS__`
 * - Wails v2/v3 在 window 上挂 `go`（runtime.Services）
 */
export function isTauriOrWails(): boolean {
  if (typeof window === 'undefined') return false
  const w = window as unknown as MaybeWindow
  if (w.__TAURI__) return true
  if (w.__TAURI_INTERNALS__) return true
  if (w.go) return true
  return false
}

/** 平台名（仅用于在 console / UI 上展示） */
export function getOSName(): OSName {
  if (typeof navigator === 'undefined') return 'web'
  const ua = (navigator.userAgent || '').toLowerCase()
  const platform = (navigator.platform || '').toLowerCase()
  if (/mac|iphone|ipad|ipod/.test(platform) || /mac os|macintosh/.test(ua)) return 'mac'
  if (/win/.test(platform) || /windows/.test(ua)) return 'win'
  if (/linux|x11/.test(platform) || /linux/.test(ua)) return 'linux'
  return 'web'
}

/**
 * 在浏览器 / 系统默认浏览器中打开 URL。
 * - web：使用 `window.open(url, '_blank', 'noopener,noreferrer')`
 * - 原生：TODO（待集成 Tauri shell plugin / Wails runtime BrowserOpenURL）
 */
export function openInBrowser(url: string): void {
  if (!url) return
  if (isTauriOrWails()) {
    // TODO: 集成原生 shell API（Tauri: `import { open } from '@tauri-apps/plugin-shell'`）
    //       或 Wails: `runtime.BrowserOpenURL(url)`
    // 暂时降级到 window.open
    // eslint-disable-next-line no-console
    console.info('[nativeBridge] openInBrowser (native):', url)
  }
  try {
    window.open(url, '_blank', 'noopener,noreferrer')
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[nativeBridge] openInBrowser failed:', err)
  }
}

/**
 * 保存 Blob / File 到本地文件系统。
 * - web：用 `<a download>` 触发浏览器下载
 * - 原生：TODO（待集成 Tauri dialog + fs API / Wails SaveFileDialog）
 */
export function saveAsFile(blob: Blob, filename: string): void {
  if (!blob) return
  if (isTauriOrWails()) {
    // TODO: 调用原生保存对话框（Tauri dialog.save / Wails runtime.SaveFileDialog）
    // eslint-disable-next-line no-console
    console.info('[nativeBridge] saveAsFile (native):', filename, blob.size)
  }
  // 降级：浏览器下载
  try {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.style.display = 'none'
    document.body.appendChild(a)
    a.click()
    // 给浏览器一点时间完成下载，再回收 URL
    setTimeout(() => {
      try { document.body.removeChild(a) } catch { /* noop */ }
      try { URL.revokeObjectURL(url) } catch { /* noop */ }
    }, 0)
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[nativeBridge] saveAsFile failed:', err)
  }
}

/** 默认导出（方便 import 整个模块） */
export default {
  isTauriOrWails,
  getOSName,
  openInBrowser,
  saveAsFile,
}
