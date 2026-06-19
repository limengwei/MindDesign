/**
 * Phase 3: Task 12 - PDF 导出（用 window.print 简单实现）
 *  避免引入新依赖：构造一个可打印 HTML，弹出打印对话框让用户保存为 PDF
 */

export type PdfPaperSize = 'A4' | 'Letter'
export type PdfOrientation = 'portrait' | 'landscape'

export interface ExportPdfOptions {
  paperSize?: PdfPaperSize
  orientation?: PdfOrientation
  title?: string
}

const SIZE_PX: Record<PdfPaperSize, { w: number; h: number }> = {
  A4: { w: 794, h: 1123 },
  Letter: { w: 816, h: 1056 },
}

export function buildPrintableHtml(rawHtml: string, opts: ExportPdfOptions): string {
  const size = SIZE_PX[opts.paperSize || 'A4']
  const orient = opts.orientation || 'portrait'
  const w = orient === 'portrait' ? size.w : size.h
  const h = orient === 'portrait' ? size.h : size.w

  // 包裹一个打印友好的外层
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>${escapeHtml(opts.title || 'MindDesign Export')}</title>
<style>
  @page { size: ${opts.paperSize || 'A4'} ${orient}; margin: 12mm; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: #fff; color: #000; font-family: -apple-system, 'PingFang SC', 'Microsoft YaHei', sans-serif; }
  .pdf-root { width: ${w}px; min-height: ${h}px; padding: 16px; }
  .pdf-content { transform-origin: top left; }
  iframe { width: ${w - 32}px; min-height: ${h - 32}px; border: none; display: block; }
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
</style>
</head>
<body>
<div class="pdf-root">
  <div class="pdf-content">
    <iframe sandbox="allow-same-origin" srcdoc='${escapeAttr(rawHtml)}'></iframe>
  </div>
</div>
</body>
</html>`
}

/**
 * 触发 window.print（用户可保存为 PDF）
 */
export function printHtmlAsPdf(rawHtml: string, opts: ExportPdfOptions): void {
  const printable = buildPrintableHtml(rawHtml, opts)
  const w = window.open('', '_blank')
  if (!w) {
    alert('浏览器拦截了弹出窗口，请允许后重试')
    return
  }
  w.document.open()
  w.document.write(printable)
  w.document.close()
  // 等待资源加载后调用 print
  w.addEventListener('load', () => {
    setTimeout(() => {
      try { w.focus(); w.print() } catch (e) { console.warn('print failed', e) }
    }, 300)
  })
}

function escapeHtml(s: string): string {
  return (s || '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  } as Record<string, string>)[c])
}
function escapeAttr(s: string): string {
  return escapeHtml(s)
}
