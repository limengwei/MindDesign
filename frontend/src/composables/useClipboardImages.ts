/** Phase 5 · Task 20 — 剪贴板图片监听 composable
 *
 * 监听 `window` 的 `paste` 事件，从 `e.clipboardData.items` 提取图片 Blob，
 * 触发 `clipboard-image` 自定义事件（detail: { dataURL, blob, size, type, source }）。
 *
 * ChatPanel.vue 监听该事件并把图片附加到下一条消息的 referenceImages。
 *
 * 同时也提供 `useDragImageFiles(opts)` 单独监听拖拽事件（用于在 ChatPanel
 * 之外的画布/画板区域也能响应拖入图片的场景）。
 *
 * 事件总线使用浏览器原生 `EventTarget`，不引入 mitt 等新依赖。
 */
import { onBeforeUnmount, onMounted } from 'vue'

export interface PastedImageDetail {
  dataURL: string
  blob: Blob
  size: number
  type: string
  /** 来源：'paste' | 'drop' | 'manual' */
  source: 'paste' | 'drop' | 'manual'
}

/** 自定义事件名（ChatPanel 监听该事件） */
export const CLIPBOARD_IMAGE_EVENT = 'clipboard-image'

function readBlobAsDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve((reader.result as string) || '')
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

function isImageBlob(blob: Blob | null | undefined): blob is Blob {
  return !!blob && !!blob.type && blob.type.startsWith('image/')
}

function dispatchPastedImage(detail: PastedImageDetail) {
  window.dispatchEvent(new CustomEvent<PastedImageDetail>(CLIPBOARD_IMAGE_EVENT, { detail }))
}

/**
 * 全局 paste 监听：从 clipboardData.items 中提取 image 项。
 * 默认 **不影响** 文本粘贴（仅在 clipboard 中存在图片时 preventDefault）。
 */
export function useClipboardImages(options: { enabled?: () => boolean } = {}) {
  const isEnabled = options.enabled ?? (() => true)

  async function onPaste(e: ClipboardEvent) {
    if (!isEnabled()) return
    const items = e.clipboardData?.items
    if (!items || items.length === 0) return
    for (let i = 0; i < items.length; i++) {
      const it = items[i]
      if (it.kind !== 'file') continue
      if (!it.type.startsWith('image/')) continue
      const blob = it.getAsFile()
      if (!isImageBlob(blob)) continue
      try {
        const dataURL = await readBlobAsDataURL(blob)
        // 仅当 clipboard 中存在图片时才阻止默认粘贴（不影响纯文本粘贴）
        e.preventDefault()
        dispatchPastedImage({ dataURL, blob, size: blob.size, type: blob.type, source: 'paste' })
        return
      } catch (err) {
        // 读取失败不抛出，避免影响用户体验
        // eslint-disable-next-line no-console
        console.warn('[useClipboardImages] failed to read pasted image', err)
      }
    }
  }

  onMounted(() => {
    window.addEventListener('paste', onPaste)
  })
  onBeforeUnmount(() => {
    window.removeEventListener('paste', onPaste)
  })
}

export interface UseDragImageFilesOptions {
  /** 触发高亮的回调（用于显示"松开附加为参考图"） */
  onDragEnter?: (e: DragEvent) => void
  onDragOver?: (e: DragEvent) => void
  onDragLeave?: (e: DragEvent) => void
  onDrop?: (e: DragEvent) => void
  /** 是否仅接受 image/*（默认 true） */
  imageOnly?: boolean
}

/**
 * 全局 dragover/drop 监听：仅在拖入的是图片时触发回调。
 * 默认 **不影响** 其他类型文件的拖入（不会 preventDefault）。
 */
export function useDragImageFiles(options: UseDragImageFilesOptions = {}) {
  const imageOnly = options.imageOnly ?? true

  function hasImage(e: DragEvent) {
    const items = e.dataTransfer?.items
    if (!items || items.length === 0) return false
    for (let i = 0; i < items.length; i++) {
      if (items[i].kind === 'file' && items[i].type.startsWith('image/')) return true
    }
    return false
  }

  function onDragOver(e: DragEvent) {
    if (imageOnly && !hasImage(e)) return
    e.preventDefault()
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy'
    options.onDragOver?.(e)
  }

  function onDragEnter(e: DragEvent) {
    if (imageOnly && !hasImage(e)) return
    options.onDragEnter?.(e)
  }

  function onDragLeave(e: DragEvent) {
    options.onDragLeave?.(e)
  }

  async function onDrop(e: DragEvent) {
    if (imageOnly && !hasImage(e)) return
    e.preventDefault()
    const files = Array.from(e.dataTransfer?.files || []).filter(f => f.type.startsWith('image/'))
    for (const f of files) {
      try {
        const dataURL = await readBlobAsDataURL(f)
        dispatchPastedImage({ dataURL, blob: f, size: f.size, type: f.type, source: 'drop' })
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn('[useDragImageFiles] failed to read dropped image', err)
      }
    }
    options.onDrop?.(e)
  }

  onMounted(() => {
    window.addEventListener('dragover', onDragOver)
    window.addEventListener('dragenter', onDragEnter)
    window.addEventListener('dragleave', onDragLeave)
    window.addEventListener('drop', onDrop)
  })
  onBeforeUnmount(() => {
    window.removeEventListener('dragover', onDragOver)
    window.removeEventListener('dragenter', onDragEnter)
    window.removeEventListener('dragleave', onDragLeave)
    window.removeEventListener('drop', onDrop)
  })
}

/**
 * 手动派发一张图片（用于组件库 → 命令面板等场景，手动注入参考图）
 */
export function dispatchPastedImageManual(dataURL: string, type = 'image/png') {
  const blob = dataURLToBlob(dataURL, type)
  dispatchPastedImage({ dataURL, blob, size: blob.size, type, source: 'manual' })
}

/** dataURL → Blob（最小实现） */
function dataURLToBlob(dataURL: string, type: string): Blob {
  const idx = dataURL.indexOf(',')
  const b64 = idx >= 0 ? dataURL.slice(idx + 1) : dataURL
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return new Blob([bytes], { type })
}

/**
 * 监听 `clipboard-image` 事件并调用回调。
 * 用法：
 * ```ts
 * useClipboardImageListener((dataUrl) => {
 *   referenceImages.value.push(dataUrl)
 * })
 * ```
 * 回调收到的 dataURL 已转成 dataURL（base64），可直接用于 `<img src>`。
 */
export function useClipboardImageListener(onImage: (dataUrl: string) => void) {
  function handler(e: Event) {
    const ce = e as CustomEvent<PastedImageDetail>
    if (!ce.detail || !ce.detail.dataURL) return
    try {
      onImage(ce.detail.dataURL)
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[useClipboardImageListener] callback failed:', err)
    }
  }
  onMounted(() => {
    window.addEventListener(CLIPBOARD_IMAGE_EVENT, handler)
  })
  onBeforeUnmount(() => {
    window.removeEventListener(CLIPBOARD_IMAGE_EVENT, handler)
  })
}
