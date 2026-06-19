<script setup lang="ts">
/**
 * 自动质检面板（Phase 4 · Task 15）
 *
 * - 3 类徽章（DOM / Token / A11y）
 * - 每个问题旁"修正"按钮：把 issue.message 注入到 ChatPanel 输入框
 *   并标记"按规范修正"——ChatPanel 监听 fix-one 事件后调用现有 sendChat
 * - "按规范修正"按钮：一次性把整份报告传给 ChatPanel
 */
import { computed, ref } from 'vue'
import { runQaCheck, type QaResult, type QaIssue } from '../utils/qaCheck'
import type { DesignSpec } from '../prompts/designSpecs'

const props = defineProps<{
  html: string
  spec: DesignSpec | null
  busy?: boolean
}>()

const emit = defineEmits<{
  /** 一键按规范修正（整份报告） */
  fixBySpec: [report: string]
  /** 单 issue 修正（仅传该 issue 的提示） */
  fixOne: [issue: { section: 'dom' | 'token' | 'a11y'; message: string }]
  refresh: []
}>()

const result = computed<QaResult>(() => runQaCheck(props.html, props.spec))
const totalIssues = computed(() => result.value.dom.issues.length + result.value.token.issues.length + result.value.a11y.issues.length)

/** 当前展开的 section（null 表示全部收起） */
const expandedSection = ref<'dom' | 'token' | 'a11y' | null>(null)

function toggleSection(sec: 'dom' | 'token' | 'a11y') {
  expandedSection.value = expandedSection.value === sec ? null : sec
}

function sectionResult(key: 'dom' | 'token' | 'a11y') {
  return result.value[key]
}

function badgeClass(ok: boolean, issues: QaIssue[]): string {
  if (ok) return 'badge ok'
  if (issues.some(i => i.severity === 'error')) return 'badge error'
  return 'badge warn'
}

function badgeIcon(ok: boolean, issues: QaIssue[]): string {
  if (ok) return '✅'
  if (issues.some(i => i.severity === 'error')) return '❌'
  return '⚠'
}

function buildReport(): string {
  const r = result.value
  const lines: string[] = []
  lines.push('【DOM 校验】' + (r.dom.ok ? '通过' : `发现 ${r.dom.issues.length} 项`))
  for (const i of r.dom.issues) lines.push(`  - [${i.severity === 'error' ? '错误' : '警告'}] ${i.message}`)
  lines.push('【Token 校验】' + (r.token.ok ? '通过' : `发现 ${r.token.issues.length} 项`))
  for (const i of r.token.issues) lines.push(`  - [${i.severity === 'error' ? '错误' : '警告'}] ${i.message}`)
  lines.push('【A11y 校验】' + (r.a11y.ok ? '通过' : `发现 ${r.a11y.issues.length} 项`))
  for (const i of r.a11y.issues) lines.push(`  - [${i.severity === 'error' ? '错误' : '警告'}] ${i.message}`)
  return lines.join('\n')
}

function handleFixAll() {
  emit('fixBySpec', buildReport())
}

function handleFixOne(sec: 'dom' | 'token' | 'a11y', issue: QaIssue) {
  emit('fixOne', { section: sec, message: issue.message })
}
</script>

