<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useChatStore, type Session } from '../stores/chatStore'
import { useCanvasStore } from '../stores/canvasStore'
import { sendMessageToLLM, type DesignCritique, type PreflightData } from '../ai/chat'
import { BUILT_IN_SKILLS, getSkillById, SKILL_CATEGORIES, type DesignSkill } from '../prompts/skills'
import { buildPreflightFollowUpPrompt } from '../prompts/preflight'
import { isBlueprintEmpty, type ProductBlueprint } from '../prompts/blueprint'
import { saveProject } from '../stores/autoSave'
import { migrateDesignSpec } from '../prompts/designSpecs'
import { getDirectionById } from '../prompts/directions'
import { buildBrandAssetFromSpec, type BrandAsset } from '../prompts/brandAssets'
import { analyzeBrandWithLLM } from '../prompts/brandAnalyzer'
import { useLLMConfigStore } from '../stores/llmConfigStore'
import { runQaCheck, formatQaResult } from '../utils/qaCheck'
import { useClipboardImages, useClipboardImageListener } from '../composables/useClipboardImages'
import DesignSpecEditor from './DesignSpecEditor.vue'
import QaPanel from './QaPanel.vue'

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
const showBrandAnalyzer = ref(false)
const brandAnalyzerInput = ref('')
const brandAnalyzerLogoData = ref<string | null>(null)
const brandAnalyzerBusy = ref(false)
const brandAnalyzerError = ref<string | null>(null)
const textareaRef = ref<HTMLTextAreaElement | null>(null)

// Phase 4 · Task 20：参考图（dataURL 列表）
const referenceImages = ref<string[]>([])
const isDragOver = ref(false)
// Phase 4 · Task 15：QA 报告追加到下一条消息
const pendingQaReport = ref<string | null>(null)

const activeSkill = computed<DesignSkill | null>(() => {
  const id = canvasStore.activeSkillId
  return id ? getSkillById(id) ?? null : null
})

const activeSpec = computed(() => canvasStore.getActiveSpec())

const currentSpecLabel = computed(() => {
  const spec = activeSpec.value
  if (spec) return spec.name
  return canvasStore.designSpecId === 'none' ? '未使用规范' : '自定义'
})

const currentSpecColors = computed(() => {
  return activeSpec.value?.colors ?? null
})

const activeDirection = computed(() => getDirectionById(canvasStore.activeDirectionId))
const directionLabel = computed(() => activeDirection.value
  ? `${activeDirection.value.emoji} ${activeDirection.value.name}`
  : null)

