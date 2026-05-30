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

export interface AutoLayout {
  direction: 'row' | 'column'
  gap?: number
  padding?: number | [number, number, number, number]
  align?: 'start' | 'center' | 'end' | 'stretch'
  wrap?: boolean
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

  children?: ElementTree[]
}
