<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'

const svgCache = new Map<string, string>()
const svgPending = new Map<string, Promise<string>>()

const props = withDefaults(defineProps<{
  name: string
  size?: number | string
  color?: string
}>(), {
  size: 24,
  color: 'currentColor',
})

const svgHtml = ref<string>('')

async function fetchSvg(name: string): Promise<string> {
  const cached = svgCache.get(name)
  if (cached !== undefined) return cached
  const pending = svgPending.get(name)
  if (pending) return pending
  const p = fetch(`/icons/${name}.svg`)
    .then(r => (r.ok ? r.text() : ''))
    .finally(() => svgPending.delete(name))
  svgPending.set(name, p)
  const svg = await p
  svgCache.set(name, svg)
  return svg
}

async function loadSvg(name: string) {
  if (!name) { svgHtml.value = ''; return }
  svgHtml.value = await fetchSvg(name)
}

onMounted(() => loadSvg(props.name))
watch(() => props.name, (val) => loadSvg(val))
</script>

<template>
  <span
    class="svg-icon"
    :style="{
      width: typeof size === 'number' ? `${size}px` : size,
      height: typeof size === 'number' ? `${size}px` : size,
      color,
    }"
    v-html="svgHtml"
  />
</template>

<style scoped>
.svg-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  line-height: 0;
}
.svg-icon :deep(svg) {
  width: 100%;
  height: 100%;
  fill: currentColor;
}
</style>
