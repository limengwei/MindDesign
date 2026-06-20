<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { getRecentProjects, createProject, readProject, writeProjectFiles, updateProjectMeta, deleteProject, type RecentProject } from '../services/projectBridge'
import { useLLMConfigStore } from '../stores/llmConfigStore'
import { useCanvasStore } from '../stores/canvasStore'
import { importSharePackage, type ShareableProjectData } from '../utils/sharePackage'
import WindowControls from '../components/WindowControls.vue'
import DesignSpecSelector from '../components/DesignSpecSelector.vue'
import SvgIcon from '../components/SvgIcon.vue'
import SettingsPanel from '../components/SettingsPanel.vue'
import {
  type DesignSpecId,
  DESIGN_SPEC_LABELS,
  getDesignSpecById,
} from '../prompts/designSpecs'
import { VISUAL_DIRECTIONS, type VisualDirection } from '../prompts/directions'

const router = useRouter()
const llmConfigStore = useLLMConfigStore()
const canvasStore = useCanvasStore()
const projects = ref<RecentProject[]>([])
const loading = ref(true)
const showCreateForm = ref(false)
const showSettingsPanel = ref(false)
const projectName = ref('')
const pageType = ref('app')
const designSpecId = ref<string>('none')
const customSpecName = ref('')
const customSpecContent = ref('')
const showCustomImport = ref(false)
const savedCustomSpecs = ref<{ name: string; content: string }[]>([])
const selectedCustomSpecIndex = ref(-1)
const activeDirectionId = ref<string | null>(null)
const visualDirections: VisualDirection[] = VISUAL_DIRECTIONS

// Phase 4 · Task 18：分享包导入
const shareImport = ref<ShareableProjectData | null>(null)
const importingShare = ref(false)
const importError = ref('')
const shareFileInput = ref<HTMLInputElement | null>(null)

function triggerShareImport() {
  importError.value = ''
  shareFileInput.value?.click()
}

async function onShareFileChange(e: Event) {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return
  if (!file.name.endsWith('.mindshare')) {
    importError.value = '请选择 .mindshare 文件'
    target.value = ''
    return
  }
  importingShare.value = true
  try {
    const data = await importSharePackage(file)
    shareImport.value = data
    importError.value = ''
    const proj = (data.project as any) || {}
    if (proj.name) projectName.value = String(proj.name) + '（分享）'
    if (proj.pageType && ['app', 'web', 'desktop'].includes(proj.pageType)) {
      pageType.value = proj.pageType
    }
    if (proj.designSpec?.id) designSpecId.value = proj.designSpec.id
  } catch (err) {
    importError.value = '解析失败：' + ((err as Error).message || String(err))
  } finally {
    importingShare.value = false
    target.value = ''
  }
}

function getDirectionSwatches(dir: VisualDirection): string[] {
  return [dir.colors.primary, dir.colors.accent, dir.colors.background, dir.colors.text]
}

function getDirectionCardStyle(dir: VisualDirection) {
  return {
    '--dir-bg': dir.colors.background,
    '--dir-fg': dir.colors.text,
    '--dir-primary': dir.colors.primary,
    '--dir-accent': dir.colors.accent,
  } as Record<string, string>
}

const pageTypes = [
  { value: 'app', label: '📱 移动 App', width: '375px' },
  { value: 'web', label: '🌐 网页', width: '1440px' },
  { value: 'desktop', label: '🖥 桌面应用', width: '1280px' },
]

async function loadCustomSpecs() {
  try {
    const bundle = await readProject('design-specs/custom-specs.project.json')
    if (bundle.project) {
      savedCustomSpecs.value = bundle.project as any
    }
  } catch {
    savedCustomSpecs.value = []
  }
}

async function saveCustomSpec() {
  const name = customSpecName.value.trim()
  const content = customSpecContent.value.trim()
  if (!name || !content) return
  savedCustomSpecs.value.push({ name, content })
  try {
    await writeProjectFiles(
      'design-specs/custom-specs.project.json',
      JSON.stringify(savedCustomSpecs.value),
      '', ''
    )
  } catch (e) {
    console.error('Failed to save custom spec:', e)
  }
  customSpecName.value = ''
  customSpecContent.value = ''
  showCustomImport.value = false
}

