<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getRecentProjects, type RecentProject } from '../services/projectBridge'

const router = useRouter()
const projects = ref<RecentProject[]>([])
const loading = ref(true)
const showCreateForm = ref(false)
const projectName = ref('')
const pageType = ref('app')
const colorScheme = ref('auto')

const pageTypes = [
  { value: 'app', label: '📱 移动 App', width: '375px' },
  { value: 'web', label: '🌐 网页', width: '1440px' },
  { value: 'desktop', label: '🖥 桌面应用', width: '1280px' },
]

const colorSchemes = [
  { value: 'auto', label: '🎨 自动' },
  { value: 'light', label: '☀️ 浅色' },
  { value: 'dark', label: '🌙 深色' },
  { value: 'brand', label: '🏷️ 品牌' },
]

async function loadProjects() {
  loading.value = true
  try {
    projects.value = await getRecentProjects()
  } catch {
    projects.value = []
  }
  loading.value = false
}

onMounted(loadProjects)

function openProject(project: RecentProject) {
  router.push({ name: 'design', query: { path: project.path } })
}

function handleCreate() {
  router.push({
    name: 'design',
    query: {
      new: '1',
      name: projectName.value || '未命名项目',
      pageType: pageType.value,
      colorScheme: colorScheme.value,
    },
  })
}
</script>

<template>
  <div class="home">
    <div class="home-header">
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
        <div class="card-icon">📄</div>
        <div class="card-info">
          <div class="card-name">{{ project.name }}</div>
          <div class="card-path">{{ project.path }}</div>
        </div>
      </div>

      <div class="project-card create-card" @click="showCreateForm = true">
        <div class="create-icon">＋</div>
        <div class="create-text">创建新项目</div>
      </div>
    </div>

    <div v-if="loading" class="loading">加载中...</div>

    <div v-if="showCreateForm" class="dialog-overlay" @click.self="showCreateForm = false">
      <div class="dialog">
        <h2 class="dialog-title">新建项目</h2>

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
          <label>配色方案</label>
          <div class="option-grid">
            <button
              v-for="cs in colorSchemes"
              :key="cs.value"
              :class="['option-card small', { active: colorScheme === cs.value }]"
              @click="colorScheme = cs.value"
            >
              {{ cs.label }}
            </button>
          </div>
        </div>

        <div class="dialog-actions">
          <button class="btn btn-secondary" @click="showCreateForm = false">取消</button>
          <button class="btn btn-primary" @click="handleCreate">开始设计</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.home {
  min-height: 100vh;
  background: #0f0f23;
  padding: 80px 40px 40px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.home-header {
  text-align: center;
  margin-bottom: 48px;
}

.app-title {
  font-size: 48px;
  font-weight: 800;
  color: #e5e7eb;
  letter-spacing: -1px;
  margin: 0;
}

.app-subtitle {
  font-size: 16px;
  color: #6b7280;
  margin-top: 8px;
}

.project-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 16px;
  width: 100%;
  max-width: 960px;
}

.project-card {
  background: rgba(30, 30, 54, 0.85);
  border: 1px solid rgba(42, 42, 74, 0.6);
  border-radius: 12px;
  padding: 20px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 14px;
}

.project-card:hover {
  background: rgba(42, 42, 74, 0.6);
  border-color: #818cf8;
  transform: translateY(-2px);
}

.card-icon {
  font-size: 28px;
  flex-shrink: 0;
}

.card-info {
  overflow: hidden;
}

.card-name {
  font-size: 15px;
  font-weight: 600;
  color: #e5e7eb;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-path {
  font-size: 11px;
  color: #6b7280;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-top: 4px;
}

.create-card {
  justify-content: center;
  flex-direction: column;
  border-style: dashed;
  min-height: 90px;
}

.create-icon {
  font-size: 32px;
  color: #818cf8;
  line-height: 1;
}

.create-text {
  font-size: 14px;
  color: #818cf8;
  margin-top: 8px;
}

.loading {
  color: #6b7280;
  margin-top: 24px;
  font-size: 14px;
}

.dialog-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.dialog {
  background: #1e1e36;
  border-radius: 16px;
  padding: 32px;
  width: 480px;
  max-width: 90vw;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
  border: 1px solid #2a2a4a;
}

.dialog-title {
  font-size: 20px;
  font-weight: 600;
  margin: 0 0 24px;
  color: #e5e7eb;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: #9ca3af;
  margin-bottom: 8px;
}

.input {
  width: 100%;
  padding: 10px 14px;
  border: 1px solid #2a2a4a;
  border-radius: 8px;
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s;
  box-sizing: border-box;
  background: #16213e;
  color: #e5e7eb;
}

.input::placeholder { color: #4b5563; }
.input:focus { border-color: #818cf8; }

.option-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.option-card {
  flex: 1 1 0;
  min-width: 100px;
  padding: 12px 8px;
  border: 2px solid #2a2a4a;
  border-radius: 10px;
  background: #16213e;
  cursor: pointer;
  text-align: center;
  transition: all 0.2s;
  color: #e5e7eb;
}

.option-card:hover { border-color: #3a3a5c; }
.option-card.active { border-color: #818cf8; background: #1e1b4b; }

.option-card.small {
  flex: 0 1 auto;
  min-width: 80px;
  padding: 8px 12px;
  white-space: nowrap;
}

.option-label { font-size: 14px; font-weight: 500; }
.option-hint { font-size: 12px; color: #6b7280; margin-top: 4px; }

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 24px;
}

.btn {
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  border: none;
  transition: all 0.2s;
}

.btn-secondary { background: #2a2a4a; color: #9ca3af; }
.btn-secondary:hover { background: #3a3a5c; }
.btn-primary { background: #4f46e5; color: #fff; }
.btn-primary:hover { background: #6366f1; }
</style>
