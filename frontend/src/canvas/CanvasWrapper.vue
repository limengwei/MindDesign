<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { App, Leafer, Box, Frame, Group, Image, Text, Rect, Ellipse, PointerEvent } from 'leafer-ui'
import '@leafer-in/viewport'
import '@leafer-in/view'
import { ScrollBar } from '@leafer-in/scroll'
import { toPng } from 'html-to-image'
import { DotGrid } from './dotGrid'
import SvgIcon from '../components/SvgIcon.vue'
import { useCanvasStore, type CanvasCard, type Page } from '../stores/canvasStore'
import { saveProject } from '../stores/autoSave'
import { fetchProxiedImage } from '../services/projectBridge'
import { sendMessageToLLM } from '../ai/chat'
import { remapImageUrls } from '../services/dataSource'

const emit = defineEmits<{
  exportCard: [cardId: string]
  previewCard: [cardId: string]
  exportPngCurrent: []
  newPage: []
  viewHistory: []
}>()

const confirmState = ref<{ show: boolean; cardId: string; message: string }>({
  show: false, cardId: '', message: '',
})

function showConfirm(cardId: string) {
  confirmState.value = { show: true, cardId, message: '确定删除这张设计稿吗？' }
}

async function confirmDelete() {
  confirmState.value.show = false
  const cardId = confirmState.value.cardId
  const group = cardGroups.get(cardId)
  if (group) {
    group.remove()
    cardGroups.delete(cardId)
  }
  canvasStore.removeCard(cardId)
  await saveProject()
}

function cancelDelete() {
  confirmState.value.show = false
}

const props = defineProps({
  pageWidth: { type: Number, default: 375 },
  pageHeight: { type: Number, default: 812 },
})

const canvasStore = useCanvasStore()
const containerRef = ref<HTMLDivElement | null>(null)
let app: App | null = null
let treeLayer: Leafer | null = null
let skyLayer: Leafer | null = null
let dotGrid: DotGrid | null = null
let resizeObserver: ResizeObserver | null = null
const cardGroups = new Map<string, Group>()
let breathRafId = 0
let renderVersion = 0
let appTapEventId: any = null
const cardEventIds = new Map<string, any>()

// 变体对话框
const variantsModal = ref<{ show: boolean; pageId: string; busy: boolean; error: string | null }>({
  show: false, pageId: '', busy: false, error: null,
})
const variantsList = ref<Array<{ html: string; screenshot: string; name?: string; dimension?: string; critique?: string }>>([])

onMounted(() => {
  if (!containerRef.value) return

  app = new App({
    view: containerRef.value,
    tree: { type: 'design' },
    sky: {},
    zoom: { min: 0.02, max: 32 },
    // 空白处左键拖拽平移画布；卡片本体不被 moveMode 接管，Frame TAP 监听可正常触发选中
    move: { dragEmpty: true, dragAnimate: 0.9 },
    wheel: { zoomMode: true, zoomSpeed: 0.02 },
  })

  treeLayer = app.tree as Leafer
  skyLayer = app.sky as Leafer

  new ScrollBar(app)

  appTapEventId = app.on_(PointerEvent.TAP, (e: PointerEvent) => {
    let target = e.target as any
    let found = false
    while (target) {
      if (target.id && cardGroups.has(target.id)) {
        found = true
        break
      }
      target = target.parent
    }
    if (!found) {
      canvasStore.selectCard(null)
    }
  })

  dotGrid = new DotGrid(containerRef.value, app, {
    dotColor: 'rgba(255,255,255,0.1)',
    dotSize: 1.2,
    gridGap: 24,
    bgColor: '#0f0f23',
  })

  resizeObserver = new ResizeObserver(() => {
    if (!containerRef.value || !app) return
    app.resize({ width: containerRef.value.clientWidth, height: containerRef.value.clientHeight })
  })
  resizeObserver.observe(containerRef.value)

  nextTick(() => {
    if (canvasStore.cards.length > 0) renderAll()
  })
})

onUnmounted(() => {
  if (breathRafId) { cancelAnimationFrame(breathRafId); breathRafId = 0 }
  dotGrid?.destroy(); dotGrid = null
  resizeObserver?.disconnect(); resizeObserver = null
  cardGroups.clear()
  cardEventIds.clear()
  if (app && appTapEventId) { app.off_(appTapEventId); appTapEventId = null }
  app?.destroy(); app = null; treeLayer = null; skyLayer = null
})

const iconCache = new Map<string, string>()

async function fetchIconSvg(name: string): Promise<string> {
  if (iconCache.has(name)) return iconCache.get(name)!
  try {
    const resp = await fetch(`/icons/${name}.svg`)
    if (!resp.ok) { iconCache.set(name, ''); return '' }
    const svg = await resp.text()
    iconCache.set(name, svg)
    return svg
  } catch {
    iconCache.set(name, '')
    return ''
  }
}

