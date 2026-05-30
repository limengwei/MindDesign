<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { Leafer } from 'leafer-ui'
import { applyTree } from './renderer'
import type { ElementTree } from '../types/element'

const props = defineProps({
  tree: { type: Object as () => ElementTree | null, default: null },
  pageWidth: { type: Number, default: 375 },
  pageHeight: { type: Number, default: 812 },
})

const canvasContainer = ref(null)
let leafer = null
let oldTree = null

onMounted(() => {
  if (!canvasContainer.value) return
  leafer = new Leafer({
    view: canvasContainer.value,
    width: props.pageWidth,
    height: props.pageHeight,
    fill: '#FFFFFF',
    type: 'design',
  })
})

onUnmounted(() => {
  leafer?.destroy()
  leafer = null
})

watch(
  () => props.tree,
  async (newTree) => {
    if (!leafer || !newTree) return
    await applyTree(leafer, newTree, oldTree)
    oldTree = newTree
  },
  { deep: true }
)

watch(
  () => props.pageWidth,
  (w) => {
    if (leafer) leafer.width = w
  }
)

watch(
  () => props.pageHeight,
  (h) => {
    if (leafer) leafer.height = h
  }
)
</script>

<template>
  <div class="canvas-wrapper">
    <div class="canvas-viewport">
      <div ref="canvasContainer" class="canvas-container"></div>
    </div>
    <div class="canvas-info">
      {{ pageWidth }} × {{ pageHeight }}
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
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: auto;
  padding: 24px;
}

.canvas-container {
  box-shadow: 0 2px 20px rgba(0, 0, 0, 0.1);
  border-radius: 4px;
  overflow: hidden;
}

.canvas-info {
  padding: 6px 12px;
  background: #e8e8e8;
  font-size: 12px;
  color: #666;
  text-align: center;
}
</style>
