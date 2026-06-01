<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { App, Leafer, Box, Image, Text, Rect, PointerEvent } from 'leafer-ui'
import '@leafer-in/viewport'
import '@leafer-in/view'
import html2canvas from 'html2canvas'
import { DotGrid } from './dotGrid'
import { useCanvasStore, type CanvasCard } from '../stores/canvasStore'
import { saveProject } from '../stores/autoSave'

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

function confirmDelete() {
  canvasStore.removeCard(confirmState.value.cardId)
  saveProject()
  confirmState.value.show = false
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
let dotGrid: DotGrid | null = null
let resizeObserver: ResizeObserver | null = null
const cardGroups = new Map<string, Box>()
let breathRafId = 0
let breathPhase = 0
let renderVersion = 0

onMounted(() => {
  if (!containerRef.value) return

  app = new App({
    view: containerRef.value,
    tree: { type: 'design' },
    zoom: { min: 0.1, max: 5 },
    move: { holdSpaceKey: true, holdMiddleKey: true, scroll: true },
  })

  treeLayer = app.tree as Leafer

  app.on(PointerEvent.TAP, (e: PointerEvent) => {
    const target = e.target as any
    if (!target?.id || !cardGroups.has(target.id)) {
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
  app?.destroy(); app = null; treeLayer = null
  cardGroups.clear()
  actionBtnGroups.clear()
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
    const color = colorMatch ? colorMatch[1].trim() : ''

    let styledSvg = svg
      .replace(/width="[^"]*"/, `width="${size}"`)
      .replace(/height="[^"]*"/, `height="${size}"`)
      .replace('<svg ', `<svg style="vertical-align:middle;display:inline-block;fill:currentColor;" `)
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
  await new Promise(r => setTimeout(r, 100))

  try {
    const doc = iframe.contentDocument!
    const freezeStyle = doc.createElement('style')
    freezeStyle.textContent = '*, *::before, *::after { animation-delay: -999999s !important; animation-duration: 0.001s !important; transition-duration: 0.001s !important; }'
    doc.head.appendChild(freezeStyle)
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))

    doc.documentElement.style.height = 'auto'
    doc.documentElement.style.overflow = 'visible'
    doc.body.style.height = 'auto'
    doc.body.style.overflow = 'visible'
    const contentHeight = Math.ceil(Math.max(doc.documentElement.scrollHeight, doc.body.scrollHeight, props.pageHeight))
    console.log('[Screenshot] contentHeight:', contentHeight, 'body scrollHeight:', doc.body.scrollHeight)
    iframe.style.height = contentHeight + 'px'
    container.style.height = contentHeight + 'px'
    await new Promise(r => setTimeout(r, 200))

    const c = await html2canvas(doc.documentElement, {
      width: props.pageWidth,
      height: contentHeight,
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      foreignObjectRendering: false,
      removeContainer: false,
    })
    const dataUrl = c.toDataURL('image/png')
    console.log('[Screenshot] canvas size:', c.width, 'x', c.height, 'dataUrl length:', dataUrl.length)
    document.body.removeChild(container)
    return { dataUrl, contentHeight }
  } catch (e) {
    console.error('[Screenshot] error:', e)
    document.body.removeChild(container)
    return { dataUrl: '', contentHeight: props.pageHeight }
  }
}

async function renderCard(card: CanvasCard, selected: boolean, isGenerating: boolean) {
  if (!treeLayer) return

  const existing = cardGroups.get(card.id)
  if (existing) existing.remove()

  if (!isGenerating && !card.screenshot && card.html) {
    const result = await htmlToScreenshot(card.html)
    card.screenshot = result.dataUrl
    if (result.contentHeight !== card.height) {
      card.height = result.contentHeight
    }
  }

  const w = card.width || props.pageWidth
  const h = card.height || props.pageHeight

  const group = new Box({
    id: card.id, x: card.x, y: card.y,
    width: w, height: h,
    strokeWidth: selected ? 3 : 1, stroke: selected ? '#818cf8' : '#2a2a4a',
    cornerRadius: 8, fill: isGenerating ? '#2a2a4a' : '#16213e',
    overflow: 'hide',
  })

  if (isGenerating) {
    const overlay = new Rect({
      width: w, height: h, cornerRadius: 8,
      fill: '#2a2a4a',
    })
    overlay.id = '__gen_overlay__'
    group.add(overlay as any)
  } else if (card.screenshot) {
    group.add(new Image({ url: card.screenshot, width: w, height: h }) as any)
  }

  group.add(new Text({ text: card.label, fontSize: 12, fill: '#6b7280', y: -22 }) as any)
  group.hitSelf = true
  group.on('click', () => { canvasStore.selectCard(card.id) })
  treeLayer.add(group as any)
  cardGroups.set(card.id, group)
}

async function renderAll(shouldZoom = false) {
  if (!treeLayer) return
  const v = ++renderVersion
  for (const g of actionBtnGroups.values()) g.remove()
  actionBtnGroups.clear()
  for (const g of cardGroups.values()) g.remove()
  cardGroups.clear()
  const genId = canvasStore.generatingCardId
  for (const card of canvasStore.cards) {
    if (renderVersion !== v) return
    await renderCard(card, card.id === canvasStore.selectedCardId, card.id === genId)
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
}

function startBreathAnimation() {
  if (breathRafId) return
  const tick = () => {
    breathPhase += 0.03
    const alpha = 0.4 + 0.3 * Math.sin(breathPhase)
    const genId = canvasStore.generatingCardId
    if (genId) {
      const group = cardGroups.get(genId)
      if (group) {
        const overlay = group.children?.find(c => (c as any).id === '__gen_overlay__')
        if (overlay) {
          (overlay as any).opacity = alpha
        }
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
    breathPhase = 0
  }
}

watch(
  () => {
    const genId = canvasStore.generatingCardId
    const cardsKey = canvasStore.cards.map(c => `${c.id}:${c.screenshot ? 'y' : 'n'}:${c.html ? 'h' : 'e'}`).join(',')
    return `${cardsKey}|gen:${genId}`
  },
  (_new, _old) => {
    const genId = canvasStore.generatingCardId
    if (!genId) stopBreathAnimation()
    const cardsChanged = _new.split('|')[0] !== _old.split('|')[0]
    renderAll(cardsChanged)
  },
)

watch(() => canvasStore.selectedCardId, (newId, oldId) => {
  if (oldId) {
    removeActionBtns(oldId)
    const oldGroup = cardGroups.get(oldId)
    if (oldGroup) {
      ;(oldGroup as any).strokeWidth = 1
      ;(oldGroup as any).stroke = '#2a2a4a'
    }
  }
  if (newId) {
    const group = cardGroups.get(newId)
    if (group) {
      ;(group as any).strokeWidth = 3
      ;(group as any).stroke = '#818cf8'
      createActionBtns(newId, group)
    }
  }
})

const BTN_H = 28
const BTN_GAP = 8
const BTN_AREA_H = BTN_H + 6
const actionBtnGroups = new Map<string, Box>()

function createActionBtns(cardId: string, group: Box) {
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
  previewBtn.add(new Text({ text: '预览', fontSize: 12, fill: '#fff', textAlign: 'center', verticalAlign: 'middle', width: btnW, height: BTN_H }) as any)
  previewBtn.id = `__btn_preview__${cardId}`
  previewBtn.on(PointerEvent.TAP, (e: PointerEvent) => { e.stop() ; emit('previewCard', cardId) })

  const exportBtn = new Box({
    x: w - btnW * 3 - BTN_GAP * 2, y: 0,
    width: btnW, height: BTN_H,
    fill: 'rgba(16,185,129,0.85)', cornerRadius: 6,
    hitSelf: true,
  })
  exportBtn.add(new Text({ text: '导出', fontSize: 12, fill: '#fff', textAlign: 'center', verticalAlign: 'middle', width: btnW, height: BTN_H }) as any)
  exportBtn.id = `__btn_export__${cardId}`
  exportBtn.on(PointerEvent.TAP, (e: PointerEvent) => { e.stop() ; emit('exportCard', cardId) })

  const refreshBtn = new Box({
    x: w - btnW * 2 - BTN_GAP, y: 0,
    width: btnW, height: BTN_H,
    fill: 'rgba(79,70,229,0.85)', cornerRadius: 6,
    hitSelf: true,
  })
  refreshBtn.add(new Text({ text: '刷新', fontSize: 12, fill: '#fff', textAlign: 'center', verticalAlign: 'middle', width: btnW, height: BTN_H }) as any)
  refreshBtn.id = `__btn_refresh__${cardId}`
  refreshBtn.on(PointerEvent.TAP, (e: PointerEvent) => { e.stop() ; refreshCard(cardId) })

  const deleteBtn = new Box({
    x: w - btnW, y: 0,
    width: btnW, height: BTN_H,
    fill: 'rgba(239,68,68,0.85)', cornerRadius: 6,
    hitSelf: true,
  })
  deleteBtn.add(new Text({ text: '删除', fontSize: 12, fill: '#fff', textAlign: 'center', verticalAlign: 'middle', width: btnW, height: BTN_H }) as any)
  deleteBtn.id = `__btn_delete__${cardId}`
  deleteBtn.on(PointerEvent.TAP, (e: PointerEvent) => { e.stop() ; showConfirm(cardId) })

  btnGroup.add(previewBtn as any)
  btnGroup.add(exportBtn as any)
  btnGroup.add(refreshBtn as any)
  btnGroup.add(deleteBtn as any)
  treeLayer!.add(btnGroup as any)
  actionBtnGroups.set(cardId, btnGroup)
}

function removeActionBtns(cardId: string) {
  const btnGroup = actionBtnGroups.get(cardId)
  if (btnGroup) { btnGroup.remove(); actionBtnGroups.delete(cardId) }
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