async function replaceIcons(html: string): Promise<string> {
  let processed = html.replace(/<link[^>]*fonts\.googleapis\.com[^>]*>/gi, '')

  // Phase 3：根据当前数据源重映射图片 URL
  if (canvasStore.imageDataSource) {
    processed = remapImageUrls(processed, { type: canvasStore.imageDataSource })
  }

  const parser = new DOMParser()
  const doc = parser.parseFromString(processed, 'text/html')
  const spans = doc.querySelectorAll('span.material-symbols-outlined')

  const iconNames = new Set<string>()
  spans.forEach(el => {
    const name = (el.textContent || '').trim()
    if (name) iconNames.add(name)
  })
  await Promise.all([...iconNames].map(name => fetchIconSvg(name)))

  spans.forEach(el => {
    const name = (el.textContent || '').trim()
    if (!name) return
    const svg = iconCache.get(name)
    if (!svg) return

    const elStyle = el.getAttribute('style') || ''
    const sizeMatch = elStyle.match(/font-size\s*:\s*(\d+(?:\.\d+)?)(px|em|rem)?/i)
    let size = 24
    if (sizeMatch) {
      size = parseFloat(sizeMatch[1])
      if (sizeMatch[2] === 'em') size *= 16
      else if (sizeMatch[2] === 'rem') size *= 16
    }

    const colorMatch = elStyle.match(/(?:^|;)\s*color\s*:\s*([^;]+)/i)
    let color = colorMatch ? colorMatch[1].trim() : ''

    if (!color) {
      let ancestor: Element | null = el.parentElement
      while (ancestor) {
        const aStyle = ancestor.getAttribute('style') || ''
        const aColorMatch = aStyle.match(/(?:^|;)\s*color\s*:\s*([^;]+)/i)
        if (aColorMatch) {
          color = aColorMatch[1].trim()
          break
        }
        ancestor = ancestor.parentElement
      }
    }

    const fillColor = color || 'currentColor'

    let styledSvg = svg
      .replace(/width="[^"]*"/, `width="${size}"`)
      .replace(/height="[^"]*"/, `height="${size}"`)
      .replace('<svg ', `<svg style="vertical-align:middle;display:inline-block;fill:${fillColor};" `)
    if (color) {
      styledSvg = `<span style="color:${color};display:inline-flex;vertical-align:middle;">${styledSvg}</span>`
    }

    const wrapper = doc.createElement('div')
    wrapper.innerHTML = styledSvg
    const newNodes = [...wrapper.childNodes]
    const parent = el.parentNode
    if (parent) {
      newNodes.forEach(n => parent.insertBefore(n, el))
      parent.removeChild(el)
    }
  })

  const head = doc.head
  let headHtml = ''
  if (head) {
    const styles = head.querySelectorAll('style')
    styles.forEach(s => { headHtml += s.outerHTML })
  }

  const bodyContent = doc.body.innerHTML

  if (!headHtml) return bodyContent

  return `<!DOCTYPE html><html><head>${headHtml}</head><body>${bodyContent}</body></html>`
}

function waitForDOMStable(doc: Document, options: { timeout: number; idleTime: number }): Promise<void> {
  return new Promise((resolve) => {
    let timer: ReturnType<typeof setTimeout>
    const observer = new MutationObserver(() => {
      clearTimeout(timer)
      timer = setTimeout(() => {
        observer.disconnect()
        resolve()
      }, options.idleTime)
    })
    observer.observe(doc.body, { childList: true, subtree: true, attributes: true })
    setTimeout(() => { observer.disconnect(); resolve() }, options.timeout)
  })
}

async function htmlToScreenshot(html: string): Promise<{ dataUrl: string; contentHeight: number }> {
  if (!html) return { dataUrl: '', contentHeight: props.pageHeight }

  const processed = await replaceIcons(html)
  console.log('[Screenshot] processed HTML length:', processed.length)

  const container = document.createElement('div')
  container.style.cssText = `position:fixed;left:-9999px;top:0;width:${props.pageWidth}px;overflow:visible;background:#fff;z-index:-1;`
  const shadow = container.attachShadow({ mode: 'open' })
  const iframe = document.createElement('iframe')
  iframe.style.cssText = `width:${props.pageWidth}px;height:${props.pageHeight}px;border:none;display:block;`
  iframe.setAttribute('sandbox', 'allow-same-origin')
  iframe.srcdoc = processed
  shadow.appendChild(iframe)
  document.body.appendChild(container)

  await new Promise<void>((resolve) => {
    iframe.onload = () => resolve()
  })

  try {
    const doc = iframe.contentDocument!
    await waitForDOMStable(doc, { timeout: 5000, idleTime: 300 })

    const freezeStyle = doc.createElement('style')
    freezeStyle.textContent = `
      *, *::before, *::after {
        animation-play-state: paused !important;
        transition: none !important;
      }
      * {
        scrollbar-width: none !important;
        -ms-overflow-style: none !important;
      }
      ::-webkit-scrollbar { display: none !important; }
    `
    doc.head.appendChild(freezeStyle)
    await new Promise(r => setTimeout(r, 100))

    const externalImages = doc.querySelectorAll<HTMLImageElement>('img[src^="http"]')
    const proxyPromises = Array.from(externalImages).map(async (img) => {
      const originalSrc = img.getAttribute('src')!
      const proxied = await fetchProxiedImage(originalSrc)
      if (proxied) {
        img.setAttribute('src', proxied)
      }
    })
    await Promise.all(proxyPromises)

    const contentHeight = Math.ceil(Math.max(doc.documentElement.scrollHeight, doc.body.scrollHeight, props.pageHeight))
    console.log('[Screenshot] contentHeight:', contentHeight, 'body scrollHeight:', doc.body.scrollHeight)

    doc.documentElement.style.height = contentHeight + 'px'
    doc.documentElement.style.overflow = 'visible'
    doc.body.style.height = contentHeight + 'px'
    doc.body.style.overflow = 'visible'
    iframe.style.height = contentHeight + 'px'
    container.style.height = contentHeight + 'px'
    await new Promise(r => setTimeout(r, 100))

    const iframeWindow = doc.defaultView!
    const bodyBg = iframeWindow.getComputedStyle(doc.body).backgroundColor || '#ffffff'

    let dataUrl = ''
    try {
      dataUrl = await toPng(doc.body, {
        width: props.pageWidth,
        height: contentHeight,
        pixelRatio: 2,
        backgroundColor: bodyBg,
        filter: (node: Node) => {
          if (node instanceof Element && node.tagName === 'IFRAME') return false
          return true
        },
        fetchRequestInit: {
          credentials: 'omit' as RequestCredentials,
        },
      })
    } catch (captureErr) {
      console.error('[Screenshot] toPng error:', captureErr)
    }
    console.log('[Screenshot] dataUrl length:', dataUrl.length)
    document.body.removeChild(container)
    return { dataUrl, contentHeight }
  } catch (e) {
    console.error('[Screenshot] error:', e)
    document.body.removeChild(container)
    return { dataUrl: '', contentHeight: props.pageHeight }
  }
}