function selectCustomSpec(index: number) {
  selectedCustomSpecIndex.value = index
}

function deleteCustomSpec(index: number) {
  savedCustomSpecs.value.splice(index, 1)
  if (selectedCustomSpecIndex.value === index) selectedCustomSpecIndex.value = -1
  else if (selectedCustomSpecIndex.value > index) selectedCustomSpecIndex.value--
  writeProjectFiles('design-specs/custom-specs.project.json', JSON.stringify(savedCustomSpecs.value), '', '').catch(() => {})
}

function getCustomContent(): string {
  if (designSpecId.value !== 'custom') return ''
  if (selectedCustomSpecIndex.value >= 0 && savedCustomSpecs.value[selectedCustomSpecIndex.value]) {
    return savedCustomSpecs.value[selectedCustomSpecIndex.value].content
  }
  return customSpecContent.value
}

async function loadProjects() {
  loading.value = true
  try {
    projects.value = await getRecentProjects()
  } catch {
    projects.value = []
  }
  loading.value = false
}


function openProject(project: RecentProject) {
  router.push({ name: 'design', query: { path: project.path } })
}

const showEditForm = ref(false)
const editingProject = ref<RecentProject | null>(null)
const editName = ref('')
const editPageType = ref('app')
const editDesignSpecId = ref<string>('none')
const showDeleteConfirm = ref(false)
const deleting = ref(false)
const saving = ref(false)

function startEdit(project: RecentProject) {
  editingProject.value = project
  editName.value = project.name
  editPageType.value = project.pageType || 'app'
  editDesignSpecId.value = (project.designSpecId || 'none')
  showEditForm.value = true
}

async function handleSaveEdit() {
  if (saving.value || !editingProject.value) return
  saving.value = true
  try {
    await updateProjectMeta(
      editingProject.value.path,
      editName.value,
      editPageType.value,
      editDesignSpecId.value
    )
    showEditForm.value = false
    await loadProjects()
  } catch (e) {
    console.error('Update project failed:', e)
    alert('更新项目失败：' + (e as Error).message)
  } finally {
    saving.value = false
  }
}

async function handleDelete() {
  if (deleting.value || !editingProject.value) return
  deleting.value = true
  try {
    await deleteProject(editingProject.value.path)
    showEditForm.value = false
    showDeleteConfirm.value = false
    await loadProjects()
  } catch (e) {
    console.error('Delete project failed:', e)
    alert('删除项目失败：' + (e as Error).message)
  } finally {
    deleting.value = false
  }
}

const pageTypeLabels: Record<string, string> = {
  app: '📱 移动App',
  web: '🌐 网页',
  desktop: '🖥 桌面',
}

function getDesignSpecLabel(id: string): string {
  if (!id || id === 'none') return ''
  return DESIGN_SPEC_LABELS[id as DesignSpecId] || id
}

function getDesignSpecColors(id: string): string[] {
  if (!id || id === 'none' || id === 'custom') return []
  const spec = getDesignSpecById(id as DesignSpecId)
  if (!spec) return []
  return [spec.colors.primary, spec.colors.accent, spec.colors.background]
}

function getCardIconStyle(project: RecentProject) {
  const colors = getDesignSpecColors(project.designSpecId)
  const bg = colors.length > 0 ? colors[0] : '#ffffff'
  // 计算相对亮度，>0.5 视为浅色背景
  const hex = bg.replace('#', '')
  const r = parseInt(hex.slice(0, 2), 16) / 255
  const g = parseInt(hex.slice(2, 4), 16) / 255
  const b = parseInt(hex.slice(4, 6), 16) / 255
  const luminance = 0.299 * r + 0.587 * g + 0.114 * b
  const color = luminance > 0.5 ? '#1a1a2e' : '#ffffff'
  return { background: bg, color }
}


