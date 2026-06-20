<script setup lang="ts">
import { computed } from 'vue'

const modules = import.meta.glob('../assets/icons/*.svg', {
  query: '?raw',
  eager: true,
  import: 'default',
})

const iconMap: Record<string, string> = {}
for (const [path, raw] of Object.entries(modules)) {
  const name = path.match(/\/([^/]+)\.svg$/)?.[1] ?? ''
  iconMap[name] = raw as string
}

const props = withDefaults(defineProps<{
  name: string
  size?: number | string
  color?: string
}>(), {
  size: 24,
  color: 'currentColor',
})

const svgHtml = computed(() => iconMap[props.name] || '')
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
}

.svg-icon :deep(svg) {
  width: 100%;
  height: 100%;
  fill: currentColor;
}
</style>
