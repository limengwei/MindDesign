import {
  Leafer,
  Rect,
  Text,
  Frame,
  Image,
  Group,
  Ellipse,
  Box,
  Path,
  Line,
} from 'leafer-ui'
import type { ElementTree, AutoLayout } from '../types/element'
import { createLeaferIcon } from '../icons/icon-loader'

type AnyLeaf = Rect | Text | Frame | Image | Group | Ellipse | Box | Path | Line

function mapFlexAlign(align?: string): string | undefined {
  switch (align) {
    case 'start': return 'flex-start'
    case 'center': return 'center'
    case 'end': return 'flex-end'
    case 'stretch': return 'stretch'
    default: return 'flex-start'
  }
}

function mapAutoLayout(layout: AutoLayout) {
  return {
    display: 'flex' as const,
    flexDirection: layout.direction === 'column' ? 'column' as const : 'row' as const,
    gap: layout.gap,
    padding: layout.padding,
    alignItems: mapFlexAlign(layout.align),
    justifyContent: mapFlexAlign(layout.align),
    flexWrap: layout.wrap ? 'wrap' as const : 'nowrap' as const,
  }
}

function commonProps(node: ElementTree) {
  return {
    id: node.id,
    x: node.x ?? 0,
    y: node.y ?? 0,
    opacity: node.opacity,
    visible: node.visible,
    rotation: node.rotation,
  }
}

function sizeProps(node: ElementTree) {
  return {
    width: node.width === 'fill' ? undefined : node.width,
    height: node.height === 'fill' ? undefined : node.height,
  }
}

export function buildElement(node: ElementTree): AnyLeaf | Promise<AnyLeaf> {
  switch (node.type) {
    case 'Frame': {
      const flex = node.autoLayout
      return new Frame({
        ...commonProps(node),
        ...sizeProps(node),
        fill: node.fill,
        cornerRadius: node.cornerRadius,
        ...(flex ? mapAutoLayout(flex) : { display: 'block' }),
        overflow: 'show',
        children: [],
      })
    }

    case 'Rect':
      return new Rect({
        ...commonProps(node),
        ...sizeProps(node),
        fill: node.fill,
        cornerRadius: node.cornerRadius,
        stroke: node.stroke,
        strokeWidth: node.strokeWidth,
      })

    case 'Text':
      return new Text({
        ...commonProps(node),
        text: node.text ?? '',
        width: node.width === 'fill' ? undefined : (node.width as number | undefined),
        height: node.height === 'fill' ? undefined : (node.height as number | undefined),
        fill: node.fill ?? node.color ?? '#333333',
        fontSize: node.fontSize,
        fontWeight: node.fontWeight,
        fontFamily:
          node.fontFamily ??
          "-apple-system, 'PingFang SC', 'Microsoft YaHei', 'Noto Sans SC', sans-serif",
        textAlign: node.textAlign,
        letterSpacing: node.letterSpacing,
      })

    case 'Icon':
      return createLeaferIcon(
        node.name ?? 'help',
        node.size ?? 24,
        node.color ?? '#333333'
      ).then((img) => {
        img.id = node.id
        img.x = node.x ?? 0
        img.y = node.y ?? 0
        return img
      })

    case 'Ellipse':
      return new Ellipse({
        ...commonProps(node),
        width: node.width as number,
        height: node.height as number,
        fill: node.fill,
        stroke: node.stroke,
        strokeWidth: node.strokeWidth,
      })

    case 'Image':
      return new Image({
        ...commonProps(node),
        url: node.url,
        width: node.width as number,
        height: node.height as number,
      })

    case 'Group':
      return new Group({
        ...commonProps(node),
        children: [],
      })

    case 'Box': {
      const flex = node.autoLayout
      return new Box({
        ...commonProps(node),
        ...sizeProps(node),
        fill: node.fill,
        cornerRadius: node.cornerRadius,
        stroke: node.stroke,
        strokeWidth: node.strokeWidth,
        ...(flex ? mapAutoLayout(flex) : {}),
        children: [],
      })
    }

    case 'Path':
      return new Path({
        ...commonProps(node),
        path: node.path,
        width: node.width as number,
        height: node.height as number,
        fill: node.fill,
        stroke: node.stroke,
        strokeWidth: node.strokeWidth,
      })

    case 'Line':
      return new Line({
        ...commonProps(node),
        points: node.points,
        stroke: node.stroke ?? '#333333',
        strokeWidth: node.strokeWidth ?? 1,
      })

    default:
      console.warn('Unknown element type:', (node as ElementTree).type)
      return new Rect({ ...commonProps(node), width: 10, height: 10, fill: '#ff0000' })
  }
}

export async function buildTree(node: ElementTree): Promise<AnyLeaf> {
  const element = await buildElement(node)

  if (node.children && 'children' in element) {
    for (const child of node.children) {
      const childElement = await buildTree(child)
      ;(element as any).add(childElement)
    }
  }

  return element
}

function collectIds(node: ElementTree): Set<string> {
  const ids = new Set<string>()
  if (node.id) ids.add(node.id)
  if (node.children) {
    for (const child of node.children) {
      for (const id of collectIds(child)) ids.add(id)
    }
  }
  return ids
}

export async function applyTree(
  leafer: Leafer,
  newTree: ElementTree,
  _oldTree: ElementTree | null
): Promise<void> {
  leafer.clear()
  const root = await buildTree(newTree)
  leafer.add(root)
}

export async function diffUpdate(
  leafer: Leafer,
  newTree: ElementTree,
  oldTree: ElementTree | null
): Promise<void> {
  if (!oldTree) {
    return applyTree(leafer, newTree, null)
  }

  const oldIds = collectIds(oldTree)
  const newIds = collectIds(newTree)

  for (const id of oldIds) {
    if (!newIds.has(id)) {
      const el = (leafer as any).findById?.(id)
      if (el) el.remove()
    }
  }

  await applyTree(leafer, newTree, oldTree)
}

export function renderStreaming(
  _leafer: Leafer,
  chunk: Partial<ElementTree>
): void {
  console.log('Streaming chunk:', chunk)
}
