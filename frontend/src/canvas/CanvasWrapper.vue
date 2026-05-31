<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { App, Leafer, Group, Rect, Image, Text } from 'leafer-ui'
import '@leafer-in/viewport'
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
const cardGroups = new Map<string, Group>()

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
  dotGrid?.destroy(); dotGrid = null
  resizeObserver?.disconnect(); resizeObserver = null
  app?.destroy(); app = null; treeLayer = null
  cardGroups.clear()
})

/** 将 HTML 渲染到隐藏 iframe 中，用 html2canvas 截图 */
async function htmlToScreenshot(html: string): Promise<string> {
  if (!html) return ''
  const iframe = document.createElement('iframe')
  iframe.style.cssText =
    'position:fixed;left:-9999px;top:0;' +
    `width:${props.pageWidth}px;height:${props.pageHeight}px;` +
    'border:none;overflow:hidden;pointer-events:none'
  document.body.appendChild(iframe)

  const doc = iframe.contentDocument!
  doc.open()
  doc.write(html)
  doc.close()

  // 等待渲染完成
  await new Promise(r => setTimeout(r, 300))

  const canvas = await html2canvas(doc.body, {
    width: props.pageWidth,
    height: props.pageHeight,
    scale: 2,
    useCORS: true,
    backgroundColor: '#ffffff',
  })
  document.body.removeChild(iframe)
  return canvas.toDataURL('image/png')
}

async function renderCard(card: CanvasCard, selected: boolean) {
  if (!treeLayer) return

  // 如果没有截图缓存，先生成
  let screenshot = card.screenshot
  if (!screenshot && card.html) {
    screenshot = await htmlToScreenshot(card.html)
    card.screenshot = screenshot
  }

  const group = new Group({
    id: card.id,
    x: card.x,
    y: card.y,
    width: card.width || props.pageWidth,
    height: card.height || props.pageHeight,
    strokeWidth: selected ? 3 : 1,
    stroke: selected ? '#818cf8' : '#2a2a4a',
    cornerRadius: 8,
    fill: '#16213e',
  })

  if (screenshot) {
    const img = new Image({
      url: screenshot,
      width: card.width || props.pageWidth,
      height: card.height || props.pageHeight,
    })
    group.add(img as any)
  }

  const label = new Text({
    text: card.label,
    fontSize: 12,
    fill: '#6b7280',
    y: -22,
  })
  group.add(label as any)

  group.hitSelf = true
  group.on('click', () => { canvasStore.selectCard(card.id) })

  treeLayer.add(group as any)
  cardGroups.set(card.id, group)
}

function removeCard(id: string) {
  cardGroups.get(id)?.remove()
  cardGroups.delete(id)
}

async function renderAll() {
  if (!treeLayer) return
  for (const g of cardGroups.values()) g.remove()
  cardGroups.clear()

  for (const card of canvasStore.cards) {
    await renderCard(card, card.id === canvasStore.selectedCardId)
  }
}

watch(
  () => canvasStore.cards.map(c => c.id),
  () => renderAll(),
  { deep: false }
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

<style scoped>
.canvas-wrapper { position: absolute; inset: 0; background: #0f0f23; overflow: hidden; }
.canvas-container { position: relative; width: 100%; height: 100%; }

.canvas-info {
  position: absolute; bottom: 8px; left: 50%; transform: translateX(-50%);
  padding: 4px 12px; background: rgba(22,33,62,0.8); font-size: 11px; color: #6b7280;
  border-radius: 6px; pointer-events: none;
}
</style>
