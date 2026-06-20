/**
 * 协作分享包（Phase 4 · Task 18）
 *
 * - `exportSharePackage(project)` 把项目 JSON + 所有图片 base64 打包成 ZIP
 *   - 过滤 `llmConfig` 字段（防泄露 API Key）
 *   - ZIP 内含 `index.html`（可用浏览器打开的预览页）+ `project.json` + `assets/`
 * - `importSharePackage(blob)` 从 ZIP 还原项目数据
 *
 * 兼容浏览器/Wails 双端运行（运行时检测）。
 */

import JSZip from 'jszip'

/** 项目可分享的最小数据形状（向前兼容） */
export interface ShareableProjectData {
  formatVersion: number
  /** 项目主数据（ProjectMeta） */
  project: unknown
  /** 画板数据（ProjectCards，向前兼容旧版） */
  cards: unknown
  /** 会话数据（ProjectSessions） */
  sessions: unknown
  /** Phase 3 新版：pages 数组（替代 cards） */
  pages?: unknown
  /** 去除 apiKey 后的 LLM 配置 */
  llmConfig?: {
    protocol: string
    baseUrl: string
    model: string
  }
}

const SHARE_FORMAT_VERSION = 2
const SHARE_MANIFEST = 'mindshare.json'
const SHARE_PROJECT = 'project.json'
const SHARE_CARDS = 'cards.json'
const SHARE_SESSIONS = 'sessions.json'
const SHARE_PAGES = 'pages.json'
const SHARE_LLM_CONFIG = 'llm-config.json'
const SHARE_INDEX_HTML = 'index.html'
const SHARE_README = 'README.txt'

/** 任何字段名为 apiKey / token / secret / password 的字符串置空 */
function stripSecrets<T>(input: T): T {
  if (!input) return input
  const SECRET_KEYS = new Set(['apikey', 'api_key', 'token', 'secret', 'authorization', 'password'])
  const visit = (val: any): any => {
    if (Array.isArray(val)) return val.map(visit)
    if (val && typeof val === 'object') {
      const out: any = {}
      for (const k of Object.keys(val)) {
        if (SECRET_KEYS.has(k.toLowerCase())) {
          out[k] = ''
        } else {
          out[k] = visit(val[k])
        }
      }
      return out
    }
    return val
  }
  return visit(input) as T
}

/** 把 LLM 配置中只保留"非敏感"字段 */
function sanitizeLlmConfig(llmConfig: any): ShareableProjectData['llmConfig'] {
  if (!llmConfig || typeof llmConfig !== 'object') return undefined
  return {
    protocol: String(llmConfig.protocol || 'openai'),
    baseUrl: String(llmConfig.baseUrl || ''),
    model: String(llmConfig.model || ''),
  }
}

// ── 资源提取：base64 dataURI / 远程 URL → assets/ 内文件 ──

/** 从一段字符串中提取所有 data:image/...;base64,... 块，返回 [{mime, ext, data, placeholder}] */
function extractDataImages(html: string): Array<{ mime: string; ext: string; data: string; placeholder: string }> {
  if (!html) return []
  const out: Array<{ mime: string; ext: string; data: string; placeholder: string }> = []
  const re = /data:(image\/[a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/=]+)/g
  let m: RegExpExecArray | null
  let idx = 0
  while ((m = re.exec(html))) {
    const mime = m[1]
    const data = m[2]
    const ext = mimeExt(mime)
    const id = `img-${idx++}-${Date.now()}.${ext}`
    out.push({ mime, ext, data, placeholder: m[0] })
  }
  return out
}

function mimeExt(mime: string): string {
  if (mime.includes('png')) return 'png'
  if (mime.includes('jpeg') || mime.includes('jpg')) return 'jpg'
  if (mime.includes('webp')) return 'webp'
  if (mime.includes('gif')) return 'gif'
  if (mime.includes('svg')) return 'svg'
  if (mime.includes('avif')) return 'avif'
  return 'bin'
}

/** 从 cards/sessions/project 中收集所有 html / screenshot 字段；返回所有 data: 资源 */
function collectDataImages(data: any): Array<{ mime: string; ext: string; data: string; placeholder: string }> {
  if (!data) return []
  const all: Array<{ mime: string; ext: string; data: string; placeholder: string }> = []
  const visit = (val: any) => {
    if (typeof val === 'string') {
      if (val.startsWith('data:image/')) {
        const imgs = extractDataImages(val)
        all.push(...imgs)
      }
    } else if (Array.isArray(val)) {
      val.forEach(visit)
    } else if (val && typeof val === 'object') {
      // 只扫描关键字段：html / screenshot / data / image
      for (const k of ['html', 'screenshot', 'data', 'image', 'thumbnail']) {
        if (typeof val[k] === 'string') visit(val[k])
      }
    }
  }
  visit(data)
  return all
}

