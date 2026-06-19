/**
 * 自动质检（Phase 4 · Task 15）
 *
 * 纯函数 + DOM 解析实现，避免引入新依赖。
 * 通过 `runQaCheck(html, spec)` 调用，返回 3 类质检结果：
 *  - dom:   标签闭合 / 缺失 alt / <a> 无 href
 *  - token: 颜色越界（与 spec.colors 比对）
 *  - a11y:  文本-背景对比度 / 按钮/链接文本长度
 *
 * 颜色越界判断采用 "色相 + 亮度" 距离 + 简单饱和度比较；对比度按
 * WCAG 2.1 相对亮度公式 (sRGB) 计算。
 */

import type { DesignSpec, ColorSet } from '../prompts/designSpecs'

export interface QaIssue {
  /** 简短问题描述 */
  message: string
  /** 问题位置（行号 / 选择器 / 文本） */
  location?: string
  /** 严重程度 */
  severity: 'error' | 'warning'
}

export interface QaSectionResult {
  ok: boolean
  issues: QaIssue[]
}

export interface QaResult {
  dom: QaSectionResult
  token: QaSectionResult
  a11y: QaSectionResult
  /** 总体通过（所有 3 类均无 error） */
  overall: boolean
}

const VOID_ELEMENTS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
  'link', 'meta', 'param', 'source', 'track', 'wbr',
])

// ── 颜色工具 ──

/** 从 CSS 字符串提取所有颜色（hex / rgb / rgba / hsl / hsla） */
export function extractColors(input: string): string[] {
  const colors: string[] = []
  if (!input) return colors
  const hexRe = /#([0-9a-fA-F]{3,8})\b/g
  const fnRe = /\b(?:rgb|rgba|hsl|hsla)\s*\([^)]+\)/g
  let m: RegExpExecArray | null
  while ((m = hexRe.exec(input))) colors.push('#' + m[1])
  while ((m = fnRe.exec(input))) colors.push(m[0])
  return colors
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n))
}

function parseHex(hex: string): [number, number, number, number] | null {
  let h = hex.replace('#', '').trim()
  if (h.length === 3) h = h.split('').map(c => c + c).join('')
  if (h.length === 4) h = h.split('').map(c => c + c).join('')
  if (h.length === 6) h += 'ff'
  if (h.length !== 8) return null
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  const a = parseInt(h.slice(6, 8), 16) / 255
  if ([r, g, b].some(v => Number.isNaN(v))) return null
  return [r, g, b, a]
}

function parseRgbFn(fn: string): [number, number, number, number] | null {
  const m = fn.match(/rgba?\s*\(\s*([\d.]+)[ ,]+([\d.]+)[ ,]+([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\)/i)
  if (!m) return null
  const r = clamp(Math.round(parseFloat(m[1])), 0, 255)
  const g = clamp(Math.round(parseFloat(m[2])), 0, 255)
  const b = clamp(Math.round(parseFloat(m[3])), 0, 255)
  let a = 1
  if (m[4]) a = m[4].endsWith('%') ? parseFloat(m[4]) / 100 : parseFloat(m[4])
  return [r, g, b, clamp(a, 0, 1)]
}

function parseHslFn(fn: string): [number, number, number, number] | null {
  const m = fn.match(/hsla?\s*\(\s*([\d.]+)(?:deg)?[ ,]+([\d.]+)%[ ,]+([\d.]+)%(?:\s*[,/]\s*([\d.]+%?))?\)/i)
  if (!m) return null
  const h = parseFloat(m[1])
  const s = clamp(parseFloat(m[2]), 0, 100) / 100
  const l = clamp(parseFloat(m[3]), 0, 100) / 100
  let a = 1
  if (m[4]) a = m[4].endsWith('%') ? parseFloat(m[4]) / 100 : parseFloat(m[4])
  const rgb = hslToRgb(h, s, l)
  return [rgb[0], rgb[1], rgb[2], clamp(a, 0, 1)]
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const hh = ((h % 360) + 360) % 360 / 60
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(hh % 2 - 1))
  let r1 = 0, g1 = 0, b1 = 0
  if (hh >= 0 && hh < 1) { r1 = c; g1 = x; b1 = 0 }
  else if (hh < 2) { r1 = x; g1 = c; b1 = 0 }
  else if (hh < 3) { r1 = 0; g1 = c; b1 = x }
  else if (hh < 4) { r1 = 0; g1 = x; b1 = c }
  else if (hh < 5) { r1 = x; g1 = 0; b1 = c }
  else { r1 = c; g1 = 0; b1 = x }
  const m = l - c / 2
  return [Math.round((r1 + m) * 255), Math.round((g1 + m) * 255), Math.round((b1 + m) * 255)]
}

export function parseColor(input: string): [number, number, number, number] | null {
  if (!input) return null
  const s = input.trim().toLowerCase()
  if (s === 'transparent') return [0, 0, 0, 0]
  if (s === 'white' || s === '#fff' || s === '#ffffff') return [255, 255, 255, 1]
  if (s === 'black' || s === '#000' || s === '#000000') return [0, 0, 0, 1]
  if (s.startsWith('#')) return parseHex(s)
  if (s.startsWith('rgb')) return parseRgbFn(s)
  if (s.startsWith('hsl')) return parseHslFn(s)
  return null
}

/** WCAG 2.1 相对亮度 */
export function relativeLuminance(r: number, g: number, b: number): number {
  const f = (c: number) => {
    const v = c / 255
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
  }
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
}

/** WCAG 对比度比 */
export function contrastRatio(a: [number, number, number], b: [number, number, number]): number {
  const la = relativeLuminance(a[0], a[1], a[2])
  const lb = relativeLuminance(b[0], b[1], b[2])
  const lighter = Math.max(la, lb)
  const darker = Math.min(la, lb)
  return (lighter + 0.05) / (darker + 0.05)
}

// ── 颜色距离（HSL 空间） ──

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255, gn = g / 255, bn = b / 255
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn)
  const l = (max + min) / 2
  let h = 0, s = 0
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case rn: h = (gn - bn) / d + (gn < bn ? 6 : 0); break
      case gn: h = (bn - rn) / d + 2; break
      case bn: h = (rn - gn) / d + 4; break
    }
    h *= 60
  }
  return [h, s, l]
}

