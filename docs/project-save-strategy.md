# 项目与页面保存方案

> Wails v3 桌面端，`.mind` 单文件 JSON 格式，Go 后端原生文件对话框 + 自动保存

---

## 目录

1. [设计目标](#1-设计目标)
2. [文件格式](#2-文件格式)
3. [Go 后端 — ProjectService](#3-go-后端--projectservice)
4. [前端交互](#4-前端交互)
5. [自动保存机制](#5-自动保存机制)
6. [快捷键](#6-快捷键)
7. [导出 vs 保存](#7-导出-vs-保存)
8. [版本兼容](#8-版本兼容)
9. [实施路线](#9-实施路线)

---

## 1. 设计目标

| 目标 | 说明 |
|------|------|
| **自包含** | 一个 `.mind` 文件 = 整个项目。包含元素树 + 对话历史 + 元数据 |
| **可继续编辑** | 打开文件后恢复完整的对话上下文，AI 知道之前的修改历史 |
| **零网络** | 全部本地文件 I/O，不走云端 |
| **原生体验** | 使用 Wails 原生文件对话框（Save/Open） |
| **崩溃安全** | 5 秒防抖自动保存到应用数据目录，启动时检测恢复 |
| **快速迭代** | Ctrl+S 快捷键 + 最近项目列表 |

---

## 2. 文件格式

### 2.1 结构定义 (.mind)

```typescript
// frontend/src/types/project.ts

interface ProjectFile {

  /** 格式版本号，用于向后兼容 */
  formatVersion: 1

  /** 项目元数据 */
  meta: {
    name: string          // 项目名称
    createdAt: string     // ISO datetime
    updatedAt: string     // ISO datetime
    appVersion: string    // "1.0.0"
  }

  /** 画布状态 */
  canvas: {
    tree: ElementTree     // 当前完整的元素树
    viewport: {           // 视口位置（恢复时保持缩放/滚动）
      zoom: number
      scrollX: number
      scrollY: number
    }
  }

  /** 完整对话历史 — 加载后可继续上一次对话 */
  chat: {
    role: 'user' | 'assistant'
    content: string
    timestamp: string
  }[]

  /** 上次导出的 HTML 缓存（可选） */
  export?: {
    lastHTML: string
  }
}
```

### 2.2 为什么保存对话历史

所有修改通过对话驱动。如果不保存历史，加载项目后用户说「把这个蓝色按钮改成紫色」，AI 不知道"这个"指哪个按钮。保留完整上下文，用户能无缝继续：

```
保存前:                           加载后:
用户: 做一个登录页                 用户: 把登录按钮改成紫色
AI: [生成了登录页]                  AI: [知道"登录按钮"是哪个]
用户: 把登录按钮改成紫色            
AI: [修改按钮颜色]                  
  ↓ 保存 .mind                      
  ↓ 关闭应用                        
  ↓ 重新打开 .mind                  
```

---

## 3. Go 后端 — ProjectService

### 3.1 完整实现

```go
// project_service.go
package main

import (
  "encoding/json"
  "os"
  "path/filepath"
  "time"

  "github.com/wailsapp/wails/v3/pkg/application"
)

type ProjectService struct {
  currentPath string // 当前文件路径（用于无对话框保存）
  appDir      string // 应用数据目录（用于自动保存）
}

func NewProjectService() *ProjectService {
  dir, _ := os.UserConfigDir()
  appDir := filepath.Join(dir, "MindDesign")
  os.MkdirAll(appDir, 0755)
  return &ProjectService{appDir: appDir}
}
```

**暴露给前端的方法：**

| 方法 | 触发场景 | 行为 |
|------|---------|------|
| `SaveAs(data string) (string, error)` | 首次保存 / 另存为 | 弹出原生保存对话框 → 写文件 → 记录路径 |
| `Save(data string) (string, error)` | Ctrl+S | 已有路径直接覆盖 → 无对话框 |
| `Open() (string, error)` | 打开文件 | 弹出原生打开对话框 → 读取并返回 JSON |
| `AutoSave(data string) error` | 自动保存 | 写到 appDir/autosave.mind，无对话框 |
| `GetAutoSave() (string, error)` | 启动检测 | 读取自动保存文件 |
| `ClearAutoSave() error` | 正常关闭 | 删除自动保存文件 |
| `GetRecentProjects() (RecentProject[], error)` | 最近项目列表 | 读取 appDir/recent.json |
| `AddRecentProject(path, name) error` | 保存后 | 更新最近项目列表 |

### 3.2 注册到 Wails

```go
// main.go
func main() {
  app := application.New(application.Options{
    Name: "MindDesign",
    Services: []application.Service{
      application.NewService(&GreetService{}),
      application.NewService(NewProjectService()), // ← 新增
    },
    // ...
  })
  // ...
}
```

### 3.3 前端绑定调用

```typescript
// 自动生成的绑定
import { ProjectService } from '../../bindings/changeme'

// 保存（另存为）
const path = await ProjectService.SaveAs(jsonData)

// 保存（覆盖当前）
const path = await ProjectService.Save(jsonData)

// 打开
const jsonStr = await ProjectService.Open()

// 自动保存
await ProjectService.AutoSave(jsonData)
```

---

## 4. 前端交互

### 4.1 界面布局

```
┌────────────────────────────────────────────────────────────┐
│  MindDesign — 我的医疗App.mind                         [_]□×│
│  ┌──────┬──────┬──────┬──────┬──────┬──────────────┐      │
│  │ 新建  │ 打开  │ 保存  │ 另存为 │ 导出 ▼ │ 最近项目 ▼ │      │
│  │ Ctrl+N│Ctrl+O│Ctrl+S│C+S+S│        │            │      │
│  └──────┴──────┴──────┴──────┴──────┴──────────────┘      │
│                                                           │
│  ┌──────────────────┐  ┌─────────────────────────────┐    │
│  │  对话面板          │  │  画布                       │    │
│  │                   │  │                             │    │
│  │  用户: 医疗App    │  │  [🏥] 在线问诊              │    │
│  │  AI: 已完成       │  │  [📊] 健康数据              │    │
│  │  用户: 改蓝色     │  │  [❤️] 我的收藏              │    │
│  │                   │  │                             │    │
│  └──────────────────┘  └─────────────────────────────┘    │
└────────────────────────────────────────────────────────────┘
```

### 4.2 操作流程

**新建项目：**
1. 点击「新建」或 Ctrl+N
2. 如果有未保存修改 → 提示 "当前项目未保存，是否保存？"
3. 清空画布 + 重置对话
4. 状态栏显示 "未命名项目"

**打开项目：**
1. 点击「打开」或 Ctrl+O
2. 如果有未保存修改 → 提示保存
3. 原生文件对话框 → 选 `.mind` 文件
4. Go 读取 → 返回 JSON
5. 前端恢复：`canvasStore.applyTree(project.canvas.tree)` + `chatStore.messages = project.chat`
6. 状态栏显示文件名

**保存：**
1. 首次保存 / 点击「另存为」 → SaveAs → 弹出原生对话框
2. 后续点击「保存」/ Ctrl+S → Save → 无声覆盖
3. 保存后更新状态栏文件名 + 最近项目列表

**最近项目：**
1. 点击下拉 → 显示最近 10 个 `.mind` 文件路径
2. 点击任一 → 直接 Open 该路径（跳过文件选择器）

---

## 5. 自动保存机制

### 5.1 前端自动保存

```typescript
// src/stores/autoSave.ts
import { watch } from 'vue'
import { ProjectService } from '../../bindings/changeme'

export function setupAutoSave(canvas: any, chat: any) {
  let timer: ReturnType<typeof setTimeout>

  function schedule() {
    clearTimeout(timer)
    timer = setTimeout(async () => {
      const data = JSON.stringify({
        formatVersion: 1,
        meta: { name: 'autosave', updatedAt: new Date().toISOString() },
        canvas: { tree: canvas.currentTree, viewport: getViewport() },
        chat: chat.messages,
      })
      await ProjectService.AutoSave(data)
    }, 5000) // 防抖 5 秒
  }

  // 监听变化
  watch(() => canvas.currentTree, schedule, { deep: true })
  watch(() => chat.messages, schedule, { deep: true })
}
```

### 5.2 启动时恢复

```typescript
// App.vue
onMounted(async () => {
  setupAutoSave(canvasStore, chatStore)

  try {
    const data = await ProjectService.GetAutoSave()
    if (data) {
      const project = JSON.parse(data)
      // 用 Wails 原生对话框询问
      const choice = await application.MessageDialog({
        type: 'question',
        title: '恢复自动保存',
        message: `检测到上次未正常关闭的项目 (${project.meta.updatedAt})，是否恢复？`,
        buttons: ['恢复', '丢弃'],
      })
      if (choice === '恢复') {
        canvasStore.applyTree(project.canvas.tree)
        chatStore.messages = project.chat
      } else {
        await ProjectService.ClearAutoSave()
      }
    }
  } catch {
    // 无自动保存，正常启动
  }
})
```

### 5.3 自动保存生命周期

```
应用运行 ──→ 每有修改 → 5秒防抖 → AutoSave()
                                      │
                              autosave.mind 更新
                                      │
应用正常关闭 ──→ ClearAutoSave()       │
                                      │
应用崩溃 ──→ autosave.mind 残留       │
                 ↓                    │
        下次启动 → 检测到残留 → 询问是否恢复
```

---

## 6. 快捷键

| 快捷键 | 操作 | 说明 |
|--------|------|------|
| `Ctrl+N` | 新建项目 | 如有未保存则提示 |
| `Ctrl+O` | 打开项目 | 原生文件对话框 |
| `Ctrl+S` | 保存 | 已有路径无声覆盖，无路径弹出 SaveAs |
| `Ctrl+Shift+S` | 另存为 | 强制弹出原生保存对话框 |
| `Ctrl+Shift+E` | 导出 HTML | 直接导出 |

```typescript
// 前端注册
onMounted(() => {
  window.addEventListener('keydown', (e) => {
    const mod = e.ctrlKey || e.metaKey
    if (mod && e.key === 's' && e.shiftKey) {
      e.preventDefault(); saveAs()
    } else if (mod && e.key === 's') {
      e.preventDefault(); save()
    } else if (mod && e.key === 'o') {
      e.preventDefault(); open()
    } else if (mod && e.key === 'n') {
      e.preventDefault(); newProject()
    } else if (mod && e.key === 'e' && e.shiftKey) {
      e.preventDefault(); exportHTML()
    }
  })
})
```

---

## 7. 导出 vs 保存

| 维度 | 保存 (.mind) | 导出 (.html / .json) |
|------|-------------|---------------------|
| **目的** | 继续编辑 | 分享 / 预览 / 二次开发 |
| **包含** | 元素树 + 对话历史 + 元数据 | 仅设计稿 |
| **可恢复编辑** | ✅ 是 | ❌ 否 |
| **文件格式** | JSON | HTML / JSON |
| **存储位置** | 用户自选路径 | 用户自选路径 |
| **触发方式** | Ctrl+S / 按钮 | 导出按钮 → 下拉选格式 |

```
项目生命周期:

  [新建] → 对话设计 → [保存 .mind] → [第二天打开 .mind]
                                       → 继续对话 → [另存为 v2.mind]
                                                     → [导出 HTML] 给客户
                                                     → [导出 JSON] 给开发者
```

---

## 8. 版本兼容

```go
// Go 后端读取时先检查版本
func (s *ProjectService) Open() (string, error) {
  bytes, err := os.ReadFile(path)
  if err != nil { return "", err }

  var header struct {
    FormatVersion int `json:"formatVersion"`
  }
  json.Unmarshal(bytes, &header)

  switch header.FormatVersion {
  case 0:
    // v0: 老格式，做迁移
    return migrateV0(bytes)
  case 1:
    // 当前版本，直接返回
    return string(bytes), nil
  default:
    return "", fmt.Errorf("不支持的版本: %d", header.FormatVersion)
  }
}
```

未来 v2 可能的扩展：

| 版本 | 新增字段 | 说明 |
|------|---------|------|
| v1 | — | 基础：单页面 + 对话历史 |
| v2 | `canvas.pages[]` | 多页面支持 |
| v2 | `canvas.components[]` | 组件库/设计系统 |
| v2 | `meta.tags` | 项目标签 |
| v2 | `meta.thumbnail` | 缩略图（data URL） |

---

## 9. 实施路线

### Phase 3.5 — 保存/加载系统 (2 天)

```
第1天 — Go 后端 + 文件格式
├── 实现 ProjectService (Save / SaveAs / Open)
├── 实现 AutoSave / GetAutoSave / ClearAutoSave
├── 实现 GetRecentProjects / AddRecentProject
├── 注册到 Wails 服务绑定
└── 测试: Go 端写入/读取文件

第2天 — 前端集成
├── 定义 ProjectFile 类型 + 序列化/反序列化
├── 快捷键 (Ctrl+S / Ctrl+O / Ctrl+N / Ctrl+S+S)
├── 自动保存 (5 秒防抖 watch)
├── 启动时检测自动保存 + 恢复对话框
├── 最近项目列表 UI 组件
├── 工具栏按钮 (新建/打开/保存/另存为)
├── 关闭前检测未保存
└── 验证: 新建 → 对话 → 保存 → 关闭 → 打开 → 继续对话 → 导出
```

### 与主路线的关系

```
Phase 1 ──→ Phase 2 ──→ Phase 3 ──→ Phase 3.5 (保存)
  基础渲染      完善交互      导出打磨      保存系统

保存系统独立，可并行开发，也可在 Phase 3 之后追加。
```

---

> **文档版本**: v1.0  
> **关联文档**: [ai-ui-design-tool-architecture.md](./ai-ui-design-tool-architecture.md)