const STORAGE_KEY = 'minddesign:autosave'
const SCREENSHOT_STORAGE_PREFIX = 'minddesign:autosave:screenshots:'

/** 设计稿快照缓存（设计稿预览图）
 *  三层结构：
 *  1. 内存 Map<path, Map<id, dataUrl>>：同会话内最快命中
 *  2. Wails 模式：PNG 文件持久化（appDir/screenshots/{basename}/*.png）
 *  3. 浏览器模式：localStorage 持久化（key = SCREENSHOT_STORAGE_PREFIX + path）
 *  写：内存 + 持久层同步更新
 *  读：内存 → 持久层（仅取请求的 id 集合），避免打开项目时重新生成截图
 */
const screenshotMemoryCache: Map<string, Map<string, string>> = new Map()

function getMemoryScreenshots(path: string): Map<string, string> {
  let m = screenshotMemoryCache.get(path)
  if (!m) {
    m = new Map<string, string>()
    screenshotMemoryCache.set(path, m)
  }
  return m
}

function loadMemoryScreenshots(path: string, cardIds: string[]): Record<string, string> {
  const mem = screenshotMemoryCache.get(path)
  if (!mem) return {}
  const out: Record<string, string> = {}
  for (const id of cardIds) {
    const v = mem.get(id)
    if (v) out[id] = v
  }
  return out
}

function loadLocalStorageScreenshots(path: string): Record<string, string> {
  try {
    const raw = localStorage.getItem(SCREENSHOT_STORAGE_PREFIX + path)
    if (!raw) return {}
    const obj = JSON.parse(raw) as Record<string, string>
    return obj && typeof obj === 'object' ? obj : {}
  } catch {
    return {}
  }
}

function saveLocalStorageScreenshots(path: string, screenshots: Record<string, string>) {
  try {
    localStorage.setItem(SCREENSHOT_STORAGE_PREFIX + path, JSON.stringify(screenshots))
  } catch (e) {
    // localStorage 容量可能不足（截图 base64 很大），失败时仅记录，不再抛出
    console.warn('[projectBridge] failed to persist screenshots to localStorage:', e)
  }
}

function cleanupLocalStorageScreenshots(path: string, keepIds: string[]) {
  try {
    const keep = new Set(keepIds)
    const current = loadLocalStorageScreenshots(path)
    const next: Record<string, string> = {}
    for (const id of Object.keys(current)) {
      if (keep.has(id)) next[id] = current[id]
    }
    localStorage.setItem(SCREENSHOT_STORAGE_PREFIX + path, JSON.stringify(next))
  } catch (e) {
    console.warn('[projectBridge] failed to cleanup localStorage screenshots:', e)
  }
}

// @ts-ignore
type ProjectServiceType = typeof import('../../bindings/changeme/projectservice')
// @ts-ignore
type ImageProxyServiceType = typeof import('../../bindings/changeme/imageproxyservice')
// @ts-ignore
type MCPServiceType = typeof import('../../bindings/changeme/mcpservice')
// @ts-ignore
type UpdateServiceType = typeof import('../../bindings/changeme/updateservice')

let ProjectService: ProjectServiceType | null = null
let ImageProxyService: ImageProxyServiceType | null = null
let MCPService: MCPServiceType | null = null
let UpdateService: UpdateServiceType | null = null
let loadingPromise: Promise<void> | null = null

