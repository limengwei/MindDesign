<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useChatStore, type Session } from '../stores/chatStore'
import { useCanvasStore } from '../stores/canvasStore'
import { sendMessageToLLM, type DesignCritique, type PreflightData } from '../ai/chat'
import { BUILT_IN_SKILLS, getSkillById, SKILL_CATEGORIES, type DesignSkill } from '../prompts/skills'
import { buildPreflightFollowUpPrompt } from '../prompts/preflight'
import { isBlueprintEmpty, type ProductBlueprint } from '../prompts/blueprint'
import { saveProject } from '../stores/autoSave'
import { DESIGN_SPEC_LABELS, getDesignSpecById } from '../prompts/designSpecs'
import DesignSpecEditor from './DesignSpecEditor.vue'

const props = defineProps<{
  collapsed: boolean
}>()

const emit = defineEmits<{
  toggle: []
}>()

const chatStore = useChatStore()
const canvasStore = useCanvasStore()

const inputText = ref('')
const showSessionList = ref(false)
const activeCritique = ref<DesignCritique | null>(null)
const showCritique = ref(false)
const activePreflight = ref<PreflightData | null>(null)
const preflightAnswers = ref<Record<string, string | string[]>>({})
const showBlueprintPanel = ref(false)
const isRebuildingBlueprint = ref(false)
const showSkillSelector = ref(false)
const showSpecEditor = ref(false)
const textareaRef = ref<HTMLTextAreaElement | null>(null)

const activeSkill = computed<DesignSkill | null>(() => {
  const id = canvasStore.activeSkillId
  return id ? getSkillById(id) ?? null : null
})

const currentSpecLabel = computed(() => {
  const spec = getDesignSpecById(canvasStore.designSpecId)
  return spec ? spec.name : (canvasStore.designSpecId === 'none' ? '未使用规范' : '自定义')
})

const currentSpecColors = computed(() => {
  return getDesignSpecById(canvasStore.designSpecId)?.colors ?? null
})

function selectSkill(skill: DesignSkill) {
  if (canvasStore.activeSkillId === skill.id) {
    canvasStore.setActiveSkillId(null)
  } else {
    canvasStore.setActiveSkillId(skill.id)
    canvasStore.setPageType(skill.defaultPageType)
  }
  showSkillSelector.value = false
}

function buildCallOptions(selectedHtml?: string, isFirstMessage?: boolean) {
  return {
    pageType: canvasStore.pageType,
    colorScheme: canvasStore.colorScheme,
    designSpecId: canvasStore.designSpecId,
    customDesignContent: canvasStore.customDesignContent,
    history: [] as Array<{ role: string; content: string }>,
    selectedHtml,
    skill: activeSkill.value,
    isFirstMessage,
    blueprint: canvasStore.productBlueprint,
    onStreamingHTML: (html: string) => {
      const genId = canvasStore.generatingCardId
      if (genId) {
        const card = canvasStore.cards.find(c => c.id === genId)
        if (card) card.html = html
      }
    },
  }
}

watch(() => chatStore.pendingSend, async (text) => {
  if (!text) return
  chatStore.pendingSend = null
  await doGenerate(text)
})

async function doGenerate(text: string) {
  const isFirstMessage = !chatStore.activeSession || chatStore.messages.length === 0
  const session = chatStore.createSession(text)
  chatStore.addUserMessage(text)
  chatStore.setStreaming(true)

  const selectedId = canvasStore.selectedCardId
  const selectedCard = selectedId ? canvasStore.cards.find(c => c.id === selectedId) : null

  const card = canvasStore.addCard('', '', undefined, session.id, selectedCard?.id)
  chatStore.addCardToSession(card.id)

  canvasStore.setGeneratingCardId(card.id)

  try {
    const result = await sendMessageToLLM(text, buildCallOptions(selectedCard?.html, isFirstMessage))

    if (result.preflight) {
      activePreflight.value = result.preflight
      preflightAnswers.value = {}
      chatStore.addAssistantMessage(`🎯 AI 理解了你的需求：${result.preflight.brief_summary}`)
      canvasStore.setGeneratingCardId(null)
    } else if (result.critique) {
      activeCritique.value = result.critique
      showCritique.value = true
      if (result.html) {
        chatStore.addAssistantMessage(result.content, result.html)
        canvasStore.updateCardContent(card.id, result.html, result.screenshot || '')
      } else {
        chatStore.addAssistantMessage(result.content || 'AI 未能生成设计稿，请重试。')
        canvasStore.removeCard(card.id)
      }
    } else {
      if (result.html) {
        chatStore.addAssistantMessage(result.content, result.html)
        canvasStore.updateCardContent(card.id, result.html, result.screenshot || '')
      } else {
        chatStore.addAssistantMessage(result.content || 'AI 未能生成设计稿，请重试。')
        canvasStore.removeCard(card.id)
      }
    }

    if (result.blueprintUpdate) {
      canvasStore.updateProductBlueprint(result.blueprintUpdate)
    }
  } catch (err) {
    chatStore.addAssistantMessage('抱歉，生成失败了，请重试。')
    console.error('LLM error:', err)
  } finally {
    canvasStore.setGeneratingCardId(null)
    chatStore.setStreaming(false)
    await new Promise(r => setTimeout(r, 1500))
    await saveProject()
  }
}

