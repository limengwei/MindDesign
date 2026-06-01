<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { App, Leafer, Box, Frame, Image, Text, Rect, Ellipse, PointerEvent, DragEvent, PropertyEvent } from 'leafer-ui'
import '@leafer-in/viewport'
import '@leafer-in/view'
import { ScrollBar } from '@leafer-in/scroll'
import { toPng } from 'html-to-image'
import { DotGrid } from './dotGrid'
import { useCanvasStore, type CanvasCard } from '../stores/canvasStore'
import { saveProject } from '../stores/autoSave'
import { fetchProxiedImage } from '../services/projectBridge'

const emit = defineEmits<{
  exportCard: [cardId: string]
  previewCard: [cardId: string]
}>()

const confirmState = ref<{ show: boolean; cardId: string; message: string }>({
  show: false, cardId: '', message: '',
})

function showConfirm(cardId: string) {
  confirmState.value = { show: true, cardId, message: '确定删除这张设计稿吗？' }
}

async function confirmDelete() {
  const cardId = confirmState.value.cardId
  confirmState.value.show = false
  removeActionBtns(cardId)
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
const cardGroups = new Map<string, Frame>()
let breathRafId = 0
let renderVersion = 0
let appTapEventId: any = null
let viewportChangeId: any = null
const cardEventIds = new Map<string, any>()
const btnEventIds = new Map<string, any[]>()

onMounted(() => {
  if (!containerRef.value) return

  app = new App({
    view: containerRef.value,
    tree: { type: 'design' },
    sky: {},
    zoom: { min: 0.02, max: 32 },
    move: { holdSpaceKey: true, holdMiddleKey: true, drag: 'auto', dragAnimate: 0.9 },
    wheel: { zoomMode: true, zoomSpeed: 0.2 },
  })

  treeLayer = app.tree as Leafer
  skyLayer = app.sky as Leafer

  new ScrollBar(app)

  appTapEventId = app.on_(PointerEvent.TAP, (e: PointerEvent) => {
    const target = e.target as any
    if (!target?.id || !cardGroups.has(target.id)) {
      canvasStore.selectCard(null)
    }
  })

  const zoomLayer = (treeLayer as any)?.zoomLayer
  if (zoomLayer) {
    viewportChangeId = zoomLayer.on_(PropertyEvent.CHANGE, (e: any) => {
      if (e.attrName === 'x' || e.attrName === 'y' || e.attrName === 'scaleX' || e.attrName === 'scaleY') {
        updateActionBtnPositions()
      }
    })
  }

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
  actionBtnGroups.clear()
  cardEventIds.clear()
  btnEventIds.clear()
  if (app && appTapEventId) { app.off_(appTapEventId); appTapEventId = null }
  if (viewportChangeId) {
    const zoomLayer = (treeLayer as any)?.zoomLayer
    if (zoomLayer) zoomLayer.off_(viewportChangeId)
    viewportChangeId = null
  }
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

function buildCardFrame(card: CanvasCard, selected: boolean, isGenerating: boolean): Frame {
  const w = card.width || props.pageWidth
  const h = card.height || props.pageHeight

  const group = new Frame({
    id: card.id, x: card.x, y: card.y,
    width: w, height: h,
    strokeWidth: selected ? 3 : 1, stroke: selected ? '#818cf8' : '#2a2a4a',
    cornerRadius: 8, fill: isGenerating ? '#2a2a4a' : '#16213e',
  })

  if (isGenerating) {
    const overlay = new Rect({
      width: w, height: h, cornerRadius: 8,
      fill: 'rgba(15,15,35,0.75)',
    })
    overlay.id = '__gen_overlay__'
    group.add(overlay)

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
    group.add(spinnerGroup)

    const loadingText = new Text({
      text: '生成中...',
      fontSize: 14, fill: '#a5b4fc',
      textAlign: 'center', width: w,
      y: cy + spinnerRadius + dotRadius + 16,
    })
    loadingText.id = '__gen_text__'
    group.add(loadingText)
  } else if (card.screenshot) {
    group.add(new Image({ url: card.screenshot, width: w, height: h }))
  }

  group.add(new Text({ text: card.label, fontSize: 12, fill: '#6b7280', y: -22 }))
  group.hitSelf = true

  const oldCardEvtId = cardEventIds.get(card.id)
  if (oldCardEvtId) group.off_(oldCardEvtId)
  const eventId = group.on_(PointerEvent.TAP, () => { canvasStore.selectCard(card.id) })
  cardEventIds.set(card.id, eventId)

  return group
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
    existing.set({
      width: w, height: h,
      strokeWidth: selected ? 3 : 1,
      stroke: selected ? '#818cf8' : '#2a2a4a',
      fill: '#16213e',
    })

    const hasOverlay = existing.children?.some(c => (c as any).id === '__gen_overlay__')
    const hasImage = existing.children?.some(c => c instanceof Image)
    if (hasOverlay || !hasImage) {
      existing.removeAll()
      existing.add(new Image({ url: card.screenshot, width: w, height: h }))
      existing.add(new Text({ text: card.label, fontSize: 12, fill: '#6b7280', y: -22 }))
    } else {
      const imgChild = existing.children?.find(c => c instanceof Image) as Image | undefined
      if (imgChild) {
        imgChild.set({ url: card.screenshot, width: w, height: h })
      }
    }
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
      removeActionBtns(id)
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
  const selId = canvasStore.selectedCardId
  if (selId) {
    const selGroup = cardGroups.get(selId)
    if (selGroup) createActionBtns(selId, selGroup)
  }
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

  const group = new Frame({
    id: card.id, x: card.x, y: card.y,
    width: w, height: h,
    strokeWidth: selected ? 3 : 1, stroke: selected ? '#818cf8' : '#2a2a4a',
    cornerRadius: 8, fill: '#16213e',
  })
  group.add(new Rect({
    width: w, height: h, cornerRadius: 8,
    fill: 'rgba(15,15,35,0.5)',
  }))
  group.add(new Text({
    text: '截图生成中...', fontSize: 14, fill: '#94a3b8',
    x: w / 2, y: h / 2,
    textAlign: 'center',
  }))
  group.add(new Text({ text: card.label, fontSize: 12, fill: '#6b7280', y: -22 }))
  group.hitSelf = true
  const oldCardEvtId = cardEventIds.get(card.id)
  if (oldCardEvtId) group.off_(oldCardEvtId)
  const eventId = group.on_(PointerEvent.TAP, () => { canvasStore.selectCard(card.id) })
  cardEventIds.set(card.id, eventId)
  if (treeLayer) treeLayer.add(group)
  cardGroups.set(card.id, group)
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
        const group = cardGroups.get(genId)
        if (group) {
          const spinner = group.children?.find(c => (c as any).id === '__spinner__')
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
  () => canvasStore.cards.map(c => `${c.screenshot ? 'y' : 'n'}:${c.html ? 'h' : 'e'}`).join(','),
  () => { renderAll(false) },
)

watch(() => canvasStore.generatingCardId, (newId) => {
  if (!newId) {
    stopBreathAnimation()
    return
  }
  startBreathAnimation()
  const card = canvasStore.cards.find(c => c.id === newId)
  if (card) renderCard(card, card.id === canvasStore.selectedCardId, true)
})

watch(() => canvasStore.selectedCardId, (newId, oldId) => {
  if (oldId) {
    removeActionBtns(oldId)
    const oldGroup = cardGroups.get(oldId)
    if (oldGroup) {
      oldGroup.set({ strokeWidth: 1, stroke: '#2a2a4a' })
    }
  }
  if (newId) {
    const group = cardGroups.get(newId)
    if (group) {
      group.set({ strokeWidth: 3, stroke: '#818cf8' })
      createActionBtns(newId, group)
    }
  }
})

const BTN_H = 28
const BTN_GAP = 8
const BTN_AREA_H = BTN_H + 6
const actionBtnGroups = new Map<string, Box>()

function updateActionBtnPositions() {
  const zoomLayer = (treeLayer as any)?.zoomLayer
  const scale = zoomLayer?.scaleX ?? 1
  const offsetX = zoomLayer?.x ?? 0
  const offsetY = zoomLayer?.y ?? 0

  for (const [cardId, btnGroup] of actionBtnGroups) {
    const cardGroup = cardGroups.get(cardId)
    if (!cardGroup) continue
    const wx = cardGroup.x ?? 0
    const wy = cardGroup.y ?? 0
    const screenX = wx * scale + offsetX
    const screenY = wy * scale + offsetY
    btnGroup.set({
      x: screenX,
      y: screenY - BTN_AREA_H * scale,
      scaleX: scale,
      scaleY: scale,
    })
  }
}

function createActionBtns(cardId: string, group: Frame) {
  const existing = actionBtnGroups.get(cardId)
  if (existing) return

  const w = group.width ?? 0
  const gx = group.x ?? 0
  const gy = group.y ?? 0
  const btnW = 56

  const btnGroup = new Box({
    x: gx, y: gy - BTN_AREA_H,
    width: w, height: BTN_H,
  })

  const previewBtn = new Box({
    x: w - btnW * 4 - BTN_GAP * 3, y: 0,
    width: btnW, height: BTN_H,
    fill: 'rgba(59,130,246,0.85)', cornerRadius: 6,
    hitSelf: true,
  })
  previewBtn.add(new Text({ text: '预览', fontSize: 12, fill: '#fff', textAlign: 'center', verticalAlign: 'middle', width: btnW, height: BTN_H }))
  previewBtn.id = `__btn_preview__${cardId}`
  const previewEvtId = previewBtn.on_(PointerEvent.TAP, (e: PointerEvent) => { e.stop() ; emit('previewCard', cardId) })

  const exportBtn = new Box({
    x: w - btnW * 3 - BTN_GAP * 2, y: 0,
    width: btnW, height: BTN_H,
    fill: 'rgba(16,185,129,0.85)', cornerRadius: 6,
    hitSelf: true,
  })
  exportBtn.add(new Text({ text: '导出', fontSize: 12, fill: '#fff', textAlign: 'center', verticalAlign: 'middle', width: btnW, height: BTN_H }))
  exportBtn.id = `__btn_export__${cardId}`
  const exportEvtId = exportBtn.on_(PointerEvent.TAP, (e: PointerEvent) => { e.stop() ; emit('exportCard', cardId) })

  const refreshBtn = new Box({
    x: w - btnW * 2 - BTN_GAP, y: 0,
    width: btnW, height: BTN_H,
    fill: 'rgba(79,70,229,0.85)', cornerRadius: 6,
    hitSelf: true,
  })
  refreshBtn.add(new Text({ text: '刷新', fontSize: 12, fill: '#fff', textAlign: 'center', verticalAlign: 'middle', width: btnW, height: BTN_H }))
  refreshBtn.id = `__btn_refresh__${cardId}`
  const refreshEvtId = refreshBtn.on_(PointerEvent.TAP, (e: PointerEvent) => { e.stop() ; refreshCard(cardId) })

  const deleteBtn = new Box({
    x: w - btnW, y: 0,
    width: btnW, height: BTN_H,
    fill: 'rgba(239,68,68,0.85)', cornerRadius: 6,
    hitSelf: true,
  })
  deleteBtn.add(new Text({ text: '删除', fontSize: 12, fill: '#fff', textAlign: 'center', verticalAlign: 'middle', width: btnW, height: BTN_H }))
  deleteBtn.id = `__btn_delete__${cardId}`
  const deleteEvtId = deleteBtn.on_(PointerEvent.TAP, (e: PointerEvent) => { e.stop() ; showConfirm(cardId) })

  btnGroup.add(previewBtn)
  btnGroup.add(exportBtn)
  btnGroup.add(refreshBtn)
  btnGroup.add(deleteBtn)
  if (skyLayer) skyLayer.add(btnGroup)
  actionBtnGroups.set(cardId, btnGroup)
  btnEventIds.set(cardId, [previewEvtId, exportEvtId, refreshEvtId, deleteEvtId])
}

function removeActionBtns(cardId: string) {
  const btnGroup = actionBtnGroups.get(cardId)
  if (btnGroup) {
    const ids = btnEventIds.get(cardId)
    if (ids) {
      for (const eid of ids) btnGroup.off_(eid)
      btnEventIds.delete(cardId)
    }
    btnGroup.remove()
    actionBtnGroups.delete(cardId)
  }
}

async function refreshCard(cardId: string) {
  const card = canvasStore.cards.find(c => c.id === cardId)
  if (!card || !card.html) return
  card.screenshot = ''
  await renderCard(card, true, false)
  await saveProject()
}

function handleZoomIn() { treeLayer?.zoom('in') }
function handleZoomOut() { treeLayer?.zoom('out') }
function handleZoomFit() { if (treeLayer && cardGroups.size > 0) treeLayer.zoom('fit') }

defineExpose({ handleZoomIn, handleZoomOut, handleZoomFit })
</script>

<template>
  <div class="canvas-wrapper">
    <div ref="containerRef" class="canvas-container"></div>

    <div class="canvas-info">
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
  </div>
</template>

<style scoped>
.canvas-wrapper { position: absolute; inset: 0; background: var(--bg-canvas); overflow: hidden; }
.canvas-container { position: relative; width: 100%; height: 100%; }
.canvas-info { position: absolute; top: 52px; left: 50%; transform: translateX(-50%); padding: 4px 12px; background: rgba(22,33,62,0.8); font-size: var(--font-xs); color: var(--text-muted); border-radius: var(--radius-sm); pointer-events: none; z-index: var(--z-canvas); }
.confirm-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: var(--z-dialog); }
.confirm-dialog { background: var(--bg-surface); border-radius: var(--radius-lg); padding: 20px 24px; min-width: 280px; box-shadow: var(--shadow-lg); border: 1px solid var(--border-default); }
.confirm-body { display: flex; align-items: center; gap: 10px; margin-bottom: 20px; }
.confirm-icon { font-size: 20px; }
.confirm-text { font-size: var(--font-md); color: var(--text-primary); }
.confirm-actions { display: flex; justify-content: flex-end; gap: 8px; }
</style>
