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
