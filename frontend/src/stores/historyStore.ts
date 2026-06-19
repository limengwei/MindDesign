/**
 * Phase 4 · Task 16：设计版本与历史 store
 *
 * 任务规约：
 * - 类型 `PageVersion = { id, pageId, html, screenshot, critique, createdAt, label }`
 * - `pageVersions: Record<pageId, PageVersion[]>`，每页最多 20 个
 * - 方法：`pushVersion(pageId, html, screenshot, critique)` / `getVersions(pageId)` /
 *   `rollbackToVersion(versionId)` / `compareVersions(a, b)`
 *
 * 实现策略：
 * - 实际版本数据保存在 canvasStore.Page.versions（避免与已有 Phase 3 实现双源）
 * - 本 store 作为"对外接口层"——提供任务规约中的命名与方法
 * - 通过 canvasStore 复用底层能力，保证数据一致性
 */

import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import { useCanvasStore, MAX_VERSIONS_PER_PAGE, type Version } from './canvasStore'

export interface PageVersion {
  id: string
  pageId: string
  html: string
  screenshot: string
  critique?: string
  createdAt: string
  /** 任务规约字段：label（与 Version.summary 同义） */
  label: string
}

function toPageVersion(v: Version, pageId: string): PageVersion {
  return {
    id: v.id,
    pageId,
    html: v.html,
    screenshot: v.screenshot,
    critique: v.critique,
    createdAt: v.createdAt,
    label: v.summary,
  }
}

export interface VersionDiff {
  added: number
  removed: number
  same: number
}

export const useHistoryStore = defineStore('history', () => {
  // ── 状态：仅一份 pageId 索引映射（实际数据走 canvasStore） ──
  const pageVersions = ref<Record<string, PageVersion[]>>({})

  // ── 派生：每页版本数（去重后取最近 20） ──
  const allPageIds = computed(() => Object.keys(pageVersions.value))

  // ── 同步：每次 canvasStore 的 versions 变化时刷新本地索引 ──
  const canvas = useCanvasStore()
  watch(
    () => canvas.pages.map(p => ({
      id: p.id,
      versions: p.versions.map(v => toPageVersion(v, p.id)),
    })),
    (mappings) => {
      const next: Record<string, PageVersion[]> = {}
      for (const m of mappings) {
        next[m.id] = m.versions
      }
      pageVersions.value = next
    },
    { deep: true, immediate: true },
  )

  /** 任务规约：pushVersion(pageId, html, screenshot, critique) */
  function pushVersion(
    pageId: string,
    html: string,
    screenshot?: string,
    critique?: string,
  ): PageVersion | null {
    // 去重：若最近一版 html 完全相同则跳过
    const existing = pageVersions.value[pageId] || []
    const last = existing[existing.length - 1]
    if (last && last.html === html) return last
    const v = canvas.pushVersion(pageId, html, screenshot, critique)
    if (!v) return null
    return toPageVersion(v, pageId)
  }

  /** 任务规约：getVersions(pageId) */
  function getVersions(pageId: string): PageVersion[] {
    return pageVersions.value[pageId] || []
  }

  /** 任务规约：rollbackToVersion(versionId) */
  function rollbackToVersion(versionId: string): PageVersion | null {
    // 通过 canvasStore 找到这个 version 所属的 page
    for (const page of canvas.pages) {
      const hit = page.versions.find(v => v.id === versionId)
      if (hit) {
        const v = canvas.rollbackToVersion(page.id, versionId)
        return v ? toPageVersion(v, page.id) : null
      }
    }
    return null
  }

  /** 任务规约：compareVersions(a, b) */
  function compareVersions(aId: string, bId: string): VersionDiff | null {
    let pageId: string | null = null
    for (const page of canvas.pages) {
      if (page.versions.find(v => v.id === aId) && page.versions.find(v => v.id === bId)) {
        pageId = page.id
        break
      }
    }
    if (!pageId) return null
    const result = canvas.compareVersions(pageId, aId, bId)
    if (!result) return null
    return result.diff
  }

  function getVersion(versionId: string): PageVersion | null {
    for (const list of Object.values(pageVersions.value)) {
      const hit = list.find(v => v.id === versionId)
      if (hit) return hit
    }
    return null
  }

  function getVersionsByPage(pageId: string) {
    return getVersions(pageId)
  }

  return {
    pageVersions,
    allPageIds,
    pushVersion,
    getVersions,
    getVersion,
    getVersionsByPage,
    rollbackToVersion,
    compareVersions,
    maxPerPage: MAX_VERSIONS_PER_PAGE,
  }
})
