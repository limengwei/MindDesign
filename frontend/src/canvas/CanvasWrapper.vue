<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { App, Leafer, Box, Image, Text, Rect } from 'leafer-ui'
import '@leafer-in/viewport'
import '@leafer-in/view'
import html2canvas from 'html2canvas'
import { DotGrid } from './dotGrid'
import { useCanvasStore, type CanvasCard } from '../stores/canvasStore'

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
})

const iconCache = new Map<string, string>()

async function fetchIconSvg(name: string): Promise<string> {
  if (iconCache.has(name)) return iconCache.get(name)!
  try {
    const resp = await fetch(`/icons/${name}.svg`)
    if (!resp.ok) return ''
    const svg = await resp.text()
    iconCache.set(name, svg)
    return svg
  } catch {
    return ''
  }
}

async function replaceIcons(html: string): Promise<string> {
  let processed = html.replace(/<link[^>]*fonts\.googleapis\.com[^>]*>/gi, '')

  const iconPattern = /<span\s+[^>]*class\s*=\s*["']material-symbols-outlined["'][^>]*>([^<]*)<\/span>/gi
  const matches = [...html.matchAll(iconPattern)]
  const iconNames = [...new Set(matches.map(m => m[1].trim()).filter(Boolean))]
  await Promise.all(iconNames.map(name => fetchIconSvg(name)))

  processed = processed.replace(iconPattern, (_match, icon: string) => {
    const name = icon.trim()
    if (!name) return ''
    const svg = iconCache.get(name)
    if (!svg) return `<span style="display:inline-block;width:24px;height:24px;"></span>`

    const styleMatch = _match.match(/style\s*=\s*"([^"]*)"/i)
    const styleStr = styleMatch ? styleMatch[1] : ''
    const sizeMatch = styleStr.match(/font-size\s*:\s*(\d+(?:\.\d+)?)(px|em|rem)?/i)
    let size = 24
    if (sizeMatch) {
      size = parseFloat(sizeMatch[1])
      if (sizeMatch[2] === 'em') size *= 16
      else if (sizeMatch[2] === 'rem') size *= 16
    }

    const colorMatch = styleStr.match(/(?:^|;)\s*color\s*:\s*([^;]+)/i)
    const color = colorMatch ? colorMatch[1].trim() : ''
    let styledSvg = svg
      .replace(/width="[^"]*"/, `width="${size}"`)
      .replace(/height="[^"]*"/, `height="${size}"`)
      .replace('<svg ', `<svg style="vertical-align:middle;display:inline-block;fill:currentColor;" `)
    if (color) {
      styledSvg = `<span style="color:${color};display:inline-flex;vertical-align:middle;">${styledSvg}</span>`
    }

    return styledSvg
  })

  return processed
}

async function htmlToScreenshot(html: string): Promise<string> {
  if (!html) return ''

  const processed = await replaceIcons(html)

  const iframe = document.createElement('iframe')
  iframe.style.cssText = 'position:fixed;left:-9999px;top:0;width:' + props.pageWidth + 'px;height:' + props.pageHeight + 'px;border:none;overflow:hidden'
  document.body.appendChild(iframe)
  const doc = iframe.contentDocument!
  doc.open(); doc.write(processed); doc.close()
  await new Promise(r => setTimeout(r, 600))
  try {
    const c = await html2canvas(doc.body, { width: props.pageWidth, height: props.pageHeight, scale: 2, useCORS: true, backgroundColor: '#ffffff' })
    document.body.removeChild(iframe)
    return c.toDataURL('image/png')
  } catch (e) {
    document.body.removeChild(iframe)
    return ''
  }
}

async function renderCard(card: CanvasCard, selected: boolean, isGenerating: boolean) {
  if (!treeLayer) return

  const existing = cardGroups.get(card.id)
  if (existing) existing.remove()

  if (!isGenerating && !card.screenshot && card.html) {
    card.screenshot = await htmlToScreenshot(card.html)
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
  for (const g of cardGroups.values()) g.remove()
  cardGroups.clear()
  const genId = canvasStore.generatingCardId
  for (const card of canvasStore.cards) {
    if (renderVersion !== v) return
    await renderCard(card, card.id === canvasStore.selectedCardId, card.id === genId)
  }
  if (genId) startBreathAnimation()
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

watch(() => canvasStore.selectedCardId, () => {
  for (const [id, group] of cardGroups) {
    const sel = id === canvasStore.selectedCardId
    ;(group as any).strokeWidth = sel ? 3 : 1
    ;(group as any).stroke = sel ? '#818cf8' : '#2a2a4a'
  }
})

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
  </div>
</template>

<style scoped>
.canvas-wrapper { position: absolute; inset: 0; background: #0f0f23; overflow: hidden; }
.canvas-container { position: relative; width: 100%; height: 100%; }
.canvas-info { position: absolute; top: 52px; left: 50%; transform: translateX(-50%); padding: 4px 12px; background: rgba(22,33,62,0.8); font-size: 11px; color: #6b7280; border-radius: 6px; pointer-events: none; z-index: 10; }
</style>
