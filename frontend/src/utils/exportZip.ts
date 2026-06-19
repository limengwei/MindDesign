/**
 * Phase 3: Task 12 - ZIP 打包（用 jszip）
 *  包含：
 *   - index.html
 *   - pages/<page-name>.html
 *   - preview.png
 *   - design-spec.json
 *   - assets/（可选，从 html 内引用的本地图片/图标抽取）
 */
import JSZip from 'jszip'
import { buildSinglePageHtml } from './exportHtml'

export interface ZipPageInput {
  id: string
  name: string
  html: string
  screenshot?: string
}

export interface ZipOptions {
  projectName: string
  pages: ZipPageInput[]
  /** 是否包含 index.html 多页入口 */
  includeIndex?: boolean
  /** 是否包含每页独立 .html */
  includePerPageHtml?: boolean
  /** 是否包含首张 preview.png */
  includePreview?: boolean
  /** 是否包含 design-spec.json */
  includeSpec?: boolean
  /** 是否打包引用的 icon/svg（用占位资源） */
  includeAssets?: boolean
  /** 附加元数据 */
  designSpec?: unknown
}

export async function buildProjectZip(opts: ZipOptions): Promise<Blob> {
  const zip = new JSZip()
  const root = zip.folder(sanitizeFilename(opts.projectName) || 'design')!
  const include = {
    index: opts.includeIndex ?? true,
    perPage: opts.includePerPageHtml ?? true,
    preview: opts.includePreview ?? true,
    spec: opts.includeSpec ?? true,
    assets: opts.includeAssets ?? false,
  }

  if (include.index && opts.pages.length > 0) {
    const indexHtml = buildMultiPageIndex(opts.pages, opts.projectName)
    root.file('index.html', indexHtml)
  }

  if (include.perPage) {
    const pagesDir = root.folder('pages')!
    for (const p of opts.pages) {
      const safe = sanitizeFilename(p.name) || p.id
      const html = buildSinglePageHtml(p.html, { pageName: p.name, projectName: opts.projectName })
      pagesDir.file(`${safe}.html`, html)
    }
  }

  if (include.preview) {
    const first = opts.pages.find(p => !!p.screenshot)
    if (first?.screenshot && first.screenshot.startsWith('data:')) {
      const blob = dataUrlToBlob(first.screenshot)
      root.file('preview.png', blob)
    }
  }

  if (include.spec) {
    const spec = opts.designSpec ?? {
      project: opts.projectName,
      pages: opts.pages.map(p => ({ id: p.id, name: p.name })),
      generatedAt: new Date().toISOString(),
    }
    root.file('design-spec.json', JSON.stringify(spec, null, 2))
  }

  if (include.assets) {
    const assets = root.folder('assets')!
    // 占位：仅放一个 README
    assets.file('README.md', '# Assets\n\n占位目录。请把页面里引用的本地图片/字体放在此。\n')
  }

  return await root.generateAsync({ type: 'blob' })
}

function buildMultiPageIndex(pages: ZipPageInput[], projectName: string): string {
  const items = pages
    .map((p, i) => {
      const safe = sanitizeFilename(p.name) || p.id
      return `<li><a href="./pages/${safe}.html" target="_blank">${escapeHtml(p.name)}</a></li>`
    })
    .join('')
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>${escapeHtml(projectName)}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box;}
body{font-family:-apple-system,'PingFang SC','Microsoft YaHei',sans-serif;background:#0f0f23;color:#e2e8f0;min-height:100vh;padding:48px;}
h1{font-size:28px;font-weight:600;color:#a5b4fc;margin-bottom:24px;}
ul{list-style:none;display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px;}
li a{display:block;padding:16px;border-radius:10px;background:rgba(22,33,62,0.7);border:1px solid #2a2a4a;color:#e2e8f0;text-decoration:none;transition:all .15s;}
li a:hover{background:rgba(129,140,248,0.15);border-color:#818cf8;}
</style>
</head>
<body>
<h1>${escapeHtml(projectName)}</h1>
<ul>${items}</ul>
</body>
</html>`
}

function sanitizeFilename(name: string): string {
  return (name || '').replace(/[\\/:*?"<>|]/g, '_').trim()
}
function escapeHtml(s: string): string {
  return (s || '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  } as Record<string, string>)[c])
}
function dataUrlToBlob(dataUrl: string): Blob {
  const [meta, b64] = dataUrl.split(',')
  const mime = /data:([^;]+);base64/.exec(meta)?.[1] || 'application/octet-stream'
  const binary = atob(b64)
  const len = binary.length
  const bytes = new Uint8Array(len)
  for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i)
  return new Blob([bytes], { type: mime })
}
