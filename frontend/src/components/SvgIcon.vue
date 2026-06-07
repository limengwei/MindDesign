<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'

const props = withDefaults(defineProps<{
  name: string
  size?: number | string
  color?: string
}>(), {
  size: 24,
  color: 'currentColor',
})

const svgHtml = ref<string>('')

async function loadSvg(name: string) {
  if (!name) return
  try {
    const resp = await fetch(`/icons/${name}.svg`)
    if (resp.ok) {
      svgHtml.value = await resp.text()
    }
  } catch {
    svgHtml.value = ''
  }
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