async function loadWailsService() {
  try {
    // @ts-ignore
    ProjectService = await import('../../bindings/changeme/projectservice')
  } catch {
    ProjectService = null
  }
  try {
    // @ts-ignore
    ImageProxyService = await import('../../bindings/changeme/imageproxyservice')
  } catch {
    ImageProxyService = null
  }
  try {
    // @ts-ignore
    MCPService = await import('../../bindings/changeme/mcpservice')
  } catch {
    MCPService = null
  }
  try {
    // @ts-ignore
    UpdateService = await import('../../bindings/changeme/updateservice')
  } catch {
    UpdateService = null
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
  designSpecId: string
): Promise<void> {
  await ensureLoaded()
  if (ProjectService) {
    await (ProjectService as any).UpdateProjectMeta(path, name, pageType, designSpecId)
  }
}

export async function saveCardScreenshots(path: string, screenshots: Record<string, string>): Promise<void> {
  await ensureLoaded()
  // 1) 同步写入内存缓存（同会话内随时可命中）
  const mem = getMemoryScreenshots(path)
  for (const [id, dataUrl] of Object.entries(screenshots)) {
    if (dataUrl) mem.set(id, dataUrl)
  }
  // 2) 持久化
  if (ProjectService) {
    await (ProjectService as any).SaveCardScreenshots(path, JSON.stringify(screenshots))
  } else {
    // 浏览器模式：把全部当前截图（旧的 + 本次新写）合并写回 localStorage
    const merged = loadLocalStorageScreenshots(path)
    for (const [id, dataUrl] of Object.entries(screenshots)) {
      if (dataUrl) merged[id] = dataUrl
    }
    saveLocalStorageScreenshots(path, merged)
  }
}

export async function loadCardScreenshots(path: string, cardIds: string[]): Promise<Record<string, string>> {
  await ensureLoaded()
  // 1) 内存缓存优先（命中即返回，避免序列化与磁盘/存储 IO）
  const result: Record<string, string> = loadMemoryScreenshots(path, cardIds)
  const missing: string[] = []
  for (const id of cardIds) {
    if (!result[id]) missing.push(id)
  }
  if (missing.length === 0) return result

  // 2) 回源到持久层
  let persisted: Record<string, string> = {}
  if (ProjectService) {
    try {
      const json = await (ProjectService as any).LoadCardScreenshots(path, JSON.stringify(missing))
      persisted = JSON.parse(json) as Record<string, string>
    } catch {
      persisted = {}
    }
  } else {
    const all = loadLocalStorageScreenshots(path)
    for (const id of missing) {
      if (all[id]) persisted[id] = all[id]
    }
  }

  // 3) 把持久层结果回填到内存（后续同会话访问直接命中）
  if (Object.keys(persisted).length > 0) {
    const mem = getMemoryScreenshots(path)
    for (const [id, dataUrl] of Object.entries(persisted)) {
      if (dataUrl) mem.set(id, dataUrl)
    }
  }

  return { ...result, ...persisted }
}

export async function cleanupCardScreenshots(path: string, cardIds: string[]): Promise<void> {
  await ensureLoaded()
  // 1) 同步清理内存缓存
  const mem = screenshotMemoryCache.get(path)
  if (mem) {
    const keep = new Set(cardIds)
    for (const id of Array.from(mem.keys())) {
      if (!keep.has(id)) mem.delete(id)
    }
  }
  // 2) 清理持久层
  if (ProjectService) {
    await (ProjectService as any).CleanupCardScreenshots(path, JSON.stringify(cardIds))
  } else {
    cleanupLocalStorageScreenshots(path, cardIds)
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

// ========== MCP Service ==========

export async function startMCP(port: number): Promise<void> {
  await ensureLoaded()
  if (MCPService) {
    await (MCPService as any).StartMCP(port)
  }
}

export async function stopMCP(): Promise<void> {
  await ensureLoaded()
  if (MCPService) {
    await (MCPService as any).StopMCP()
  }
}

export async function isMCPRunning(): Promise<boolean> {
  await ensureLoaded()
  if (MCPService) {
    return await (MCPService as any).IsMCPRunning()
  }
  return false
}

export async function getMCPPort(): Promise<number> {
  await ensureLoaded()
  if (MCPService) {
    return await (MCPService as any).GetMCPPort()
  }
  return 0
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

export async function fetchProxiedImage(url: string): Promise<string | null> {
  await ensureLoaded()
  if (ImageProxyService) {
    try {
      return await ImageProxyService.FetchImage(url)
    } catch {
      return null
    }
  }
  return null
}

export async function saveExportFile(path: string, content: string): Promise<void> {
  await ensureLoaded()
  if (ProjectService) {
    await (ProjectService as any).SaveExportFile(path, content)
  }
}

export async function saveExportFileBinary(path: string, base64Content: string): Promise<void> {
  await ensureLoaded()
  if (ProjectService) {
    await (ProjectService as any).SaveExportFileBinary(path, base64Content)
  }
}

export async function showSaveDialog(title: string, defaultFilename: string, filters: Array<{ DisplayName: string; Pattern: string }>): Promise<string> {
  await ensureLoaded()
  try {
    const { Dialogs } = await import('@wailsio/runtime')
    const path = await Dialogs.SaveFile({
      Title: title,
      Filename: defaultFilename,
      Filters: filters,
    })
    return (path as string) || ''
  } catch {
    return ''
  }
}

export async function deleteProject(path: string): Promise<void> {
  await ensureLoaded()
  if (ProjectService) {
    await (ProjectService as any).DeleteProject(path)
  }
}

export interface UpdateResult {
  hasUpdate: boolean
  latestVersion: string
  releaseNotes: string
  downloadURL: string
  fileSize: number
  currentVersion: string
}

export async function checkUpdate(): Promise<UpdateResult | null> {
  await ensureLoaded()
  try {
    const json = await UpdateService!.CheckUpdate()
    return JSON.parse(json)
  } catch {
    return null
  }
}

export async function downloadUpdate(
  downloadURL: string,
): Promise<string> {
  await ensureLoaded()
  // @ts-ignore - DownloadUpdate 第二个参数是 wails 自动注入的 progress 回调
  return await UpdateService!.DownloadUpdate(downloadURL)
}

export async function installUpdate(installerPath: string): Promise<void> {
  await ensureLoaded()
  await UpdateService!.InstallUpdate(installerPath)
}
