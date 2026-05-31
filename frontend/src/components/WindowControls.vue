<script setup lang="ts">
import { ref, onMounted } from 'vue'

const isMaximized = ref(false)

async function minimize() {
  try {
    const { Window } = await import('@wailsio/runtime')
    Window.Minimise()
  } catch {}
}

async function toggleMaximize() {
  try {
    const { Window } = await import('@wailsio/runtime')
    const wasMaximized = await Window.IsMaximised()
    if (wasMaximized) {
      Window.Restore()
    } else {
      Window.Maximise()
    }
    isMaximized.value = !wasMaximized
  } catch {}
}

async function close() {
  try {
    const { Window } = await import('@wailsio/runtime')
    Window.Close()
  } catch {}
}

async function checkMaximized() {
  try {
    const { Window } = await import('@wailsio/runtime')
    isMaximized.value = await Window.IsMaximised()
  } catch {}
}

onMounted(() => {
  checkMaximized()
})
</script>

<template>
  <div class="window-controls">
    <button class="ctrl-btn" title="最小化" @click="minimize">
      <svg width="10" height="1" viewBox="0 0 10 1"><rect width="10" height="1" fill="currentColor"/></svg>
    </button>
    <button class="ctrl-btn" :title="isMaximized ? '还原' : '最大化'" @click="toggleMaximize">
      <svg v-if="!isMaximized" width="10" height="10" viewBox="0 0 10 10">
        <rect x=".5" y=".5" width="9" height="9" fill="none" stroke="currentColor" stroke-width="1"/>
      </svg>
      <svg v-else width="10" height="10" viewBox="0 0 10 10">
        <rect x="2.5" y="0" width="7" height="7" fill="none" stroke="currentColor" stroke-width="1"/>
        <rect x="0" y="2.5" width="7" height="7" fill="none" stroke="currentColor" stroke-width="1"/>
        <line x1="0" y1="3" x2="2.5" y2="3" stroke="currentColor" stroke-width="1"/>
        <line x1="3" y1="0" x2="3" y2="2.5" stroke="currentColor" stroke-width="1"/>
      </svg>
    </button>
    <button class="ctrl-btn close-btn" title="关闭" @click="close">
      <svg width="10" height="10" viewBox="0 0 10 10">
        <line x1="0" y1="0" x2="10" y2="10" stroke="currentColor" stroke-width="1.2"/>
        <line x1="10" y1="0" x2="0" y2="10" stroke="currentColor" stroke-width="1.2"/>
      </svg>
    </button>
  </div>
</template>

<style scoped>
.window-controls {
  display: flex;
  align-items: center;
  height: 100%;
  --wails-draggable: no-drag;
}

.ctrl-btn {
  width: 46px;
  height: 32px;
  border: none;
  background: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #9ca3af;
  transition: background 0.15s, color 0.15s;
}

.ctrl-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #e5e7eb;
}

.close-btn:hover {
  background: #e81123;
  color: #fff;
}
</style>
