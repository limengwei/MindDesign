const STORAGE_KEY = 'minddesign:autosave'

type ProjectServiceType = typeof import('../../bindings/changeme/projectservice')

let ProjectService: ProjectServiceType | null = null
let loadingPromise: Promise<void> | null = null

async function loadWailsService() {
  try {
    ProjectService = await import('../../bindings/changeme/projectservice')
  } catch {
    ProjectService = null
  }
}

loadingPromise = loadWailsService()

async function ensureLoaded() {
  if (loadingPromise) {
    await loadingPromise
    loadingPromise = null
  }
}

export async function autoSave(data: string): Promise<void> {
  await ensureLoaded()
  if (ProjectService) {
    await ProjectService.AutoSave(data)
  } else {
    localStorage.setItem(STORAGE_KEY, data)
  }
}

export async function getAutoSave(): Promise<string | null> {
  await ensureLoaded()
  if (ProjectService) {
    return await ProjectService.GetAutoSave()
  }
  return localStorage.getItem(STORAGE_KEY)
}

export async function clearAutoSave(): Promise<void> {
  await ensureLoaded()
  if (ProjectService) {
    await ProjectService.ClearAutoSave()
  } else {
    localStorage.removeItem(STORAGE_KEY)
  }
}

export async function writeFile(path: string, data: string): Promise<void> {
  await ensureLoaded()
  if (ProjectService) {
    await ProjectService.WriteFile(path, data)
  } else {
    localStorage.setItem(STORAGE_KEY + ':file:' + path, data)
  }
}

export async function readFile(path: string): Promise<string> {
  await ensureLoaded()
  if (ProjectService) {
    return await ProjectService.ReadFile(path)
  }
  const data = localStorage.getItem(STORAGE_KEY + ':file:' + path)
  if (!data) throw new Error('文件不存在')
  return data
}

export async function getCurrentPath(): Promise<string> {
  await ensureLoaded()
  if (ProjectService) {
    return await ProjectService.GetCurrentPath()
  }
  return ''
}

export async function setCurrentPath(path: string): Promise<void> {
  await ensureLoaded()
  if (ProjectService) {
    await ProjectService.SetCurrentPath(path)
  }
}

export async function showSaveDialog(defaultName?: string): Promise<string> {
  await ensureLoaded()
  try {
    const { Dialogs } = await import('@wailsio/runtime')
    const path = await Dialogs.SaveFile({
      Title: '保存项目',
      DefaultFilename: defaultName || '未命名项目.mind',
      Filters: [
        { DisplayName: 'MindDesign 项目', Pattern: '*.mind' },
        { DisplayName: '所有文件', Pattern: '*.*' },
      ],
    })
    return path || ''
  } catch {
    return ''
  }
}

export async function showOpenDialog(): Promise<string> {
  await ensureLoaded()
  try {
    const { Dialogs } = await import('@wailsio/runtime')
    const path = await Dialogs.OpenFile({
      Title: '打开项目',
      Filters: [
        { DisplayName: 'MindDesign 项目', Pattern: '*.mind' },
        { DisplayName: '所有文件', Pattern: '*.*' },
      ],
    })
    return (path as string) || ''
  } catch {
    return ''
  }
}

export interface RecentProject {
  path: string
  name: string
  updatedAt: string
}

export async function getRecentProjects(): Promise<RecentProject[]> {
  await ensureLoaded()
  if (ProjectService) {
    const json = await ProjectService.GetRecentProjects()
    return JSON.parse(json) as RecentProject[]
  }
  return []
}

export async function clearCurrentPath(): Promise<void> {
  await ensureLoaded()
  if (ProjectService) {
    await ProjectService.ClearCurrentPath()
  }
}