const creating = ref(false)

async function handleCreate() {
  if (creating.value) return
  creating.value = true
  try {
    const name = projectName.value || '未命名项目'
    // 同步视觉方向到 canvasStore（让 Design 视图直接拿到）
    canvasStore.setActiveDirectionId(activeDirectionId.value)

    // Phase 4 · Task 18：分享包恢复
    if (shareImport.value) {
      const sessions = (shareImport.value.sessions as any[]) || []
      const cards = (shareImport.value.cards as any[]) || []
      const project = (shareImport.value.project as any) || {}
      const projectJson = JSON.stringify({
        formatVersion: 3,
        meta: {
          name,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          appVersion: '1.0.0',
        },
        canvas: {
          pageType: pageType.value,
          designSpecId: designSpecId.value,
          customDesignContent: project?.designSpec?.id ? '' : '',
          activeDirectionId: null,
          viewport: { zoom: 1, scrollX: 0, scrollY: 0 },
        },
      })
      const cardsJson = JSON.stringify({ cards })
      const sessionsJson = JSON.stringify({ sessions })
      const path = await createProject(name, projectJson, sessionsJson, cardsJson)
      router.push({ name: 'design', query: { path } })
      return
    }

    const projectJson = JSON.stringify({
      formatVersion: 3,
      meta: {
        name,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        appVersion: '1.0.0',
      },
      canvas: {
        pageType: pageType.value,
        designSpecId: designSpecId.value,
        customDesignContent: getCustomContent(),
        activeDirectionId: activeDirectionId.value,
        viewport: { zoom: 1, scrollX: 0, scrollY: 0 },
      },
    })
    const cardsJson = JSON.stringify({ cards: [] })
    const sessionsJson = JSON.stringify({ sessions: [] })

    const path = await createProject(name, projectJson, sessionsJson, cardsJson)
    router.push({ name: 'design', query: { path } })
  } catch (e) {
    console.error('Create project failed:', e)
    alert('创建项目失败：' + (e as Error).message)
  } finally {
    creating.value = false
  }
}

const homeRef = ref<HTMLElement | null>(null)
let dotCanvas: HTMLCanvasElement | null = null
let dotCtx: CanvasRenderingContext2D | null = null
let dotRaf = 0
let mouseX = -9999
let mouseY = -9999
let smoothX = -9999
let smoothY = -9999
let mouseInside = false

let animating = false

function startDotAnimation() {
  if (animating) return
  animating = true
  tickDotGrid()
}

function initDotGrid() {
  if (!homeRef.value) return
  dotCanvas = document.createElement('canvas')
  dotCanvas.style.cssText = 'position:fixed;inset:0;z-index:0;pointer-events:none;'
  homeRef.value.insertBefore(dotCanvas, homeRef.value.firstChild)
  dotCtx = dotCanvas.getContext('2d')!
  resizeDotCanvas()
  window.addEventListener('resize', resizeDotCanvas)
  drawDots()
}

function resizeDotCanvas() {
  if (!dotCanvas) return
  dotCanvas.width = window.innerWidth
  dotCanvas.height = window.innerHeight
}

function handleMouseMove(e: MouseEvent) {
  mouseX = e.clientX
  mouseY = e.clientY
  startDotAnimation()
}

function handleMouseEnter(e: MouseEvent) {
  mouseInside = true
  mouseX = e.clientX
  mouseY = e.clientY
  smoothX = e.clientX
  smoothY = e.clientY
  startDotAnimation()
}
function handleMouseLeave() { mouseInside = false; startDotAnimation() }

function tickDotGrid() {
  const targetX = mouseInside ? mouseX : -9999
  const targetY = mouseInside ? mouseY : -9999
  smoothX += (targetX - smoothX) * 0.25
  smoothY += (targetY - smoothY) * 0.25

  drawDots()

  if (mouseInside || Math.abs(targetX - smoothX) > 1 || Math.abs(targetY - smoothY) > 1) {
    dotRaf = requestAnimationFrame(tickDotGrid)
  } else {
    smoothX = -9999; smoothY = -9999
    animating = false
  }
}

