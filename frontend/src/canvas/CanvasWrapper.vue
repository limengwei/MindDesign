<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { App, Leafer, Group, Image, Text } from 'leafer-ui'
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
    zoom: {
      min: 0.1,
      max: 5,
    },
    move: {
      holdSpaceKey: true,
      holdMiddleKey: true,
      scroll: true,
    },
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
    const { clientWidth, clientHeight } = containerRef.value
    app.resize({ width: clientWidth, height: clientHeight })
  })
  resizeObserver.observe(containerRef.value)

  nextTick(() => {
    if (canvasStore.cards.length > 0) {
      renderAll()
    }
  })
})

onUnmounted(() => {
  dotGrid?.destroy()
  dotGrid = null
  resizeObserver?.disconnect()
  resizeObserver = null
  app?.destroy()
  app = null
  treeLayer = null
  cardGroups.clear()
})

async function htmlToScreenshot(html: string): Promise<string> {
  if (!html) return ''
  const iframe = document.createElement('iframe')
  iframe.style.cssText = 'position:fixed;left:-9999px;top:0;width:' + props.pageWidth + 'px;height:' + props.pageHeight + 'px;border:none;overflow:hidden'
  document.body.appendChild(iframe)
  const doc = iframe.contentDocument!
  doc.open()
  doc.write(html)
  doc.close()
  await new Promise(r => setTimeout(r, 400))
  const c = await html2canvas(doc.body, { width: props.pageWidth, height: props.pageHeight, scale: 2, useCORS: true, backgroundColor: '#ffffff' })
  document.body.removeChild(iframe)
  return c.toDataURL('image/png')
}

async function renderCard(card: CanvasCard, selected: boolean) {
  if (!treeLayer) return
  // 如果没有截图缓存，先生成
  if (!card.screenshot && card.html) {
    card.screenshot = await htmlToScreenshot(card.html)
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

  if (card.screenshot) {
    group.add(new Image({ url: card.screenshot, width: card.width || props.pageWidth, height: card.height || props.pageHeight }) as any)
  }

  group.add(new Text({ text: card.label, fontSize: 12, fill: '#6b7280', y: -22 }) as any)
  group.hitSelf = true
  group.on('click', () => { canvasStore.selectCard(card.id) })
  treeLayer.add(group as any)
  cardGroups.set(card.id, group)
}

function removeCard(id: string) {
  const group = cardGroups.get(id)
  group?.remove()
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

watch(
  () => canvasStore.selectedCardId,
  () => {
    for (const [id, group] of cardGroups) {
      const sel = id === canvasStore.selectedCardId
      ;(group as any).strokeWidth = sel ? 3 : 1
      ;(group as any).stroke = sel ? '#818cf8' : '#2a2a4a'
    }
  }
)

function handleZoomIn() {
  if (!treeLayer) return
  treeLayer.zoom('in')
}

function handleZoomOut() {
  if (!treeLayer) return
  treeLayer.zoom('out')
}

function handleZoomFit() {
  if (!treeLayer || cardGroups.size === 0) return
  treeLayer.zoom('fit')
}

defineExpose({ handleZoomIn, handleZoomOut, handleZoomFit })
</script>

<template>
  <div class="canvas-wrapper">
    <div ref="containerRef" class="canvas-container"></div>

    <Transition name="loading-fade">
      <div v-if="canvasStore.isGenerating" class="canvas-loading-overlay">
        <div class="loading-content">
          <div class="loading-spinner">
            <div class="spinner-ring"></div>
            <div class="spinner-ring"></div>
            <div class="spinner-ring"></div>
          </div>
          <div class="loading-text">AI 正在生成设计稿...</div>
          <div class="loading-subtext">请稍候，这可能需要几秒钟</div>
        </div>
      </div>
    </Transition>

    <div class="canvas-info">
      {{ canvasStore.cards.length }} 个设计稿 | {{ pageWidth }} × {{ pageHeight }}
    </div>
  </div>
</template>

<style scoped>
.canvas-wrapper {
  position: absolute;
  inset: 0;
  background: #0f0f23;
  overflow: hidden;
}

.canvas-container {
  position: relative;
  width: 100%;
  height: 100%;
}

.canvas-info {
  position: absolute;
  bottom: 8px;
  left: 50%;
  transform: translateX(-50%);
  padding: 4px 12px;
  background: rgba(22, 33, 62, 0.8);
  font-size: 11px;
  color: #6b7280;
  border-radius: 6px;
  pointer-events: none;
}

.canvas-loading-overlay {
  position: absolute;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(15, 15, 35, 0.7);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

.loading-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.loading-spinner {
  position: relative;
  width: 64px;
  height: 64px;
}

.spinner-ring {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 2px solid transparent;
}

.spinner-ring:nth-child(1) {
  border-top-color: #818cf8;
  animation: spin 1.2s linear infinite;
}

.spinner-ring:nth-child(2) {
  inset: 6px;
  border-right-color: #6366f1;
  animation: spin 1.6s linear infinite reverse;
}

.spinner-ring:nth-child(3) {
  inset: 12px;
  border-bottom-color: #4f46e5;
  animation: spin 2s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-text {
  font-size: 16px;
  font-weight: 500;
  color: #e5e7eb;
  letter-spacing: 0.5px;
}

.loading-subtext {
  font-size: 12px;
  color: #6b7280;
}

.loading-fade-enter-active,
.loading-fade-leave-active {
  transition: opacity 0.4s ease;
}

.loading-fade-enter-from,
.loading-fade-leave-to {
  opacity: 0;
}
</style>
