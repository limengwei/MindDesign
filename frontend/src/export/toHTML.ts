import type { ElementTree } from '../types/element'
import { loadIconSvg, colorizeSvg, getSvgCache } from '../icons/icon-loader'

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function autoLayoutToCSS(layout: ElementTree['autoLayout']): string {
  if (!layout) return ''
  const parts: string[] = []
  parts.push('display:flex')
  parts.push(`flex-direction:${layout.direction}`)
  if (layout.gap) parts.push(`gap:${layout.gap}px`)
  if (layout.padding) {
    if (typeof layout.padding === 'number') {
      parts.push(`padding:${layout.padding}px`)
    } else {
      parts.push(`padding:${layout.padding.map(v => `${v}px`).join(' ')}`)
    }
  }
  if (layout.align) {
    const alignMap: Record<string, string> = {
      start: 'flex-start',
      center: 'center',
      end: 'flex-end',
      stretch: 'stretch',
    }
    parts.push(`align-items:${alignMap[layout.align] || 'flex-start'}`)
    parts.push(`justify-content:${alignMap[layout.align] || 'flex-start'}`)
  }
  if (layout.wrap) parts.push('flex-wrap:wrap')
  return parts.join(';')
}

function sizeToCSS(node: ElementTree): string {
  const parts: string[] = []
  if (node.width !== undefined) {
    if (node.width === 'fill') parts.push('width:100%')
    else parts.push(`width:${node.width}px`)
  }
  if (node.height !== undefined) {
    if (node.height === 'fill') parts.push('height:100%')
    else parts.push(`height:${node.height}px`)
  }
  return parts.join(';')
}

function commonStyleCSS(node: ElementTree): string {
  const parts: string[] = []
  if (node.fill) parts.push(`background:${node.fill}`)
  if (node.opacity !== undefined) parts.push(`opacity:${node.opacity}`)
  if (node.cornerRadius) {
    if (typeof node.cornerRadius === 'number') {
      parts.push(`border-radius:${node.cornerRadius}px`)
    } else {
      parts.push(`border-radius:${node.cornerRadius.map(v => `${v}px`).join(' ')}`)
    }
  }
  if (node.stroke) parts.push(`border:${node.strokeWidth || 1}px solid ${node.stroke}`)
  if (node.rotation) parts.push(`transform:rotate(${node.rotation}deg)`)
  return parts.join(';')
}

/** 收集元素树中所有图标名并批量预加载，避免串行 await */
function collectIconNames(node: ElementTree): Set<string> {
  const names = new Set<string>()
  if (node.type === 'Icon' && node.name) names.add(node.name)
  if (node.children) {
    for (const child of node.children) {
      collectIconNames(child).forEach(n => names.add(n))
    }
  }
  return names
}

async function preloadIcons(tree: ElementTree): Promise<void> {
  const names = collectIconNames(tree)
  await Promise.all(Array.from(names).map(name => loadIconSvg(name)))
}

async function iconToHTML(name: string, size: number, color: string): Promise<string> {
  const cached = getSvgCache(name)
  if (!cached) return `<span style="width:${size}px;height:${size}px;display:inline-block;background:#ccc;border-radius:4px"></span>`
  const colored = colorizeSvg(cached, color)
  return colored.replace(
    '<svg ',
    `<svg width="${size}" height="${size}" `
  )
}

