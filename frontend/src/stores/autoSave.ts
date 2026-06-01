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
  for (const card of canvas.cards) {
    if (card.screenshot && card.screenshot.startsWith('data:')) {
      screenshots[card.id] = card.screenshot
    }
  }
  return screenshots
}

export async function saveProject(): Promise<void> {
  const canvas = useCanvasStore()

  const projectJson = JSON.stringify(buildProjectMeta(), null, 2)
  const sessionsJson = JSON.stringify(buildSessionsData(), null, 2)
  const cardsJson = JSON.stringify(buildCardsData(true), null, 2)

  const screenshots = extractScreenshots()
  const cardIds = canvas.cards.map(c => c.id)

  if (canvas.currentFilePath) {
    try {
      await writeProjectFiles(canvas.currentFilePath, projectJson, sessionsJson, cardsJson)
      if (Object.keys(screenshots).length > 0) {
        await saveCardScreenshots(canvas.currentFilePath, screenshots)
      }
      await cleanupCardScreenshots(canvas.currentFilePath, cardIds)
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