function hueDistance(a: number, b: number): number {
  const d = Math.abs(a - b) % 360
  return d > 180 ? 360 - d : d
}

/** 色相 + 亮度 + 饱和度综合距离（0~1，值越小越接近） */
function colorDistance(a: [number, number, number, number], b: [number, number, number, number]): number {
  const ha = rgbToHsl(a[0], a[1], a[2])
  const hb = rgbToHsl(b[0], b[1], b[2])
  const hue = hueDistance(ha[0], hb[0]) / 180
  const lum = Math.abs(ha[2] - hb[2])
  const sat = Math.abs(ha[1] - hb[1])
  return hue * 0.5 + lum * 0.35 + sat * 0.15
}

const COLOR_TOLERANCE = 0.18

function findClosestTokenColor(
  rgba: [number, number, number, number],
  palette: ColorSet | null,
): { name: string; distance: number } | null {
  if (!palette) return null
  const tokens: Array<[string, string]> = [
    ['primary', palette.primary],
    ['background', palette.background],
    ['surface', palette.surface],
    ['text', palette.text],
    ['textSecondary', palette.textSecondary],
    ['border', palette.border],
    ['accent', palette.accent],
    ['error', palette.error],
    ['success', palette.success],
  ]
  let best: { name: string; distance: number } | null = null
  for (const [name, raw] of tokens) {
    const rgb = parseColor(raw)
    if (!rgb) continue
    const d = colorDistance(rgba, rgb)
    if (!best || d < best.distance) best = { name, distance: d }
  }
  return best
}

// ── DOM 解析 ──

interface ParsedDom {
  doc: Document
  body: HTMLElement | null
}

/** 解析 HTML 字符串，失败时返回 null（结构不完整时仍继续） */
function parseHtml(html: string): ParsedDom | null {
  if (!html) return null
  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, 'text/html')
    if (!doc || !doc.documentElement) return null
    return { doc, body: doc.body }
  } catch {
    return null
  }
}

