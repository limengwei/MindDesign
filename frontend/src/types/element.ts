export type ElementType =
  | 'Frame'
  | 'Rect'
  | 'Text'
  | 'Icon'
  | 'Ellipse'
  | 'Image'
  | 'Group'
  | 'Box'
  | 'Path'
  | 'Line'
  | 'Star'
  | 'Polygon'

export interface AutoLayout {
  direction: 'row' | 'column'
  gap?: number
  padding?: number | [number, number, number, number]
  align?: 'start' | 'center' | 'end' | 'stretch'
  wrap?: boolean
}

export interface Shadow {
  x?: number
  y?: number
  blur?: number
  color: string
  spread?: number
}

export interface ElementTree {
  type: ElementType
  id?: string
  x?: number
  y?: number
  width?: number | 'fill'
  height?: number | 'fill'
  fill?: string
  stroke?: string
  strokeWidth?: number
  cornerRadius?: number | [number, number, number, number]
  opacity?: number
  visible?: boolean
  rotation?: number
  scaleX?: number
  scaleY?: number
  skewX?: number
  skewY?: number
  zIndex?: number
  overflow?: 'show' | 'hide'
  shadow?: Shadow | Shadow[]
  innerShadow?: Shadow | Shadow[]
  blur?: number
  blendMode?: string
  cursor?: string

  autoLayout?: AutoLayout

  text?: string
  fontSize?: number
  fontWeight?: number
  fontFamily?: string
  textAlign?: 'left' | 'center' | 'right'
  lineHeight?: number
  letterSpacing?: number
  color?: string

  name?: string
  size?: number

  url?: string

  path?: string

  points?: number[]

  corners?: number
  innerRadius?: number

  children?: ElementTree[]
}
