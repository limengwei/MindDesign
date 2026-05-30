import type { CanvasCard, PageType, ColorScheme } from '../stores/canvasStore'

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
    pageType: PageType
    colorScheme: ColorScheme
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