/** 当前规范的"5 步品牌资产卡片"数据（v2 字段派生） */
const brandAsset = computed<BrandAsset | null>(() => {
  const spec = activeSpec.value
  if (!spec) return null
  return buildBrandAssetFromSpec(migrateDesignSpec(spec))
})
/** 5 步资产的可视化"标题"（用于渲染摘要卡片） */
const brandAssetSteps = computed(() => {
  const asset = brandAsset.value
  if (!asset) return null
  return [
    { key: 'colors', title: '1. 色彩', icon: '🎨', preview: asset.colors },
    { key: 'type', title: '2. 字体', icon: '🔤', preview: asset.typography },
    { key: 'spacing', title: '3. 间距', icon: '📐', preview: asset.spacing },
    { key: 'components', title: '4. 组件', icon: '🧩', preview: asset.components },
    { key: 'layout', title: '5. 布局', icon: '🗂', preview: asset.layout },
  ]
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
    direction: activeDirection.value,
    brandAsset: brandAsset.value,
    referenceImages: referenceImages.value.length > 0 ? [...referenceImages.value] : undefined,
    qaReport: pendingQaReport.value ?? undefined,
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
  inputText.value = `根据设计评审建议进行优化：${suggestions}`
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

// Phase 4 · Task 20：图片拖拽 / 粘贴处理
function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

async function handleDrop(e: DragEvent) {
  e.preventDefault()
  isDragOver.value = false
  const files = Array.from(e.dataTransfer?.files || []).filter(f => f.type.startsWith('image/'))
  for (const f of files) {
    if (referenceImages.value.length >= 4) break  // 最多 4 张
    const dataUrl = await readFileAsDataURL(f)
    referenceImages.value.push(dataUrl)
  }
}
function handleDragOver(e: DragEvent) {
  e.preventDefault()
  isDragOver.value = true
}
function handleDragLeave(_e: DragEvent) {
  isDragOver.value = false
}
function removeImage(i: number) {
  referenceImages.value.splice(i, 1)
}

async function onPaste(e: ClipboardEvent) {
  const items = e.clipboardData?.items
  if (!items) return
  for (const it of Array.from(items)) {
    if (it.type.startsWith('image/')) {
      const file = it.getAsFile()
      if (!file) continue
      e.preventDefault()
      if (referenceImages.value.length >= 4) return
      const dataUrl = await readFileAsDataURL(file)
      referenceImages.value.push(dataUrl)
      return
    }
  }
}

// Phase 4 · Task 15：按规范修正
async function handleQaFix(report: string) {
  if (!inputText.value.trim()) inputText.value = '请按质检报告修正以下问题，并保持原有设计风格。'
  pendingQaReport.value = report
  // 自动发送
  await doGenerate(inputText.value)
  pendingQaReport.value = null
  inputText.value = ''
}

// Phase 4 · Task 15：单 issue 修正
async function handleQaFixOne(issue: { section: 'dom' | 'token' | 'a11y'; message: string }) {
  const prefix = `[按规范修正] 【${issue.section.toUpperCase()}】 ${issue.message}\n请输出修正后的完整 HTML。`
  inputText.value = prefix
  pendingQaReport.value = formatQaResult(runQaCheck(latestHtml.value, activeSpec.value))
  await doGenerate(inputText.value)
  pendingQaReport.value = null
  inputText.value = ''
}

// Phase 4 · Task 15：当前选中卡片的最新 HTML（供 QaPanel 实时检测）
const latestHtml = computed(() => {
  const id = canvasStore.selectedCardId
  if (id) {
    const card = canvasStore.cards.find(c => c.id === id)
    if (card?.html) return card.html
  }
  // 退而求其次：最后一张有 html 的卡片
  for (let i = canvasStore.cards.length - 1; i >= 0; i--) {
    if (canvasStore.cards[i]?.html) return canvasStore.cards[i].html
  }
  return ''
})

// Phase 4 · Task 15：实时跟踪 latestHtml 变化，更新 latestQaResult（任务规约：
// "watch currentHtml 调用 runQaCheck"）
const latestQaResult = computed(() => runQaCheck(latestHtml.value, activeSpec.value))
const latestQaReport = computed(() => formatQaResult(latestQaResult.value))

/** 任务规约：watch currentHtml 变化时记录一次（用于埋点/调试） */
watch(latestHtml, (val) => {
  if (val) {
    const r = runQaCheck(val, activeSpec.value)
    // 控制台埋点，方便 QA 排错
    if (r.dom.issues.length + r.token.issues.length + r.a11y.issues.length > 0) {
      // eslint-disable-next-line no-console
      console.debug('[QA] 检测到', r.dom.issues.length, 'DOM /', r.token.issues.length, 'Token /', r.a11y.issues.length, 'A11y 问题')
    }
  }
})

onMounted(() => {
  if (!props.collapsed) {
    window.addEventListener('paste', onPaste)
  }
})
onUnmounted(() => {
  window.removeEventListener('paste', onPaste)
})
watch(() => props.collapsed, (v) => {
  if (v) window.removeEventListener('paste', onPaste)
  else window.addEventListener('paste', onPaste)
})

// Phase 5 · Task 20：全局 paste/drop 监听 → 派发 `clipboard-image` 事件
useClipboardImages()

// Phase 5 · Task 20：收到 `clipboard-image` 事件时插入"📋 粘贴图片"占位消息
//  - 图片本身仍由本地 onPaste/handleDrop 写入 referenceImages（避免重复）
//  - 占位消息让用户直观看到"已附加图片"
useClipboardImageListener((dataUrl) => {
  // 去重：本地 handler 已添加过则跳过
  if (referenceImages.value.includes(dataUrl)) {
    addClipboardPlaceholder('📋 粘贴图片（已附加到下一条消息）')
    return
  }
  // ChatPanel 折叠时本地 onPaste 不注册；这里兜底写入 refImages
  if (props.collapsed) {
    if (referenceImages.value.length < 4) {
      referenceImages.value.push(dataUrl)
    }
  }
  addClipboardPlaceholder('📋 粘贴图片（已附加到下一条消息）')
})

function addClipboardPlaceholder(text: string) {
  // 确保有 session
  if (!chatStore.activeSession) {
    chatStore.createSession('已附加图片')
  }
  // 占位消息（不计入 assistant "生成" 流程）
  if (chatStore.activeSession) {
    chatStore.activeSession.messages.push({
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    })
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

function handleLogoFile(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    brandAnalyzerLogoData.value = (reader.result as string) || null
  }
  reader.readAsDataURL(file)
}

async function handleBrandAnalyzerSubmit() {
  const text = brandAnalyzerInput.value.trim()
  if (!text || brandAnalyzerBusy.value) return
  const llmConfigStore = useLLMConfigStore()
  if (!llmConfigStore.isConfigured) {
    brandAnalyzerError.value = '请先在设置中配置 AI 服务。'
    return
  }
  brandAnalyzerBusy.value = true
  brandAnalyzerError.value = null
  try {
    const spec = await analyzeBrandWithLLM({
      config: llmConfigStore.getConfig(),
      input: { rawInput: text, logoDataUrl: brandAnalyzerLogoData.value || undefined },
    })
    if (!spec) {
      brandAnalyzerError.value = '品牌分析失败：AI 未返回有效 DesignSpec v2。'
      return
    }
    canvasStore.addCustomDesignSpec(spec)
    // 立即选用
    canvasStore.setDesignSpecId(spec.id)
    showBrandAnalyzer.value = false
    brandAnalyzerInput.value = ''
    brandAnalyzerLogoData.value = null
    chatStore.addAssistantMessage(`🎉 已从品牌描述生成规范：${spec.name}，可继续描述界面需求。`)
  } catch (err) {
    brandAnalyzerError.value = '品牌分析失败：' + ((err as Error).message || String(err))
  } finally {
    brandAnalyzerBusy.value = false
  }
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
      <div v-if="brandAsset && brandAssetSteps" class="spec-summary">
        <div class="spec-summary-header">
          <div class="spec-summary-title">
            <span class="spec-summary-emoji">🎯</span>
            <span>规范摘要</span>
            <span class="spec-summary-name">{{ currentSpecLabel }}</span>
          </div>
          <div v-if="directionLabel" class="spec-summary-direction">{{ directionLabel }}</div>
        </div>
        <div class="spec-summary-steps">
          <div
            v-for="step in brandAssetSteps"
            :key="step.key"
            class="spec-summary-step"
          >
            <div class="spec-step-head">
              <span class="spec-step-icon">{{ step.icon }}</span>
              <span class="spec-step-title">{{ step.title }}</span>
            </div>
            <div class="spec-step-body">
              <template v-if="step.key === 'colors'">
                <div class="spec-color-row">
                  <span class="spec-color-cdot" :style="{ background: (step.preview as any).primary }"></span>
                  <span class="spec-color-cdot" :style="{ background: (step.preview as any).secondary }"></span>
                  <span class="spec-color-cdot" :style="{ background: (step.preview as any).accent }"></span>
                  <span class="spec-color-cdot" :style="{ background: (step.preview as any).background }"></span>
                </div>
                <div class="spec-step-meta">{{ brandAsset?.meta.industry || '通用' }} · {{ brandAsset?.meta.tags.length ? brandAsset?.meta.tags.join(' / ') : 'no tags' }}</div>
              </template>
              <template v-else-if="step.key === 'type'">
                <div class="spec-step-line">H1 {{ (step.preview as any).h1Size }}px · Body {{ (step.preview as any).bodySize }}px</div>
                <div class="spec-step-meta font-meta">{{ (step.preview as any).fontStack }}</div>
              </template>
              <template v-else-if="step.key === 'spacing'">
                <div class="spec-step-line">base {{ (step.preview as any).base }}px · density {{ brandAsset?.meta.density }}</div>
                <div class="spec-step-meta">[{{ ((step.preview as any).scale as number[]).join(' · ') }}]</div>
              </template>
              <template v-else-if="step.key === 'components'">
                <div class="spec-step-line">button · {{ (step.preview as any).button.shape }} · h{{ (step.preview as any).button.height }}</div>
                <div class="spec-step-line">card r={{ (step.preview as any).card.radius }} p={{ (step.preview as any).card.padding }}</div>
              </template>
              <template v-else>
                <div class="spec-step-line">maxW {{ (step.preview as any).maxWidth }} · {{ (step.preview as any).columns }} 列 · hero {{ (step.preview as any).heroRatio }}</div>
              </template>
            </div>
          </div>
        </div>
        <div class="spec-summary-actions">
          <button class="spec-summary-btn" @click="showBrandAnalyzer = true">🪄 从品牌 URL/Logo 生成</button>
          <button class="spec-summary-btn secondary" @click="showSpecEditor = true">⚙ 调整规范</button>
        </div>
        <!-- Phase 4 · Task 15：质量检查折叠区（在"规范摘要"下方） -->
        <QaPanel
          v-if="latestHtml"
          class="spec-qa"
          :html="latestHtml"
          :spec="activeSpec"
          :busy="chatStore.isStreaming"
          @fix-by-spec="handleQaFix"
          @fix-one="handleQaFixOne"
          @refresh="() => {}"
        />
      </div>
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
          <div class="critique-actions">
            <button class="critique-optimize-btn" @click="handleCritiqueOptimize">根据建议优化</button>
            <button class="critique-dismiss-btn" @click="showCritique = false; activeCritique = null">忽略</button>
          </div>
        </div>
      </div>

      <div v-if="hasBlueprint" class="blueprint-card">
        <div class="blueprint-header" @click="showBlueprintPanel = !showBlueprintPanel">
          <span>📋 产品蓝图 v{{ canvasStore.productBlueprint.version }}</span>
          <svg :style="{ transform: showBlueprintPanel ? 'rotate(180deg)' : '' }" width="12" height="12" viewBox="0 0 24 24" fill="currentColor" style="transition: transform 0.2s"><path d="M7 10l5 5 5-5z"/></svg>
        </div>
        <div v-if="showBlueprintPanel" class="blueprint-body">
          <div v-if="canvasStore.productBlueprint.product?.name" class="blueprint-section">
            <div class="blueprint-section-title">产品概述</div>
            <div class="blueprint-field" v-if="canvasStore.productBlueprint.product?.name">名称：{{ canvasStore.productBlueprint.product.name }}</div>
            <div class="blueprint-field" v-if="canvasStore.productBlueprint.product?.category">类型：{{ canvasStore.productBlueprint.product.category }}</div>
            <div class="blueprint-field" v-if="canvasStore.productBlueprint.product?.targetUsers">目标用户：{{ canvasStore.productBlueprint.product.targetUsers }}</div>
          </div>
          <div v-if="canvasStore.productBlueprint.visualSpec?.primaryColor" class="blueprint-section">
            <div class="blueprint-section-title">视觉规范</div>
            <div class="blueprint-field">主色：<span class="color-dot" :style="{ background: canvasStore.productBlueprint.visualSpec.primaryColor }"></span>{{ canvasStore.productBlueprint.visualSpec.primaryColor }}</div>
            <div class="blueprint-field" v-if="canvasStore.productBlueprint.visualSpec?.styleKeywords?.length">风格：{{ canvasStore.productBlueprint.visualSpec.styleKeywords.join('、') }}</div>
          </div>
          <div v-if="canvasStore.productBlueprint.pages?.length" class="blueprint-section">
            <div class="blueprint-section-title">页面 ({{ canvasStore.productBlueprint.pages.length }})</div>
            <div v-for="(p, i) in canvasStore.productBlueprint.pages" :key="i" class="blueprint-page-item">
              <span :class="['page-status', p.status]">{{ p.status === 'designed' ? '✓' : '○' }}</span>
              <span class="page-name">{{ p.name }}</span>
              <span class="page-purpose">{{ p.purpose }}</span>
            </div>
          </div>
          <div v-if="canvasStore.productBlueprint.features?.confirmed?.length" class="blueprint-section">
            <div class="blueprint-section-title">已确认功能</div>
            <div class="blueprint-tags">
              <span v-for="f in canvasStore.productBlueprint.features.confirmed" :key="f" class="blueprint-tag">{{ f }}</span>
            </div>
          </div>
          <div v-if="canvasStore.productBlueprint.designDecisions?.length" class="blueprint-section">
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
      <div
        class="input-wrapper"
        :class="{ 'is-drag-over': isDragOver }"
        @drop="handleDrop"
        @dragover="handleDragOver"
        @dragleave="handleDragLeave"
      >
        <!-- Phase 4 · Task 15：QA 面板（每帧 QA 检测通过 watch 触发） -->
        <QaPanel
          v-if="latestHtml"
          :html="latestHtml"
          :spec="activeSpec"
          :busy="chatStore.isStreaming"
          @fix-by-spec="handleQaFix"
          @fix-one="handleQaFixOne"
          @refresh="() => {}"
        />

        <!-- Phase 4 · Task 20：参考图预览 -->
        <div v-if="referenceImages.length > 0" class="ref-images">
          <div v-for="(img, i) in referenceImages" :key="i" class="ref-img">
            <img :src="img" :alt="`ref-${i}`" />
            <button class="ref-img-remove" @click="removeImage(i)" title="移除">×</button>
          </div>
        </div>

        <!-- Phase 5 · Task 20：拖入 / 粘贴图片提示 -->
        <div class="chat-input-hint">
          <span>📎 拖入 / 粘贴图片</span>
          <span class="chat-input-hint-sep">·</span>
          <span>最多 4 张参考图</span>
        </div>

        <textarea
          ref="textareaRef"
          v-model="inputText"
          class="chat-input"
          :placeholder="activeSkill ? activeSkill.examplePrompt : '描述你想要的界面... (可拖入图片 / ⌘V 粘贴)'"
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
            <!-- Phase 4 · Task 17：组件库下拉 已移除 -->
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
        <div v-if="isDragOver" class="drop-hint">📥 拖入图片作为参考</div>
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

  <div v-if="showBrandAnalyzer" class="brand-analyzer-overlay" @click.self="showBrandAnalyzer = false">
    <div class="brand-analyzer-modal">
      <div class="brand-analyzer-header">
        <div class="brand-analyzer-title">🪄 从品牌 URL / Logo 生成 DesignSpec</div>
        <button class="brand-analyzer-close" @click="showBrandAnalyzer = false">×</button>
      </div>
      <div class="brand-analyzer-body">
        <label class="brand-analyzer-label">品牌 URL 或名称</label>
        <input
          v-model="brandAnalyzerInput"
          class="brand-analyzer-input"
          placeholder="例如：https://stripe.com 或 Stripe"
          :disabled="brandAnalyzerBusy"
        />
        <label class="brand-analyzer-label">Logo 图片（可选）</label>
        <input
          type="file"
          accept="image/*"
          class="brand-analyzer-file"
          :disabled="brandAnalyzerBusy"
          @change="handleLogoFile"
        />
        <div v-if="brandAnalyzerLogoData" class="brand-analyzer-logo-preview">
          <img :src="brandAnalyzerLogoData" alt="logo" />
        </div>
        <div v-if="brandAnalyzerError" class="brand-analyzer-error">⚠ {{ brandAnalyzerError }}</div>
        <div class="brand-analyzer-actions">
          <button class="brand-analyzer-submit" :disabled="brandAnalyzerBusy" @click="handleBrandAnalyzerSubmit">
            {{ brandAnalyzerBusy ? '分析中...' : '开始分析' }}
          </button>
          <button class="brand-analyzer-cancel" :disabled="brandAnalyzerBusy" @click="showBrandAnalyzer = false">取消</button>
        </div>
      </div>
    </div>
  </div>
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
.critique-actions { display: flex; gap: 8px; }
.critique-optimize-btn { flex: 1; padding: 8px; border-radius: 8px; border: 1px solid var(--color-primary); background: transparent; color: var(--color-primary); font-size: 12px; font-weight: 600; cursor: pointer; transition: all 0.15s ease; font-family: inherit; }
.critique-optimize-btn:hover { background: var(--color-primary); color: #fff; }
.critique-dismiss-btn { padding: 8px 16px; border-radius: 8px; border: 1px solid var(--border-color); background: transparent; color: var(--text-secondary); font-size: 12px; font-weight: 500; cursor: pointer; transition: all 0.15s ease; font-family: inherit; }
.critique-dismiss-btn:hover { background: rgba(255,255,255,0.05); color: var(--text-primary); }

.active-skill-chip { display: inline-flex; align-items: center; gap: 4px; padding: 3px 8px; background: rgba(79, 70, 229, 0.2); color: var(--color-primary-light); border-radius: 6px; font-size: 12px; }
.skill-chip-emoji { font-size: 14px; line-height: 1; }
.skill-chip-close { background: none; border: none; color: rgba(255,255,255,0.5); cursor: pointer; font-size: 14px; padding: 0 2px; line-height: 1; }
.skill-chip-close:hover { color: var(--text-primary); }

/* chip 关闭按钮（组件库复用） */
.chip-clear { background: none; border: none; color: var(--text-muted); cursor: pointer; font-size: 14px; line-height: 1; padding: 0 4px; flex-shrink: 0; }
.chip-clear:hover { color: #fff; }

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

/* Phase 4 · Task 20：拖入 / 粘贴图片 */
.is-drag-over { border: 2px dashed var(--color-primary) !important; background: rgba(129,140,248,0.05) !important; }
.ref-images { display: flex; gap: 6px; margin-bottom: 8px; flex-wrap: wrap; }
.ref-img { position: relative; width: 60px; height: 60px; border-radius: 6px; overflow: hidden; border: 1px solid var(--border-default); }
.ref-img img { width: 100%; height: 100%; object-fit: cover; }
.ref-img-remove { position: absolute; top: 0; right: 0; width: 18px; height: 18px; border-radius: 0 0 0 6px; background: rgba(0,0,0,0.7); color: #fff; border: none; font-size: 12px; cursor: pointer; line-height: 1; }
.drop-hint { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); padding: 8px 16px; background: rgba(129,140,248,0.95); color: #fff; border-radius: 6px; font-size: 13px; pointer-events: none; z-index: 5; }

/* Phase 5 · Task 20：拖入 / 粘贴图片提示 */
.chat-input-hint { display: flex; align-items: center; gap: 6px; margin-bottom: 6px; font-size: 11px; color: var(--text-tertiary, #888); }
.chat-input-hint-sep { opacity: 0.5; }

/* Phase 4 · Task 17：组件库下拉（已移除） */

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

/* ── 规范摘要（品牌资产 5 步卡片） ── */
.spec-summary { margin: 10px 10px 6px; padding: 10px 12px; border-radius: 10px; background: rgba(40, 40, 70, 0.45); border: 1px solid var(--border-subtle); }
.spec-summary-header { display: flex; align-items: center; justify-content: space-between; gap: 6px; flex-wrap: wrap; }
.spec-summary-title { display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 600; color: var(--text-primary); }
.spec-summary-emoji { font-size: 14px; }
.spec-summary-name { font-size: 11px; color: var(--color-primary-light); padding: 1px 6px; border-radius: 6px; background: rgba(94, 106, 210, 0.15); }
.spec-summary-direction { font-size: 11px; color: var(--text-secondary); padding: 1px 6px; border-radius: 6px; background: rgba(255,255,255,0.06); }
.spec-summary-steps { display: flex; flex-direction: column; gap: 6px; margin-top: 8px; }
.spec-step-head { display: flex; align-items: center; gap: 4px; font-size: 11px; color: var(--text-primary); font-weight: 500; }
.spec-step-icon { font-size: 12px; }
.spec-step-body { margin-top: 4px; }
.spec-color-row { display: flex; gap: 3px; }
.spec-color-cdot { width: 14px; height: 14px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.1); }
.spec-step-line { font-size: 10px; color: var(--text-secondary); line-height: 1.4; }
.spec-step-meta { font-size: 10px; color: var(--text-muted); margin-top: 2px; word-break: break-all; }
.font-meta { font-family: 'Cascadia Code', monospace; font-size: 9px; }
.spec-summary-actions { display: flex; gap: 6px; margin-top: 8px; }
.spec-summary-btn { flex: 1; padding: 6px 8px; border-radius: 7px; border: 1px solid var(--color-primary-light); background: var(--color-primary); color: #fff; font-size: 11px; cursor: pointer; font-family: inherit; transition: all 0.15s; }
.spec-summary-btn.secondary { background: transparent; color: var(--text-primary); border-color: var(--border-hover); }
.spec-summary-btn:hover { transform: translateY(-1px); }

/* ── 品牌分析器弹窗 ── */
.brand-analyzer-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.55); display: flex; align-items: center; justify-content: center; z-index: var(--z-modal); }
.brand-analyzer-modal { width: 420px; max-width: 92vw; background: var(--bg-elevated); border-radius: 12px; border: 1px solid var(--border-subtle); box-shadow: 0 10px 40px rgba(0,0,0,0.4); overflow: hidden; }
.brand-analyzer-header { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border-bottom: 1px solid var(--border-subtle); }
.brand-analyzer-title { font-size: 14px; font-weight: 600; color: var(--text-primary); }
.brand-analyzer-close { background: transparent; border: none; color: var(--text-secondary); font-size: 20px; cursor: pointer; line-height: 1; padding: 0; }
.brand-analyzer-body { padding: 14px 16px; display: flex; flex-direction: column; gap: 8px; }
.brand-analyzer-label { font-size: 12px; color: var(--text-secondary); }
.brand-analyzer-input, .brand-analyzer-file { width: 100%; padding: 8px 10px; border-radius: 6px; border: 1px solid var(--border-subtle); background: rgba(0,0,0,0.2); color: var(--text-primary); font-size: 13px; font-family: inherit; box-sizing: border-box; }
.brand-analyzer-input:focus, .brand-analyzer-file:focus { outline: 1px solid var(--color-primary-light); }
.brand-analyzer-logo-preview { max-height: 80px; padding: 6px; background: rgba(255,255,255,0.05); border-radius: 6px; display: flex; justify-content: center; }
.brand-analyzer-logo-preview img { max-height: 60px; max-width: 100%; object-fit: contain; }
.brand-analyzer-error { color: #ef4444; font-size: 12px; padding: 6px 8px; background: rgba(239,68,68,0.08); border-radius: 6px; }
.brand-analyzer-actions { display: flex; gap: 8px; margin-top: 4px; }
.brand-analyzer-submit { flex: 1; padding: 8px 12px; border-radius: 6px; border: none; background: var(--color-primary); color: #fff; font-size: 13px; cursor: pointer; font-family: inherit; }
.brand-analyzer-submit:disabled { opacity: 0.5; cursor: not-allowed; }
.brand-analyzer-cancel { padding: 8px 12px; border-radius: 6px; border: 1px solid var(--border-subtle); background: transparent; color: var(--text-secondary); font-size: 13px; cursor: pointer; font-family: inherit; }
</style>
