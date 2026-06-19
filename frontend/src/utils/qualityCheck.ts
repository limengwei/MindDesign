/**
 * 自动质检（Phase 4 · Task 15）
 *
 * 提供任务规约要求的对外 API：
 *  - checkTokens(html, spec)  → TokenIssue[]
 *  - checkA11y(html)          → A11yIssue[]
 *  - checkDom(html)           → DomIssue[]
 *  - runQualityCheck(html, spec) → QualityReport
 *
 * 内部基于 qaCheck.ts 的实现。
 */

import {
  runQaCheck,
  extractColors,
  parseColor,
  findClosestTokenColor,
  contrastRatio,
  type QaIssue,
  type QaResult,
  type QaSectionResult,
  type DesignSpecV2,
} from './qaCheck'

// ── 任务规约中的对外类型 ──

export type IssueSeverity = 'error' | 'warning'

export interface TokenIssue {
  selector: string
  property: string
  value: string
  allowedToken: string
}

export type A11yIssueType =
  | 'img-alt'
  | 'button-text'
  | 'link-text'
  | 'contrast'
  | 'aria-label'

export interface A11yIssue {
  selector: string
  type: A11yIssueType
  message: string
  severity: IssueSeverity
}

export type DomIssueType =
  | 'unclosed-tag'
  | 'missing-lang'
  | 'missing-viewport'
  | 'anchor-href'
  | 'invalid-nesting'

export interface DomIssue {
  selector: string
  type: DomIssueType
  message: string
  severity: IssueSeverity
}

export interface QualitySection<T> {
  ok: boolean
  issues: T[]
}

export interface QualityReport {
  dom: QualitySection<DomIssue>
  token: QualitySection<TokenIssue>
  a11y: QualitySection<A11yIssue>
  /** 总体通过（无 error 级问题） */
  overall: boolean
  /** 原始问题数（来自 qaCheck） */
  summary: {
    domCount: number
    tokenCount: number
    a11yCount: number
    errorCount: number
    warningCount: number
  }
}

// ── 颜色容忍度（与 qaCheck 一致） ──
const COLOR_TOLERANCE = 0.18

// ── DOM 解析辅助 ──

function parseHtml(html: string): Document | null {
  if (!html) return null
  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, 'text/html')
    if (!doc || !doc.documentElement) return null
    return doc
  } catch {
    return null
  }
}

function buildSelector(el: Element, doc: Document): string {
  const tag = el.tagName.toLowerCase()
  const id = el.id ? `#${el.id}` : ''
  const cls = el.className && typeof el.className === 'string'
    ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.')
    : ''
  // 简化：tag + id + class，最多 60 字符
  const sel = `${tag}${id}${cls}`
  if (sel.length > 60) return sel.slice(0, 60) + '…'
  return sel || tag
}

// ── Token 越界检查 ──

/**
 * 解析 HTML 内联 style 与 <style> 块的颜色，越界返回 TokenIssue。
 */
export function checkTokens(html: string, spec: DesignSpecV2 | null): TokenIssue[] {
  const issues: TokenIssue[] = []
  if (!html) return issues
  if (!spec?.colors) return issues

  const colors = extractColors(html)
  const uniq = Array.from(new Set(colors))
  for (const c of uniq) {
    const rgba = parseColor(c)
    if (!rgba) continue
    if (rgba[3] < 0.1) continue
    const [r, g, b] = rgba
    const maxC = Math.max(r, g, b)
    const minC = Math.min(r, g, b)
    // 黑/白/灰在文本-背景情况下基本都可接受
    if (maxC - minC < 16) continue
    const closest = findClosestTokenColor(rgba, spec.colors)
    if (!closest) continue
    if (closest.distance > COLOR_TOLERANCE) {
      issues.push({
        selector: 'html[style] / <style>',
        property: 'color / background-color',
        value: c,
        allowedToken: closest.name,
      })
    }
  }
  return issues
}

// ── A11y 检查 ──

/**
 * 检查 a11y：缺 alt、按钮/链接无文本或 aria-label、对比度 < 4.5。
 */
