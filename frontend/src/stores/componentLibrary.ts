/**
 * Phase 4 · Task 17：组件库 Pinia store
 *
 * 任务规约：
 *  - 类型 `ComponentInstance { id, name, html, props, designSpecId, createdAt }`
 *  - 方法：`addComponent / removeComponent / listComponents(specId?) / getComponent`
 *  - 按 designSpecId 分组持久化到 localStorage
 *
 * 设计与 canvasStore 的关系：
 *  - 本 store 自有 state（独立于项目状态，跨项目共享）
 *  - 与 canvasStore 共享 `ComponentInstance` 类型，但状态是独立的，
 *    避免项目 reset() 时清空用户的组件库。
 */

import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'

export interface ComponentInstance {
  id: string
  name: string
  html: string
  props?: Record<string, string>
  designSpecId?: string
  createdAt: string
}

const STORAGE_KEY = 'minddesign.componentLibrary.v1'

function loadFromStorage(): ComponentInstance[] {
  if (typeof localStorage === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((x: any) => x && x.id && x.name && x.html)
  } catch {
    return []
  }
}

function saveToStorage(list: ComponentInstance[]) {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
  } catch (e) {
    console.warn('[componentLibrary] save failed', e)
  }
}

let _counter = 0

export const useComponentLibraryStore = defineStore('componentLibrary', () => {
  // ── 状态 ──
  const components = ref<ComponentInstance[]>(loadFromStorage())

  // 持久化
  watch(
    components,
    (val) => {
      saveToStorage(val)
    },
    { deep: true },
  )

  // ── 方法 ──

  /** 任务规约命名：addComponent */
  function addComponent(opts: { name: string; html: string; props?: Record<string, string>; designSpecId?: string }): ComponentInstance {
    _counter++
    const c: ComponentInstance = {
      id: `comp-${Date.now()}-${_counter}`,
      name: opts.name,
      html: opts.html,
      props: opts.props,
      designSpecId: opts.designSpecId,
      createdAt: new Date().toISOString(),
    }
    components.value.push(c)
    return c
  }

  /** 任务规约命名：removeComponent */
  function removeComponent(id: string): boolean {
    const idx = components.value.findIndex(c => c.id === id)
    if (idx < 0) return false
    components.value.splice(idx, 1)
    return true
  }

  /** 任务规约命名：listComponents(specId?) */
  function listComponents(specId?: string | null): ComponentInstance[] {
    if (!specId) return [...components.value]
    return components.value.filter(c => c.designSpecId === specId)
  }

  /** 任务规约命名：getComponent */
  function getComponent(id: string): ComponentInstance | null {
    return components.value.find(c => c.id === id) ?? null
  }

  // ── 派生：按 designSpecId 分组 ──
  const groupedBySpec = computed<Record<string, ComponentInstance[]>>(() => {
    const out: Record<string, ComponentInstance[]> = {}
    for (const c of components.value) {
      const key = c.designSpecId || '__none__'
      if (!out[key]) out[key] = []
      out[key].push(c)
    }
    return out
  })

  function getGroupedBySpec(): Record<string, ComponentInstance[]> {
    return groupedBySpec.value
  }

  function clear() {
    components.value = []
  }

  return {
    components,
    groupedBySpec,
    addComponent,
    removeComponent,
    listComponents,
    getComponent,
    getGroupedBySpec,
    clear,
  }
})
