import { watch } from 'vue'
import { useCanvasStore } from './canvasStore'
import { useChatStore } from './chatStore'
import type { ProjectFile } from '../types/project'
import { writeFile } from '../services/projectBridge'

export function setupAutoSave() {
  const canvas = useCanvasStore()
  const chat = useChatStore()
  let timer: ReturnType<typeof setTimeout> | null = null

  function buildData(): ProjectFile {
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

  async function doAutoSave() {
    if (!canvas.cards.length && chat.sessions.length === 0) return

    const data = buildData()
    const json = JSON.stringify(data, null, 2)

    if (canvas.currentFilePath) {
      try {
        await writeFile(canvas.currentFilePath, json)
      } catch (e) {
        console.error('AutoSave failed:', e)
      }
    } else {
      const path = await chooseSavePath()
      if (path) {
        canvas.setCurrentFilePath(path)
        try {
          await writeFile(path, json)
        } catch (e) {
          console.error('AutoSave failed:', e)
        }
      }
    }
  }

  async function chooseSavePath(): Promise<string | null> {
    try {
      const { Dialogs } = await import('@wailsio/runtime')
      const path = await Dialogs.SaveFile({
        Title: '保存项目',
        Filters: [
          { DisplayName: 'MindDesign 项目', Pattern: '*.mind' },
        ],
      } as any)
      return (path as string) || null
    } catch {
      return null
    }
  }

  function schedule() {
    if (timer) clearTimeout(timer)
    timer = setTimeout(doAutoSave, 3000)
  }

  watch(() => canvas.cards, schedule, { deep: true })
  watch(() => chat.sessions, schedule, { deep: true })
}
