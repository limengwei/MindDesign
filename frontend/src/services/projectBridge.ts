const STORAGE_KEY = 'minddesign:autosave'

// @ts-ignore
type ProjectServiceType = typeof import('../../bindings/changeme/projectservice')

let ProjectService: ProjectServiceType | null = null
let loadingPromise: Promise<void> | null = null

async function loadWailsService() {
  try {
    // @ts-ignore
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

export async function writeProjectFiles(path: string, projectJson: string, sessionsJson: string, cardsJson: string): Promise<void> {
  await ensureLoaded()
  if (ProjectService) {
    await (ProjectService as any).WriteProjectFiles(path, projectJson, sessionsJson, cardsJson)
  } else {
    localStorage.setItem(STORAGE_KEY + ':project:' + path, projectJson)
    localStorage.setItem(STORAGE_KEY + ':sessions:' + path, sessionsJson)
    localStorage.setItem(STORAGE_KEY + ':cards:' + path, cardsJson)
  }
}

export interface ProjectBundle {
  project: any
  sessions: any[] | null
  cards: any[] | null
}

export async function readProject(path: string): Promise<ProjectBundle> {
  await ensureLoaded()
  if (ProjectService) {
    const json = await (ProjectService as any).ReadProject(path)
    return JSON.parse(json) as ProjectBundle
  }
  const projectStr = localStorage.getItem(STORAGE_KEY + ':project:' + path)
  const sessionsStr = localStorage.getItem(STORAGE_KEY + ':sessions:' + path)
  const cardsStr = localStorage.getItem(STORAGE_KEY + ':cards:' + path)
  return {
    project: projectStr ? JSON.parse(projectStr) : null,
    sessions: sessionsStr ? JSON.parse(sessionsStr) : null,
    cards: cardsStr ? JSON.parse(cardsStr) : null,
  }
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

export async function clearCurrentPath(): Promise<void> {
  await ensureLoaded()
  if (ProjectService) {
    await ProjectService.ClearCurrentPath()
  }
}

export async function createProject(name: string, projectJson: string, sessionsJson: string, cardsJson: string): Promise<string> {
  await ensureLoaded()
  if (ProjectService) {
    return await (ProjectService as any).CreateProject(name, projectJson, sessionsJson, cardsJson)
  }
  const key = STORAGE_KEY + ':project:' + name
  localStorage.setItem(key, projectJson)
  localStorage.setItem(STORAGE_KEY + ':sessions:' + name, sessionsJson)
  localStorage.setItem(STORAGE_KEY + ':cards:' + name, cardsJson)
  return key
}

export async function updateProjectMeta(
  path: string,
  name: string,
  pageType: string,
  designSpecId: string,
  colorScheme: string
): Promise<void> {
  await ensureLoaded()
  if (ProjectService) {
    await (ProjectService as any).UpdateProjectMeta(path, name, pageType, designSpecId, colorScheme)
  }
}

export async function saveCardScreenshots(path: string, screenshots: Record<string, string>): Promise<void> {
  await ensureLoaded()
  if (ProjectService) {
    await (ProjectService as any).SaveCardScreenshots(path, JSON.stringify(screenshots))
  }
}

export async function loadCardScreenshots(path: string, cardIds: string[]): Promise<Record<string, string>> {
  await ensureLoaded()
  if (ProjectService) {
    const json = await (ProjectService as any).LoadCardScreenshots(path, JSON.stringify(cardIds))
    return JSON.parse(json) as Record<string, string>
  }
  return {}
}

export async function cleanupCardScreenshots(path: string, cardIds: string[]): Promise<void> {
  await ensureLoaded()
  if (ProjectService) {
    await (ProjectService as any).CleanupCardScreenshots(path, JSON.stringify(cardIds))
  }
}

export async function showOpenDialog(): Promise<string> {
  await ensureLoaded()
  try {
    const { Dialogs } = await import('@wailsio/runtime')
    const path = await Dialogs.OpenFile({
      Title: '打开项目',
      Filters: [
        { DisplayName: 'MindDesign 项目', Pattern: '*.project.json' },
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
  pageType: string
  designSpecId: string
  colorScheme: string
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