async function handlePreflightSubmit() {
  if (!activePreflight.value) return
  const followUp = buildPreflightFollowUpPrompt(preflightAnswers.value)
  activePreflight.value = null
  chatStore.setStreaming(true)
  chatStore.addUserMessage('已确认需求，开始设计')

  const selectedId = canvasStore.selectedCardId
  const selectedCard = selectedId ? canvasStore.cards.find(c => c.id === selectedId) : null
  const card = canvasStore.addCard('', '', undefined, chatStore.activeSessionId ?? undefined, selectedCard?.id)
  chatStore.addCardToSession(card.id)
  canvasStore.setGeneratingCardId(card.id)

  try {
    const result = await sendMessageToLLM(followUp, buildCallOptions(selectedCard?.html, false))
    if (result.critique) {
      activeCritique.value = result.critique
      showCritique.value = true
    }
    if (result.html) {
      chatStore.addAssistantMessage(result.content, result.html)
      canvasStore.updateCardContent(card.id, result.html, result.screenshot || '')
    } else {
      chatStore.addAssistantMessage(result.content || 'AI 未能生成设计稿，请重试。')
      canvasStore.removeCard(card.id)
    }
    if (result.blueprintUpdate) {
      canvasStore.updateProductBlueprint(result.blueprintUpdate)
    }
  } catch (err) {
    chatStore.addAssistantMessage('抱歉，生成失败了，请重试。')
    console.error('LLM error:', err)
  } finally {
    canvasStore.setGeneratingCardId(null)
    chatStore.setStreaming(false)
    await new Promise(r => setTimeout(r, 1500))
    await saveProject()
  }
}

function setPreflightAnswer(key: string, value: string, isMulti: boolean) {
  if (isMulti) {
    const current = (preflightAnswers.value[key] as string[]) || []
    const idx = current.indexOf(value)
    if (idx >= 0) {
      current.splice(idx, 1)
    } else {
      current.push(value)
    }
    preflightAnswers.value[key] = [...current]
  } else {
    preflightAnswers.value[key] = value
  }
}

function isPreflightOptionSelected(key: string, value: string, isMulti: boolean): boolean {
  if (isMulti) {
    return ((preflightAnswers.value[key] as string[]) || []).includes(value)
  }
  return preflightAnswers.value[key] === value
}

function handleCritiqueOptimize() {
  if (!activeCritique.value) return
  const suggestions = activeCritique.value.suggestions.join('；')
  activeCritique.value = null
  showCritique.value = false
  chatStore.pendingSend = `根据设计评审建议进行优化：${suggestions}`
}

function critiqueScoreColor(score: number): string {
  if (score >= 4) return '#22c55e'
  if (score >= 3) return '#f59e0b'
  return '#ef4444'
}

async function handleRebuildBlueprint() {
  if (isRebuildingBlueprint.value || chatStore.isStreaming) return
  isRebuildingBlueprint.value = true
  chatStore.setStreaming(true)
  chatStore.addUserMessage('重新整理产品蓝图')

  try {
    const rebuildPrompt = '请根据当前所有设计稿和对话历史，重新整理产品蓝图。保持信息完整但精炼，确保所有字段都是最新的。输出 action 为 "rebuild" 的完整蓝图。'
    const result = await sendMessageToLLM(rebuildPrompt, buildCallOptions(undefined, false))
    if (result.blueprintUpdate) {
      canvasStore.updateProductBlueprint(result.blueprintUpdate)
      chatStore.addAssistantMessage('📋 产品蓝图已重新整理完成。')
    } else {
      chatStore.addAssistantMessage('蓝图重整未能完成，请重试。')
    }
  } catch (err) {
    chatStore.addAssistantMessage('蓝图重整失败，请重试。')
    console.error('Blueprint rebuild error:', err)
  } finally {
    isRebuildingBlueprint.value = false
    chatStore.setStreaming(false)
    await saveProject()
  }
}

