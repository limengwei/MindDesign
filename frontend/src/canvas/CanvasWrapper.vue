<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { Leafer, Group, Rect, Text, Frame } from 'leafer-ui'
import { buildTree } from './renderer'
import { useCanvasStore, type CanvasCard } from '../stores/canvasStore'
import type { ElementTree } from '../types/element'

const props = defineProps({
  pageWidth: { type: Number, default: 375 },
  pageHeight: { type: Number, default: 812 },
})

const canvasStore = useCanvasStore()
const containerRef = ref<HTMLDivElement | null>(null)
let leafer: Leafer | null = null
/** cardId → Leafer Group */
const cardGroups = new Map<string, Group>()

onMounted(() => {
  if (!containerRef.value) return
  // 无限画布：比视口大很多
  const w = containerRef.value.clientWidth * 3
  const h = containerRef.value.clientHeight * 3
  leafer = new Leafer({
    view: containerRef.value,
    width: w,
    height: h,
    fill: '#f5f5f5',
    type: 'design',
    move: { scroll: true },
  })
})

onUnmounted(() => {
  leafer?.destroy()
  leafer = null
  cardGroups.clear()
})

/** 构建单张卡片并定位 */
async function renderCard(card: CanvasCard, selected: boolean) {
  if (!leafer) return
  const group = new Group({
    id: card.id,
    x: card.x,
    y: card.y,
    // 选中高亮
    strokeWidth: selected ? 3 : 1,
    stroke: selected ? '#4F46E5' : '#e0e0e0',
    cornerRadius: 8,
    fill: '#ffffff',
  })
  const root = await buildTree(card.tree)
  group.add(root as any)

  // 卡片标签
  const label = new Text({
    text: card.label,
    fontSize: 12,
    fill: '#999',
    y: -22,
  })
  group.add(label as any)

  const dims = { width: props.pageWidth, height: props.pageHeight }
  group.hitSelf = true
  group.on('click', () => {
    canvasStore.selectCard(card.id)
  })

  leafer.add(group as any)
  cardGroups.set(card.id, group)
}

function removeCard(id: string) {
  const group = cardGroups.get(id)
  group?.remove()
  cardGroups.delete(id)
}

/** 全量重绘所有卡片 */
async function renderAll() {
  if (!leafer) return
  // 清除所有卡片组
  for (const g of cardGroups.values()) g.remove()
  cardGroups.clear()

  for (const card of canvasStore.cards) {
    await renderCard(card, card.id === canvasStore.selectedCardId)
  }
}

// 监听 cards 变化
watch(
  () => canvasStore.cards.map(c => c.id),
  () => renderAll(),
  { deep: false }
)

// 选中高亮更新
watch(
  () => canvasStore.selectedCardId,
  () => {
    for (const [id, group] of cardGroups) {
      const sel = id === canvasStore.selectedCardId
      ;(group as any).strokeWidth = sel ? 3 : 1
      ;(group as any).stroke = sel ? '#4F46E5' : '#e0e0e0'
    }
  }
)

// 视口缩放（滚轮）
function onWheel(e: WheelEvent) {
  if (!leafer) return
  e.preventDefault()
  const delta = e.deltaY > 0 ? -0.1 : 0.1
  const currentZoom = leafer.scaleX ?? 1
  const newZoom = Math.max(0.2, Math.min(2, currentZoom + delta))
  leafer.scaleX = newZoom
  leafer.scaleY = newZoom
}

onMounted(() => {
  containerRef.value?.addEventListener('wheel', onWheel, { passive: false })
})

onUnmounted(() => {
  containerRef.value?.removeEventListener('wheel', onWheel)
})
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
  background: #f0f0f0;
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
  background: #e8e8e8;
  font-size: 12px;
  color: #666;
  text-align: center;
  flex-shrink: 0;
}
</style>
