import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import type { PageType } from '../prompts/page-types'
import type { ColorScheme } from '../prompts/colors'
import type { DesignSpec, DesignSpecId } from '../prompts/designSpecs'
import { getDesignSpecById } from '../prompts/designSpecs'
import type { SkillCategory } from '../prompts/skills'
import type { ProductBlueprint } from '../prompts/blueprint'
import { createEmptyBlueprint, normalizeBlueprint } from '../prompts/blueprint'

export type { PageType, ColorScheme }
export type { DesignSpecId }
export type { SkillCategory }
export type { ProductBlueprint }

/** 历史（向前兼容）—— Phase 1/2 沿用的单画板 */
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

/** Phase 3：变体（一画板的多版本候选） */
export interface Variant {
  id: string
  /** 显示名（用于变体列表） */
  label?: string
  /** 父变体 id（用于"再变体"派生链） */
  parentVariantId?: string
  html: string
  screenshot: string
  critique?: string
  /** 维度：colors / layout / tone */
  dimension?: 'colors' | 'layout' | 'tone' | 'mixed'
  createdAt: string
  /** Phase 4：变体版本号（同一画板下递增） */
  version: number
  /** Phase 4：来源版本 id（仅当"复制版本为新变体"时设置） */
  sourceVersionId?: string
  /** Phase 4：版本时间线（任务规约：history 字段） */
  history?: Version[]
}

/** Phase 4：版本快照（每个画板最多 20 个） */
export interface Version {
  id: string
  html: string
  screenshot: string
  critique?: string
  createdAt: string
  /** 该版本的简述（一句话，由 critique / 操作派生） */
  summary: string
  /** 版本号（同一画板下递增） */
  version: number
}

/** Phase 4：组件库条目 */
export interface Component {
  id: string
  name: string
  html: string
  /** 简单 props 描述（可选） */
  props?: Record<string, string>
  /** 关联的设计规范 id（用于分组） */
  designSpecId?: string
  createdAt: string
}

/** Phase 4 · Task 17 规约：ComponentInstance 别名（与 Component 同义） */
export type ComponentInstance = Component

/** Phase 3：画板（多页项目） */
export interface Page {
  id: string
  name: string
  pageType: PageType
  size: { width: number; height: number }
  /** 正式画板（被采纳的 variant 拷贝到此） */
  html: string
  screenshot: string
  /** 变体历史 */
  variants: Variant[]
  /** Phase 4：版本快照（最近 20 个） */
  versions: Version[]
  sessionId?: string
  parentId?: string
  createdAt: string
  updatedAt: string
}

export const PAGE_DIMENSIONS: Record<PageType, { width: number; height: number }> = {
  app: { width: 375, height: 812 },
  web: { width: 1440, height: 900 },
  desktop: { width: 1280, height: 800 },
}

let _cardCounter = 0
let _pageCounter = 0
let _variantCounter = 0
let _versionCounter = 0
let _componentCounter = 0

const STORAGE_KEY_CUSTOM_SPECS = 'minddesign.customDesignSpecs.v1'
const STORAGE_KEY_DATA_SOURCE = 'minddesign.dataSource.v1'
const STORAGE_KEY_DARK_MODE = 'minddesign.darkMode.v1'
const STORAGE_KEY_COMPONENTS = 'minddesign.components.v1'
/** 每个画板最多保留的版本数 */
export const MAX_VERSIONS_PER_PAGE = 20

/** Phase 3：图片数据源配置 */
export type ImageDataSource = 'placehold' | 'unsplash' | 'local'

