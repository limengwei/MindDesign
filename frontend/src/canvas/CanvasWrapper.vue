<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { App, Leafer, Group, Rect, Text, Frame } from 'leafer-ui'
import '@leafer-in/viewport'
import { buildTree } from './renderer'
import { useCanvasStore, type CanvasCard } from '../stores/canvasStore'
import type { ElementTree } from '../types/element'

const props = defineProps({
  pageWidth: { type: Number, default: 375 },
  pageHeight: { type: Number, default: 812 },
})

const canvasStore = useCanvasStore()
const containerRef = ref<HTMLDivElement | null>(null)
let app: App | null = null
let treeLayer: Leafer | null = null
let resizeObserver: ResizeObserver | null = null
const cardGroups = new Map<string, Group>()

onMounted(() => {
  if (!containerRef.value) return

  app = new App({
    view: containerRef.value,
    fill: '#0f0f23',
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

  resizeObserver = new ResizeObserver(() => {
    if (!containerRef.value || !app) return
    const { clientWidth, clientHeight } = containerRef.value
    app.resize({ width: clientWidth, height: clientHeight })
  })
  resizeObserver.observe(containerRef.value)
})

onUnmounted(() => {
  resizeObserver?.disconnect()
  resizeObserver = null
  app?.destroy()
  app = null
  treeLayer = null
  cardGroups.clear()
})

async function renderCard(card: CanvasCard, selected: boolean) {
  if (!treeLayer) return
  const group = new Group({
    id: card.id,
    x: card.x,
    y: card.y,
    strokeWidth: selected ? 3 : 1,
    stroke: selected ? '#818cf8' : '#2a2a4a',
    cornerRadius: 8,
    fill: '#16213e',
  })
  const root = await buildTree(card.tree)
  group.add(root as any)

  const label = new Text({
    text: card.label,
    fontSize: 12,
    fill: '#6b7280',
    y: -22,
  })
  group.add(label as any)

  group.hitSelf = true
  group.on('click', () => {
    canvasStore.selectCard(card.id)
  })

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
    <div class="canvas-viewport">
      <div ref="containerRef" class="canvas-container"></div>
    </div>
    <div class="canvas-info">
      {{ canvasStore.cards.length }} 个设计稿 | {{ pageWidth }} × {{ pageHeight }}
    </div>
  </div>
</template>

<style scoped>
.canvas-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #0f0f23;
  overflow: hidden;
}

.canvas-viewport {
  flex: 1;
  overflow: hidden;
  position: relative;
}

.canvas-container {
  width: 100%;
  height: 100%;
}

.canvas-info {
  padding: 6px 12px;
  background: #16213e;
  font-size: 12px;
  color: #6b7280;
  text-align: center;
  flex-shrink: 0;
}
</style>
