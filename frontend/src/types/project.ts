import type { CanvasCard, PageType, ColorScheme, DesignSpecId } from '../stores/canvasStore'
import type { Session } from '../stores/chatStore'
import type { ProductBlueprint } from '../prompts/blueprint'

export interface ProjectMeta {
  formatVersion: 3
  meta: {
    name: string
    createdAt: string
    updatedAt: string
    appVersion: string
  }
  canvas: {
    pageType: PageType
    colorScheme: ColorScheme
    designSpecId?: DesignSpecId
    customDesignContent?: string
    viewport: {
      zoom: number
      scrollX: number
      scrollY: number
    }
  }
  productBlueprint?: ProductBlueprint
}

export interface ProjectCards {
  cards: CanvasCard[]
}

export interface ProjectSessions {
  sessions: Session[]
}