export async function elementToHTML(node: ElementTree, indent = ''): Promise<string> {
  switch (node.type) {
    case 'Frame': {
      const flexCSS = autoLayoutToCSS(node.autoLayout)
      const sizeCSS = sizeToCSS(node)
      const commonCSS = commonStyleCSS(node)
      const style = [flexCSS || 'display:block', sizeCSS, commonCSS].filter(Boolean).join(';')

      let childrenHTML = ''
      if (node.children) {
        for (const child of node.children) {
          childrenHTML += '\n' + await elementToHTML(child, indent + '  ')
        }
      }
      return `${indent}<div style="${style}">${childrenHTML}\n${indent}</div>`
    }

    case 'Rect': {
      const sizeCSS = sizeToCSS(node)
      const commonCSS = commonStyleCSS(node)
      const style = [sizeCSS, commonCSS].filter(Boolean).join(';')
      let childrenHTML = ''
      if (node.children) {
        for (const child of node.children) {
          childrenHTML += '\n' + await elementToHTML(child, indent + '  ')
        }
      }
      return `${indent}<div style="${style}">${childrenHTML}\n${indent}</div>`
    }

    case 'Text': {
      const parts: string[] = []
      parts.push(`font-size:${node.fontSize || 14}px`)
      if (node.fontWeight) parts.push(`font-weight:${node.fontWeight}`)
      if (node.fill || node.color) parts.push(`color:${node.fill || node.color}`)
      if (node.textAlign) parts.push(`text-align:${node.textAlign}`)
      if (node.lineHeight) parts.push(`line-height:${node.lineHeight}`)
      parts.push("font-family:-apple-system,'PingFang SC','Microsoft YaHei','Noto Sans SC',sans-serif")
      const style = parts.join(';')
      return `${indent}<span style="${style}">${escapeHtml(node.text || '')}</span>`
    }

    case 'Icon': {
      const svg = await iconToHTML(
        node.name || 'help',
        node.size || 24,
        node.color || '#333'
      )
      return `${indent}${svg}`
    }

    case 'Ellipse': {
      const sizeCSS = sizeToCSS(node)
      const commonCSS = commonStyleCSS(node)
      const style = [sizeCSS, commonCSS, 'border-radius:50%'].filter(Boolean).join(';')
      return `${indent}<div style="${style}"></div>`
    }

    case 'Image': {
      const sizeCSS = sizeToCSS(node)
      const style = [sizeCSS].filter(Boolean).join(';')
      return `${indent}<img src="${node.url || ''}" style="${style}" />`
    }

    case 'Group': {
      let childrenHTML = ''
      if (node.children) {
        for (const child of node.children) {
          childrenHTML += '\n' + await elementToHTML(child, indent + '  ')
        }
      }
      return `${indent}<div style="position:relative">${childrenHTML}\n${indent}</div>`
    }

    case 'Box': {
      const flexCSS = autoLayoutToCSS(node.autoLayout)
      const sizeCSS = sizeToCSS(node)
      const commonCSS = commonStyleCSS(node)
      const style = [flexCSS, sizeCSS, commonCSS].filter(Boolean).join(';')
      let childrenHTML = ''
      if (node.children) {
        for (const child of node.children) {
          childrenHTML += '\n' + await elementToHTML(child, indent + '  ')
        }
      }
      return `${indent}<div style="${style}">${childrenHTML}\n${indent}</div>`
    }

    case 'Path': {
      return `${indent}<svg width="${node.width || 24}" height="${node.height || 24}" viewBox="0 0 ${node.width || 24} ${node.height || 24}"><path d="${node.path || ''}" fill="${node.fill || 'none'}" stroke="${node.stroke || 'none'}" stroke-width="${node.strokeWidth || 1}" /></svg>`
    }

    case 'Line': {
      return `${indent}<svg><polyline points="${(node.points || []).join(',')}" stroke="${node.stroke || '#333'}" stroke-width="${node.strokeWidth || 1}" fill="none" /></svg>`
    }

    default:
      return `${indent}<!-- unknown element type: ${(node as ElementTree).type} -->`
  }
}

export async function generateHTML(tree: ElementTree, title = 'MindDesign Export'): Promise<string> {
  // 预加载所有图标（并行），避免串行 await
  await preloadIcons(tree)
  const body = await elementToHTML(tree, '    ')

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      display: flex; justify-content: center; align-items: center;
      min-height: 100vh; background: #f0f0f0;
      font-family: -apple-system, 'PingFang SC', 'Microsoft YaHei', 'Noto Sans SC', sans-serif;
    }
  </style>
</head>
<body>
${body}
</body>
</html>`
}
