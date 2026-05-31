import type { CanvasCard, PageType, ColorScheme } from '../stores/canvasStore'
import type { Session } from '../stores/chatStore'

export interface ProjectFile {
  formatVersion: 2
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
  sessions: Session[]
}
