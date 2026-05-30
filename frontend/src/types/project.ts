import type { ElementTree } from './element'

import type { ElementTree } from './element'
import type { CanvasCard } from '../stores/canvasStore'

export interface ProjectFile {
  formatVersion: 1
  meta: {
    name: string
    createdAt: string
    updatedAt: string
    appVersion: string
  }
  canvas: {
    cards: CanvasCard[]
    viewport: {
      zoom: number
      scrollX: number
      scrollY: number
    }
  }
  chat: {
    role: 'user' | 'assistant'
    content: string
    timestamp: string
  }[]
}