function buildCardFrame(card: CanvasCard, selected: boolean, isGenerating: boolean): Group {
  const w = card.width || props.pageWidth
  const h = card.height || props.pageHeight

  const wrapper = new Group({ x: card.x, y: card.y })

  const frame = new Frame({
    id: card.id, width: w, height: h,
    strokeWidth: selected ? 3 : 1, stroke: selected ? '#22d3ee' : '#2a2a4a',
    cornerRadius: 8, fill: isGenerating ? '#2a2a4a' : '#16213e',
  })

  if (isGenerating) {
    const overlay = new Rect({
      width: w, height: h, cornerRadius: 8,
      fill: 'rgba(15,15,35,0.75)',
    })
    overlay.id = '__gen_overlay__'
    frame.add(overlay)

    const dotCount = 8
    const dotRadius = 4
    const spinnerRadius = 22
    const cx = w / 2
    const cy = h / 2 - 14
    const spinnerGroup = new Box({
      id: '__spinner__',
      x: cx - spinnerRadius - dotRadius, y: cy - spinnerRadius - dotRadius,
      width: (spinnerRadius + dotRadius) * 2, height: (spinnerRadius + dotRadius) * 2,
    })
    for (let i = 0; i < dotCount; i++) {
      const angle = (i / dotCount) * Math.PI * 2 - Math.PI / 2
      const dx = spinnerRadius + dotRadius + Math.cos(angle) * spinnerRadius
      const dy = spinnerRadius + dotRadius + Math.sin(angle) * spinnerRadius
      const dot = new Ellipse({
        x: dx - dotRadius, y: dy - dotRadius,
        width: dotRadius * 2, height: dotRadius * 2,
        fill: '#818cf8',
        opacity: 0.15 + (i / dotCount) * 0.85,
      })
      dot.id = `__spinner_dot_${i}__`
      spinnerGroup.add(dot)
    }
    frame.add(spinnerGroup)

    const loadingText = new Text({
      text: '设计中...',
      fontSize: 14, fill: '#a5b4fc',
      textAlign: 'center', width: w,
      y: cy + spinnerRadius + dotRadius + 16,
    })
    loadingText.id = '__gen_text__'
    frame.add(loadingText)
  } else if (card.screenshot) {
    frame.add(new Image({ url: card.screenshot, width: w, height: h }))
  }

  const label = new Text({ text: card.label, fontSize: 14, fill: '#ffffff', y: -22 })
  label.id = '__label__'

  wrapper.add(frame)
  wrapper.add(label)
  frame.hitSelf = true

  const oldCardEvtId = cardEventIds.get(card.id)
  if (oldCardEvtId) frame.off_(oldCardEvtId)
  const eventId = frame.on_(PointerEvent.TAP, (e: PointerEvent) => {
    canvasStore.selectCard(card.id)
  })
  cardEventIds.set(card.id, eventId)

  return wrapper
}

async function renderCard(card: CanvasCard, selected: boolean, isGenerating: boolean) {
  if (!treeLayer) return

  const existing = cardGroups.get(card.id)

  if (!isGenerating && !card.screenshot && card.html) {
    const result = await htmlToScreenshot(card.html)
    card.screenshot = result.dataUrl
    if (result.contentHeight !== card.height) {
      card.height = result.contentHeight
    }
  }

  if (existing && !isGenerating && card.screenshot) {
    const w = card.width || props.pageWidth
    const h = card.height || props.pageHeight
    const frame = existing.children?.find(c => c instanceof Frame) as Frame | undefined
    if (frame) {
      frame.set({
        width: w, height: h,
        strokeWidth: selected ? 3 : 1,
        stroke: selected ? '#22d3ee' : '#2a2a4a',
        fill: '#16213e',
      })
    }

    const hasOverlay = frame?.children?.some(c => (c as any).id === '__gen_overlay__')
    const hasImage = frame?.children?.some(c => c instanceof Image)
    if (hasOverlay || !hasImage) {
      frame?.removeAll()
      frame?.add(new Image({ url: card.screenshot, width: w, height: h }))
    } else {
      const imgChild = frame?.children?.find(c => c instanceof Image) as Image | undefined
      if (imgChild) {
        imgChild.set({ url: card.screenshot, width: w, height: h })
      }
    }
    const labelNode = existing.children?.find(c => (c as any).id === '__label__') as Text | undefined
    if (labelNode) labelNode.set({ text: card.label })
    return
  }

  if (existing) existing.remove()

  const group = buildCardFrame(card, selected, isGenerating)
  treeLayer.add(group)
  cardGroups.set(card.id, group)
}