export function checkA11y(html: string): A11yIssue[] {
  const issues: A11yIssue[] = []
  const doc = parseHtml(html)
  if (!doc) return issues

  // 缺 alt
  doc.body.querySelectorAll('img').forEach((img) => {
    if (!img.hasAttribute('alt')) {
      issues.push({
        selector: buildSelector(img, doc),
        type: 'img-alt',
        message: '<img> 缺失 alt 属性',
        severity: 'warning',
      })
    }
  })

  // 按钮/链接无文本或 aria-label
  doc.body.querySelectorAll('button, a').forEach((el) => {
    const tag = el.tagName.toLowerCase()
    const text = (el.textContent || '').trim()
    if (text.length === 0) {
      const aria = el.getAttribute('aria-label')
      if (!aria) {
        issues.push({
          selector: buildSelector(el, doc),
          type: tag === 'button' ? 'button-text' : 'link-text',
          message: `<${tag}> 没有可读文本或 aria-label`,
          severity: 'error',
        })
      } else {
        issues.push({
          selector: buildSelector(el, doc),
          type: 'aria-label',
          message: `<${tag}> 仅依赖 aria-label，请确认内容准确`,
          severity: 'warning',
        })
      }
    } else if (text.length < 2) {
      issues.push({
        selector: buildSelector(el, doc),
        type: tag === 'button' ? 'button-text' : 'link-text',
        message: `<${tag}> 文本过短（"${text}"）`,
        severity: 'warning',
      })
    }
  })

  // 对比度（近似：仅检查带 inline color 的元素与其父级背景）
  doc.body.querySelectorAll('*').forEach((el) => {
    if (el.tagName.toLowerCase() === 'script' || el.tagName.toLowerCase() === 'style') return
    const style = (el as HTMLElement).style
    const color = style?.color
    if (!color) return
    const fg = parseColor(color)
    if (!fg) return
    // 找父级背景
    let bg: ReturnType<typeof parseColor> = null
    let parent: Element | null = el.parentElement
    while (parent) {
      const pbg = (parent as HTMLElement).style?.backgroundColor
      if (pbg) {
        const r = parseColor(pbg)
        if (r && r[3] > 0.5) {
          bg = r
          break
        }
      }
      parent = parent.parentElement
    }
    if (!bg) bg = [255, 255, 255, 1]
    const ratio = contrastRatio([fg[0], fg[1], fg[2]], [bg[0], bg[1], bg[2]])
    if (ratio < 4.5) {
      issues.push({
        selector: buildSelector(el, doc),
        type: 'contrast',
        message: `对比度 ${ratio.toFixed(2)}:1 低于 WCAG AA 4.5`,
        severity: 'error',
      })
    }
  })

  return issues
}

// ── DOM 基础检查 ──

/**
 * 检查 DOM 基础：缺 lang、缺 viewport meta、链接无 href、未闭合标签（粗略）。
 */
