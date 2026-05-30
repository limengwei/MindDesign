# 开发计划

> MindDesign — AI 对话式 UI 设计工具

---

## 目录

1. [项目概述](#1-项目概述)
2. [开发路线总图](#2-开发路线总图)
3. [Phase 1 — 基础渲染 (2 天)](#3-phase-1--基础渲染-2-天)
4. [Phase 2 — 完善交互 (3 天)](#4-phase-2--完善交互-3-天)
5. [Phase 3 — 导出与打磨 (3 天)](#5-phase-3--导出与打磨-3-天)
6. [Phase 3.5 — 保存/加载系统 (2 天)](#6-phase-35--保存加载系统-2-天)
7. [项目文件结构](#7-项目文件结构)
8. [验收标准总表](#8-验收标准总表)

---

## 1. 项目概述

### 产品定位

类似 Google Stitch 的纯对话式 UI 设计探索工具。用户通过自然语言描述界面需求，AI 生成 LeaferJS 渲染的矢量设计稿。**用户不能在画布上直接拖拽编辑**，所有修改通过对话完成。

### 技术栈

| 层 | 技术 | 版本 |
|----|------|------|
| 桌面壳 | Wails v3 | latest |
| 前端框架 | Vue 3 + Vite | latest |
| Canvas 引擎 | leafer-ui | ^2.1.2 |
| 图标 | Material Symbols SVG (3881 个) | — |
| 状态管理 | Pinia (Vue 3 内置) | — |
| LLM | 待接入 (GPT-4 / DeepSeek / Claude) | — |
| 后端语言 | Go (Wails 绑定) | 1.21+ |

### 当前状态

| 项目 | 状态 |
|------|------|
| Wails 项目骨架 | ✅ 已创建 |
| SVG 图标 | ✅ 已放入 `frontend/public/icons/` (3881 个, 3.6MB) |
| 图标搜索索引 | ✅ 已生成 `icon-index.json` (760KB) |
| 生成索引脚本 | ✅ `scripts/generate-icon-index.ts` |
| 方案文档 | ✅ 3 份 `docs/*.md` |
| LeaferJS | ❌ 待安装 |
| 前端组件 | ❌ 待开发 |

---

## 2. 开发路线总图

```
Phase 1 (2天) ──→ Phase 2 (3天) ──→ Phase 3 (3天) ──→ Phase 3.5 (2天)
  基础渲染           完善交互           导出打磨            保存系统

总工期: ~10 天
```

### 依赖关系

```
Phase 1 ─── 必须先完成，没有画布什么都做不了
  │
  ├──→ Phase 2 ─── 依赖 Phase 1 的画布，可串行
  │
  ├──→ Phase 3 ─── 依赖 Phase 1 + 2 的元素树
  │
  └──→ Phase 3.5 ─ 独立，可与 Phase 2/3 并行开发
```

---

## 3. Phase 1 — 基础渲染 (2 天)

**目标**：画布能显示 LeaferJS 元素，对话面板能发送消息并渲染简单的 UI。

### Day 1 — 环境搭建 + 画布组件

| 任务 | 文件 | 说明 |
|------|------|------|
| 安装 leafer-ui | `npm --prefix frontend install leafer-ui` | Canvas 渲染引擎 |
| 创建 CanvasWrapper.vue | `frontend/src/canvas/CanvasWrapper.vue` | Vue 组件，初始化 Leafer 实例，占满右侧区域 |
| 实现 renderer.ts | `frontend/src/canvas/renderer.ts` | JSON → LeaferJS 元素映射（Rect / Text / Frame / Icon） |
| 实现 icon-loader.ts | `frontend/src/icons/icon-loader.ts` | SVG → data URL → Leafer Image |
| 创建项目选择对话框 | `frontend/src/components/ProjectDialog.vue` | 页面类型 + 配色方案 + 项目名称 |

**renderer.ts 核心接口：**

```typescript
type ElementType = 'Rect' | 'Text' | 'Frame' | 'Icon' | 'Ellipse' | 'Image' | 'Group' | 'Box'

function buildElement(node: ElementTree): ILeaf | Promise<ILeaf>
function applyTree(newTree: ElementTree): void          // diff + 更新
function renderStreaming(chunk: Partial<ElementTree>): void  // Streaming 逐元素
```

**验收标准：**
- [ ] 画布能正常显示（Leafer 实例初始化无报错）
- [ ] 手动传入一个 JSON 元素树能渲染出 Rect + Text + Frame + Icon
- [ ] Icon 从 SVG data URL 加载并正确显示颜色/大小

### Day 2 — 对话面板 + LLM 集成

| 任务 | 文件 | 说明 |
|------|------|------|
| 创建 ChatPanel.vue | `frontend/src/components/ChatPanel.vue` | 消息列表 + 输入框 + 发送按钮 |
| 创建 chatStore | `frontend/src/stores/chatStore.ts` | 对话历史管理 |
| 创建 canvasStore | `frontend/src/stores/canvasStore.ts` | 元素树 + 页面类型 + 配色方案 |
| 集成 LLM 基础调用 | `frontend/src/ai/chat.ts` | 调用外部 API（先写死 API Key 或 mock） |
| 组装 App.vue | `frontend/src/App.vue` | 左侧 ChatPanel + 右侧 CanvasWrapper 布局 |
| 调通全链路 | — | 输入 → LLM 返回 → 渲染到画布 |

**验收标准：**
- [ ] 左侧对话面板可输入文字并发送
- [ ] LLM 返回 JSON 元素树（可用 mock 数据先测）
- [ ] 元素树流式渲染到 LeaferJS 画布
- [ ] 端到端：输入 "画一个红色按钮" → 画布显示红色圆角矩形

### Phase 1 产出物

```
frontend/src/
├── ai/
│   └── chat.ts                      ← LLM 调用 (mock 或真实)
├── canvas/
│   ├── CanvasWrapper.vue            ← 画布组件
│   └── renderer.ts                  ← JSON → LeaferJS 元素
├── icons/
│   └── icon-loader.ts               ← SVG → Image 加载器
├── stores/
│   ├── chatStore.ts                 ← 对话历史
│   └── canvasStore.ts               ← 元素树 + 页面配置
├── components/
│   ├── ChatPanel.vue                ← 对话面板
│   └── ProjectDialog.vue            ← 新建项目对话框
├── App.vue                          ← 主布局
└── main.ts                          ← 入口
```

---

## 4. Phase 2 — 完善交互 (3 天)

**目标**：完整元素类型支持，Flex 自动布局生效，AI 图标搜索可用，能连续多轮对话修改。

### Day 3 — 完整元素类型

| 任务 | 文件 | 说明 |
|------|------|------|
| 补充 Ellipse / Image / Path / Line / Group / Box | `renderer.ts` | 完成所有 8 种元素类型映射 |
| 支持 opacity / visible / locked 等通用属性 | `renderer.ts` | 元素可见性、透明度、锁定 |
| Flex 自动布局全面支持 | `renderer.ts` | direction, gap, padding, align, wrap |
| 元素树类型定义完善 | `frontend/src/types/element.ts` | 完整的 TypeScript 类型 |

**验收标准：**
- [ ] 全部 8 种元素类型可正常渲染
- [ ] Frame 的 Flex 布局正确：column/row、gap、padding、align
- [ ] 多层级嵌套 Frame 布局正常

### Day 4 — Streaming + 增量更新

| 任务 | 文件 | 说明 |
|------|------|------|
| Streaming 流式渲染 | `renderer.ts` renderStreaming() | AI 边输出边渲染，逐步"长出"元素 |
| 增量 diff 更新 | `renderer.ts` applyTree() | 只更新变动元素（不闪烁） |
| Canvas 视口管理 | `CanvasWrapper.vue` | 自适应窗口大小 |

**验收标准：**
- [ ] Streaming 模式下元素逐个出现，不闪烁
- [ ] 修改后重新渲染不重建整个画布（diff 生效）
- [ ] 窗口缩放时画布自适应

### Day 5 — AI 图标搜索 + 多轮对话

| 任务 | 文件 | 说明 |
|------|------|------|
| 注册 search_icons Function Calling | `frontend/src/ai/tools.ts` | AI 通过此工具搜索图标 |
| 实现 search_icons 执行函数 | `frontend/src/ai/tools.ts` | 从 icon-index.json 匹配关键词 |
| 多轮上下文管理 | `chatStore.ts` | 对话历史 + 元素树一起传给 LLM |
| 系统提示词生成器 | `frontend/src/prompts/system.ts` | 组装 page-type + icons + colors + examples |
| Prompt 模块 | `prompts/page-types.ts` | 页面类型约束 |
| Prompt 模块 | `prompts/icons.ts` | 图标使用规范 |
| Prompt 模块 | `prompts/colors.ts` | 配色方案约束 |
| Prompt 模块 | `prompts/examples.ts` | Few-shot 示例 |

**验收标准：**
- [ ] AI 能通过 search_icons 找到正确图标
- [ ] 多轮对话：「设计一个登录页」「把按钮改成紫色」→ 按钮颜色变了
- [ ] 系统提示词正确注入页面类型和配色约束

---

## 5. Phase 3 — 导出与打磨 (3 天)

**目标**：可导出自包含 HTML，用户体验打磨。

### Day 6 — HTML 导出引擎

| 任务 | 文件 | 说明 |
|------|------|------|
| 实现 toHTML.ts | `frontend/src/export/toHTML.ts` | 元素树 → 自包含 HTML（inline CSS + 内联 SVG） |
| 图标内联导出 | `toHTML.ts` | SVG 转为内联 `<svg>`，fill 替换为指定颜色 |
| 导出预览/下载 | `frontend/src/components/ExportDialog.vue` | 预览 HTML + Blob 下载 |

**导出 HTML 产物：**
```html
<!DOCTYPE html>
<html>
<head>
  <style>*{margin:0;padding:0;box-sizing:border-box}</style>
</head>
<body>
  <div style="display:flex;flex-direction:column;width:375px;...">
    <svg width="24" height="24" viewBox="0 0 24 24" fill="#333">...</svg>
    <span style="font-size:16px;color:#333">搜索</span>
  </div>
</body>
</html>
```

**验收标准：**
- [ ] 导出的 HTML 文件在浏览器双击可打开
- [ ] 图标和样式正确，零网络请求
- [ ] 包含 Material Symbols 内联 SVG，不含字体加载

### Day 7 — 功能打磨

| 任务 | 说明 |
|------|------|
| SVG/PNG 截图导出 | 用 `canvas.toDataURL()` 或 LeaferJS 的 export 方法 |
| SVG 缓存优化 | 预加载 AI 正在生成的图标，减少等待 |
| 画布模板 | 手机壳(375x812) / 桌面(1440x900) / 平板(1024x768) 框线 |
| 导出预览对话框 | 代码预览 + 复制 + 下载 |

**验收标准：**
- [ ] 截图导出清晰
- [ ] 模板框线正确
- [ ] 导出预览显示完整 HTML

### Day 8 — "回到上一步"

| 任务 | 说明 |
|------|------|
| 对话回退 | 点击上一条 AI 回复 → 回退到该版本的元素树 |
| "撤销"按钮 | 工具栏增加撤销按钮 |
| 体验优化 | 加载状态、错误提示、空状态 |

**验收标准：**
- [ ] 点击任意历史消息可回退到对应版本
- [ ] 完整闭环：设计 → 修改 3 轮 → 回退 → 导出 HTML

---

## 6. Phase 3.5 — 保存/加载系统 (2 天)

**目标**：项目可保存为 `.mind` 文件，下次打开可继续对话编辑。

可与 Phase 2/3 并行开发（保存系统不依赖渲染完善度）。

### Day 9 — Go 后端

| 任务 | 文件 | 说明 |
|------|------|------|
| 实现 ProjectService | `project_service.go` | Save / SaveAs / Open / AutoSave / GetAutoSave / ClearAutoSave |
| 最近项目管理 | `project_service.go` | GetRecentProjects / AddRecentProject |
| 注册到 Wails | `main.go` | 追加到 Services 列表 |

**Go 方法签名：**

```go
type ProjectService struct{}
func (s *ProjectService) SaveAs(data string) (string, error)
func (s *ProjectService) Save(data string) (string, error)
func (s *ProjectService) Open() (string, error)
func (s *ProjectService) AutoSave(data string) error
func (s *ProjectService) GetAutoSave() (string, error)
func (s *ProjectService) ClearAutoSave() error
func (s *ProjectService) GetRecentProjects() ([]RecentProject, error)
func (s *ProjectService) AddRecentProject(path, name string) error
```

### Day 10 — 前端集成

| 任务 | 文件 | 说明 |
|------|------|------|
| 快捷键 | `frontend/src/stores/keyboard.ts` | Ctrl+S / Ctrl+O / Ctrl+N / Ctrl+Shift+S |
| 自动保存 | `frontend/src/stores/autoSave.ts` | 5 秒防抖 watch canvas.currentTree + chat.messages |
| 启动恢复 | `App.vue` | 检测 autosave.mind → 询问恢复 |
| 最近项目 UI | `Toolbar.vue` | 下拉列表显示最近 10 个项目 |
| 工具栏按钮 | `Toolbar.vue` | 新建 / 打开 / 保存 / 另存为 |

**.mind 文件格式：**

```json
{
  "formatVersion": 1,
  "meta": { "name": "项目名", "createdAt": "...", "updatedAt": "..." },
  "canvas": { "tree": ElementTree, "viewport": { "zoom": 1, "scrollX": 0, "scrollY": 0 } },
  "chat": [{ "role": "user", "content": "...", "timestamp": "..." }]
}
```

**验收标准：**
- [ ] Ctrl+S 弹出原生保存对话框（首次）或无声覆盖（已有路径）
- [ ] Ctrl+O 弹出原生打开对话框，恢复元素树 + 对话历史
- [ ] 应用崩溃后重新打开，提示恢复自动保存
- [ ] 最近项目列表显示最近 10 个文件
- [ ] 完整流程：新建 → 对话 → 保存 → 关闭 → 打开 → 继续对话

---

## 7. 项目文件结构

### 最终完整结构

```
MindDesign/
├── main.go                            ← Wails 入口
├── greetservice.go                    ← 现有示例服务
├── project_service.go                 ← Phase 3.5: 项目保存/加载
│
├── frontend/
│   ├── package.json
│   ├── vite.config.js
│   ├── index.html
│   │
│   ├── public/
│   │   ├── icons/                     ← 3881 个 .svg 图标
│   │   │   ├── search.svg
│   │   │   ├── home.svg
│   │   │   ├── icon-index.json        ← 搜索索引
│   │   │   └── ...
│   │   └── fonts/                     ← (可选) 正文字体
│   │
│   └── src/
│       ├── main.ts                    ← 入口
│       ├── App.vue                    ← 主布局 (左侧聊天 + 右侧画布)
│       │
│       ├── ai/
│       │   ├── chat.ts                ← LLM 调用 + Streaming
│       │   └── tools.ts               ← Function Calling 工具 (search_icons)
│       │
│       ├── canvas/
│       │   ├── CanvasWrapper.vue      ← 画布 Vue 组件
│       │   └── renderer.ts            ← JSON → LeaferJS 元素映射
│       │
│       ├── icons/
│       │   └── icon-loader.ts         ← SVG → data URL → Image
│       │
│       ├── prompts/
│       │   ├── system.ts              ← 主系统提示词组装器
│       │   ├── page-types.ts          ← app / web / desktop 约束
│       │   ├── icons.ts               ← 图标使用规范
│       │   ├── colors.ts              ← 配色方案约束
│       │   └── examples.ts            ← few-shot 示例
│       │
│       ├── export/
│       │   └── toHTML.ts              ← 元素树 → 自包含 HTML
│       │
│       ├── stores/
│       │   ├── chatStore.ts           ← 对话历史
│       │   ├── canvasStore.ts         ← 元素树 + 页面配置
│       │   └── autoSave.ts            ← 自动保存逻辑
│       │
│       ├── components/
│       │   ├── ChatPanel.vue          ← 对话面板
│       │   ├── Toolbar.vue            ← 顶部工具栏
│       │   ├── ProjectDialog.vue      ← 新建项目对话框
│       │   └── ExportDialog.vue       ← 导出预览对话框
│       │
│       └── types/
│           ├── element.ts             ← 元素树类型定义
│           └── project.ts             ← 项目文件类型定义
│
└── scripts/
    └── generate-icon-index.ts         ← 生成 icon-index.json

docs/
├── ai-ui-design-tool-architecture.md
├── project-save-strategy.md
└── page-creation-prompt-system.md
```

---

## 8. 验收标准总表

### 总体要求

| 要求 | 验收条件 |
|------|---------|
| 画布只读 | 用户不能拖拽/编辑画布上的元素 |
| 纯对话修改 | 所有 UI 变更通过对话完成 |
| 零网络依赖 | 国内用户开箱即用，无 Google Fonts CDN 调用 |
| 图标可搜索 | AI 通过 search_icons 找到任意图标 |
| HTML 导出 | 单文件，双击打开，零外部依赖 |
| 项目保存 | .mind 文件可保存/打开/继续对话 |
| 自动保存 | 崩溃后提示恢复 |

### Phase 验收

| Phase | 验收 | 耗时 |
|-------|------|------|
| Phase 1 | 画布显示 + 对话 → 渲染 "红色按钮+搜索图标" | 2 天 |
| Phase 2 | 多轮修改 "登录页→改紫色→加图标" + Streaming + Flex | 3 天 |
| Phase 3 | 导出 HTML 可双击打开 | 3 天 |
| Phase 3.5 | 保存 .mind → 关闭 → 打开 → 继续对话 | 2 天 |

### 技术债务（可选优化）

- [ ] icon-index.json 压缩（当前 760KB 未压缩，生产环境可压缩到 ~200KB）
- [ ] 图标初次加载时显示占位符
- [ ] 切面/主题切换动画
- [ ] 撤销/重做（对话回退之外）

---

> **文档版本**: v1.0  
> **总工期**: ~10 天  
> **关联文档**: [ai-ui-design-tool-architecture.md](./ai-ui-design-tool-architecture.md) · [project-save-strategy.md](./project-save-strategy.md) · [page-creation-prompt-system.md](./page-creation-prompt-system.md)