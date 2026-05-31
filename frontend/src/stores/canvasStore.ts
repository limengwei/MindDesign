import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { PageType } from '../prompts/page-types'
import type { ColorScheme } from '../prompts/colors'

export type { PageType, ColorScheme }

export interface CanvasCard {
  id: string
  label: string
  html: string
  screenshot: string
  x: number
  y: number
  width: number
  height: number
  sessionId?: string
  parentId?: string
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
  const isGenerating = ref(false)
  const generatingCardId = ref<string | null>(null)
  const currentFilePath = ref('')
  const createdAt = ref('')

  function addCard(html: string, screenshot: string, label?: string, sessionId?: string, parentId?: string): CanvasCard {
    _cardCounter++
    const dims = PAGE_DIMENSIONS[pageType.value]
    const gap = 60
    const lastCard = cards.value[cards.value.length - 1]
    const x = lastCard ? lastCard.x + lastCard.width + gap : 0
    const card: CanvasCard = {
      id: `card-${Date.now()}-${_cardCounter}`,
      label: label || `设计稿 ${cards.value.length + 1}`,
      html,
      screenshot,
      x,
      y: 0,
      width: dims.width,
      height: dims.height,
      sessionId,
      parentId,
    }
    cards.value.push(card)
    selectedCardId.value = card.id
    return card
  }

  function updateLastCardScreenshot(screenshot: string) {
    const last = cards.value[cards.value.length - 1]
    if (last) last.screenshot = screenshot
  }

  function updateLastCardHtml(html: string) {
    const last = cards.value[cards.value.length - 1]
    if (last) last.html = html
  }

  function updateCardContent(id: string, html: string, screenshot: string) {
    const card = cards.value.find(c => c.id === id)
    if (card) {
      card.html = html
      card.screenshot = screenshot
    }
  }

  function setGeneratingCardId(id: string | null) {
    generatingCardId.value = id
    isGenerating.value = id !== null
  }

  function selectCard(id: string | null) {
    selectedCardId.value = id
  }

  function removeCard(id: string) {
    cards.value = cards.value.filter(c => c.id !== id)
    if (selectedCardId.value === id) selectedCardId.value = null
  }

  function setPageType(type: PageType) { pageType.value = type }
  function setColorScheme(scheme: ColorScheme) { colorScheme.value = scheme }
  function setProjectName(name: string) { projectName.value = name }
  function setViewport(z: number, sx: number, sy: number) { viewport.value = { zoom: z, scrollX: sx, scrollY: sy } }
  function setGenerating(val: boolean) { isGenerating.value = val }
  function setCurrentFilePath(path: string) { currentFilePath.value = path }
  function setCreatedAt(date: string) { createdAt.value = date }

  function reset() {
    cards.value = []
    selectedCardId.value = null
    pageType.value = 'app'
    colorScheme.value = 'auto'
    projectName.value = '未命名项目'
    viewport.value = { zoom: 1, scrollX: 0, scrollY: 0 }
    isGenerating.value = false
    generatingCardId.value = null
    currentFilePath.value = ''
    createdAt.value = ''
  }

  return {
    cards, selectedCardId,
    pageType, colorScheme, projectName, viewport, isGenerating, generatingCardId, currentFilePath, createdAt,
    addCard, updateLastCardScreenshot, updateLastCardHtml, updateCardContent, removeCard, selectCard,
    setPageType, setColorScheme, setProjectName, setViewport, setGenerating, setGeneratingCardId,
    setCurrentFilePath, setCreatedAt, reset,
  }
})
