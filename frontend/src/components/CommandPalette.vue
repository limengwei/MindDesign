<script setup lang="ts">
/**
 * 命令面板（Phase 5 · Task 19）
 *
 * 全局浮层（Teleport to body），输入框 + 搜索结果列表。
 * 键盘: ↑/↓ 选中、Enter 执行、Esc 关闭。
 */
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useCanvasStore } from '../stores/canvasStore'
import { BUILT_IN_SKILLS, getSkillById } from '../prompts/skills'

const emit = defineEmits<{
  close: []
  newPage: []
  exportCurrent: []
  showShortcuts: []
}>()

const canvasStore = useCanvasStore()
const router = useRouter()

export interface CommandItem {
  id: string
  label: string
  hint?: string
  icon?: string
  /** 关键字（用于搜索） */
  keywords?: string[]
  /** 内部路由名（router.push 用） */
  route?: string
  /** 自定义动作（执行后必须 emit('close')） */
  action?: () => void
  group?: string
}

const query = ref('')
const inputRef = ref<HTMLInputElement | null>(null)
const activeIndex = ref(0)

const commands = computed<CommandItem[]>(() => {
  const cmds: CommandItem[] = [
    {
      id: 'new-page',
      label: '新建画板',
      hint: '在当前项目添加一个空画板',
      icon: '➕',
      keywords: ['new', 'page', '画板', '新增'],
      action: () => emit('newPage'),
      group: '画板',
    },
    {
      id: 'export-png',
      label: '导出 PNG（当前画板）',
      hint: '把当前选中画板导出为 PNG',
      icon: '🖼',
      keywords: ['export', 'png', 'image', '导出'],
      action: () => emit('exportCurrent'),
      group: '导出',
    },
    {
      id: 'toggle-theme',
      label: canvasStore.isDarkMode ? '切换为亮色主题' : '切换为暗色主题',
      hint: 'UI 主题切换（不影响导出 HTML）',
      icon: canvasStore.isDarkMode ? '☀' : '🌙',
      keywords: ['theme', 'dark', 'light', '主题', '暗色', '亮色'],
      action: () => { canvasStore.toggleDarkMode(); emit('close') },
      group: '主题',
    },
    {
      id: 'show-shortcuts',
      label: '显示快捷键帮助',
      hint: '打开快捷键速查',
      icon: '⌨',
      keywords: ['shortcut', 'help', '快捷键', '帮助'],
      action: () => { emit('showShortcuts'); },
      group: '帮助',
    },
    {
      id: 'go-home',
      label: '返回首页',
      hint: '回到项目列表',
      icon: '🏠',
      keywords: ['home', '首页', '返回'],
      route: 'home',
      action: () => { router.push({ name: 'home' }); emit('close') },
      group: '导航',
    },
  ]
  // 动态注入 Skill
  for (const sk of BUILT_IN_SKILLS) {
    cmds.push({
      id: `skill-${sk.id}`,
      label: `切换 Skill：${sk.name}`,
      hint: sk.description.slice(0, 40),
      icon: sk.emoji,
      keywords: [sk.name, sk.description.slice(0, 20), 'skill', '场景'],
      action: () => {
        if (canvasStore.activeSkillId === sk.id) canvasStore.setActiveSkillId(null)
        else canvasStore.setActiveSkillId(sk.id)
        emit('close')
      },
      group: 'Skill',
    })
  }
  return cmds
})

const filtered = computed<CommandItem[]>(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return commands.value
  return commands.value.filter(c => {
    if (c.label.toLowerCase().includes(q)) return true
    if (c.hint?.toLowerCase().includes(q)) return true
    if (c.keywords?.some(k => k.toLowerCase().includes(q))) return true
    return false
  })
})

watch(filtered, () => { activeIndex.value = 0 })