/** 旧 cards → 新 pages 迁移（保持 cards 数组不变以兼容旧版 schema） */
export function migrateCardsToPages(cards: CanvasCard[]): Page[] {
  const now = new Date().toISOString()
  return cards.map(c => ({
    id: c.id,
    name: c.label,
    pageType: 'app',
    size: { width: c.width, height: c.height },
    html: c.html,
    screenshot: c.screenshot,
    variants: [],
    versions: [],
    sessionId: c.sessionId,
    parentId: c.parentId,
    createdAt: now,
    updatedAt: now,
  }))
}

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
  const designSpecId = ref<string>('none')
  const customDesignContent = ref('')
  const activeSkillId = ref<string | null>(null)
  const productBlueprint = ref<ProductBlueprint>(createEmptyBlueprint())
  // Phase 2: 视觉方向 + 品牌分析器产生的自定义规范
  const activeDirectionId = ref<string | null>(null)
  const customDesignSpecs = ref<DesignSpec[]>([])

  // ── Phase 3：Pages 模型 ──
  const pages = ref<Page[]>([])
  const currentPageId = ref<string | null>(null)
  // Phase 3：图片数据源
  const imageDataSource = ref<ImageDataSource>('placehold')

  // Phase 4：全局暗色模式（仅控制 UI 主题；不影响导出 HTML）
  const isDarkMode = ref<boolean>(true)
  // Phase 4：组件库
  const components = ref<Component[]>([])

  /**
   * 当前激活的 DesignSpec（可能是内置也可能是品牌分析器生成的自定义规范）。
   * 解析顺序：customDesignSpecs（按 id 匹配）> BUILT_IN_DESIGN_SPECS（按 id 匹配）> null
   */
  function getActiveSpec(): DesignSpec | null {
    const id = designSpecId.value
    if (!id || id === 'none' || id === 'custom') {
      // 兼容：custom id 时回查 customDesignSpecs
      if (id === 'custom') {
        const hit = customDesignSpecs.value[0]
        return hit ?? null
      }
      return null
    }
    const customHit = customDesignSpecs.value.find(s => s.id === id)
    if (customHit) return customHit
    return getDesignSpecById(id as DesignSpecId) ?? null
  }

  // ── 旧 cards API（向前兼容，迁移内部走 pages） ──
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

    // 同步创建 Page（Phase 3 双轨：cards 保留，pages 是新主结构）
    addPageFromCard(card)

    return card
  }

  function updateLastCardScreenshot(screenshot: string) {
    const last = cards.value[cards.value.length - 1]
    if (last) {
      last.screenshot = screenshot
      // 同步到 current page
      const page = currentPageId.value ? pages.value.find(p => p.id === currentPageId.value) : null
      if (page) page.screenshot = screenshot
    }
  }

  function updateLastCardHtml(html: string) {
    const last = cards.value[cards.value.length - 1]
    if (last) {
      last.html = html
      const page = currentPageId.value ? pages.value.find(p => p.id === currentPageId.value) : null
      if (page) page.html = html
    }
  }

  function updateCardContent(id: string, html: string, screenshot: string) {
    const card = cards.value.find(c => c.id === id)
    if (card) {
      card.html = html
      card.screenshot = screenshot
    }
    const page = pages.value.find(p => p.id === id)
    if (page) {
      // 记录历史版本（HTML 变化时），上限 20
      if (page.html && page.html !== html) {
        addVersion(id, { summary: '设计稿更新' })
      }
      page.html = html
      page.screenshot = screenshot
      page.updatedAt = new Date().toISOString()
    }
  }

  function setGeneratingCardId(id: string | null) {
    generatingCardId.value = id
    isGenerating.value = id !== null
  }

  function selectCard(id: string | null) {
    selectedCardId.value = id
    if (id) setCurrentPage(id)
  }

  function removeCard(id: string) {
    cards.value = cards.value.filter(c => c.id !== id)
    removePage(id)
    if (selectedCardId.value === id) selectedCardId.value = null
    relayoutCards()
  }

  function relayoutCards() {
    const gap = 60
    let x = 0
    for (const card of cards.value) {
      card.x = x
      card.y = 0
      x += card.width + gap
    }
  }

  function setPageType(type: PageType) {
    pageType.value = type
    // 同步影响所有 page 尺寸
    const dims = PAGE_DIMENSIONS[type]
    for (const p of pages.value) {
      p.pageType = type
      p.size = { ...dims }
    }
  }
  function setColorScheme(scheme: ColorScheme) { colorScheme.value = scheme }
  function setProjectName(name: string) { projectName.value = name }
  function setViewport(z: number, sx: number, sy: number) { viewport.value = { zoom: z, scrollX: sx, scrollY: sy } }
  function setGenerating(val: boolean) { isGenerating.value = val }
  function setCurrentFilePath(path: string) { currentFilePath.value = path }
  function setCreatedAt(date: string) { createdAt.value = date }
  function setDesignSpecId(id: string) { designSpecId.value = id }
  function setCustomDesignContent(content: string) { customDesignContent.value = content }
  function setActiveSkillId(id: string | null) { activeSkillId.value = id }
  function setProductBlueprint(bp: ProductBlueprint) { productBlueprint.value = normalizeBlueprint(bp) }
  function updateProductBlueprint(update: { action: string; blueprint: ProductBlueprint }) {
    const normalized = normalizeBlueprint(update.blueprint)
    productBlueprint.value = { ...normalized, version: (normalized.version || 0) + 1, lastUpdated: new Date().toISOString() }
  }
  function setActiveDirectionId(id: string | null) { activeDirectionId.value = id }
  function setImageDataSource(src: ImageDataSource) {
    imageDataSource.value = src
    try { localStorage.setItem(STORAGE_KEY_DATA_SOURCE, src) } catch { /* ignore */ }
  }
  function addCustomDesignSpec(spec: DesignSpec) {
    // 同 id 覆盖；避免重复
    const existingIndex = customDesignSpecs.value.findIndex(s => s.id === spec.id)
    if (existingIndex >= 0) {
      customDesignSpecs.value.splice(existingIndex, 1, spec)
    } else {
      customDesignSpecs.value.push(spec)
    }
    try {
      localStorage.setItem(STORAGE_KEY_CUSTOM_SPECS, JSON.stringify(customDesignSpecs.value))
    } catch (e) {
      console.warn('[canvasStore] failed to persist customDesignSpecs', e)
    }
  }
  function removeCustomDesignSpec(id: string) {
    customDesignSpecs.value = customDesignSpecs.value.filter(s => s.id !== id)
    try {
      localStorage.setItem(STORAGE_KEY_CUSTOM_SPECS, JSON.stringify(customDesignSpecs.value))
    } catch (e) {
      console.warn('[canvasStore] failed to persist customDesignSpecs', e)
    }
  }
  function loadCustomDesignSpecs() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_CUSTOM_SPECS)
      if (!raw) return
      const arr = JSON.parse(raw) as DesignSpec[]
      if (Array.isArray(arr)) customDesignSpecs.value = arr
    } catch (e) {
      console.warn('[canvasStore] failed to load customDesignSpecs', e)
    }
    try {
      const src = localStorage.getItem(STORAGE_KEY_DATA_SOURCE) as ImageDataSource | null
      if (src === 'placehold' || src === 'unsplash' || src === 'local') {
        imageDataSource.value = src
      }
    } catch { /* ignore */ }
    try {
      const dark = localStorage.getItem(STORAGE_KEY_DARK_MODE)
      if (dark === 'false') isDarkMode.value = false
      else if (dark === 'true') isDarkMode.value = true
    } catch { /* ignore */ }
    try {
      const compRaw = localStorage.getItem(STORAGE_KEY_COMPONENTS)
      if (compRaw) {
        const arr = JSON.parse(compRaw) as Component[]
        if (Array.isArray(arr)) components.value = arr
      }
    } catch { /* ignore */ }
  }

  // ── Phase 4：暗色模式 ──
  function setDarkMode(v: boolean) {
    isDarkMode.value = v
    try { localStorage.setItem(STORAGE_KEY_DARK_MODE, String(v)) } catch { /* ignore */ }
    applyThemeClass()
  }
  function toggleDarkMode() { setDarkMode(!isDarkMode.value) }
  function applyThemeClass() {
    if (typeof document === 'undefined') return
    const root = document.documentElement
    if (isDarkMode.value) root.classList.add('md-theme-dark')
    else root.classList.remove('md-theme-dark')
  }

  // ── Phase 4：组件库 ──
  function addComponent(opts: { name: string; html: string; props?: Record<string, string>; designSpecId?: string }): Component {
    _componentCounter++
    const c: Component = {
      id: `comp-${Date.now()}-${_componentCounter}`,
      name: opts.name,
      html: opts.html,
      props: opts.props,
      designSpecId: opts.designSpecId,
      createdAt: new Date().toISOString(),
    }
    components.value.push(c)
    try { localStorage.setItem(STORAGE_KEY_COMPONENTS, JSON.stringify(components.value)) } catch { /* ignore */ }
    return c
  }
  function removeComponent(id: string) {
    components.value = components.value.filter(c => c.id !== id)
    try { localStorage.setItem(STORAGE_KEY_COMPONENTS, JSON.stringify(components.value)) } catch { /* ignore */ }
  }

  // ── Phase 3：Pages API ──

  function createPage(opts?: { name?: string; pageType?: PageType; html?: string; screenshot?: string; sessionId?: string; parentId?: string }): Page {
    _pageCounter++
    const dims = PAGE_DIMENSIONS[opts?.pageType ?? pageType.value]
    const now = new Date().toISOString()
    const p: Page = {
      id: opts?.sessionId ? `page-${opts.sessionId}-${_pageCounter}` : `page-${Date.now()}-${_pageCounter}`,
      name: opts?.name ?? `画板 ${pages.value.length + 1}`,
      pageType: opts?.pageType ?? pageType.value,
      size: { ...dims },
      html: opts?.html ?? '',
      screenshot: opts?.screenshot ?? '',
      variants: [],
      versions: [],
      sessionId: opts?.sessionId,
      parentId: opts?.parentId,
      createdAt: now,
      updatedAt: now,
    }
    pages.value.push(p)
    return p
  }

  function addPageFromCard(card: CanvasCard) {
    const p = createPage({
      name: card.label,
      html: card.html,
      screenshot: card.screenshot,
      sessionId: card.sessionId,
      parentId: card.parentId,
    })
    // 复用以便 selectedCardId ↔ pageId 一致
    p.id = card.id
    currentPageId.value = p.id
  }

  function addPage(opts?: { name?: string; pageType?: PageType; html?: string; screenshot?: string }): Page {
    const p = createPage(opts)
    currentPageId.value = p.id
    return p
  }

  function removePage(id: string) {
    pages.value = pages.value.filter(p => p.id !== id)
    if (currentPageId.value === id) {
      currentPageId.value = pages.value[0]?.id ?? null
      if (currentPageId.value) selectedCardId.value = currentPageId.value
    }
  }

  function renamePage(id: string, name: string) {
    const p = pages.value.find(pg => pg.id === id)
    if (p) {
      p.name = name
      p.updatedAt = new Date().toISOString()
    }
  }

  function setCurrentPage(id: string) {
    if (pages.value.some(p => p.id === id)) {
      currentPageId.value = id
    }
  }

  function getCurrentPage(): Page | null {
    if (!currentPageId.value) return null
    return pages.value.find(p => p.id === currentPageId.value) ?? null
  }

  function addVariant(pageId: string, html: string, screenshot: string, opts?: { parentVariantId?: string; dimension?: Variant['dimension']; critique?: string }): Variant | null {
    const p = pages.value.find(pg => pg.id === pageId)
    if (!p) return null
    _variantCounter++
    const version = (p.variants[p.variants.length - 1]?.version ?? 0) + 1
    const v: Variant = {
      id: `var-${Date.now()}-${_variantCounter}`,
      parentVariantId: opts?.parentVariantId,
      html,
      screenshot,
      critique: opts?.critique,
      dimension: opts?.dimension,
      createdAt: new Date().toISOString(),
      version,
    }
    p.variants.push(v)
    p.updatedAt = v.createdAt
    return v
  }

  function adoptVariant(pageId: string, variantId: string) {
    const p = pages.value.find(pg => pg.id === pageId)
    if (!p) return
    const v = p.variants.find(vt => vt.id === variantId)
    if (!v) return
    // 采纳前先记录当前版本
    addVersion(pageId, { summary: `采纳变体 v${v.version}` })
    p.html = v.html
    p.screenshot = v.screenshot
    p.updatedAt = new Date().toISOString()
    // 同步到 cards（双轨）
    const card = cards.value.find(c => c.id === pageId)
    if (card) {
      card.html = v.html
      card.screenshot = v.screenshot
    }
  }

  // ── Phase 4：版本快照 ──
  function addVersion(pageId: string, opts?: { html?: string; screenshot?: string; critique?: string; summary?: string }): Version | null {
    const p = pages.value.find(pg => pg.id === pageId)
    if (!p) return null
    _versionCounter++
    const version = (p.versions[p.versions.length - 1]?.version ?? 0) + 1
    const v: Version = {
      id: `ver-${Date.now()}-${_versionCounter}`,
      html: opts?.html ?? p.html,
      screenshot: opts?.screenshot ?? p.screenshot,
      critique: opts?.critique,
      summary: opts?.summary || `v${version} 自动保存`,
      createdAt: new Date().toISOString(),
      version,
    }
    p.versions.push(v)
    // 限制最多 20 个
    if (p.versions.length > MAX_VERSIONS_PER_PAGE) {
      p.versions.splice(0, p.versions.length - MAX_VERSIONS_PER_PAGE)
    }
    p.updatedAt = v.createdAt
    return v
  }

  function rollbackToVersion(pageId: string, versionId: string): Version | null {
    const p = pages.value.find(pg => pg.id === pageId)
    if (!p) return null
    const v = p.versions.find(ver => ver.id === versionId)
    if (!v) return null
    // 先快照当前状态再回滚
    addVersion(pageId, { summary: `回滚前自动保存` })
    p.html = v.html
    p.screenshot = v.screenshot
    p.updatedAt = new Date().toISOString()
    // 同步到 cards（双轨）
    const card = cards.value.find(c => c.id === pageId)
    if (card) {
      card.html = v.html
      card.screenshot = v.screenshot
    }
    return v
  }

  function compareVersions(pageId: string, versionIdA: string, versionIdB: string) {
    const p = pages.value.find(pg => pg.id === pageId)
    if (!p) return null
    const a = p.versions.find(ver => ver.id === versionIdA)
    const b = p.versions.find(ver => ver.id === versionIdB)
    if (!a || !b) return null
    return {
      a,
      b,
      diff: computeHtmlDiff(a.html, b.html),
    }
  }

  /** 简易 HTML diff（按行）：返回 { added, removed, same } 行数 */
  function computeHtmlDiff(a: string, b: string): { added: number; removed: number; same: number } {
    const al = (a || '').split('\n')
    const bl = (b || '').split('\n')
    const setA = new Set(al)
    const setB = new Set(bl)
    let same = 0
    for (const l of al) if (setB.has(l)) same++
    const removed = al.length - same
    const added = bl.length - same
    return { added, removed, same }
  }

  /**
   * 任务规约中的命名：pushVersion(variantId, html, screenshot, critique)
   * 这里 variantId 实际是 pageId（保留向后兼容：同时接受 variant 形式，即 pageId|variantId）
   */
  function pushVersion(
    pageOrVariantId: string,
    html: string,
    screenshot?: string,
    critique?: string,
  ): Version | null {
    // 解析 "pageId" 或 "pageId|variantId"
    const [pageId] = pageOrVariantId.split('|')
    return addVersion(pageId, { html, screenshot, critique, summary: critique ? `v${(pages.value.find(pg => pg.id === pageId)?.versions.length ?? 0) + 1} ${critique.slice(0, 30)}` : '手动保存' })
  }

  /**
   * 返回页面的版本时间线（含当前态作为 v0 + 倒序历史）
   */
  function getVersionTimeline(pageId: string): Version[] {
    const p = pages.value.find(pg => pg.id === pageId)
    if (!p) return []
    // 倒序：最新在前
    return [...p.versions].reverse()
  }

  /**
   * 把某个历史版本"复制为新变体"：在当前页的 variants 中追加一个变体
   * html / screenshot 取自该版本。
   */
  function copyVersionAsVariant(pageId: string, versionId: string): Variant | null {
    const p = pages.value.find(pg => pg.id === pageId)
    if (!p) return null
    const v = p.versions.find(ver => ver.id === versionId)
    if (!v) return null
    _variantCounter++
    const variant: Variant = {
      id: `var-${Date.now()}-${_variantCounter}`,
      label: `v${v.version} 复制为新变体`,
      html: v.html,
      screenshot: v.screenshot,
      version: (p.variants[p.variants.length - 1]?.version ?? 0) + 1,
      createdAt: new Date().toISOString(),
      sourceVersionId: v.id,
    }
    p.variants.push(variant)
    return variant
  }

  /** 组件库：按 designSpecId 过滤（任务规约命名 listComponents） */
  function listComponents(specId?: string | null): Component[] {
    if (!specId) return components.value
    return components.value.filter(c => c.designSpecId === specId)
  }

  /** 组件库：按 id 取组件 */
  function getComponent(id: string): Component | null {
    return components.value.find(c => c.id === id) ?? null
  }

  function removeVariant(pageId: string, variantId: string) {
    const p = pages.value.find(pg => pg.id === pageId)
    if (!p) return
    p.variants = p.variants.filter(v => v.id !== variantId)
  }

  // 启动时尝试从 localStorage 恢复
  loadCustomDesignSpecs()
  // 写入持久化（与 add/remove 解耦，防止外部直接改 ref 而丢失同步）
  watch(customDesignSpecs, (val) => {
    try {
      localStorage.setItem(STORAGE_KEY_CUSTOM_SPECS, JSON.stringify(val))
    } catch (e) {
      console.warn('[canvasStore] failed to persist customDesignSpecs (watch)', e)
    }
  }, { deep: true })

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
    designSpecId.value = 'none'
    customDesignContent.value = ''
    activeSkillId.value = null
    productBlueprint.value = createEmptyBlueprint()
    activeDirectionId.value = null
    pages.value = []
    currentPageId.value = null
    // 保留 customDesignSpecs（用户自建资产，不随项目重置）
    // 保留 imageDataSource（用户偏好，不随项目重置）
    // 保留 isDarkMode、components（用户偏好与库不随项目重置）
  }

  // 初始化主题类
  applyThemeClass()

  return {
    cards, selectedCardId,
    pageType, colorScheme, projectName, viewport, isGenerating, generatingCardId, currentFilePath, createdAt, designSpecId, customDesignContent, activeSkillId, productBlueprint,
    activeDirectionId, customDesignSpecs,
    // Phase 3
    pages, currentPageId, imageDataSource,
    // Phase 4
    isDarkMode, components,
    addCard, updateLastCardScreenshot, updateLastCardHtml, updateCardContent, removeCard, selectCard,
    setPageType, setColorScheme, setProjectName, setViewport, setGenerating, setGeneratingCardId,
    setCurrentFilePath, setCreatedAt, setDesignSpecId, setCustomDesignContent, setActiveSkillId, setProductBlueprint, updateProductBlueprint,
    setActiveDirectionId, addCustomDesignSpec, removeCustomDesignSpec, loadCustomDesignSpecs,
    setImageDataSource,
    getActiveSpec,
    // Phase 3: Pages
    addPage, removePage, renamePage, setCurrentPage, getCurrentPage, addPageFromCard,
    addVariant, adoptVariant, removeVariant,
    // Phase 4: Versions + Components + Theme
    addVersion, rollbackToVersion, compareVersions,
    pushVersion, getVersionTimeline, copyVersionAsVariant,
    addComponent, removeComponent, listComponents, getComponent,
    setDarkMode, toggleDarkMode,
    reset,
  }
})