/** 检查标签闭合（粗略：未配对的开始/结束标签数） */
function checkUnclosedTags(html: string): QaIssue[] {
  const issues: QaIssue[] = []
  if (!html) return issues
  // 去除 <!-- 注释 -->、<!DOCTYPE>、自闭合标签
  const cleaned = html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<!DOCTYPE[^>]*>/gi, '')
  const tagRe = /<\s*(\/?)\s*([a-zA-Z][a-zA-Z0-9-]*)\b[^>]*?(\/?)\s*>/g
  const stack: string[] = []
  let m: RegExpExecArray | null
  let line = 1
  let lastIndex = 0
  const lineOf = (idx: number) => {
    let count = 1
    for (let i = 0; i < idx; i++) if (cleaned[i] === '\n') count++
    return count
  }
  while ((m = tagRe.exec(cleaned))) {
    const closing = !!m[1]
    const tagName = m[2].toLowerCase()
    const selfClose = !!m[3] || VOID_ELEMENTS.has(tagName)
    if (selfClose && !closing) continue
    if (!closing) {
      stack.push(tagName)
    } else {
      // 弹栈
      if (stack.length === 0 || stack[stack.length - 1] !== tagName) {
        // 找栈中同名
        const idx = stack.lastIndexOf(tagName)
        if (idx >= 0) {
          // 中间未闭合
          const unclosed = stack.splice(idx + 1)
          stack.pop()
          for (const u of unclosed) {
            issues.push({
              message: `未闭合标签：<${u}>`,
              location: `行 ${lineOf(m.index)}`,
              severity: 'warning',
            })
          }
        } else {
          issues.push({
            message: `多余的结束标签：</${tagName}>`,
            location: `行 ${lineOf(m.index)}`,
            severity: 'warning',
          })
        }
      } else {
        stack.pop()
      }
    }
    lastIndex = m.index + m[0].length
  }
  for (const u of stack) {
    issues.push({
      message: `未闭合标签：<${u}>`,
      severity: 'warning',
    })
  }
  return issues
}

function checkMissingAlt(parsed: ParsedDom | null): QaIssue[] {
  if (!parsed || !parsed.body) return []
  const issues: QaIssue[] = []
  parsed.body.querySelectorAll('img').forEach((img) => {
    if (!img.hasAttribute('alt')) {
      const src = img.getAttribute('src') || ''
      issues.push({
        message: `<img> 缺失 alt 属性（src: ${truncate(src, 40)}）`,
        severity: 'warning',
      })
    }
  })
  return issues
}

function checkAnchorHref(parsed: ParsedDom | null): QaIssue[] {
  if (!parsed || !parsed.body) return []
  const issues: QaIssue[] = []
  parsed.body.querySelectorAll('a').forEach((a) => {
    if (!a.hasAttribute('href') || a.getAttribute('href')?.trim() === '') {
      const text = (a.textContent || '').trim()
      issues.push({
        message: `<a> 缺少有效 href（文本: ${truncate(text, 30) || '(空)'}）`,
        severity: 'warning',
      })
    }
  })
  return issues
}

function truncate(s: string, n: number) {
  if (!s) return ''
  return s.length > n ? s.slice(0, n) + '…' : s
}

// ── Token 越界检查 ──

function checkToken(html: string, spec: DesignSpec | null): QaSectionResult {
  const issues: QaIssue[] = []
  if (!html) return { ok: true, issues }
  if (!spec) {
    return {
      ok: true,
      issues: [{
        message: '未提供 DesignSpec，跳过 Token 校验',
        severity: 'warning',
      }],
    }
  }
  const palette = spec.colors || null
  if (!palette) return { ok: true, issues }

  const colors = extractColors(html)
  // 去重
  const uniq = Array.from(new Set(colors))
  for (const c of uniq) {
    const rgba = parseColor(c)
    if (!rgba) continue
    if (rgba[3] < 0.1) continue  // 透明色忽略
    // 黑/白/灰在文本-背景情况下基本都可接受
    const [r, g, b] = rgba
    const maxC = Math.max(r, g, b), minC = Math.min(r, g, b)
    if (maxC - minC < 16) continue
    const closest = findClosestTokenColor(rgba, palette)
    if (!closest) continue
    if (closest.distance > COLOR_TOLERANCE) {
      issues.push({
        message: `颜色 ${c} 偏离规范（最接近 ${closest.name}，距离 ${closest.distance.toFixed(2)}）`,
        location: 'HTML 内联样式 / <style>',
        severity: closest.distance > 0.3 ? 'error' : 'warning',
      })
    }
  }
  return { ok: issues.length === 0, issues }
}

// ── A11y 检查 ──

const MIN_BUTTON_TEXT = 2
const MIN_LINK_TEXT = 2

function effectiveBackground(el: Element, doc: Document): [number, number, number] {
  let cur: Element | null = el
  while (cur) {
    const bg = (cur as HTMLElement).style?.backgroundColor
    if (bg) {
      const rgba = parseColor(bg)
      if (rgba && rgba[3] > 0.5) return [rgba[0], rgba[1], rgba[2]]
    }
    cur = cur.parentElement
  }
  // 兜底：body 或 white
  const bodyBg = (doc.body as HTMLElement).style?.backgroundColor
  if (bodyBg) {
    const rgba = parseColor(bodyBg)
    if (rgba) return [rgba[0], rgba[1], rgba[2]]
  }
  return [255, 255, 255]
}