async function renderAll(shouldZoom = false) {
  if (!treeLayer) return
  const v = ++renderVersion

  const currentIds = new Set(canvasStore.cards.map(c => c.id))
  for (const [id, group] of cardGroups) {
    if (!currentIds.has(id)) {
      group.remove()
      cardGroups.delete(id)
    }
  }

  const genId = canvasStore.generatingCardId
  const screenshotQueue: CanvasCard[] = []
  for (const card of canvasStore.cards) {
    if (renderVersion !== v) return
    if (!card.screenshot && card.html && card.id !== genId) {
      screenshotQueue.push(card)
      const w = card.width || props.pageWidth
      const h = card.height || props.pageHeight
      renderCardPlaceholder(card, card.id === canvasStore.selectedCardId, w, h)
    } else {
      await renderCard(card, card.id === canvasStore.selectedCardId, card.id === genId)
    }
  }

  if (genId) startBreathAnimation()
  if (shouldZoom && cardGroups.size > 0) {
    setTimeout(() => { if (renderVersion === v) treeLayer?.zoom('fit', 40) }, 600)
  }

  for (const card of screenshotQueue) {
    if (renderVersion !== v) return
    await renderCard(card, card.id === canvasStore.selectedCardId, false)
  }
}

function renderCardPlaceholder(card: CanvasCard, selected: boolean, w: number, h: number) {
  const existing = cardGroups.get(card.id)
  if (existing) existing.remove()

  const wrapper = new Group({ x: card.x, y: card.y })
  const frame = new Frame({
    id: card.id, width: w, height: h,
    strokeWidth: selected ? 3 : 1, stroke: selected ? '#22d3ee' : '#2a2a4a',
    cornerRadius: 8, fill: '#16213e',
  })
  frame.add(new Rect({
    width: w, height: h, cornerRadius: 8,
    fill: 'rgba(15,15,35,0.5)',
  }))
  frame.add(new Text({
    text: '效果图生成中...', fontSize: 14, fill: '#94a3b8',
    x: w / 2, y: h / 2,
    textAlign: 'center',
  }))
  const label = new Text({ text: card.label, fontSize: 14, fill: '#ffffff', y: -22 })
  label.id = '__label__'
  frame.hitSelf = true
  wrapper.add(frame)
  wrapper.add(label)
  const oldCardEvtId = cardEventIds.get(card.id)
  if (oldCardEvtId) frame.off_(oldCardEvtId)
  const eventId = frame.on_(PointerEvent.TAP, (e: PointerEvent) => {
    canvasStore.selectCard(card.id)
  })
  cardEventIds.set(card.id, eventId)
  if (treeLayer) treeLayer.add(wrapper)
  cardGroups.set(card.id, wrapper)
}

function startBreathAnimation() {
  if (breathRafId) return
  const dotCount = 8
  let rotationStep = 0
  let frameCount = 0
  const tick = () => {
    frameCount++
    if (frameCount % 4 === 0) {
      rotationStep = (rotationStep + 1) % dotCount
      const genId = canvasStore.generatingCardId
      if (genId) {
        const wrapper = cardGroups.get(genId)
        if (wrapper) {
          const frame = wrapper.children?.find(c => c instanceof Frame)
          const spinner = frame?.children?.find(c => (c as any).id === '__spinner__')
          if (spinner) {
            const dots = (spinner as any).children || []
            for (let i = 0; i < dots.length; i++) {
              const brightness = ((i - rotationStep + dotCount) % dotCount) / dotCount
              ;(dots[i] as any).set({ opacity: 0.12 + brightness * 0.88 })
            }
          }
        }
      } else {
        cancelAnimationFrame(breathRafId)
        breathRafId = 0
        return
      }
    }
    breathRafId = requestAnimationFrame(tick)
  }
  breathRafId = requestAnimationFrame(tick)
}

function stopBreathAnimation() {
  if (breathRafId) {
    cancelAnimationFrame(breathRafId)
    breathRafId = 0
  }
}

watch(
  () => canvasStore.cards.map(c => c.id).join(','),
  () => { renderAll(true) },
)

watch(
  () => canvasStore.cards.map(c => `${c.x}:${c.y}`).join(','),
  () => {
    for (const card of canvasStore.cards) {
      const wrapper = cardGroups.get(card.id)
      if (wrapper) {
        wrapper.set({ x: card.x, y: card.y })
      }
    }
  }
)

watch(
  () => canvasStore.cards.map(c => `${c.screenshot ? 'y' : 'n'}:${c.html ? 'h' : 'e'}`).join(','),
  () => { renderAll(false) },
)

/** 选中态切换：仅更新受影响卡片的描边样式（避免 renderAll 重建整张画布） */
watch(
  () => canvasStore.selectedCardId,
  (newId, oldId) => {
    const apply = (id: string | null, selected: boolean) => {
      if (!id) return
      const wrapper = cardGroups.get(id)
      if (!wrapper) return
      const frame = wrapper.children?.find(c => c instanceof Frame) as Frame | undefined
      if (!frame) return
      frame.set({
        strokeWidth: selected ? 3 : 1,
        stroke: selected ? '#22d3ee' : '#2a2a4a',
      })
    }
    apply(oldId, false)
    apply(newId, true)
  },
)

