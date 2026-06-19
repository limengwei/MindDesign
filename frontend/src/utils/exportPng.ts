/**
 * Phase 3: Task 12 - PNG 导出
 *  利用 html-to-image（已装），支持 1x / 2x / 3x 倍率
 */
import { toPng } from 'html-to-image'

export type PngScale = 1 | 2 | 3

export interface ExportPngOptions {
  scale?: PngScale
  backgroundColor?: string
  width: number
  height: number
}

export async function exportElementToPng(element: HTMLElement, opts: ExportPngOptions): Promise<string> {
  const scale = opts.scale ?? 2
  return await toPng(element, {
    width: opts.width,
    height: opts.height,
    pixelRatio: scale,
    backgroundColor: opts.backgroundColor || '#ffffff',
    cacheBust: true,
  })
}

/**
 * 触发浏览器下载一个 dataURL
 */
export function downloadDataUrl(dataUrl: string, filename: string): void {
  const a = document.createElement('a')
  a.href = dataUrl
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}

/**
 * 把 dataURL 转 Blob
 */
export function dataUrlToBlob(dataUrl: string): Blob {
  const [meta, b64] = dataUrl.split(',')
  const mime = /data:([^;]+);base64/.exec(meta)?.[1] || 'application/octet-stream'
  const binary = atob(b64)
  const len = binary.length
  const bytes = new Uint8Array(len)
  for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i)
  return new Blob([bytes], { type: mime })
}
