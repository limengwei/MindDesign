import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { ElementTree } from '../types/element'
import type { PageType } from '../prompts/page-types'
import type { ColorScheme } from '../prompts/colors'

export type { PageType, ColorScheme }

export interface CanvasCard {
  id: string
  label: string
  tree: ElementTree
  x: number
  y: number
}

export const PAGE_DIMENSIONS: Record<PageType, { width: number; height: number }> = {
  app: { width: 375, height: 812 },
  web: { width: 1440, height: 900 },
  desktop: { width: 1280, height: 800 },
}

let _cardCounter = 0

export const useCanvasStore = defineStore('canvas', () => {
  const cards = ref<CanvasCard[]>([])
  const selectedCardId = ref<string | null>(null)
  const pageType = ref<PageType>('app')
  const colorScheme = ref<ColorScheme>('auto')
  const projectName = ref('未命名项目')
  const viewport = ref({ zoom: 1, scrollX: 0, scrollY: 0 })

  /** 添加一张新卡片，自动排在已有卡片右侧 */
  function addCard(tree: ElementTree, label?: string): CanvasCard {
    _cardCounter++
    const dims = PAGE_DIMENSIONS[pageType.value]
    const gap = 60
    // 计算新卡片 x 位置：放在最后一张卡片右边
    const lastCard = cards.value[cards.value.length - 1]
    const x = lastCard ? lastCard.x + dims.width + gap : 0
    const card: CanvasCard = {
      id: `card-${Date.now()}-${_cardCounter}`,
      label: label || `设计稿 ${cards.value.length + 1}`,
      tree,
      x,
      y: 0,
    }
    cards.value.push(card)
    selectedCardId.value = card.id
    return card
  }

  function selectCard(id: string | null) {
    selectedCardId.value = id
  }

  function setPageType(type: PageType) {
    pageType.value = type
  }

  function setColorScheme(scheme: ColorScheme) {
    colorScheme.value = scheme
  }

  function setProjectName(name: string) {
    projectName.value = name
  }

  function setViewport(z: number, sx: number, sy: number) {
    viewport.value = { zoom: z, scrollX: sx, scrollY: sy }
  }

  function reset() {
    cards.value = []
    selectedCardId.value = null
    pageType.value = 'app'
    colorScheme.value = 'auto'
    projectName.value = '未命名项目'
    viewport.value = { zoom: 1, scrollX: 0, scrollY: 0 }
  }

  return {
    cards,
    selectedCardId,
    pageType,
    colorScheme,
    projectName,
    viewport,
    addCard,
    selectCard,
    setPageType,
    setColorScheme,
    setProjectName,
    setViewport,
    reset,
  }
})
