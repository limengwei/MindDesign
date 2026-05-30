import type { ElementTree } from './element'

export interface ProjectFile {
  formatVersion: 1
  meta: {
    name: string
    createdAt: string
    updatedAt: string
    appVersion: string
  }
  canvas: {
    tree: ElementTree | null
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