const hasBlueprint = computed(() => !isBlueprintEmpty(canvasStore.productBlueprint))

async function handleSend() {
  const text = inputText.value.trim()
  if (!text || chatStore.isStreaming) return
  inputText.value = ''
  if (textareaRef.value) textareaRef.value.style.height = 'auto'
  await doGenerate(text)
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    handleSend()
  }
}

function autoResize() {
  const el = textareaRef.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = Math.min(el.scrollHeight, 160) + 'px'
}

function handleSessionClick(session: Session) {
  chatStore.setActiveSession(session.id)
  showSessionList.value = false

  if (session.cardIds.length > 0) {
    const lastCardId = session.cardIds[session.cardIds.length - 1]
    canvasStore.selectCard(lastCardId)
  } else {
    canvasStore.selectCard(null)
  }
}

function formatTime(iso: string) {
  const d = new Date(iso)
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${hh}:${mm}`
}
</script>

<template>
  <div class="chat-history-panel" :class="{ collapsed }">
    <div class="chat-history-header">
      <span class="chat-history-title">{{ chatStore.activeSession ? chatStore.activeSession.title : '对话记录' }}</span>
      <div class="header-btns">

        <button
          v-if="!collapsed"
          class="toggle-btn"
          title="会话列表"
          @click="showSessionList = !showSessionList"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"/></svg>
        </button>
        <button class="toggle-btn" @click="emit('toggle')" :title="collapsed ? '展开' : '收起'">
          <svg v-if="collapsed" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>
          <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>
        </button>
      </div>
    </div>

    <div v-if="!collapsed && showSessionList" class="session-list">
      <div v-if="chatStore.sessions.length === 0" class="chat-empty">
        <div class="empty-icon">✨</div>
        <p>还没有对话记录</p>
      </div>
      <div
        v-for="session in [...chatStore.sessions].reverse()"
        :key="session.id"
        :class="['session-item', { active: session.id === chatStore.activeSessionId }]"
        @click="handleSessionClick(session)"
      >
        <div class="session-title">{{ session.title }}</div>
        <div class="session-meta">
          <span class="session-time">{{ formatTime(session.createdAt) }}</span>
          <span v-if="session.cardIds.length" class="session-card-count">{{ session.cardIds.length }} 个设计稿</span>
        </div>
      </div>
    </div>

    <div v-else-if="!collapsed" class="chat-messages">
      <div v-if="!chatStore.activeSession" class="chat-empty">
        <div class="empty-icon">✨</div>
        <p>描述你想要的界面</p>
        <p class="empty-hint">{{ activeSkill ? `当前场景：${activeSkill.name}` : 'AI 将为你生成设计稿' }}</p>
      </div>

      <template v-if="chatStore.activeSession">
        <div
          v-for="(msg, idx) in chatStore.messages"
          :key="idx"
          :class="['message', msg.role]"
        >
          <div class="message-avatar">
            {{ msg.role === 'user' ? '👤' : '🤖' }}
          </div>
          <div class="message-content">
            {{ msg.content }}
          </div>
        </div>
      </template>

      <div v-if="activePreflight" class="preflight-form">
        <div class="preflight-header">
          <span>🎯</span>
          <span class="preflight-title">请确认几个关键信息</span>
        </div>
        <div
          v-for="q in activePreflight.questions"
          :key="q.key"
          class="preflight-question"
        >
          <div class="preflight-question-label">{{ q.label }}</div>
          <div class="preflight-options">
            <button
              v-for="opt in q.options"
              :key="opt.value"
              :class="['preflight-option', { selected: isPreflightOptionSelected(q.key, opt.value, q.type === 'multiselect') }]"
              @click="setPreflightAnswer(q.key, opt.value, q.type === 'multiselect')"
            >
              {{ opt.label }}
            </button>
          </div>
        </div>
        <button class="preflight-submit" @click="handlePreflightSubmit">
          开始设计 →
        </button>
      </div>

      <div v-if="showCritique && activeCritique" class="critique-card">
        <div class="critique-header" @click="showCritique = !showCritique">
          <span>📊 设计质量评估</span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M7 10l5 5 5-5z"/></svg>
        </div>
        <div v-if="showCritique" class="critique-body">
          <div class="critique-scores">
            <div v-for="(label, key) in { consistency: '视觉一致性', hierarchy: '信息层级', usability: '可用性', brand: '品牌契合度', completeness: '完整度' }" :key="key" class="critique-score-row">
              <span class="critique-score-label">{{ label }}</span>
              <div class="critique-score-bar-bg">
                <div
                  class="critique-score-bar"
                  :style="{ width: ((activeCritique.scores as any)[key] / 5) * 100 + '%', background: critiqueScoreColor((activeCritique.scores as any)[key]) }"
                ></div>
              </div>
              <span class="critique-score-value" :style="{ color: critiqueScoreColor((activeCritique.scores as any)[key]) }">{{ (activeCritique.scores as any)[key] }}</span>
            </div>
          </div>
          <div class="critique-summary">{{ activeCritique.summary }}</div>
          <div v-if="activeCritique.suggestions.length" class="critique-suggestions">
            <div v-for="(s, i) in activeCritique.suggestions" :key="i" class="critique-suggestion">• {{ s }}</div>
          </div>
          <button class="critique-optimize-btn" @click="handleCritiqueOptimize">根据建议优化</button>
        </div>
      </div>

      <div v-if="hasBlueprint" class="blueprint-card">
        <div class="blueprint-header" @click="showBlueprintPanel = !showBlueprintPanel">
          <span>📋 产品蓝图 v{{ canvasStore.productBlueprint.version }}</span>
          <svg :style="{ transform: showBlueprintPanel ? 'rotate(180deg)' : '' }" width="12" height="12" viewBox="0 0 24 24" fill="currentColor" style="transition: transform 0.2s"><path d="M7 10l5 5 5-5z"/></svg>
        </div>
        <div v-if="showBlueprintPanel" class="blueprint-body">
          <div v-if="canvasStore.productBlueprint.product.name" class="blueprint-section">
            <div class="blueprint-section-title">产品概述</div>
            <div class="blueprint-field" v-if="canvasStore.productBlueprint.product.name">名称：{{ canvasStore.productBlueprint.product.name }}</div>
            <div class="blueprint-field" v-if="canvasStore.productBlueprint.product.category">类型：{{ canvasStore.productBlueprint.product.category }}</div>
            <div class="blueprint-field" v-if="canvasStore.productBlueprint.product.targetUsers">目标用户：{{ canvasStore.productBlueprint.product.targetUsers }}</div>
          </div>
          <div v-if="canvasStore.productBlueprint.visualSpec.primaryColor" class="blueprint-section">
            <div class="blueprint-section-title">视觉规范</div>
            <div class="blueprint-field">主色：<span class="color-dot" :style="{ background: canvasStore.productBlueprint.visualSpec.primaryColor }"></span>{{ canvasStore.productBlueprint.visualSpec.primaryColor }}</div>
            <div class="blueprint-field" v-if="canvasStore.productBlueprint.visualSpec.styleKeywords.length">风格：{{ canvasStore.productBlueprint.visualSpec.styleKeywords.join('、') }}</div>
          </div>
          <div v-if="canvasStore.productBlueprint.pages.length" class="blueprint-section">
            <div class="blueprint-section-title">页面 ({{ canvasStore.productBlueprint.pages.length }})</div>
            <div v-for="(p, i) in canvasStore.productBlueprint.pages" :key="i" class="blueprint-page-item">
              <span :class="['page-status', p.status]">{{ p.status === 'designed' ? '✓' : '○' }}</span>
              <span class="page-name">{{ p.name }}</span>
              <span class="page-purpose">{{ p.purpose }}</span>
            </div>
          </div>
          <div v-if="canvasStore.productBlueprint.features.confirmed.length" class="blueprint-section">
            <div class="blueprint-section-title">已确认功能</div>
            <div class="blueprint-tags">
              <span v-for="f in canvasStore.productBlueprint.features.confirmed" :key="f" class="blueprint-tag">{{ f }}</span>
            </div>
          </div>
          <div v-if="canvasStore.productBlueprint.designDecisions.length" class="blueprint-section">
            <div class="blueprint-section-title">设计决策</div>
            <div v-for="(d, i) in canvasStore.productBlueprint.designDecisions" :key="i" class="blueprint-decision">• {{ d }}</div>
          </div>
          <button class="blueprint-rebuild-btn" :disabled="isRebuildingBlueprint" @click="handleRebuildBlueprint">
            {{ isRebuildingBlueprint ? '整理中...' : '🔄 重新整理蓝图' }}
          </button>
        </div>
      </div>

      <div v-if="chatStore.isStreaming" class="message assistant">
        <div class="message-avatar">🤖</div>
        <div class="message-content streaming">
          <span class="dot"></span>
          <span class="dot"></span>
          <span class="dot"></span>
        </div>
      </div>
    </div>
  </div>

  <div class="chat-input-float">
    <div class="input-container">
      <div class="input-wrapper">
        <textarea
          ref="textareaRef"
          v-model="inputText"
          class="chat-input"
          :placeholder="activeSkill ? activeSkill.examplePrompt : '描述你想要的界面...'"
          rows="3"
          :disabled="chatStore.isStreaming"
          @input="autoResize"
          @keydown="handleKeydown"
        />
        <div class="input-actions">
          <div class="spec-trigger" :class="{ 'has-spec': canvasStore.designSpecId !== 'none' }" title="修改设计规范" @click="showSpecEditor = true">
            <span class="spec-label">{{ currentSpecLabel }}</span>
            <div v-if="currentSpecColors" class="spec-colors">
              <span class="spec-cdot" :style="{ backgroundColor: currentSpecColors.primary }"></span>
              <span class="spec-cdot" :style="{ backgroundColor: currentSpecColors.background }"></span>
              <span class="spec-cdot" :style="{ backgroundColor: currentSpecColors.surface }"></span>
              <span class="spec-cdot" :style="{ backgroundColor: currentSpecColors.accent }"></span>
            </div>
          </div>
          <div class="input-actions-right">
            <div v-if="activeSkill" class="active-skill-chip">
              <span class="skill-chip-emoji">{{ activeSkill.emoji }}</span>
              <span>{{ activeSkill.name }}</span>
              <button class="skill-chip-close" @click="canvasStore.setActiveSkillId(null)">&times;</button>
            </div>
            <button class="input-action-btn" :class="{ active: !!activeSkill }" title="选择设计场景" @click="showSkillSelector = !showSkillSelector">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M7 2v11h3v9l7-12h-4l4-8z"/></svg>
            </button>
            <button
              class="send-btn"
              :disabled="!inputText.trim() || chatStore.isStreaming"
              @click="handleSend"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3.4 20.4l17.45-7.48a1 1 0 000-1.84L3.4 3.6a.993.993 0 00-1.39.91L2 9.12c0 .5.37.93.87.99L17 12 2.87 13.88c-.5.07-.87.5-.87 1l.01 4.61c0 .71.73 1.2 1.39.91z"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>

  <Teleport to="body">
    <Transition name="fade">
      <div v-if="showSkillSelector" class="skill-modal-overlay" @click.self="showSkillSelector = false">
        <div class="skill-modal">
          <div class="skill-modal-header">
            <h3>选择设计场景</h3>
            <button class="skill-modal-close" @click="showSkillSelector = false">&times;</button>
          </div>
          <div class="skill-modal-body">
            <div class="skill-grid">
              <button
                v-for="skill in BUILT_IN_SKILLS"
                :key="skill.id"
                :class="['skill-card', { active: canvasStore.activeSkillId === skill.id }]"
                @click="selectSkill(skill)"
              >
                <div class="skill-card-emoji">{{ skill.emoji }}</div>
                <div class="skill-card-name">{{ skill.name }}</div>
                <div class="skill-card-cat">{{ SKILL_CATEGORIES[skill.category] }}</div>
                <div class="skill-card-desc">{{ skill.description }}</div>
                <div v-if="canvasStore.activeSkillId === skill.id" class="skill-card-check">✓</div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>

  <DesignSpecEditor
    v-if="showSpecEditor"
    @close="showSpecEditor = false"
  />
</template>

<style scoped>
.chat-history-panel { position: absolute; top: 56px; left: 12px; bottom: 80px; width: 300px; z-index: var(--z-panel); display: flex; flex-direction: column; background: rgba(30, 30, 54, 0.85); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); border-radius: var(--radius-lg); border: 1px solid var(--border-subtle); overflow: hidden; transition: width 0.3s ease, bottom 0.3s ease; }
.chat-history-panel.collapsed { width: 40px; bottom: 80px; }
.chat-history-header { display: flex; align-items: center; justify-content: space-between; padding: 12px 14px; border-bottom: 1px solid var(--border-subtle); flex-shrink: 0; }
.chat-history-title { font-size: var(--font-base); font-weight: 600; color: var(--text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; margin-right: 4px; }
.collapsed .chat-history-title { display: none; }
.header-btns { display: flex; gap: 4px; flex-shrink: 0; }
.toggle-btn { width: 24px; height: 24px; border: none; background: none; color: var(--text-secondary); cursor: pointer; border-radius: 4px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.collapsed .toggle-btn { margin: 0 auto; }
.toggle-btn:hover { background: var(--bg-hover); color: var(--text-primary); }

.session-list { flex: 1; overflow-y: auto; padding: 8px; }
.session-item { padding: 10px 12px; border-radius: var(--radius-md); cursor: pointer; transition: background var(--transition-fast); margin-bottom: 4px; }
.session-item:hover { background: var(--bg-hover); }
.session-item.active { background: var(--bg-active); border: 1px solid var(--border-active); }
.session-title { font-size: var(--font-base); color: var(--text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-bottom: 4px; }
.session-meta { display: flex; gap: 8px; font-size: var(--font-xs); color: var(--text-muted); }
.session-card-count { color: var(--color-primary-light); }
.chat-messages { flex: 1; overflow-y: auto; padding: 12px; }
.chat-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: var(--text-muted); text-align: center; }
.empty-icon { font-size: 36px; margin-bottom: 12px; }
.chat-empty p { margin: 3px 0; font-size: var(--font-base); }
.empty-hint { font-size: var(--font-xs) !important; color: var(--text-placeholder) !important; }
.message { display: flex; gap: 8px; margin-bottom: 12px; }
.message.user { flex-direction: row-reverse; }
.message-avatar { width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: var(--font-md); flex-shrink: 0; background: var(--border-default); }
.message.user .message-avatar { background: var(--color-primary-dark); }
.message-content { max-width: 220px; padding: 8px 12px; border-radius: 10px; font-size: var(--font-base); line-height: 1.5; word-break: break-word; }
.message.user .message-content { background: var(--color-primary); color: #fff; border-bottom-right-radius: 4px; }
.message.assistant .message-content { background: rgba(22, 33, 62, 0.8); color: var(--text-primary); border: 1px solid var(--border-subtle); border-bottom-left-radius: 4px; }
.streaming { display: flex; gap: 4px; padding: 12px 16px; }
.dot { width: 6px; height: 6px; border-radius: 50%; background: var(--text-muted); animation: blink 1.4s infinite both; }
.dot:nth-child(2) { animation-delay: 0.2s; }
.dot:nth-child(3) { animation-delay: 0.4s; }
@keyframes blink { 0%, 80%, 100% { opacity: 0.3; } 40% { opacity: 1; } }

.preflight-form { background: rgba(22, 33, 62, 0.9); border: 1px solid var(--border-subtle); border-radius: 10px; padding: 14px; margin-bottom: 12px; }
.preflight-header { display: flex; align-items: center; gap: 6px; margin-bottom: 12px; }
.preflight-title { font-size: 13px; font-weight: 600; color: var(--text-primary); }
.preflight-question { margin-bottom: 12px; }
.preflight-question-label { font-size: 12px; color: var(--text-secondary); margin-bottom: 6px; }
.preflight-options { display: flex; flex-wrap: wrap; gap: 6px; }
.preflight-option { padding: 6px 12px; border-radius: 8px; border: 1px solid var(--border-subtle); background: transparent; color: var(--text-secondary); cursor: pointer; font-size: 12px; transition: all 0.15s ease; font-family: inherit; }
.preflight-option:hover { border-color: var(--border-hover); color: var(--text-primary); }
.preflight-option.selected { background: var(--color-primary); color: #fff; border-color: var(--color-primary); }
.preflight-submit { width: 100%; padding: 10px; border-radius: 10px; border: none; background: var(--color-primary); color: #fff; font-size: 14px; font-weight: 600; cursor: pointer; transition: background 0.15s ease; font-family: inherit; }
.preflight-submit:hover { background: var(--color-primary-hover); }

.critique-card { background: rgba(22, 33, 62, 0.9); border: 1px solid var(--border-subtle); border-radius: 10px; margin-bottom: 12px; overflow: hidden; }
.critique-header { display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; cursor: pointer; font-size: 13px; font-weight: 600; color: var(--text-primary); }
.critique-header:hover { background: rgba(255,255,255,0.03); }
.critique-body { padding: 0 14px 14px; }
.critique-scores { display: flex; flex-direction: column; gap: 6px; margin-bottom: 10px; }
.critique-score-row { display: flex; align-items: center; gap: 8px; }
.critique-score-label { font-size: 11px; color: var(--text-secondary); width: 64px; flex-shrink: 0; }
.critique-score-bar-bg { flex: 1; height: 6px; background: rgba(255,255,255,0.08); border-radius: 3px; overflow: hidden; }
.critique-score-bar { height: 100%; border-radius: 3px; transition: width 0.3s ease; }
.critique-score-value { font-size: 12px; font-weight: 600; width: 16px; text-align: right; }
.critique-summary { font-size: 12px; color: var(--text-primary); line-height: 1.5; margin-bottom: 8px; }
.critique-suggestions { margin-bottom: 10px; }
.critique-suggestion { font-size: 11px; color: var(--text-secondary); line-height: 1.5; padding-left: 4px; }
.critique-optimize-btn { width: 100%; padding: 8px; border-radius: 8px; border: 1px solid var(--color-primary); background: transparent; color: var(--color-primary); font-size: 12px; font-weight: 600; cursor: pointer; transition: all 0.15s ease; font-family: inherit; }
.critique-optimize-btn:hover { background: var(--color-primary); color: #fff; }

.active-skill-chip { display: inline-flex; align-items: center; gap: 4px; padding: 3px 8px; background: rgba(79, 70, 229, 0.2); color: var(--color-primary-light); border-radius: 6px; font-size: 12px; }
.skill-chip-emoji { font-size: 14px; line-height: 1; }
.skill-chip-close { background: none; border: none; color: rgba(255,255,255,0.5); cursor: pointer; font-size: 14px; padding: 0 2px; line-height: 1; }
.skill-chip-close:hover { color: var(--text-primary); }

.chat-input-float { position: absolute; bottom: 24px; left: 50%; transform: translateX(-50%); z-index: var(--z-input); width: 720px; max-width: calc(100vw - 40px); }
.input-container { display: flex; flex-direction: column; gap: 0; }

.skill-modal-overlay { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.6); display: flex; align-items: center; justify-content: center; z-index: var(--z-modal); }
.skill-modal { width: 620px; max-width: 92vw; max-height: 85vh; background: var(--bg-elevated); border-radius: var(--radius-xl); box-shadow: var(--shadow-xl); border: 1px solid var(--border-default); display: flex; flex-direction: column; overflow: hidden; }
.skill-modal-header { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px 12px; border-bottom: 1px solid var(--border-default); flex-shrink: 0; }
.skill-modal-header h3 { font-size: var(--font-lg); font-weight: 600; color: var(--text-primary); margin: 0; }
.skill-modal-close { width: 28px; height: 28px; border: none; background: none; color: var(--text-muted); font-size: 18px; cursor: pointer; border-radius: var(--radius-sm); display: flex; align-items: center; justify-content: center; }
.skill-modal-close:hover { background: var(--bg-hover); color: var(--text-primary); }
.skill-modal-body { padding: 16px; overflow-y: auto; flex: 1; }
.skill-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 10px; }
.skill-card { position: relative; display: flex; flex-direction: column; align-items: center; padding: 16px 10px 12px; border-radius: 10px; border: 1px solid var(--border-default); background: var(--bg-surface); cursor: pointer; text-align: center; transition: all 0.15s ease; font-family: inherit; }
.skill-card:hover { border-color: #3a3a5c; background: #1a1a3e; }
.skill-card.active { border-color: var(--color-primary-light); background: #1e1b4b; }
.skill-card-emoji { font-size: 28px; margin-bottom: 8px; line-height: 1; }
.skill-card-name { font-size: var(--font-sm); font-weight: 600; color: var(--text-primary); }
.skill-card-cat { display: inline-block; font-size: 10px; font-weight: 500; color: var(--color-primary-light); background: rgba(129,140,248,0.12); padding: 2px 6px; border-radius: 4px; margin-top: 4px; }
.skill-card-desc { font-size: 10px; color: var(--text-muted); margin-top: 6px; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.skill-card-check { position: absolute; top: 6px; right: 6px; width: 18px; height: 18px; border-radius: 50%; background: var(--color-primary-light); color: #fff; font-size: 10px; display: flex; align-items: center; justify-content: center; }
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

.input-wrapper { display: flex; flex-direction: column; gap: 8px; padding: 12px 16px; background: rgba(30, 30, 54, 0.95); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); border-radius: 14px; border: 1px solid var(--border-subtle); box-shadow: 0 8px 32px rgba(0,0,0,0.3); }
.chat-input { width: 100%; padding: 8px 12px; border: none; border-radius: var(--radius-md); font-size: 15px; font-family: inherit; outline: none; resize: none; background: transparent; color: var(--text-primary); line-height: 1.5; min-height: 24px; max-height: 160px; }
.chat-input::placeholder { color: var(--text-muted); }
.chat-input:disabled { color: var(--text-placeholder); }
.input-actions { display: flex; justify-content: space-between; align-items: center; gap: 6px; }
.input-actions-right { display: flex; align-items: center; gap: 6px; }
.spec-trigger { display: flex; align-items: center; gap: 6px; padding: 5px 10px; border-radius: var(--radius-md); background: transparent; color: var(--text-muted); cursor: pointer; transition: all 0.15s ease; user-select: none; }
.spec-trigger:hover { background: var(--bg-hover); color: var(--text-primary); }
.spec-trigger.has-spec { color: var(--color-primary-light); }
.spec-trigger.has-spec:hover { background: rgba(129,140,248,0.12); }
.spec-label { font-size: 12px; white-space: nowrap; }
.spec-colors { display: flex; gap: 3px; margin-left: 2px; }
.spec-cdot { width: 12px; height: 12px; border-radius: 50%; border: 1px solid rgba(255,255,255,0.1); flex-shrink: 0; }
.input-action-btn { width: 34px; height: 34px; border: none; border-radius: var(--radius-md); background: transparent; color: var(--text-secondary); cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.15s ease; }
.input-action-btn:hover { background: var(--bg-hover); color: var(--text-primary); }
.input-action-btn.active { color: var(--color-primary-light); }
.send-btn { width: 36px; height: 36px; border: none; border-radius: var(--radius-md); background: var(--color-primary); color: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background var(--transition-normal); flex-shrink: 0; }
.send-btn:hover:not(:disabled) { background: var(--color-primary-hover); }
.send-btn:disabled { background: #3a3a5c; cursor: not-allowed; }

.blueprint-card { background: rgba(22, 33, 62, 0.9); border: 1px solid var(--border-subtle); border-radius: 10px; margin-bottom: 12px; overflow: hidden; }
.blueprint-header { display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; cursor: pointer; font-size: 13px; font-weight: 600; color: var(--text-primary); }
.blueprint-header:hover { background: rgba(255,255,255,0.03); }
.blueprint-body { padding: 0 14px 14px; }
.blueprint-section { margin-bottom: 10px; }
.blueprint-section-title { font-size: 11px; font-weight: 600; color: var(--color-primary-light); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
.blueprint-field { font-size: 12px; color: var(--text-secondary); line-height: 1.6; }
.color-dot { display: inline-block; width: 10px; height: 10px; border-radius: 50%; margin-right: 4px; vertical-align: middle; }
.blueprint-page-item { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--text-secondary); line-height: 1.8; }
.page-status { font-size: 10px; flex-shrink: 0; }
.page-status.designed { color: #22c55e; }
.page-status.planned { color: #f59e0b; }
.page-name { color: var(--text-primary); font-weight: 500; }
.page-purpose { color: var(--text-muted); }
.blueprint-tags { display: flex; flex-wrap: wrap; gap: 4px; }
.blueprint-tag { padding: 2px 8px; border-radius: 10px; background: rgba(79, 70, 229, 0.15); color: var(--color-primary-light); font-size: 11px; }
.blueprint-decision { font-size: 11px; color: var(--text-secondary); line-height: 1.5; }
.blueprint-rebuild-btn { width: 100%; padding: 7px; border-radius: 8px; border: 1px solid var(--border-subtle); background: transparent; color: var(--text-secondary); font-size: 12px; cursor: pointer; transition: all 0.15s ease; font-family: inherit; margin-top: 4px; }
.blueprint-rebuild-btn:hover:not(:disabled) { border-color: var(--border-hover); color: var(--text-primary); }
.blueprint-rebuild-btn:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
