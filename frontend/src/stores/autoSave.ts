import { watch } from 'vue'
import { useCanvasStore } from './canvasStore'
import { useChatStore } from './chatStore'
import type { ProjectFile } from '../types/project'
import { autoSave, getAutoSave, clearAutoSave as doClear } from '../services/projectBridge'

export function setupAutoSave() {
  const canvas = useCanvasStore()
  const chat = useChatStore()
  let timer: ReturnType<typeof setTimeout> | null = null

  async function doAutoSave() {
    if (!canvas.cards.length && chat.messages.length === 0) return

    const data: ProjectFile = {
      formatVersion: 1,
      meta: {
        name: canvas.projectName,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        appVersion: '1.0.0',
      },
      canvas: {
        cards: canvas.cards,
        viewport: canvas.viewport,
      },
      chat: chat.messages.map((m) => ({
        role: m.role,
        content: m.content,
        timestamp: m.timestamp,
      })),
    }

    try {
      await autoSave(JSON.stringify(data))
    } catch (e) {
      console.error('AutoSave failed:', e)
    }
  }

  function schedule() {
    if (timer) clearTimeout(timer)
    timer = setTimeout(doAutoSave, 5000)
  }

  watch(() => canvas.cards, schedule, { deep: true })
  watch(() => chat.messages, schedule, { deep: true })
}

export async function checkAutoSave(): Promise<ProjectFile | null> {
  try {
    const data = await getAutoSave()
    if (!data) return null
    return JSON.parse(data) as ProjectFile
  } catch {
    return null
  }
}

export async function clearAutoSave() {
  try {
    await doClear()
  } catch (e) {
    console.error('ClearAutoSave failed:', e)
  }
}