function drawDots() {
  if (!dotCtx || !dotCanvas) return
  const w = dotCanvas.width
  const h = dotCanvas.height
  const ctx = dotCtx
  ctx.clearRect(0, 0, w, h)
  ctx.fillStyle = '#0f0f23'
  ctx.fillRect(0, 0, w, h)

  const gap = 24
  const dotSize = 1.2
  const dotColor = 'rgba(255,255,255,0.08)'
  const hoverR = 120
  const hoverR2 = hoverR * hoverR
  const hoverColor = 'rgba(129,140,248,0.6)'

  const hasHover = smoothX > -999 && smoothY > -999
  const hoverMargin = hasHover ? hoverR + gap : 0

  for (let x = gap / 2; x < w; x += gap) {
    for (let y = gap / 2; y < h; y += gap) {
      if (hasHover && x > smoothX - hoverMargin && x < smoothX + hoverMargin && y > smoothY - hoverMargin && y < smoothY + hoverMargin) {
        const dx = x - smoothX, dy = y - smoothY
        const dist2 = dx * dx + dy * dy
        if (dist2 < hoverR2) {
          const t = 1 - Math.sqrt(dist2) / hoverR
          const eased = t * t
          ctx.fillStyle = hoverColor
          ctx.globalAlpha = 0.08 + eased * 0.92
          ctx.beginPath()
          ctx.arc(x, y, dotSize * (1 + 1.5 * eased), 0, Math.PI * 2)
          ctx.fill()
          continue
        }
      }
      ctx.globalAlpha = 1
      ctx.fillStyle = dotColor
      ctx.beginPath()
      ctx.arc(x, y, dotSize, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  ctx.globalAlpha = 1
}

onMounted(async () => {
  loadProjects()
  loadCustomSpecs()
  initDotGrid()
})

onUnmounted(() => {
  if (dotRaf) cancelAnimationFrame(dotRaf)
  window.removeEventListener('resize', resizeDotCanvas)
  dotCanvas?.remove()
})
</script>

<template>
  <div class="home" ref="homeRef" @mousemove="handleMouseMove" @mouseenter="handleMouseEnter" @mouseleave="handleMouseLeave">
    <div class="titlebar">
      <div class="titlebar-left">
        <span class="titlebar-app-name">MindDesign</span>
      </div>
      <div class="titlebar-center"></div>
      <div class="titlebar-right">
        <button
          class="titlebar-btn"
          :class="{ active: llmConfigStore.isConfigured }"
          title="API 设置"
          @click="showSettingsPanel = true"
        >
          <SvgIcon name="settings" :size="16" />
        </button>
        <WindowControls />
      </div>
    </div>
    <div class="home-header">
      <img src="/logo.png" alt="MindDesign" class="app-logo" />
      <h1 class="app-title">MindDesign</h1>
      <p class="app-subtitle">AI 对话式 UI 设计工具</p>
    </div>

    <div class="project-grid">
      <div
        v-for="project in projects"
        :key="project.path"
        class="project-card"
        @click="openProject(project)"
      >
        <div class="card-header">
          <div class="card-icon" :style="getCardIconStyle(project)">{{ project.name.charAt(0) }}</div>
          <button class="card-edit-btn" @click.stop="startEdit(project)" title="编辑项目">
            <SvgIcon name="edit" :size="16" />
          </button>
        </div>
        <div class="card-name">{{ project.name }}</div>
        <div class="card-footer">
          <span v-if="project.pageType" class="card-tag-type">{{ pageTypeLabels[project.pageType] || project.pageType }}</span>
          <div v-if="getDesignSpecColors(project.designSpecId).length" class="card-colors">
            <span
              v-for="(color, idx) in getDesignSpecColors(project.designSpecId)"
              :key="idx"
              class="color-dot"
              :style="{ background: color }"
            ></span>
          </div>
        </div>
      </div>

      <div class="project-card create-card" @click="llmConfigStore.isConfigured ? (showCreateForm = true) : (showSettingsPanel = true)">
        <div class="create-icon">＋</div>
        <div class="create-text">创建新项目</div>
      </div>
    </div>

    <div v-if="loading" class="loading">加载中...</div>

    <div v-if="showEditForm" class="dialog-overlay" @click.self="showEditForm = false">
      <div class="dialog dialog-create">
        <h2 class="dialog-title">编辑项目</h2>

        <div class="form-group">
          <label>项目名称</label>
          <input
            v-model="editName"
            type="text"
            placeholder="输入项目名称..."
            class="input"
            maxlength="20"
            @keyup.enter="handleSaveEdit"
          />
        </div>

        <div class="form-group">
          <label>页面类型</label>
          <div class="option-grid">
            <button
              v-for="pt in pageTypes"
              :key="pt.value"
              :class="['option-card', { active: editPageType === pt.value }]"
              @click="editPageType = pt.value"
            >
              <div class="option-label">{{ pt.label }}</div>
              <div class="option-hint">{{ pt.width }}</div>
            </button>
          </div>
        </div>

        <div class="form-group">
          <label>设计规范</label>
          <DesignSpecSelector v-model="editDesignSpecId" />
        </div>

        <div class="dialog-actions">
          <div class="dialog-actions-left">
            <template v-if="!showDeleteConfirm">
              <button class="btn btn-danger-ghost" @click="showDeleteConfirm = true">删除项目</button>
            </template>
            <template v-else>
              <span class="delete-confirm-text">确定删除「{{ editName }}」？此操作不可撤销</span>
              <button class="btn btn-secondary" @click="showDeleteConfirm = false">取消</button>
              <button class="btn btn-danger" :disabled="deleting" @click="handleDelete">{{ deleting ? '删除中...' : '确认删除' }}</button>
            </template>
          </div>
          <div class="dialog-actions-right">
            <button class="btn btn-secondary" @click="showEditForm = false">取消</button>
            <button v-if="!showDeleteConfirm" class="btn btn-primary" :disabled="saving" @click="handleSaveEdit">{{ saving ? '保存中...' : '保存' }}</button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showCreateForm" class="dialog-overlay" @click.self="showCreateForm = false">
      <div class="dialog dialog-create">
        <h2 class="dialog-title">{{ shareImport ? '从分享包恢复' : '新建项目' }}</h2>

        <div v-if="!shareImport" class="form-group import-share-group">
          <button class="btn btn-secondary import-share-btn" :disabled="importingShare" @click="triggerShareImport">
            📥 导入 .mindshare 分享包
          </button>
          <input
            ref="shareFileInput"
            type="file"
            accept=".mindshare"
            style="display:none"
            @change="onShareFileChange"
          />
          <p v-if="importingShare" class="hint">解析中…</p>
          <p v-if="importError" class="hint error">⚠ {{ importError }}</p>
        </div>

        <div v-if="shareImport" class="share-preview">
          <div class="share-row">📦 已加载分享包：<strong>{{ ((shareImport as any).project?.name) || '未命名' }}</strong></div>
          <div class="share-row">画板数：{{ Array.isArray(shareImport.sessions) ? shareImport.sessions.length : 0 }}</div>
          <button class="btn btn-secondary" @click="shareImport = null">取消导入</button>
        </div>

        <div class="form-group">
          <label>项目名称</label>
          <input
            v-model="projectName"
            type="text"
            placeholder="输入项目名称..."
            class="input"
            @keyup.enter="handleCreate"
          />
        </div>

        <div class="form-group">
          <label>页面类型</label>
          <div class="option-grid">
            <button
              v-for="pt in pageTypes"
              :key="pt.value"
              :class="['option-card', { active: pageType === pt.value }]"
              @click="pageType = pt.value"
            >
              <div class="option-label">{{ pt.label }}</div>
              <div class="option-hint">{{ pt.width }}</div>
            </button>
          </div>
        </div>

        <div class="form-group">
          <label>视觉方向 <span class="label-hint">（可选，影响整体观感）</span></label>
          <div class="direction-grid">
            <button
              v-for="dir in visualDirections"
              :key="dir.id"
              :class="['direction-card', { active: activeDirectionId === dir.id }]"
              :style="getDirectionCardStyle(dir)"
              @click="activeDirectionId = activeDirectionId === dir.id ? null : dir.id"
            >
              <div class="direction-emoji">{{ dir.emoji }}</div>
              <div class="direction-name">{{ dir.name }}</div>
              <div class="direction-desc">{{ dir.description }}</div>
              <div class="direction-swatches">
                <span
                  v-for="(c, i) in getDirectionSwatches(dir)"
                  :key="i"
                  class="swatch"
                  :style="{ background: c }"
                ></span>
              </div>
            </button>
          </div>
        </div>

        <div class="form-group">
          <label>设计规范</label>
          <DesignSpecSelector v-model="designSpecId" />

          <div v-if="designSpecId === 'custom'" class="custom-spec-area">
            <div v-if="savedCustomSpecs.length > 0" class="saved-specs-list">
              <div class="saved-specs-title">已保存的设计规范</div>
              <div
                v-for="(spec, idx) in savedCustomSpecs"
                :key="idx"
                :class="['saved-spec-item', { active: selectedCustomSpecIndex === idx }]"
                @click="selectCustomSpec(idx)"
              >
                <span class="saved-spec-name">{{ spec.name }}</span>
                <button class="delete-spec-btn" @click.stop="deleteCustomSpec(idx)">✕</button>
              </div>
            </div>
            <div class="import-actions">
              <button class="btn btn-link" @click="showCustomImport = !showCustomImport">
                {{ showCustomImport ? '收起' : '+ 导入新的设计规范' }}
              </button>
              <a href="https://getdesign.md/" target="_blank" class="spec-link">获取更多设计规范 →</a>
            </div>
            <div v-if="showCustomImport" class="custom-import-form">
              <input
                v-model="customSpecName"
                type="text"
                placeholder="设计规范名称（如：My Brand）"
                class="input"
              />
              <textarea
                v-model="customSpecContent"
                placeholder="粘贴 DESIGN.md 内容..."
                class="input textarea"
                rows="6"
              ></textarea>
              <div class="import-hint">
                将设计规范内容粘贴到上方文本框中。你可以从
                <a href="https://github.com/VoltAgent/awesome-design-md" target="_blank">awesome-design-md</a>
                获取 DESIGN.md 文件，或按照
                <a href="https://stitch.withgoogle.com/docs/design-md/specification/" target="_blank">DESIGN.md 规范</a>
                自行编写。
              </div>
              <button
                class="btn btn-secondary"
                :disabled="!customSpecName.trim() || !customSpecContent.trim()"
                @click="saveCustomSpec"
              >保存设计规范</button>
            </div>
          </div>
        </div>

        <div class="dialog-actions">
          <button class="btn btn-secondary" @click="showCreateForm = false">取消</button>
          <button class="btn btn-primary" :disabled="creating" @click="handleCreate">{{ creating ? '创建中...' : '开始设计' }}</button>
        </div>
      </div>
    </div>

    <Teleport to="body">
      <SettingsPanel
        v-if="showSettingsPanel"
        @close="showSettingsPanel = false"
      />
    </Teleport>
  </div>
</template>

<style scoped>
.home { position: relative; min-height: 100vh; background: transparent; padding-top: 44px; display: flex; flex-direction: column; align-items: center; overflow: hidden; }
.titlebar { position: fixed; top: 0; left: 0; right: 0; z-index: var(--z-toolbar); display: flex; align-items: center; height: 44px; background: rgba(22, 33, 62, 0.75); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); border-bottom: 1px solid var(--border-subtle); --wails-draggable: drag; }
.titlebar-left { display: flex; align-items: center; padding-left: 16px; --wails-draggable: no-drag; }
.titlebar-app-name { font-size: var(--font-base); font-weight: 600; color: var(--color-primary-light); }
.titlebar-center { flex: 1; }
.titlebar-right { --wails-draggable: no-drag; display: flex; align-items: center; gap: 8px; }
.titlebar-btn { border: none; background: none; color: var(--text-secondary); cursor: pointer; padding: 4px; border-radius: 4px; display: flex; align-items: center; justify-content: center; }
.titlebar-btn:hover { color: var(--text-primary); background: var(--bg-hover); }
.titlebar-btn.active { color: #34d399; }
.home > *:not(.titlebar):not(.dialog-overlay) { position: relative; z-index: 1; }
.home-header { text-align: center; margin-bottom: 48px; padding-top: 48px; }
.app-logo { width: 72px; height: 72px; border-radius: var(--radius-xl); margin-bottom: 16px; }
.app-title { font-size: var(--font-3xl); font-weight: 800; color: var(--text-primary); letter-spacing: -1px; margin: 0; }
.app-subtitle { font-size: 16px; color: var(--text-muted); margin-top: 8px; }
.project-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 16px; width: 100%; max-width: 960px; padding: 0 40px 40px; }
.project-card { background: var(--bg-overlay); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); padding: 20px; cursor: pointer; transition: all var(--transition-normal); display: flex; flex-direction: column; gap: 10px; position: relative; }
.project-card:hover { background: var(--bg-hover); border-color: var(--color-primary-light); transform: translateY(-2px); }
.card-header { display: flex; align-items: flex-start; justify-content: space-between; }
.card-icon { width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 18px; font-weight: 700; flex-shrink: 0; }
.card-edit-btn { flex-shrink: 0; background: none; border: none; color: var(--text-muted); cursor: pointer; padding: 4px; border-radius: 6px; opacity: 0; transition: opacity var(--transition-fast), background var(--transition-fast), color var(--transition-fast); }
.project-card:hover .card-edit-btn { opacity: 1; }
.card-edit-btn:hover { background: rgba(255,255,255,0.1); color: var(--color-primary-light); }
.card-name { font-size: var(--font-lg); font-weight: 600; color: var(--text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.card-footer { display: flex; align-items: center; justify-content: space-between; margin-top: auto; }
.card-tag-type { font-size: var(--font-xs); color: var(--text-muted); background: rgba(129,140,248,0.1); border: 1px solid rgba(129,140,248,0.2); border-radius: 6px; padding: 2px 8px; white-space: nowrap; }
.card-colors { display: flex; align-items: center; gap: 4px; }
.color-dot { width: 14px; height: 14px; border-radius: 50%; border: 1.5px solid rgba(255,255,255,0.15); flex-shrink: 0; }
.create-card { justify-content: center; flex-direction: column; border-style: dashed; min-height: 90px; }
.create-icon { font-size: 32px; color: var(--color-primary-light); line-height: 1; }
.create-text { font-size: var(--font-md); color: var(--color-primary-light); margin-top: 8px; }
.loading { color: var(--text-muted); margin-top: 24px; font-size: var(--font-md); }
.dialog { background: var(--bg-elevated); border-radius: var(--radius-xl); padding: 32px; width: 480px; max-width: 90vw; box-shadow: var(--shadow-lg); border: 1px solid var(--border-default); }
.dialog-title { font-size: var(--font-2xl); font-weight: 600; margin: 0 0 24px; color: var(--text-primary); }
.option-grid { display: flex; flex-wrap: wrap; gap: 8px; }
.option-card { flex: 1 1 0; min-width: 100px; padding: 12px 8px; border: 2px solid var(--border-default); border-radius: 10px; background: var(--bg-surface); cursor: pointer; text-align: center; transition: all var(--transition-normal); color: var(--text-primary); }
.option-card:hover { border-color: #3a3a5c; }
.option-card.active { border-color: var(--color-primary-light); background: #1e1b4b; }
.option-card.small { flex: 0 1 auto; min-width: 80px; padding: 8px 12px; white-space: nowrap; }
.option-label { font-size: var(--font-md); font-weight: 500; }
.option-hint { font-size: var(--font-sm); color: var(--text-muted); margin-top: 4px; }
.dialog-actions { display: flex; justify-content: space-between; align-items: center; margin-top: 24px;padding: 16px 0px; }
.dialog-actions-left { display: flex; align-items: center; gap: 10px; }
.dialog-actions-right { display: flex; align-items: center; gap: 10px; }
.btn-danger { background: #ef4444; color: #fff; border: none; }
.btn-danger:hover { background: #dc2626; }
.btn-danger:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-danger-ghost { background: none; color: #ef4444; border: 1px solid transparent; }
.btn-danger-ghost:hover { background: rgba(239,68,68,0.1); }
.delete-confirm-text { font-size: var(--font-sm); color: var(--text-muted); }
.btn-link { background: none; color: var(--color-primary-light); padding: 4px 8px; font-size: var(--font-base); }
.btn-link:hover { background: none; color: #a5b4fc; }
.dialog-create { width: 560px; max-height: 85vh; overflow-y: auto; }
.custom-spec-area { margin-top: 12px; padding: 12px; background: var(--bg-surface); border-radius: var(--radius-md); border: 1px solid var(--border-default); }
.saved-specs-list { margin-bottom: 12px; }
.saved-specs-title { font-size: var(--font-sm); color: var(--text-secondary); margin-bottom: 6px; }
.saved-spec-item { display: flex; align-items: center; justify-content: space-between; padding: 8px 10px; border-radius: var(--radius-sm); cursor: pointer; transition: all var(--transition-fast); margin-bottom: 4px; background: var(--bg-elevated); border: 1px solid transparent; }
.saved-spec-item:hover { border-color: #3a3a5c; }
.saved-spec-item.active { border-color: var(--color-primary-light); background: #1e1b4b; }
.saved-spec-name { font-size: var(--font-base); color: var(--text-primary); }
.delete-spec-btn { background: none; border: none; color: var(--text-muted); cursor: pointer; font-size: var(--font-sm); padding: 2px 4px; border-radius: 4px; }
.delete-spec-btn:hover { color: var(--color-danger-hover); background: rgba(239,68,68,0.1); }
.import-actions { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.custom-import-form { margin-top: 12px; display: flex; flex-direction: column; gap: 10px; }
.import-hint { font-size: var(--font-sm); color: var(--text-muted); line-height: 1.5; }
.import-hint a { color: var(--color-primary-light); text-decoration: none; }
.import-hint a:hover { text-decoration: underline; }
.textarea { resize: vertical; font-family: 'Cascadia Code', 'Fira Code', monospace; font-size: var(--font-base); line-height: 1.5; }
.label-hint { font-weight: 400; color: var(--text-muted); font-size: var(--font-sm); }
.direction-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 10px; }
.direction-card { background: var(--bg-surface); border: 2px solid var(--border-default); border-radius: 12px; padding: 12px 14px; cursor: pointer; text-align: left; transition: all var(--transition-normal); color: var(--text-primary); display: flex; flex-direction: column; gap: 6px; min-height: 130px; }
.direction-card:hover { border-color: var(--dir-primary, var(--color-primary-light)); transform: translateY(-1px); }
.direction-card.active { border-color: var(--dir-primary, var(--color-primary-light)); background: linear-gradient(135deg, var(--bg-elevated), color-mix(in srgb, var(--dir-primary, var(--color-primary-light)) 10%, var(--bg-elevated))); }
.direction-emoji { font-size: 24px; line-height: 1; }
.direction-name { font-size: var(--font-md); font-weight: 600; color: var(--text-primary); }
.direction-desc { font-size: var(--font-xs); color: var(--text-muted); line-height: 1.4; flex: 1; }
.direction-swatches { display: flex; gap: 4px; margin-top: 4px; }
.swatch { width: 16px; height: 16px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.18); }
</style>