function effectiveColor(el: Element): [number, number, number] {
  const color = (el as HTMLElement).style?.color
  if (color) {
    const rgba = parseColor(color)
    if (rgba) return [rgba[0], rgba[1], rgba[2]]
  }
  return [33, 37, 41]
}

function checkContrast(parsed: ParsedDom | null): QaIssue[] {
  if (!parsed || !parsed.body) return []
  const issues: QaIssue[] = []
  const doc = parsed.doc
  parsed.body.querySelectorAll('*').forEach((el) => {
    const tag = el.tagName.toLowerCase()
    if (tag === 'script' || tag === 'style') return
    const text = (el.textContent || '').trim()
    if (!text) return
    // 仅检查"主要"文本节点：直接子文本或短文本元素
    if (text.length > 200) return
    const hasOwnText = Array.from(el.childNodes).some(n => n.nodeType === 3 && (n.textContent || '').trim().length > 0)
    if (!hasOwnText && el.children.length > 0) return
    const fg = effectiveColor(el)
    const bg = effectiveBackground(el, doc)
    const ratio = contrastRatio(fg, bg)
    if (ratio < 4.5) {
      const styleHint = (el as HTMLElement).style?.color || (el as HTMLElement).style?.backgroundColor
      issues.push({
        message: `对比度 ${ratio.toFixed(2)}:1 低于 WCAG AA 4.5（文本: ${truncate(text, 24)}）`,
        location: styleHint ? `style="${truncate(styleHint, 32)}"` : tag,
        severity: 'error',
      })
    }
  })
  return issues
}

function checkActionableText(parsed: ParsedDom | null): QaIssue[] {
  if (!parsed || !parsed.body) return []
  const issues: QaIssue[] = []
  parsed.body.querySelectorAll('button, a').forEach((el) => {
    const text = (el.textContent || '').trim()
    if (text.length === 0) {
      const aria = el.getAttribute('aria-label')
      if (!aria) {
        issues.push({
          message: `<${el.tagName.toLowerCase()}> 没有可读文本或 aria-label`,
          severity: 'error',
        })
      }
    } else if (text.length < (el.tagName.toLowerCase() === 'button' ? MIN_BUTTON_TEXT : MIN_LINK_TEXT)) {
      issues.push({
        message: `<${el.tagName.toLowerCase()}> 文本过短（"${truncate(text, 8)}"）`,
        severity: 'warning',
      })
    }
  })
  return issues
}

// ── 入口 ──

export function runQaCheck(html: string, spec: DesignSpecV2 | DesignSpec | null): QaResult {
  const parsed = parseHtml(html)
  const domIssues: QaIssue[] = [
    ...checkUnclosedTags(html),
    ...checkMissingAlt(parsed),
    ...checkAnchorHref(parsed),
  ]
  const tokenResult = checkToken(html, spec)
  const a11yIssues: QaIssue[] = [
    ...checkContrast(parsed),
    ...checkActionableText(parsed),
  ]
  const a11yResult: QaSectionResult = { ok: a11yIssues.length === 0, issues: a11yIssues }
  const domResult: QaSectionResult = { ok: domIssues.length === 0, issues: domIssues }
  const hasError = [domResult, tokenResult, a11yResult].some(s => s.issues.some(i => i.severity === 'error'))
  return {
    dom: domResult,
    token: tokenResult,
    a11y: a11yResult,
    overall: !hasError,
  }
}

/** DesignSpecV2 是 DesignSpec 的同义别名（向前兼容 brandAssets） */
export type DesignSpecV2 = DesignSpec

export function formatQaResult(result: QaResult): string {
  const lines: string[] = []
  const push = (name: string, sec: QaSectionResult) => {
    const icon = sec.ok ? '✅' : '❌'
    lines.push(`${icon} ${name}: ${sec.issues.length === 0 ? '无问题' : `${sec.issues.length} 个问题`}`)
    for (const i of sec.issues) {
      const tag = i.severity === 'error' ? '[错误]' : '[警告]'
      lines.push(`  - ${tag} ${i.message}${i.location ? `（${i.location}）` : ''}`)
    }
  }
  push('DOM 校验', result.dom)
  push('Token 校验', result.token)
  push('A11y 校验', result.a11y)
  return lines.join('\n')
}
