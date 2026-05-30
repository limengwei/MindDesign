import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { ElementTree } from '../types/element'
import type { PageType } from '../prompts/page-types'
import type { ColorScheme } from '../prompts/colors'

export type { PageType, ColorScheme }

export const PAGE_DIMENSIONS: Record<PageType, { width: number; height: number }> = {
  app: { width: 375, height: 812 },
  web: { width: 1440, height: 900 },
  desktop: { width: 1280, height: 800 },
}

export const useCanvasStore = defineStore('canvas', () => {
  const currentTree = ref<ElementTree | null>(null)
  const previousTree = ref<ElementTree | null>(null)
  const pageType = ref<PageType>('app')
  const colorScheme = ref<ColorScheme>('auto')
  const projectName = ref('未命名项目')

  function setTree(tree: ElementTree) {
    previousTree.value = currentTree.value
    currentTree.value = tree
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

  function reset() {
    currentTree.value = null
    previousTree.value = null
    pageType.value = 'app'
    colorScheme.value = 'auto'
    projectName.value = '未命名项目'
  }

  return {
    currentTree,
    previousTree,
    pageType,
    colorScheme,
    projectName,
    setTree,
    setPageType,
    setColorScheme,
    setProjectName,
    reset,
  }
})