export function checkDom(html: string): DomIssue[] {
  const issues: DomIssue[] = []
  if (!html) return issues

  const doc = parseHtml(html)

  // 缺 <html lang>
  if (doc) {
    const root = doc.documentElement
    if (root && !root.getAttribute('lang')) {
      issues.push({
        selector: 'html',
        type: 'missing-lang',
        message: '<html> 缺失 lang 属性',
        severity: 'warning',
      })
    }
  }

  // 缺 viewport meta
  if (doc) {
    const metas = doc.querySelectorAll('meta[name="viewport"]')
    if (metas.length === 0) {
      issues.push({
        selector: '<head> meta',
        type: 'missing-viewport',
        message: '缺少 <meta name="viewport">',
        severity: 'warning',
      })
    }
  }

  // <a> 无 href
  if (doc) {
    doc.body.querySelectorAll('a').forEach((a) => {
      const href = a.getAttribute('href')
      if (!href || href.trim() === '') {
        issues.push({
          selector: buildSelector(a, doc),
          type: 'anchor-href',
          message: '<a> 缺少有效 href',
          severity: 'warning',
        })
      }
    })
  }

  // 粗略标签闭合检查
  const tagRe = /<\s*(\/?)\s*([a-zA-Z][a-zA-Z0-9-]*)\b[^>]*?(\/?)\s*>/g
  const VOID = new Set([
    'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
    'link', 'meta', 'param', 'source', 'track', 'wbr',
  ])
  const stack: string[] = []
  let m: RegExpExecArray | null
  while ((m = tagRe.exec(html.replace(/<!--[\s\S]*?-->/g, '').replace(/<!DOCTYPE[^>]*>/gi, '')))) {
    const closing = !!m[1]
    const name = m[2].toLowerCase()
    const self = !!m[3] || VOID.has(name)
    if (self && !closing) continue
    if (!closing) stack.push(name)
    else if (stack[stack.length - 1] === name) stack.pop()
    else {
      const idx = stack.lastIndexOf(name)
      if (idx >= 0) {
        const unclosed = stack.splice(idx + 1)
        stack.pop()
        for (const u of unclosed) {
          issues.push({
            selector: `<${u}>`,
            type: 'unclosed-tag',
            message: `未闭合标签：<${u}>`,
            severity: 'warning',
          })
        }
      }
    }
  }
  for (const u of stack) {
    issues.push({
      selector: `<${u}>`,
      type: 'unclosed-tag',
      message: `未闭合标签：<${u}>`,
      severity: 'warning',
    })
  }

  return issues
}

// ── 汇总入口 ──

/**
 * 运行完整质检，返回 QualityReport。
 */
export function runQualityCheck(html: string, spec: DesignSpecV2 | null): QualityReport {
  const dom = checkDom(html)
  const token = checkTokens(html, spec)
  const a11y = checkA11y(html)

  const domSection: QualitySection<DomIssue> = { ok: dom.length === 0, issues: dom }
  const tokenSection: QualitySection<TokenIssue> = { ok: token.length === 0, issues: token }
  const a11ySection: QualitySection<A11yIssue> = { ok: a11y.length === 0, issues: a11y }

  const all = [...dom, ...token, ...a11y]
  const errorCount = all.filter(i => i.severity === 'error').length
  const warningCount = all.filter(i => i.severity === 'warning').length

  return {
    dom: domSection,
    token: tokenSection,
    a11y: a11ySection,
    overall: errorCount === 0,
    summary: {
      domCount: dom.length,
      tokenCount: token.length,
      a11yCount: a11y.length,
      errorCount,
      warningCount,
    },
  }
}

/**
 * 内部：将 qaCheck 的 QaIssue 转换为新类型，保留兼容性。
 */
export function fromQaIssues(result: QaResult): QualityReport {
  const dom = result.dom.issues.map((i: QaIssue): DomIssue => ({
    selector: i.location || 'document',
    type: 'unclosed-tag',
    message: i.message,
    severity: i.severity,
  }))
  const a11y = result.a11y.issues.map((i: QaIssue): A11yIssue => ({
    selector: i.location || 'document',
    type: 'contrast',
    message: i.message,
    severity: i.severity,
  }))
  const token = result.token.issues.map((i: QaIssue): TokenIssue => ({
    selector: i.location || 'document',
    property: 'color / background',
    value: '',
    allowedToken: '',
  }))
  const all = [...dom, ...token, ...a11y]
  return {
    dom: { ok: dom.length === 0, issues: dom },
    token: { ok: token.length === 0, issues: token },
    a11y: { ok: a11y.length === 0, issues: a11y },
    overall: result.overall,
    summary: {
      domCount: dom.length,
      tokenCount: token.length,
      a11yCount: a11y.length,
      errorCount: all.filter(i => i.severity === 'error').length,
      warningCount: all.filter(i => i.severity === 'warning').length,
    },
  }
}

// 重新导出 QaResult / QaSectionResult / QaIssue / DesignSpecV2，方便旧代码引用
export type { QaResult, QaSectionResult, QaIssue, DesignSpecV2 }
export { runQaCheck }