function runCommand(cmd: CommandItem) {
  if (cmd.action) cmd.action()
  else if (cmd.route) { router.push({ name: cmd.route }); emit('close') }
  else emit('close')
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    activeIndex.value = Math.min(filtered.value.length - 1, activeIndex.value + 1)
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    activeIndex.value = Math.max(0, activeIndex.value - 1)
  } else if (e.key === 'Enter') {
    e.preventDefault()
    const cmd = filtered.value[activeIndex.value]
    if (cmd) runCommand(cmd)
  } else if (e.key === 'Escape') {
    e.preventDefault()
    emit('close')
  }
}

onMounted(() => {
  nextTick(() => inputRef.value?.focus())
})
onUnmounted(() => { /* nothing to clean */ })
</script>

<template>
  <div class="cmd-overlay" @click.self="emit('close')">
    <div class="cmd-panel">
      <div class="cmd-input-wrap">
        <span class="cmd-prefix">🔍</span>
        <input
          ref="inputRef"
          v-model="query"
          class="cmd-input"
          placeholder="输入命令、Skill、跳转目标..."
          @keydown="onKeydown"
        />
        <span class="cmd-esc">ESC</span>
      </div>
      <div class="cmd-list">
        <template v-if="filtered.length === 0">
          <div class="cmd-empty">没有匹配的命令</div>
        </template>
        <template v-else>
          <template v-for="(cmd, i) in filtered" :key="cmd.id">
            <div
              v-if="i === 0 || cmd.group !== filtered[i-1].group"
              class="cmd-group"
            >{{ cmd.group || '其他' }}</div>
            <div
              :class="['cmd-item', { active: i === activeIndex }]"
              @click="runCommand(cmd)"
              @mouseenter="activeIndex = i"
            >
              <span class="cmd-icon">{{ cmd.icon || '·' }}</span>
              <div class="cmd-text">
                <div class="cmd-label">{{ cmd.label }}</div>
                <div v-if="cmd.hint" class="cmd-hint">{{ cmd.hint }}</div>
              </div>
            </div>
          </template>
        </template>
      </div>
      <div class="cmd-footer">
        <span class="cmd-hint-key">↑↓ 选择</span>
        <span class="cmd-hint-key">↵ 执行</span>
        <span class="cmd-hint-key">esc 关闭</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.cmd-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: flex-start; justify-content: center; padding-top: 14vh; z-index: 9999; }
.cmd-panel { width: 560px; max-width: 92vw; max-height: 70vh; background: var(--bg-elevated); border: 1px solid var(--border-default); border-radius: 12px; box-shadow: 0 24px 80px rgba(0,0,0,0.5); display: flex; flex-direction: column; overflow: hidden; }
.cmd-input-wrap { display: flex; align-items: center; gap: 8px; padding: 12px 16px; border-bottom: 1px solid var(--border-subtle); }
.cmd-prefix { color: var(--text-muted); font-size: 16px; }
.cmd-input { flex: 1; border: none; outline: none; background: transparent; color: var(--text-primary); font-size: 15px; font-family: inherit; }
.cmd-input::placeholder { color: var(--text-placeholder); }
.cmd-esc { font-size: 10px; color: var(--text-muted); padding: 2px 6px; border: 1px solid var(--border-default); border-radius: 4px; }
.cmd-list { flex: 1; overflow-y: auto; padding: 4px 0; }
.cmd-group { font-size: 10px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; padding: 8px 16px 4px; }
.cmd-item { display: flex; align-items: center; gap: 10px; padding: 8px 16px; cursor: pointer; transition: background 0.1s; }
.cmd-item.active { background: rgba(129,140,248,0.18); }
.cmd-icon { width: 22px; text-align: center; font-size: 15px; flex-shrink: 0; }
.cmd-text { flex: 1; min-width: 0; }
.cmd-label { font-size: 13px; color: var(--text-primary); }
.cmd-hint { font-size: 11px; color: var(--text-muted); margin-top: 1px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cmd-empty { padding: 24px; text-align: center; font-size: 12px; color: var(--text-muted); }
.cmd-footer { display: flex; gap: 12px; padding: 8px 16px; border-top: 1px solid var(--border-subtle); background: var(--bg-surface); }
.cmd-hint-key { font-size: 10px; color: var(--text-muted); }
</style>
