import { useCanvasStore } from './canvasStore'
import { useChatStore } from './chatStore'
import type { ProjectMeta, ProjectCards, ProjectSessions } from '../types/project'
import { writeProjectFiles, createProject } from '../services/projectBridge'

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

export function buildCardsData(): ProjectCards {
  const canvas = useCanvasStore()
  return { cards: canvas.cards }
}

export function buildSessionsData(): ProjectSessions {
  const chat = useChatStore()
  return { sessions: chat.sessions }
}

export async function saveProject(): Promise<void> {
  const canvas = useCanvasStore()

  const projectJson = JSON.stringify(buildProjectMeta(), null, 2)
  const sessionsJson = JSON.stringify(buildSessionsData(), null, 2)
  const cardsJson = JSON.stringify(buildCardsData(), null, 2)

  if (canvas.currentFilePath) {
    try {
      await writeProjectFiles(canvas.currentFilePath, projectJson, sessionsJson, cardsJson)
    } catch (e) {
      console.error('Save failed:', e)
    }
  } else {
    try {
      const path = await createProject(canvas.projectName, projectJson, sessionsJson, cardsJson)
      canvas.setCurrentFilePath(path)
    } catch (e) {
      console.error('Create project failed:', e)
    }
  }
}