watch(() => canvasStore.generatingCardId, (newId, oldId) => {
  if (!newId) {
    stopBreathAnimation()
    if (oldId) {
      const card = canvasStore.cards.find(c => c.id === oldId)
      if (card) renderCard(card, card.id === canvasStore.selectedCardId, false)
    }
    return
  }
  startBreathAnimation()
  const card = canvasStore.cards.find(c => c.id === newId)
  if (card) {
    renderCard(card, card.id === canvasStore.selectedCardId, true)
    nextTick(() => panToCard(card))
  }
})

async function refreshCard(cardId: string) {
  const card = canvasStore.cards.find(c => c.id === cardId)
  if (!card || !card.html) return
  card.screenshot = ''
  await renderCard(card, true, false)
  await saveProject()
}

function panToCard(card: CanvasCard) {
  if (!treeLayer || !containerRef.value) return
  const zoomLayer = (treeLayer as any)?.zoomLayer
  if (!zoomLayer) return
  const scale = zoomLayer.scaleX ?? 1
  const cw = containerRef.value.clientWidth
  const ch = containerRef.value.clientHeight
  const tx = cw / 2 - (card.x + card.width / 2) * scale
  const ty = ch / 2 - (card.y + card.height / 2) * scale
  zoomLayer.set({ x: tx, y: ty })
}

function handleZoomIn() { treeLayer?.zoom('in') }
function handleZoomOut() { treeLayer?.zoom('out') }
function handleZoomFit() { if (treeLayer && cardGroups.size > 0) treeLayer.zoom('fit') }

defineExpose({ handleZoomIn, handleZoomOut, handleZoomFit })

const selectedCard = computed(() => {
  if (!canvasStore.selectedCardId) return null
  return canvasStore.cards.find(c => c.id === canvasStore.selectedCardId) ?? null
})

// ── Phase 3：多画板 tabs ──
const currentPages = computed<Page[]>(() => canvasStore.pages)
const currentPage = computed<Page | null>(() => canvasStore.getCurrentPage())

function switchToPage(id: string) {
  canvasStore.setCurrentPage(id)
  canvasStore.selectCard(id)
  renderAll()
  nextTick(() => {
    const card = canvasStore.cards.find(c => c.id === id)
    if (card) panToCard(card)
  })
}

function handleAddPage() {
  const p = canvasStore.addPage({ name: `画板 ${canvasStore.pages.length + 1}` })
  // 同步加一个 card（向前兼容）
  const dims = p.size
  const card: CanvasCard = {
    id: p.id, label: p.name, html: '', screenshot: '',
    x: 0, y: 0, width: dims.width, height: dims.height,
  }
  // 直接 push 到 cards，让 renderAll 接管
  // 用 addCard-style 操作避免破坏双轨
  const lastCard = canvasStore.cards[canvasStore.cards.length - 1]
  const gap = 60
  card.x = lastCard ? lastCard.x + lastCard.width + gap : 0
  canvasStore.cards.push(card)
  canvasStore.selectCard(card.id)
  renderAll()
}

const editingPageName = ref<{ id: string; value: string } | null>(null)
function startRenamePage(id: string) {
  const p = canvasStore.pages.find(pg => pg.id === id)
  if (!p) return
  editingPageName.value = { id, value: p.name }
  nextTick(() => {
    const input = document.querySelector('.page-name-input') as HTMLInputElement
    input?.focus(); input?.select()
  })
}
function finishRenamePage() {
  if (!editingPageName.value) return
  const { id, value } = editingPageName.value
  if (value.trim()) {
    canvasStore.renamePage(id, value.trim())
    // 同步 card label
    const card = canvasStore.cards.find(c => c.id === id)
    if (card) card.label = value.trim()
  }
  editingPageName.value = null
  renderAll()
}

// ── Phase 3：变体生成 ──
async function handleGenerateVariants() {
  const pageId = canvasStore.currentPageId
  if (!pageId) return
  const page = canvasStore.pages.find(p => p.id === pageId)
  if (!page) return
  variantsModal.value = { show: true, pageId, busy: true, error: null }
  variantsList.value = []
  try {
    const res = await sendMessageToLLM(
      '请为该画板生成 3 个变体，差异维度：颜色 / 布局骨架 / 文案语气。',
      {
        pageType: canvasStore.pageType,
        colorScheme: canvasStore.colorScheme,
        designSpecId: canvasStore.designSpecId,
        customDesignContent: canvasStore.customDesignContent,
        history: [],
        selectedHtml: page.html,
        blueprint: canvasStore.productBlueprint,
        direction: null,
        brandAsset: null,
        variantsMode: true,
      },
    )
    if (res.variants && res.variants.length > 0) {
      variantsList.value = res.variants.map(v => ({
        html: v.html,
        screenshot: '',
        name: v.name,
        dimension: v.dimension,
        critique: v.critique,
      }))
      // 异步生成截图
      for (let i = 0; i < variantsList.value.length; i++) {
        const v = variantsList.value[i]
        const r = await htmlToScreenshot(v.html)
        v.screenshot = r.dataUrl
        variantsList.value[i] = { ...v, screenshot: r.dataUrl }
      }
    } else {
      variantsModal.value.error = 'AI 未返回有效变体'
    }
  } catch (e) {
    variantsModal.value.error = '生成失败：' + ((e as Error).message || String(e))
  } finally {
    variantsModal.value.busy = false
  }
}

