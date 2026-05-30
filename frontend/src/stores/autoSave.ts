import { watch } from 'vue'
import { useCanvasStore } from './canvasStore'
import { useChatStore } from './chatStore'
import type { ProjectFile } from '../types/project'
import * as ProjectService from '../../bindings/changeme/projectservice'

export function setupAutoSave() {
  const canvas = useCanvasStore()
  const chat = useChatStore()
  let timer: ReturnType<typeof setTimeout> | null = null

  async function doAutoSave() {
    if (!canvas.currentTree && chat.messages.length === 0) return

    const data: ProjectFile = {
      formatVersion: 1,
      meta: {
        name: canvas.projectName,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        appVersion: '1.0.0',
      },
      canvas: {
        tree: canvas.currentTree,
        viewport: { zoom: 1, scrollX: 0, scrollY: 0 },
      },
      chat: chat.messages.map((m) => ({
        role: m.role,
        content: m.content,
        timestamp: m.timestamp,
      })),
    }

    try {
      await ProjectService.AutoSave(JSON.stringify(data))
    } catch (e) {
      console.error('AutoSave failed:', e)
    }
  }

  function schedule() {
    if (timer) clearTimeout(timer)
    timer = setTimeout(doAutoSave, 5000)
  }

  watch(() => canvas.currentTree, schedule, { deep: true })
  watch(() => chat.messages, schedule, { deep: true })
}

export async function checkAutoSave(): Promise<ProjectFile | null> {
  try {
    const data = await ProjectService.GetAutoSave()
    if (!data) return null
    return JSON.parse(data) as ProjectFile
  } catch {
    return null
  }
}

export async function clearAutoSave() {
  try {
    await ProjectService.ClearAutoSave()
  } catch (e) {
    console.error('ClearAutoSave failed:', e)
  }
}
