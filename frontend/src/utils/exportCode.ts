/**
 * Phase 3: Task 13 - 代码片段导出
 *  - HTML → Tailwind 配置（颜色 token + 字体栈 + 圆角）
 *  - HTML → CSS Variables（保留原结构，注入 :root 变量）
 *  - HTML → Vue 3 SFC
 *  - HTML → React 函数组件
 *
 * 所有片段不依赖网络字体（系统字体兜底）
 */

import type { DesignSpec } from '../prompts/designSpecs'

export type CodeFormat = 'tailwind' | 'css-vars' | 'vue' | 'react'

const SYSTEM_FONT_STACK = "-apple-system, 'PingFang SC', 'Microsoft YaHei', 'Segoe UI', Roboto, sans-serif"

function pickSpec(spec: DesignSpec | null | undefined): DesignSpec | null {
  return spec ?? null
}

/** 从 inline style 中提取一个元素所用的关键颜色（首色与背景） */
function extractPrimaryColor(html: string): string {
  const m = html.match(/background(?:-color)?\s*:\s*(#[0-9a-f]{3,8}|rgba?\([^)]+\))/i)
  if (m) return m[1]
  return '#4F46E5'
}

function extractAccentColor(html: string): string {
  const m = html.match(/color\s*:\s*(#[0-9a-f]{3,8}|rgba?\([^)]+\))/i)
  if (m) return m[1]
  return '#22d3ee'
}

/**
 * Tailwind: 颜色 token + 字体栈 + 圆角
 */
export function toTailwind(html: string, spec: DesignSpec | null | undefined): string {
  const s = pickSpec(spec)
  const primary = s?.colors?.primary || extractPrimaryColor(html)
  const secondary = s?.colors?.accent || extractAccentColor(html)
  const bg = s?.colors?.background || '#ffffff'
  const text = s?.colors?.text || '#0f172a'
  const surface = s?.colors?.surface || '#f8fafc'
  const radius = s?.borderRadius || '12px'

  return `// tailwind.config.js
// MindDesign 自动生成 — 颜色 token + 字体栈 + 圆角
// 用法：require('./tailwind.config')，或在 CSS 里 @apply text-brand
module.exports = {
  content: ['./src/**/*.{vue,tsx,jsx,html}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '${primary}',
          accent: '${secondary}',
          bg: '${bg}',
          surface: '${surface}',
          text: '${text}',
        },
      },
      fontFamily: {
        sans: [\`-apple-system\`, 'PingFang SC', 'Microsoft YaHei', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      borderRadius: {
        brand: '${radius}',
      },
    },
  },
  plugins: [],
}
`
}

/**
 * CSS Variables: 保留原结构，注入 :root 变量与 .brand-* class
 */
export function toCssVariables(html: string, spec: DesignSpec | null | undefined): string {
  const s = pickSpec(spec)
  const primary = s?.colors?.primary || extractPrimaryColor(html)
  const secondary = s?.colors?.accent || extractAccentColor(html)
  const bg = s?.colors?.background || '#ffffff'
  const text = s?.colors?.text || '#0f172a'
  const surface = s?.colors?.surface || '#f8fafc'
  const border = s?.colors?.border || '#e2e8f0'
  const radius = s?.borderRadius || '12px'

  const css = `:root {
  --color-brand: ${primary};
  --color-brand-accent: ${secondary};
  --color-bg: ${bg};
  --color-surface: ${surface};
  --color-text: ${text};
  --color-border: ${border};
  --radius-brand: ${radius};
  --font-sans: ${SYSTEM_FONT_STACK};
}

body {
  background: var(--color-bg);
  color: var(--color-text);
  font-family: var(--font-sans);
}

.brand-btn {
  background: var(--color-brand);
  color: #fff;
  border-radius: var(--radius-brand);
}
.brand-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-brand);
}
`

  // 提取 body 内的实际 HTML
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
  const bodyContent = bodyMatch ? bodyMatch[1] : html
  // 提取 <style> 块
  const styleMatch = html.match(/<style[^>]*>([\s\S]*?)<\/style>/i)
  const originalStyle = styleMatch ? styleMatch[1] : ''

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>MindDesign CSS Variables</title>
<style>
${css}
/* ── 原始样式（已剔除外部字体） ── */
${(originalStyle || '').replace(/@import[^;]+;/g, '')}
</style>
</head>
<body>
${bodyContent}
</body>
</html>
`
}

function stripStyleAndBody(rawHtml: string): { style: string; body: string } {
  const bodyMatch = rawHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
  const body = bodyMatch ? bodyMatch[1] : rawHtml
  const styleMatch = rawHtml.match(/<style[^>]*>([\s\S]*?)<\/style>/i)
  const style = styleMatch ? styleMatch[1] : ''
  return { style, body }
}

/** 把 bodyContent 里顶级子元素提取成 Vue template 节点 */
function bodyToTemplate(body: string): string {
  // 简单：把 body 顶层内容整体放进 template
  return body.trim()
}

/**
 * Vue 3 SFC
 */
export function toVueSfc(rawHtml: string, spec: DesignSpec | null | undefined, opts?: { componentName?: string }): string {
  const name = opts?.componentName || 'DesignPage'
  const { style, body } = stripStyleAndBody(rawHtml)
  const s = pickSpec(spec)
  const primary = s?.colors?.primary || extractPrimaryColor(rawHtml)
  const radius = s?.borderRadius || '12px'

  return `<script setup lang="ts">
// MindDesign 自动生成的 Vue 3 SFC
// props 中可继续暴露 colors/title/items 等
defineProps<{
  title?: string
}>()
</script>

<template>
${bodyToTemplate(body)}
</template>

<style scoped>
/* 原始样式（去掉外部字体引用） */
${(style || '').replace(/@import[^;]+;/g, '')}

:root {
  --color-brand: ${primary};
  --radius-brand: ${radius};
  --font-sans: ${SYSTEM_FONT_STACK};
}

body {
  font-family: var(--font-sans);
}
</style>
`
}

/**
 * React 函数组件
 */
export function toReactComponent(rawHtml: string, spec: DesignSpec | null | undefined, opts?: { componentName?: string }): string {
  const name = opts?.componentName || 'DesignPage'
  const { style, body } = stripStyleAndBody(rawHtml)
  const s = pickSpec(spec)
  const primary = s?.colors?.primary || extractPrimaryColor(rawHtml)
  const secondary = s?.colors?.accent || extractAccentColor(rawHtml)
  const radius = s?.borderRadius || '12px'

  return `import React from 'react'

// MindDesign 自动生成的 React 函数组件
// props 中可继续暴露 colors/title/items 等
export interface ${name}Props {
  title?: string
  primaryColor?: string
  accentColor?: string
  borderRadius?: string
}

export const ${name}: React.FC<${name}Props> = ({
  title = 'MindDesign',
  primaryColor = '${primary}',
  accentColor = '${secondary}',
  borderRadius = '${radius}',
}) => {
  return (
    <div style={{
      fontFamily: ${JSON.stringify(SYSTEM_FONT_STACK)},
      color: '#0f172a',
      background: '#ffffff',
    }}>
      <style>{\`${(style || '').replace(/@import[^;]+;/g, '')}\`}</style>
${bodyToTemplate(body)
    .replace(/class=/g, 'className=')
    .split('\n')
    .map(line => '      ' + line)
    .join('\n')}
    </div>
  )
}

export default ${name}
`
}

export function convertCode(format: CodeFormat, html: string, spec: DesignSpec | null | undefined, opts?: { componentName?: string }): string {
  switch (format) {
    case 'tailwind': return toTailwind(html, spec)
    case 'css-vars': return toCssVariables(html, spec)
    case 'vue': return toVueSfc(html, spec, opts)
    case 'react': return toReactComponent(html, spec, opts)
    default: return html
  }
}