async function adoptVariant(index: number) {
  const v = variantsList.value[index]
  const pageId = variantsModal.value.pageId
  if (!v || !pageId) return
  const variant = canvasStore.addVariant(pageId, v.html, v.screenshot, {
    dimension: (v.dimension as any) || undefined,
    critique: v.critique,
  })
  if (variant) {
    canvasStore.adoptVariant(pageId, variant.id)
    // 触发 card 截图刷新
    const card = canvasStore.cards.find(c => c.id === pageId)
    if (card) {
      card.html = v.html
      card.screenshot = v.screenshot
      await renderCard(card, true, false)
    }
  }
  variantsModal.value.show = false
  await saveProject()
}

function closeVariantsModal() {
  if (variantsModal.value.busy) return
  variantsModal.value.show = false
}

const copyTooltip = ref('')

async function copyCardId() {
  if (!selectedCard.value) return
  try {
    await navigator.clipboard.writeText(selectedCard.value.id)
    copyTooltip.value = '已复制'
    setTimeout(() => { copyTooltip.value = '' }, 1500)
  } catch {
    copyTooltip.value = '复制失败'
    setTimeout(() => { copyTooltip.value = '' }, 1500)
  }
}

const editingLabel = ref(false)
const editingLabelValue = ref('')

function startEditLabel() {
  if (!selectedCard.value) return
  editingLabelValue.value = selectedCard.value.label
  editingLabel.value = true
  nextTick(() => {
    const input = document.querySelector('.card-name-input') as HTMLInputElement
    input?.focus()
    input?.select()
  })
}

function finishEditLabel() {
  editingLabel.value = false
  if (!selectedCard.value || !editingLabelValue.value.trim()) return
  const newLabel = editingLabelValue.value.trim()
  if (newLabel === selectedCard.value.label) return
  selectedCard.value.label = newLabel
  updateCardLabelText(selectedCard.value.id, newLabel)
  // 同步到 page
  canvasStore.renamePage(selectedCard.value.id, newLabel)
  saveProject()
}

function updateCardLabelText(cardId: string, label: string) {
  const wrapper = cardGroups.get(cardId)
  if (!wrapper) return
  const labelNode = wrapper.children?.find(c => (c as any).id === '__label__') as Text | undefined
  if (labelNode) {
    labelNode.set({ text: label })
  }
}
</script>

<template>
  <div class="canvas-wrapper">
    <!-- Phase 3：画板切换 tabs -->
    <div class="page-tabs">
      <div class="page-tabs-strip">
        <div
          v-for="p in currentPages"
          :key="p.id"
          :class="['page-tab', { active: p.id === currentPage?.id }]"
          @click="switchToPage(p.id)"
          @dblclick="startRenamePage(p.id)"
        >
          <input
            v-if="editingPageName && editingPageName.id === p.id"
            v-model="editingPageName.value"
            class="page-name-input"
            @blur="finishRenamePage"
            @keydown.enter="finishRenamePage"
            @keydown.escape="editingPageName = null"
            @click.stop
          />
          <template v-else>
            <div class="page-tab-thumb">
              <img v-if="p.screenshot" :src="p.screenshot" :alt="p.name" />
              <div v-else class="page-tab-thumb-empty">{{ p.name.charAt(0) }}</div>
            </div>
            <span class="page-tab-name">{{ p.name }}</span>
          </template>
        </div>
        <button class="page-tab-add" @click="handleAddPage" title="新增画板">+</button>
      </div>
    </div>

    <div
      ref="containerRef"
      class="canvas-container"
    ></div>

    <div v-if="selectedCard" class="action-bar">
      <input
        v-if="editingLabel"
        v-model="editingLabelValue"
        class="card-name-input"
        @blur="finishEditLabel"
        @keydown.enter="finishEditLabel"
        @keydown.escape="editingLabel = false"
      />
      <span v-else class="action-label" @dblclick="startEditLabel" title="双击编辑名称">{{ selectedCard.label }}</span>
      <button class="action-btn action-preview" @click="emit('previewCard', selectedCard!.id)"><SvgIcon name="visibility" :size="16" class="action-icon" />预览</button>
      <button class="action-btn action-export" @click="emit('exportCard', selectedCard!.id)"><SvgIcon name="file_export" :size="16" class="action-icon" />导出</button>
      <button class="action-btn action-refresh" @click="refreshCard(selectedCard!.id)"><SvgIcon name="refresh" :size="16" class="action-icon" />刷新</button>
      <button class="action-btn action-variants" @click="handleGenerateVariants" title="生成 3 个变体">🎨 变体</button>
      <button class="action-btn action-history" @click="emit('viewHistory')" title="查看历史"><SvgIcon name="history" :size="16" class="action-icon" />历史</button>
      <button class="action-btn action-delete" @click="showConfirm(selectedCard!.id)"><SvgIcon name="delete" :size="16" class="action-icon" />删除</button>
    </div>

    <Transition name="slide">
      <div v-if="selectedCard" class="card-id-bar">
        <span class="card-id-label">ID:</span>
        <span class="card-id-value">{{ selectedCard.id }}</span>
        <button class="card-id-copy-btn" @click="copyCardId" title="复制 ID">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>
          <span v-if="copyTooltip" class="copy-tooltip">{{ copyTooltip }}</span>
        </button>
      </div>
    </Transition>

    <div v-if="!selectedCard" class="canvas-info">
      {{ canvasStore.cards.length }} 个设计稿 | {{ pageWidth }} × {{ pageHeight }}
    </div>

    <div v-if="confirmState.show" class="confirm-overlay" @click.self="cancelDelete">
      <div class="confirm-dialog">
        <div class="confirm-body">
          <span class="confirm-icon">⚠️</span>
          <span class="confirm-text">{{ confirmState.message }}</span>
        </div>
        <div class="confirm-actions">
          <button class="btn btn-secondary" @click="cancelDelete">取消</button>
          <button class="btn btn-danger" @click="confirmDelete">删除</button>
        </div>
      </div>
    </div>

    <!-- Phase 3：变体对话框 -->
    <div v-if="variantsModal.show" class="variants-modal-overlay" @click.self="closeVariantsModal">
      <div class="variants-modal">
        <div class="variants-modal-header">
          <h3>🎨 3 个变体</h3>
          <button class="variants-modal-close" @click="closeVariantsModal">×</button>
        </div>
        <div class="variants-modal-body">
          <div v-if="variantsModal.busy" class="variants-loading">
            <span class="dot-spin"></span>
            <span class="dot-spin"></span>
            <span class="dot-spin"></span>
            <p>正在生成变体…</p>
          </div>
          <div v-else-if="variantsModal.error" class="variants-error">⚠ {{ variantsModal.error }}</div>
          <div v-else class="variants-grid">
            <div v-for="(v, i) in variantsList" :key="i" class="variant-card">
              <div class="variant-thumb">
                <img v-if="v.screenshot" :src="v.screenshot" :alt="v.name || `变体 ${i+1}`" />
                <div v-else class="variant-thumb-empty">生成中…</div>
              </div>
              <div class="variant-meta">
                <div class="variant-name">{{ v.name || `变体 ${i+1}` }}</div>
                <div v-if="v.dimension" class="variant-dim">{{ v.dimension }}</div>
                <div v-if="v.critique" class="variant-critique">{{ v.critique }}</div>
                <button class="variant-adopt-btn" @click="adoptVariant(i)">采纳为正式画板</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.canvas-wrapper { position: absolute; inset: 0; background: var(--bg-canvas); overflow: hidden; }
