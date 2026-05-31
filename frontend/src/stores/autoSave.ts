import { useCanvasStore } from './canvasStore'
import { useChatStore } from './chatStore'
import type { ProjectFile } from '../types/project'
import { writeFile, createProject } from '../services/projectBridge'

export function buildProjectData(): ProjectFile {
  const canvas = useCanvasStore()
  const chat = useChatStore()

  return {
    formatVersion: 2,
    meta: {
      name: canvas.projectName,
      createdAt: canvas.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      appVersion: '1.0.0',
    },
    canvas: {
      cards: canvas.cards,
      pageType: canvas.pageType,
      colorScheme: canvas.colorScheme,
      viewport: canvas.viewport,
    },
    sessions: chat.sessions,
  }
}

export async function saveProject(): Promise<void> {
  const canvas = useCanvasStore()
  const data = buildProjectData()
  const json = JSON.stringify(data, null, 2)

  if (canvas.currentFilePath) {
    try {
      await writeFile(canvas.currentFilePath, json)
    } catch (e) {
      console.error('Save failed:', e)
    }
  } else {
    try {
      const path = await createProject(canvas.projectName, json)
      canvas.setCurrentFilePath(path)
    } catch (e) {
      console.error('Create project failed:', e)
    }
  }
}