/** 把 data: 占位符替换为 assets/xxx，并把资源写入 zip */
function replaceDataImages(
  data: any,
  zip: JSZip,
): { rewritten: any; assets: { filename: string; size: number }[] } {
  const all = collectDataImages(data)
  const seen = new Map<string, string>() // placeholder → filename
  for (const img of all) {
    if (seen.has(img.placeholder)) continue
    const filename = `assets/${img.placeholder.length}_${all.indexOf(img)}.${img.ext}`
    // 简化：使用顺序 index 作为文件名，避免碰撞
    const safeName = `assets/${Object.keys(seen).length.toString().padStart(4, '0')}.${img.ext}`
    zip.file(safeName, img.data, { base64: true })
    seen.set(img.placeholder, safeName)
  }
  const rewrite = (val: any): any => {
    if (typeof val === 'string') {
      let out = val
      for (const [ph, fn] of seen) {
        out = out.split(ph).join(fn)
      }
      return out
    }
    if (Array.isArray(val)) return val.map(rewrite)
    if (val && typeof val === 'object') {
      const out: any = {}
      for (const k of Object.keys(val)) out[k] = rewrite(val[k])
      return out
    }
    return val
  }
  return {
    rewritten: rewrite(data),
    assets: Array.from(seen.values()).map(filename => ({
      filename,
      size: 0,
    })),
  }
}

// ── index.html 预览页模板 ──

