import {
  Rect,
  Text,
  Frame,
  Image,
  Group,
  Ellipse,
  Box,
  Path,
  Line,
  Star,
  Polygon,
} from 'leafer-ui'
import type { ElementTree, AutoLayout } from '../types/element'
import { createLeaferIcon } from '../icons/icon-loader'

type AnyLeaf = Rect | Text | Frame | Image | Group | Ellipse | Box | Path | Line | Star | Polygon

function mapFlexAlign(align?: string): string | undefined {
  switch (align) {
    case 'start': return 'flex-start'
    case 'center': return 'center'
    case 'end': return 'flex-end'
    case 'stretch': return 'stretch'
    default: return 'flex-start'
  }
}

function autoLayoutPadding(p: AutoLayout['padding']): [number, number, number, number] | number | undefined {
  if (p === undefined) return undefined
  if (typeof p === 'number') return p
  return p as [number, number, number, number]
}

function mapAutoLayout(layout: AutoLayout) {
  return {
    display: 'flex' as const,
    flexDirection: layout.direction === 'column' ? 'column' as const : 'row' as const,
    gap: layout.gap,
    padding: autoLayoutPadding(layout.padding),
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
    scaleX: node.scaleX,
    scaleY: node.scaleY,
    skewX: node.skewX,
    skewY: node.skewY,
    zIndex: node.zIndex,
    shadow: node.shadow,
    innerShadow: node.innerShadow,
    blur: node.blur,
    blendMode: node.blendMode as any,
    cursor: node.cursor,
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
        overflow: node.overflow ?? 'show',
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
        lineHeight: node.lineHeight,
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

    case 'Star':
      return new Star({
        ...commonProps(node),
        ...sizeProps(node),
        fill: node.fill,
        stroke: node.stroke,
        strokeWidth: node.strokeWidth,
        corners: node.corners ?? 5,
        innerRadius: node.innerRadius,
      })

    case 'Polygon':
      return new Polygon({
        ...commonProps(node),
        ...sizeProps(node),
        fill: node.fill,
        stroke: node.stroke,
        strokeWidth: node.strokeWidth,
        sides: node.corners ?? 6,
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
