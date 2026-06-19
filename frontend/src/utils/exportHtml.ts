/**
 * Phase 3: Task 12 - HTML 导出
 *  单页 / 多页
 */

export interface ExportHtmlOptions {
  pageName: string
  projectName: string
  inlineAssets?: boolean
}

export function buildSinglePageHtml(rawHtml: string, opts: ExportHtmlOptions): string {
  let html = (rawHtml || '').trim()
  if (!html) return ''
  // 去掉外部 Google Fonts 引用（避免离线导出后白屏）
  html = html.replace(/<link[^>]*fonts\.googleapis\.com[^>]*>/gi, '')
  // 注入标题
  const title = `${opts.projectName} - ${opts.pageName}`
  if (html.includes('<head>')) {
    html = html.replace('<head>', `<head><title>${title}</title>`)
  } else {
    html = `<title>${title}</title>\n` + html
  }
  return html
}

export interface MultiPageInput {
  id: string
  name: string
  html: string
}

export function buildMultiPageHtml(pages: MultiPageInput[], projectName: string): string {
  // 生成包含导航的 index.html，内部用 <iframe srcdoc> 展示各页
  const navItems = pages
    .map((p, i) => `<li><a href="#page-${i}" data-target="page-${i}">${escapeHtml(p.name)}</a></li>`)
    .join('')

  const frames = pages
    .map((p, i) => {
      const cleaned = buildSinglePageHtml(p.html, { pageName: p.name, projectName })
      return `<section id="page-${i}" class="page-frame"><iframe sandbox="allow-same-origin" srcdoc='${escapeAttr(cleaned)}'></iframe></section>`
    })
    .join('\n')

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>${escapeHtml(projectName)} - 多页项目</title>
<style>
*{margin:0;padding:0;box-sizing:border-box;}
body{font-family:-apple-system,'PingFang SC','Microsoft YaHei',sans-serif;background:#0f0f23;color:#e2e8f0;min-height:100vh;}
.topnav{position:sticky;top:0;z-index:10;display:flex;align-items:center;gap:24px;padding:14px 24px;background:rgba(15,15,35,0.95);backdrop-filter:blur(8px);border-bottom:1px solid #2a2a4a;}
.topnav h1{font-size:16px;font-weight:600;color:#a5b4fc;}
.topnav ul{list-style:none;display:flex;gap:12px;flex-wrap:wrap;}
.topnav a{color:#94a3b8;text-decoration:none;font-size:13px;padding:4px 10px;border-radius:6px;transition:all .15s;}
.topnav a:hover{color:#fff;background:rgba(129,140,248,0.15);}
.page-frame{display:block;width:100%;padding:24px;}
.page-frame iframe{width:100%;min-height:80vh;border:1px solid #2a2a4a;border-radius:8px;background:#fff;}
</style>
</head>
<body>
<nav class="topnav">
  <h1>${escapeHtml(projectName)}</h1>
  <ul>${navItems}</ul>
</nav>
<main>
${frames}
</main>
</body>
</html>`
}

function escapeHtml(s: string): string {
  return (s || '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  } as Record<string, string>)[c])
}

function escapeAttr(s: string): string {
  return escapeHtml(s)
}
