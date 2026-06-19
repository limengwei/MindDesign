import { useCanvasStore } from './canvasStore'
import { useChatStore } from './chatStore'
import type { ProjectMeta, ProjectCards, ProjectSessions } from '../types/project'
import { writeProjectFiles, createProject, saveCardScreenshots, cleanupCardScreenshots } from '../services/projectBridge'
export function buildProjectMeta(): ProjectMeta {
  const canvas = useCanvasStore()

  return {
    formatVersion: 3,
    meta: {
      name: canvas.projectName,
      createdAt: canvas.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      appVersion: '1.0.0',
    },
    canvas: {
      pageType: canvas.pageType,
      colorScheme: canvas.colorScheme,
      designSpecId: canvas.designSpecId,
      customDesignContent: canvas.customDesignContent,
      viewport: canvas.viewport,
    },
    productBlueprint: canvas.productBlueprint,
  }
}

export function buildCardsData(stripScreenshots = false): ProjectCards {
  const canvas = useCanvasStore()
  const cards = stripScreenshots
    ? canvas.cards.map(c => ({ ...c, screenshot: '' }))
    : canvas.cards
  return { cards }
}

export function buildSessionsData(): ProjectSessions {
  const chat = useChatStore()
  return { sessions: chat.sessions }
}

function extractScreenshots(): Record<string, string> {
  const canvas = useCanvasStore()
  const screenshots: Record<string, string> = {}
  // 优先从 pages 取（Phase 3 主源），回退到 cards（向前兼容）
  const items = canvas.pages.length > 0 ? canvas.pages : canvas.cards
  for (const item of items) {
    if (item.screenshot && item.screenshot.startsWith('data:')) {
      screenshots[item.id] = item.screenshot
    }
  }
  return screenshots
}

export async function saveProject(): Promise<void> {
  const canvas = useCanvasStore()

  // Phase 4 · Task 16：自动保存时调用 pushVersion（去重：若最近版本 html 完全相同则跳过）
  for (const p of canvas.pages) {
    if (!p.html) continue
    // 去重：与最近一版 html 完全相同则跳过
    const last = p.versions[p.versions.length - 1]
    if (last && last.html === p.html) continue
    canvas.pushVersion(p.id, p.html, p.screenshot)
  }

  const projectJson = JSON.stringify(buildProjectMeta(), null, 2)
  const sessionsJson = JSON.stringify(buildSessionsData(), null, 2)
  const cardsJson = JSON.stringify(buildCardsData(true), null, 2)

  const screenshots = extractScreenshots()
  // Phase 3：item id 来自 pages 或 cards
  const itemIds = canvas.pages.length > 0
    ? canvas.pages.map(p => p.id)
    : canvas.cards.map(c => c.id)

  if (canvas.currentFilePath) {
    try {
      await writeProjectFiles(canvas.currentFilePath, projectJson, sessionsJson, cardsJson)
      if (Object.keys(screenshots).length > 0) {
        await saveCardScreenshots(canvas.currentFilePath, screenshots)
      }
      await cleanupCardScreenshots(canvas.currentFilePath, itemIds)
    } catch (e) {
      console.error('Save failed:', e)
    }
  } else {
    try {
      const path = await createProject(canvas.projectName, projectJson, sessionsJson, cardsJson)
      canvas.setCurrentFilePath(path)
      if (Object.keys(screenshots).length > 0) {
        await saveCardScreenshots(path, screenshots)
      }
    } catch (e) {
      console.error('Create project failed:', e)
    }
  }
}

/**
 * 立即触发一次保存（Phase 5 · Task 19：Cmd/Ctrl+S 手动保存入口）。
 * 当前实现与 `saveProject` 等价；保留独立导出便于在 UI 层表达"手动 vs 自动"。
 */
export function saveNow(): Promise<void> {
  return saveProject()
}