<template>
  <div v-if="html" class="qa-panel">
    <div class="qa-header" @click="expandedSection === null ? expandedSection = 'dom' : null">
      <span class="qa-title">🧪 自动质检</span>
      <span class="qa-count">{{ totalIssues }} 项</span>
    </div>
    <div class="qa-badges">
      <button
        type="button"
        :class="[badgeClass(sectionResult('dom').ok, sectionResult('dom').issues), { active: expandedSection === 'dom' }]"
        @click.stop="toggleSection('dom')"
      >
        <span class="badge-icon">{{ badgeIcon(sectionResult('dom').ok, sectionResult('dom').issues) }}</span>
        <span>DOM</span>
        <span class="badge-count">{{ sectionResult('dom').issues.length }}</span>
      </button>
      <button
        type="button"
        :class="[badgeClass(sectionResult('token').ok, sectionResult('token').issues), { active: expandedSection === 'token' }]"
        @click.stop="toggleSection('token')"
      >
        <span class="badge-icon">{{ badgeIcon(sectionResult('token').ok, sectionResult('token').issues) }}</span>
        <span>Token</span>
        <span class="badge-count">{{ sectionResult('token').issues.length }}</span>
      </button>
      <button
        type="button"
        :class="[badgeClass(sectionResult('a11y').ok, sectionResult('a11y').issues), { active: expandedSection === 'a11y' }]"
        @click.stop="toggleSection('a11y')"
      >
        <span class="badge-icon">{{ badgeIcon(sectionResult('a11y').ok, sectionResult('a11y').issues) }}</span>
        <span>A11y</span>
        <span class="badge-count">{{ sectionResult('a11y').issues.length }}</span>
      </button>
    </div>
    <div v-if="expandedSection && sectionResult(expandedSection).issues.length > 0" class="qa-issues">
      <div
        v-for="(iss, i) in sectionResult(expandedSection).issues"
        :key="i"
        :class="['qa-issue', iss.severity]"
      >
        <span class="issue-icon">{{ iss.severity === 'error' ? '❌' : '⚠' }}</span>
        <div class="issue-body">
          <div class="issue-msg">{{ iss.message }}</div>
          <div v-if="iss.location" class="issue-loc">{{ iss.location }}</div>
        </div>
        <button
          type="button"
          class="issue-fix-btn"
          :disabled="busy"
          title="把该问题提交给 AI 修正"
          @click="handleFixOne(expandedSection!, iss)"
        >🛠 修正</button>
      </div>
    </div>
    <div class="qa-actions">
      <button class="qa-btn" type="button" @click="emit('refresh')" :disabled="busy">🔄 重新检查</button>
      <button class="qa-btn primary" type="button" @click="handleFixAll" :disabled="busy || totalIssues === 0">🛠 按规范修正</button>
    </div>
  </div>
</template>

<style scoped>
.qa-panel { background: rgba(22, 33, 62, 0.9); border: 1px solid var(--border-subtle); border-radius: 10px; padding: 10px 12px; margin-bottom: 12px; }
.qa-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
.qa-title { font-size: 12px; font-weight: 600; color: var(--text-primary); }
.qa-count { font-size: 11px; color: var(--text-muted); }
.qa-badges { display: flex; gap: 6px; margin-bottom: 8px; }
.badge { display: inline-flex; align-items: center; gap: 4px; padding: 4px 8px; border-radius: 6px; font-size: 11px; font-weight: 500; cursor: pointer; border: 1px solid transparent; font-family: inherit; }
.badge.ok { background: rgba(34,197,94,0.15); color: #22c55e; }
.badge.warn { background: rgba(245,158,11,0.15); color: #f59e0b; }
.badge.error { background: rgba(239,68,68,0.15); color: #ef4444; }
.badge.active { border-color: currentColor; }
.badge-icon { font-size: 11px; }
.badge-count { font-size: 10px; opacity: 0.8; }
.qa-issues { display: flex; flex-direction: column; gap: 4px; max-height: 200px; overflow-y: auto; padding: 4px 0; }
.qa-issue { display: flex; gap: 6px; padding: 4px 6px; border-radius: 4px; font-size: 11px; align-items: center; }
.qa-issue.error { background: rgba(239,68,68,0.08); }
.qa-issue.warning { background: rgba(245,158,11,0.08); }
.issue-icon { flex-shrink: 0; }
.issue-body { flex: 1; min-width: 0; }
.issue-msg { color: var(--text-primary); word-break: break-word; }
.issue-loc { font-size: 10px; color: var(--text-muted); margin-top: 1px; }
.issue-fix-btn { flex-shrink: 0; padding: 2px 8px; border-radius: 4px; border: 1px solid rgba(129,140,248,0.4); background: transparent; color: var(--color-primary-light); font-size: 10px; cursor: pointer; font-family: inherit; }
.issue-fix-btn:hover:not(:disabled) { background: var(--color-primary); color: #fff; border-color: var(--color-primary); }
.issue-fix-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.qa-actions { display: flex; gap: 6px; margin-top: 8px; }
.qa-btn { flex: 1; padding: 6px 8px; border-radius: 6px; border: 1px solid var(--border-default); background: transparent; color: var(--text-secondary); font-size: 11px; cursor: pointer; font-family: inherit; }
.qa-btn:hover:not(:disabled) { color: var(--text-primary); border-color: var(--border-hover); }
.qa-btn.primary { background: var(--color-primary); color: #fff; border-color: var(--color-primary); }
.qa-btn.primary:hover:not(:disabled) { background: var(--color-primary-hover); }
.qa-btn:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