.canvas-container { position: relative; width: 100%; height: 100%; }

/* Phase 3：page tabs */
.page-tabs { position: absolute; top: 56px; left: 12px; z-index: 9; display: flex; align-items: center; gap: 4px; max-width: 60vw; overflow-x: auto; padding: 4px 8px; background: rgba(22,33,62,0.7); border: 1px solid rgba(255,255,255,0.06); border-radius: 10px; backdrop-filter: blur(8px); }
.page-tabs-strip { display: flex; align-items: center; gap: 6px; }
.page-tab { position: relative; display: flex; align-items: center; gap: 6px; padding: 4px 10px 4px 4px; border-radius: 8px; background: rgba(255,255,255,0.04); border: 1px solid transparent; cursor: pointer; transition: all 0.15s; user-select: none; max-width: 160px; }
.page-tab:hover { background: rgba(255,255,255,0.08); }
.page-tab.active { background: rgba(129,140,248,0.2); border-color: rgba(129,140,248,0.5); }
.page-tab-thumb { position: relative; width: 28px; height: 36px; border-radius: 4px; overflow: hidden; background: #0f0f23; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
.page-tab-thumb img { width: 100%; height: 100%; object-fit: cover; }
.page-tab-thumb-empty { font-size: 12px; color: #818cf8; font-weight: 600; }
.page-tab-name { font-size: 12px; color: #e2e8f0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.page-name-input { font-size: 12px; padding: 1px 6px; border-radius: 4px; border: 1px solid rgba(129,140,248,0.5); background: rgba(0,0,0,0.2); color: #e2e8f0; outline: none; width: 100px; font-family: inherit; }
.page-tab-add { width: 28px; height: 36px; border-radius: 6px; background: rgba(255,255,255,0.05); border: 1px dashed rgba(255,255,255,0.2); color: #94a3b8; cursor: pointer; font-size: 16px; line-height: 1; }
.page-tab-add:hover { background: rgba(129,140,248,0.15); color: #a5b4fc; }

.canvas-info { position: absolute; top: 108px; left: 50%; transform: translateX(-50%); padding: 4px 12px; background: rgba(22,33,62,0.8); font-size: var(--font-xs); color: var(--text-muted); border-radius: var(--radius-sm); pointer-events: none; z-index: var(--z-canvas); }
.confirm-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: var(--z-dialog); }
.confirm-dialog { background: var(--bg-surface); border-radius: var(--radius-lg); padding: 20px 24px; min-width: 280px; box-shadow: var(--shadow-lg); border: 1px solid var(--border-default); }
.confirm-body { display: flex; align-items: center; gap: 10px; margin-bottom: 20px; }
.confirm-icon { font-size: 20px; }
.confirm-text { font-size: var(--font-md); color: var(--text-primary); }
.confirm-actions { display: flex; justify-content: flex-end; gap: 8px; }
.action-bar { position: absolute; top: 108px; left: 50%; transform: translateX(-50%); z-index: 10; display: flex; align-items: center; gap: 8px; padding: 6px 12px; background: rgba(22,33,62,0.92); border: 1px solid rgba(129,140,248,0.3); border-radius: 8px; backdrop-filter: blur(8px); box-shadow: 0 4px 16px rgba(0,0,0,0.3); }
.action-label { font-size: 13px; color: #a5b4fc; margin-right: 4px; white-space: nowrap; max-width: 120px; overflow: hidden; text-overflow: ellipsis; cursor: default; }
.action-label:hover { background: rgba(165, 180, 252, 0.1); border-radius: 4px; }
.card-name-input { font-size: 13px; color: #a5b4fc; background: rgba(165, 180, 252, 0.1); border: 1px solid rgba(165, 180, 252, 0.3); border-radius: 4px; padding: 1px 6px; outline: none; width: 120px; margin-right: 4px; font-family: inherit; }
.card-name-input:focus { border-color: #818cf8; background: rgba(165, 180, 252, 0.15); }
.action-btn { padding: 4px 14px; border: none; border-radius: 6px; font-size: 12px; font-weight: 500; cursor: pointer; color: #fff; transition: opacity 0.15s; display: inline-flex; align-items: center; gap: 4px; }
.action-icon { width: 14px; height: 14px; vertical-align: middle; filter: brightness(0) invert(1); }
.action-btn:hover { opacity: 0.85; }
.action-preview { background: rgba(59,130,246,0.85); }
.action-export { background: rgba(16,185,129,0.85); }
.action-refresh { background: rgba(79,70,229,0.85); }
.action-variants { background: rgba(236,72,153,0.85); }
.action-history { background: rgba(245,158,11,0.85); }
.action-delete { background: rgba(239,68,68,0.85); }

.card-id-bar { position: absolute; top: 144px; left: 50%; transform: translateX(-50%); z-index: 10; display: flex; align-items: center; gap: 6px; padding: 3px 12px; background: rgba(15, 23, 42, 0.7); border: 1px solid rgba(255,255,255,0.08); border-radius: 6px; backdrop-filter: blur(8px); }
.card-id-label { font-size: 11px; color: var(--text-muted); flex-shrink: 0; }
.card-id-value { font-size: 11px; color: var(--text-secondary); font-family: 'SF Mono', 'Cascadia Code', 'Consolas', monospace; user-select: all; }
.card-id-copy-btn { position: relative; border: none; background: none; color: var(--text-muted); cursor: pointer; padding: 2px; border-radius: 3px; display: flex; align-items: center; justify-content: center; }
.card-id-copy-btn:hover { color: var(--color-primary-light); background: rgba(129, 140, 248, 0.1); }
.copy-tooltip { position: absolute; top: -22px; left: 50%; transform: translateX(-50%); font-size: 10px; color: #34d399; white-space: nowrap; background: rgba(15, 23, 42, 0.9); padding: 2px 8px; border-radius: 4px; pointer-events: none; }

/* Phase 3：variants modal */
.variants-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.variants-modal { background: var(--bg-elevated); border-radius: 12px; width: 1000px; max-width: 95vw; max-height: 85vh; display: flex; flex-direction: column; border: 1px solid var(--border-default); box-shadow: 0 12px 48px rgba(0,0,0,0.5); overflow: hidden; }
.variants-modal-header { display: flex; align-items: center; justify-content: space-between; padding: 14px 20px; border-bottom: 1px solid var(--border-default); }
.variants-modal-header h3 { font-size: 16px; font-weight: 600; color: var(--text-primary); margin: 0; }
.variants-modal-close { width: 28px; height: 28px; border: none; background: var(--border-default); border-radius: 50%; font-size: 18px; cursor: pointer; color: var(--text-secondary); }
.variants-modal-close:hover { background: #3a3a5c; color: #fff; }
.variants-modal-body { padding: 20px; flex: 1; overflow: auto; }
.variants-loading { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 40px; color: var(--text-muted); }
.dot-spin { width: 10px; height: 10px; border-radius: 50%; background: #818cf8; animation: blink 1.4s infinite both; display: inline-block; margin: 0 4px; }
.dot-spin:nth-child(2) { animation-delay: 0.2s; }
.dot-spin:nth-child(3) { animation-delay: 0.4s; }
@keyframes blink { 0%, 80%, 100% { opacity: 0.3; } 40% { opacity: 1; } }
.variants-error { color: #fca5a5; background: rgba(239,68,68,0.1); padding: 12px; border-radius: 6px; }
.variants-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
.variant-card { display: flex; flex-direction: column; border-radius: 10px; overflow: hidden; border: 1px solid var(--border-default); background: var(--bg-surface); }
.variant-thumb { width: 100%; aspect-ratio: 3 / 4; background: #0f0f23; overflow: hidden; }
.variant-thumb img { width: 100%; height: 100%; object-fit: contain; background: #fff; }
.variant-thumb-empty { display: flex; align-items: center; justify-content: center; height: 100%; color: var(--text-muted); font-size: 12px; }
.variant-meta { padding: 12px; display: flex; flex-direction: column; gap: 6px; }
.variant-name { font-size: 13px; font-weight: 600; color: var(--text-primary); }
.variant-dim { font-size: 11px; color: var(--color-primary-light); padding: 1px 6px; border-radius: 4px; background: rgba(129,140,248,0.15); display: inline-block; width: fit-content; }
.variant-critique { font-size: 11px; color: var(--text-muted); line-height: 1.5; }
.variant-adopt-btn { margin-top: 6px; padding: 6px 12px; border-radius: 6px; border: none; background: var(--color-primary); color: #fff; font-size: 12px; cursor: pointer; font-family: inherit; }
.variant-adopt-btn:hover { background: var(--color-primary-hover); }

.btn { padding: 6px 16px; border-radius: 6px; font-size: 12px; cursor: pointer; font-family: inherit; border: 1px solid transparent; }
.btn-secondary { background: transparent; border-color: var(--border-default); color: var(--text-secondary); }
.btn-danger { background: var(--color-danger, #ef4444); color: #fff; }
</style>