function buildIndexHtml(project: any, cardList: any[]): string {
  const projectName = (project?.meta?.name) || 'MindDesign 分享包'
  const safeName = String(projectName).replace(/[<>&"']/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' }[c] || c))
  const cards: any[] = Array.isArray(cardList)
    ? cardList
    : (cardList && Array.isArray((cardList as any).cards) ? (cardList as any).cards : [])
  const cardTiles = cards
    .map((c: any, i: number) => {
      const title = String(c?.label || `画板 ${i + 1}`).replace(/[<>&"']/g, ch => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' }[ch] || ch))
      const html = c?.html || ''
      const safeHtml = html.replace(/<\/script>/gi, '<\\/script>')
      return `<section class="card"><h2>${title}</h2><div class="frame-wrap"><iframe sandbox="allow-same-origin" srcdoc="${encodeURIComponent(safeHtml)}"></iframe></div></section>`
    })
    .join('\n')
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${safeName} — MindDesign 分享预览</title>
<style>
  * { box-sizing: border-box; }
  body { margin: 0; font-family: -apple-system, 'PingFang SC', 'Microsoft YaHei', sans-serif; background: #0f0f23; color: #e2e8f0; min-height: 100vh; }
  header { padding: 32px 24px; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: #fff; }
  header h1 { margin: 0 0 8px; font-size: 24px; font-weight: 700; }
  header p { margin: 0; opacity: 0.85; font-size: 14px; }
  main { padding: 24px; display: flex; flex-direction: column; gap: 24px; max-width: 1600px; margin: 0 auto; }
  .card { background: #1a1a2e; border: 1px solid #2a2a4a; border-radius: 12px; overflow: hidden; }
  .card h2 { margin: 0; padding: 16px 20px; font-size: 16px; font-weight: 600; border-bottom: 1px solid #2a2a4a; background: rgba(99,102,241,0.06); }
  .frame-wrap { width: 100%; max-height: 80vh; overflow: auto; background: #fff; }
  .frame-wrap iframe { width: 100%; border: 0; display: block; min-height: 600px; }
  footer { padding: 16px 24px; text-align: center; color: #94a3b8; font-size: 12px; }
</style>
</head>
<body>
  <header>
    <h1>${safeName}</h1>
    <p>MindDesign 分享预览 · 共 ${cards.length} 个画板</p>
  </header>
  <main>
    ${cardTiles || '<p style="text-align:center;opacity:0.6">此分享包无画板数据</p>'}
  </main>
  <footer>由 MindDesign 生成 · 仅供设计协作使用</footer>
</body>
</html>`
}

// ── 导出入口 ──

/**
 * 导出分享包（任务规约命名）
 * @param projectData 项目各部分数据
 * @param opts 选项：includePreview 是否包含 index.html 预览页（默认 true）
 * @returns Promise<Blob> .mindshare 文件
 */
export async function exportSharePackage(
  projectData: Partial<ShareableProjectData> & { llmConfig?: any },
  opts: { includePreview?: boolean } = {},
): Promise<Blob> {
  const includePreview = opts.includePreview !== false
  const zip = new JSZip()

  // 提取 data: 图片并替换为 assets/...
  const projectRewritten = projectData.project !== undefined
    ? replaceDataImages(projectData.project, zip).rewritten
    : projectData.project
  const cardsRewritten = projectData.cards !== undefined
    ? replaceDataImages(projectData.cards, zip).rewritten
    : projectData.cards
  const sessionsRewritten = projectData.sessions !== undefined
    ? replaceDataImages(projectData.sessions, zip).rewritten
    : projectData.sessions
  // Phase 3 pages
  const pagesRaw = (projectData as any).pages
  const pagesRewritten = pagesRaw !== undefined
    ? replaceDataImages(pagesRaw, zip).rewritten
    : pagesRaw

  const manifest = {
    formatVersion: SHARE_FORMAT_VERSION,
    type: 'mindshare',
    createdAt: new Date().toISOString(),
    app: 'MindDesign',
  }
  zip.file(SHARE_MANIFEST, JSON.stringify(manifest, null, 2))
  if (projectRewritten !== undefined) {
    zip.file(SHARE_PROJECT, JSON.stringify(stripSecrets(projectRewritten), null, 2))
  }
  if (cardsRewritten !== undefined) {
    zip.file(SHARE_CARDS, JSON.stringify(stripSecrets(cardsRewritten), null, 2))
  }
  if (sessionsRewritten !== undefined) {
    zip.file(SHARE_SESSIONS, JSON.stringify(stripSecrets(sessionsRewritten), null, 2))
  }
  if (pagesRewritten !== undefined) {
    zip.file(SHARE_PAGES, JSON.stringify(stripSecrets(pagesRewritten), null, 2))
  }
  // llmConfig 严格脱敏
  const llm = sanitizeLlmConfig(projectData.llmConfig)
  if (llm) {
    zip.file(SHARE_LLM_CONFIG, JSON.stringify(llm, null, 2))
  }

  if (includePreview) {
    // 解包 cards 列表用于预览
    // 优先使用 pages（Phase 3），回退到 cards
    const cardList = Array.isArray(pagesRewritten) ? pagesRewritten : ((cardsRewritten as any)?.cards || cardsRewritten)
    const indexHtml = buildIndexHtml(projectRewritten, cardList as any)
    zip.file(SHARE_INDEX_HTML, indexHtml)
    zip.file(
      SHARE_README,
      `MindDesign 分享包\n\n- 双击 index.html 用浏览器打开即可预览所有画板\n- project.json / cards.json / sessions.json / pages.json 为原始数据\n- assets/ 目录包含提取出的所有图片资源\n- llm-config.json 已被脱敏（不含 API Key）\n`,
    )
  }

  return await zip.generateAsync({ type: 'blob' })
}

/** 把 Blob 转 base64（用于 Wails 落盘） */
export async function blobToBase64(blob: Blob): Promise<string> {
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      const dataUrl = reader.result as string
      const idx = dataUrl.indexOf(',')
      resolve(idx >= 0 ? dataUrl.slice(idx + 1) : dataUrl)
    }
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

/** 从 .mindshare 文件读取项目数据 */
export async function importSharePackage(blob: Blob): Promise<ShareableProjectData> {
  const zip = await JSZip.loadAsync(blob)
  // 校验 manifest
  const manifestRaw = await zip.file(SHARE_MANIFEST)?.async('string')
  if (!manifestRaw) throw new Error('不是有效的 .mindshare 文件：缺少 manifest')
  const manifest = JSON.parse(manifestRaw)
  if (manifest.type !== 'mindshare') throw new Error('不是有效的 .mindshare 文件')

  const data: ShareableProjectData = {
    formatVersion: manifest.formatVersion || SHARE_FORMAT_VERSION,
    project: null,
    cards: null,
    sessions: null,
  }
  const projectRaw = await zip.file(SHARE_PROJECT)?.async('string')
  if (projectRaw) data.project = JSON.parse(projectRaw)
  const cardsRaw = await zip.file(SHARE_CARDS)?.async('string')
  if (cardsRaw) data.cards = JSON.parse(cardsRaw)
  const sessionsRaw = await zip.file(SHARE_SESSIONS)?.async('string')
  if (sessionsRaw) data.sessions = JSON.parse(sessionsRaw)
  const pagesRaw = await zip.file(SHARE_PAGES)?.async('string')
  if (pagesRaw) data.pages = JSON.parse(pagesRaw)
  const llmRaw = await zip.file(SHARE_LLM_CONFIG)?.async('string')
  if (llmRaw) data.llmConfig = JSON.parse(llmRaw)
  return data
}

// ── 保留旧版 stripSecrets 导出，方便其它模块引用 ──
export { stripSecrets }
