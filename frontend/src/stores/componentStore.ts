/**
 * Phase 4 · Task 17：组件库 Pinia store（对外门面）
 *
 * 任务规约：
 * - 类型 `StoredComponent = { id, name, html, props, designSpecId, category, createdAt }`
 * - `components: StoredComponent[]` 持久化到 localStorage
 * - 方法：`addComponent / removeComponent / getBySpec / instantiate(componentId): html`
 *
 * 实现策略：
 * - 内部状态与持久化复用 componentLibrary.ts（避免双源）
 * - category 字段是规约中的扩展字段，存于 props 旁（向后兼容）
 */

import { defineStore } from 'pinia'
import { computed } from 'vue'
import { useComponentLibraryStore, type ComponentInstance } from './componentLibrary'

/** 任务规约类型（在 ComponentInstance 基础上加 category 字段） */
export interface StoredComponent extends ComponentInstance {
  /** 任务规约字段：分类（如 "按钮 / 卡片 / 导航"） */
  category?: string
}

export const useComponentStore = defineStore('componentStore', () => {
  const lib = useComponentLibraryStore()

  const components = computed<StoredComponent[]>(() => {
    // lib.components 是 ComponentInstance[]，结构上与 StoredComponent 兼容
    return lib.components as unknown as StoredComponent[]
  })

  /** 任务规约命名：addComponent */
  function addComponent(opts: {
    name: string
    html: string
    props?: Record<string, string>
    designSpecId?: string
    category?: string
  }): StoredComponent {
    const c = lib.addComponent(opts)
    if (opts.category) {
      // category 写入 props 旁（避免破坏现有类型）
      c.props = { ...(c.props || {}), __category: opts.category }
    }
    return c as unknown as StoredComponent
  }

  /** 任务规约命名：removeComponent */
  function removeComponent(id: string): boolean {
    return lib.removeComponent(id)
  }

  /** 任务规约命名：getBySpec */
  function getBySpec(specId: string | null): StoredComponent[] {
    return (lib.listComponents(specId) as unknown as StoredComponent[])
  }

  /** 任务规约命名：getComponent */
  function getComponent(id: string): StoredComponent | null {
    return (lib.getComponent(id) as unknown as StoredComponent) ?? null
  }

  /** 任务规约命名：instantiate(componentId) → 组件 HTML */
  function instantiate(componentId: string): string {
    const c = lib.getComponent(componentId)
    if (!c) return ''
    // 任务规约"一处改，多处同步"：直接返回当前 html（保持与 canvasStore 一致）
    return c.html
  }

  /** 任务规约未明说，但常用：按分类过滤 */
  function getByCategory(category: string): StoredComponent[] {
    return components.value.filter(c => (c as any).category === category)
  }

  return {
    components,
    addComponent,
    removeComponent,
    getBySpec,
    getComponent,
    getByCategory,
    instantiate,
  }
})
