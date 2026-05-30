# AI 对话式 UI 设计工具 — 方案文档

> 基于 LeaferJS + Vue3 + Wails 构建，Stitch 纯对话模式，全量 Material Symbols SVG 图标本地内置

---

## 目录

1. [概述](#1-概述)
2. [架构总览](#2-架构总览)
3. [Canvas 渲染层 — LeaferJS](#3-canvas-渲染层--leaferjs)
4. [AI 对话层](#4-ai-对话层)
5. [图标系统 — Material Symbols SVG](#5-图标系统--material-symbols-svg)
6. [正文字体策略](#6-正文字体策略)
7. [HTML 导出](#7-html-导出)
8. [状态管理](#8-状态管理)
9. [数据流](#9-数据流)
10. [核心代码骨架](#10-核心代码骨架)
11. [实施路线](#11-实施路线)
12. [资源清单](#12-资源清单)
13. [附录：常用图标同义词表](#13-附录常用图标同义词表)

---

## 1. 概述

### 产品定位

类似 **Google Stitch** 的纯对话式 UI 设计探索工具。用户通过自然语言描述界面需求，AI 生成 LeaferJS 渲染的矢量设计稿。**用户不能在画布上直接拖拽编辑**，所有修改都通过对话完成。

### 核心约束

| 约束 | 说明 |
|------|------|
| 画布交互 | 完全只读，无 draggable、无 editor 插件 |
| 修改方式 | 纯对话驱动，AI 每次返回全量元素树，前端 diff 更新 |
| 图标 | Material Symbols SVG 全量本地内置 (3881 个图标) |
| 图标颜色/大小 | SVG `fill` 替换 + `width/height` 控制 |
| 正文字体 | 系统字体回退 (PingFang SC / Microsoft YaHei / sans-serif) |
| 网络依赖 | **零** — 所有资源本地打包，国内用户开箱即用 |
| 导出 | 自包含 HTML（内联 SVG + 纯 CSS 布局），零外部依赖 |

---

## 2. 架构总览

```
┌──────────────────────────────────────────────────────────────────┐
│                        Vue3 UI Shell                             │
│                                                                  │
│  ┌──────────────────────┐    ┌────────────────────────────────┐  │
│  │     对话面板 (左)      │    │     LeaferJS 画布 (只读)         │  │
│  │                      │    │                                │  │
│  │ 用户输入描述           │    │  ┌─ 模板容器 ──────────────┐   │  │
│  │ 历史消息列表           │    │  │  [Icon] 在线问诊        │   │  │
│  │ Streaming 流式响应    │    │  │  [Icon] 健康数据        │   │  │
│  │                      │    │  │  [Icon] 我的收藏        │   │  │
│  │                      │    │  └────────────────────────┘   │  │
│  │  [导出 HTML]          │    │                                │  │
│  └──────────┬───────────┘    └────────────────────────────────┘  │
│             │                        ▲                           │
│  ┌──────────┴────────────────────────┴───────────────────────┐  │
│  │                 AI Orchestrator                            │  │
│  │                                                           │  │
│  │  1. 接收用户自然语言                                        │  │
│  │  2. Function Calling: search_icons(查询) → 选择图标        │  │
│  │  3. 生成结构化元素树 JSON (含 Icon 类型)                    │  │
│  │  4. 前端解析 → diff 更新 → LeaferJS 渲染                    │  │
│  └───────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

### 三层职责

| 层级 | 技术 | 职责 |
|------|------|------|
| UI Shell | Vue3 + Pinia | 对话面板、画布容器、导出按钮 |
| AI Orchestrator | Function Calling + 元素树 JSON | 自然语言 → 结构化描述 |
| Canvas 渲染 | `leafer-ui` (70KB) | JSON → LeaferJS 元素 → Canvas 渲染 |

---

## 3. Canvas 渲染层 — LeaferJS

### 选用理由

| 对比项 | LeaferJS | Fabric.js | Konva.js |
|--------|----------|-----------|----------|
| 100万矩形创建 | **1.28秒** | 41.33秒 | 15.93秒 |
| 包大小 (gzip) | **70KB** | ~200KB | ~180KB |
| Flex 自动布局 | ✅ 内置 | ❌ 无 | ❌ 无 |
| 零依赖 | ✅ | ❌ | ❌ |
| MIT 开源 | ✅ | ✅ | ✅ |
| 国产/中文文档 | ✅ | ❌ | ❌ |

### 使用的包

```json
{
  "dependencies": {
    "leafer-ui": "^2.1.2"
    // ❌ 不安装 leafer-editor (画布只读，不需要编辑功能)
  }
}
```

### 元素映射表 (JSON → LeaferJS)

| AI JSON type | LeaferJS 类 | 关键属性 |
|-------------|-------------|---------|
| `Rect` | `Rect` | x, y, width, height, fill, cornerRadius |
| `Text` | `Text` | text, fontSize, fontFamily, fill, textAlign |
| `Frame` | `Frame` | width, height, fill, display:'flex', flexDirection, padding, gap |
| `Group` | `Group` | (位置容器) |
| `Box` | `Box` | width, height, fill (带外观的容器) |
| `Image` | `Image` | url, width, height |
| `Ellipse` | `Ellipse` | width, height, fill |
| `Path` | `Path` | path (SVG path data) |
| `Line` | `Line` | points, stroke, strokeWidth |
| `Icon` | `Image` (SVG data URL) | width, height, url (data:image/svg+xml;base64) |

### Flex 自动布局

LeaferJS 的 `Frame` 元素原生支持 Flex 布局，对应 Figma 的 Auto Layout：

```typescript
// AI JSON
{
  "type": "Frame",
  "autoLayout": { "direction": "column", "gap": 16, "padding": 24 },
  "children": [...]
}

// 映射到 LeaferJS
new Frame({
  width: 375,
  display: 'flex',               // ← 开启 Flex 布局
  flexDirection: 'column',       // ← 垂直排列
  padding: [24, 24, 24, 24],
  gap: 16,
})
```

Flex 布局的意义 — **AI 生成的组件自动按间距排列**，不歪不散。修改 padding/gap 所有子元素自动重排。

---

## 4. AI 对话层

### 交互流程

```
Turn 1:
用户: "帮我设计一个登录页面，风格要干净简约"
  ↓ AI search_icons("email") → [...]
  ↓ AI search_icons("lock") → [...]
  ↓ AI 生成元素树 JSON
  ↓ 前端渲染

Turn 2:
用户: "把登录按钮改成渐变紫色，然后加一个'忘记密码'链接"
  ↓ AI 计算差异 → 返回新元素树
  ↓ 前端 diff → 只更新按钮 fill 和新增 Text

Turn 3:
用户: "间距调大一点"
  ↓ AI 返回修改 autoLayout.padding/gap
  ↓ Flex 布局自动重排
```

### Streaming 渲染

```typescript
// AI Stream → 前端逐元素渲染
AI 响应流式到达:
  chunk 1: {"type":"Frame","children":[  → 创建空白 Frame
  chunk 2: {"type":"Icon","name":"logo"  → fetch SVG → 渲染 Image
  chunk 3: {"type":"Text","value":"登录" → 渲染 Text
  ...
});

// 用户看到的画布是逐渐"长出来"的，而非一次性闪烁
```

### AI 输出的 JSON Schema

```typescript
interface ElementTree {
  type: 'Frame' | 'Rect' | 'Text' | 'Icon' | 'Ellipse' | 'Image' | 'Group' | 'Box' | 'Path' | 'Line'
  id?: string
  x?: number
  y?: number
  width?: number | 'fill'
  height?: number | 'fill'
  fill?: string
  cornerRadius?: number
  autoLayout?: {
    direction: 'row' | 'column'
    gap?: number
    padding?: number
  }
  fontSize?: number
  fontWeight?: number
  fontFamily?: string
  textAlign?: 'left' | 'center' | 'right'
  children?: ElementTree[]
  // Icon 专有
  name?: string        // 图标名，如 "search", "stethoscope"
  size?: number        // 图标宽高
  color?: string       // 图标填充色
}
```

---

## 5. 图标系统 — Material Symbols SVG

### 方案对比

| 方案 | 优点 | 缺点 | 结论 |
|------|------|------|------|
| 字体连字 (fontFamily) | 单文件 ~320KB | 国内加载难、颜色只能 CSS `color` | ❌ 放弃 |
| 预选 120 个 SVG | 小体积 ~48KB | AI 选不到冷门图标 | ❌ 放弃 |
| **全量 SVG 本地内置** | AI 可搜索任意图标、颜色大小精确控制 | ~3.6MB (桌面应用可接受) | ✅ 采用 |

### 数据获取

从 [Google Fonts Material Symbols](https://fonts.google.com/icons) 下载 SVG 图标包，
将 `outlined/` 目录下的 `.svg` 文件（去掉 `-fill` 变体）放入 `frontend/public/icons/`。

### 生成搜索索引

```bash
npm --prefix frontend run icons    # 执行 scripts/generate-icon-index.ts
```

产出：

```
frontend/public/icons/
├── search.svg
├── home.svg
├── ... (3881 个 .svg 文件, ~3.6MB)
│
└── icon-index.json       ← 搜索索引 (~760KB, 可压缩)
```

### AI 图标搜索 (Function Calling)

```typescript
// 注册为 LLM tool
const searchIconsTool = {
  name: 'search_icons',
  description: '搜索 Material Symbols 图标库，根据关键词找到匹配的图标',
  parameters: {
    query: { type: 'string', description: '搜索关键词，中文/英文均可' },
    limit: { type: 'number', default: 8 }
  }
}

// 前端/后端实现
function searchIcons(query: string, limit = 8): IconEntry[] {
  const q = query.toLowerCase()
  return iconIndex
    .filter(e => e.keywords.some(k => k.includes(q)))
    .slice(0, limit)
}
```

### SVG 颜色/大小控制

```typescript
// src/icons/icon-loader.ts
const svgCache = new Map<string, string>()

export async function loadIcon(name: string, color: string): Promise<string> {
  if (!svgCache.has(name)) {
    const resp = await fetch(`/icons/${name}.svg`)
    svgCache.set(name, await resp.text())
  }
  // 替换所有 fill 为指定颜色
  return svgCache.get(name)!.replace(/fill="[^"]*"/g, `fill="${color}"`)
}

export async function createLeaferIcon(name: string, size: number, color: string) {
  const svg = await loadIcon(name, color)
  const b64 = btoa(unescape(encodeURIComponent(svg)))
  return new Image({ url: `data:image/svg+xml;base64,${b64}`, width: size, height: size })
}
```

### AI 对话中使用图标示例

```
用户: "设计一个医疗健康App的首页"

AI → search_icons("heart")     → ["favorite", "heart_plus", "pulse_alert", ...]
  → search_icons("medical")    → ["stethoscope", "medical_services", "hospital", "pharmacy", ...]
  → search_icons("activity")   → ["monitoring", "track_changes", "directions_run", ...]

AI 组合后输出:
{
  "type": "Frame",
  "autoLayout": { "direction": "column", "gap": 16, "padding": 24 },
  "children": [
    { "type": "Frame", "autoLayout": { "direction": "row", "gap": 12 },
      "children": [
        { "type": "Icon", "name": "stethoscope", "size": 32, "color": "#4F46E5" },
        { "type": "Text", "value": "在线问诊", "fontSize": 16, "fill": "#333" },
        { "type": "Icon", "name": "monitoring", "size": 32, "color": "#4F46E5" },
        { "type": "Text", "value": "健康数据", "fontSize": 16, "fill": "#333" },
        { "type": "Icon", "name": "favorite", "size": 28, "color": "#FF4444" },
        { "type": "Text", "value": "我的收藏", "fontSize": 16, "fill": "#333" }
      ]
    }
  ]
}
```

---

## 6. 正文字体策略

不需要额外下载任何正文字体。使用系统字体回退链：

```css
font-family: -apple-system, 'PingFang SC', 'Microsoft YaHei', 'Noto Sans SC', sans-serif;
```

| 平台 | 匹配到的字体 |
|------|-------------|
| macOS | PingFang SC |
| Windows | Microsoft YaHei |
| Linux | Noto Sans SC (安装后) |
| 所有平台回退 | sans-serif |

> 如果追求跨平台一致性，可在 `public/fonts/` 放置可选的 `NotoSansSC-Variable.woff2`，但**不强依赖**。

---

## 7. HTML 导出

### 导出流程

```
当前元素树 (LeaferJS)
  ↓
递归映射: 每个 LeaferJS 元素 → HTML tag + CSS style
  ↓
生成自包含 HTML 文件
  ↓
Blob URL 预览 / 文件下载
```

### 映射规则

| LeaferJS | HTML |
|----------|------|
| `Frame` (flex) | `<div style="display:flex;flex-direction:...;gap:...;padding:...">` |
| `Rect` | `<div style="width:...;height:...;background:...;border-radius:...">` |
| `Text` | `<span style="font-size:...;color:...">text</span>` |
| `Icon` | `<svg width="..." height="..." viewBox="0 0 24 24" fill="...">...</svg>` |
| `Image` | `<img src="data:...">` |
| `Ellipse` | `<div style="border-radius:50%;width:...;height:...;background:...">` |
| `Group` | `<div style="position:relative">` |

### 导出 HTML 结构

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>设计稿名称</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { display: flex; justify-content: center; align-items: center;
           min-height: 100vh; background: #f0f0f0; font-family: -apple-system, ...; }
    /* 每个元素的样式按需生成 */
  </style>
</head>
<body>
  <!-- 图标内联 SVG，零外部依赖 -->
  <div style="display:flex;gap:12px;padding:24px;">
    <svg width="24" height="24" viewBox="0 0 24 24" fill="#4F46E5">
      <path d="M..."/>
    </svg>
    <span>在线问诊</span>
  </div>
</body>
</html>
```

### 图标在 HTML 中的处理

```typescript
// src/export/toHTML.ts
function iconToHTML(name: string, size: number, color: string): string {
  const raw = iconSvgCache.get(name)
  const colored = raw.replace(/fill="[^"]*"/g, `fill="${color}"`)
  return colored.replace('<svg ', `<svg width="${size}" height="${size}" `)
}
```

每个图标是独立的 `<svg>` 元素，**不依赖任何外部字体/JS/CSS**。

---

## 8. 状态管理

使用 Pinia (Vue3 生态) 管理两个 Store：

### useChatStore

```typescript
interface Message {
  role: 'user' | 'assistant'
  content: string
  // assistant 消息还可能附带渲染指令
  tree?: ElementTree   // AI 返回的元素树
}

const useChatStore = defineStore('chat', {
  state: () => ({
    messages: [] as Message[],
    isStreaming: false,
  }),
  actions: {
    async sendMessage(text: string) { /* 调用 LLM API */ }
  }
})
```

### useCanvasStore

```typescript
const useCanvasStore = defineStore('canvas', {
  state: () => ({
    currentTree: null as ElementTree | null,
    previousTree: null as ElementTree | null,
    leaferInstance: null as Leafer | null,
  }),
  actions: {
    applyTree(newTree: ElementTree) {
      // diff 计算: 新增/修改/删除
      // 对每个变动元素调用 leafer.add / element.set / element.remove
    }
  }
})
```

---

## 9. 数据流

### 完整数据流向

```
用户输入 ──→ ChatPanel.vue
                │
                ▼ sendMessage(text)
          LLM API (Streaming)
                │
                ▼ (SSE / fetch stream)
          JSON Stream Parser
                │
                ├── 完整元素到达 → applyTree() → LeaferJS 渲染
                ├── 属性变更到达 → element.set() → 更新
                └── 删除指令到达 → element.remove() → 移除
                │
                ▼
          Canvas 无闪烁更新
```

### 增量 Diff 更新

```typescript
function applyTree(newTree: ElementTree) {
  const oldIds = new Set(currentLeafer.children.map(c => c.id))
  const newIds = new Set(collectIds(newTree))

  // 删除: 旧树有但新树没有的
  for (const id of oldIds) {
    if (!newIds.has(id)) {
      leafer.findById(id)?.remove()
    }
  }

  // 新增/修改: 遍历新树
  walkAndApply(newTree, leafer)
}
```

---

## 10. 核心代码骨架

### 文件结构

```
frontend/src/
├── icons/
│   ├── icon-index.json          ← (build 生成) 图标搜索索引
│   └── icon-loader.ts           ← loadIcon() / createLeaferIcon()
│
├── canvas/
│   ├── CanvasWrapper.vue        ← Vue 组件: 初始化 Leafer
│   └── renderer.ts              ← buildElement() / applyTree() / diff
│
├── export/
│   └── toHTML.ts                ← elementToHTML() / generateHTML()
│
├── chat/
│   └── ChatPanel.vue            ← 对话面板 + Streaming 展示
│
├── stores/
│   ├── chatStore.ts             ← Pinia: 对话历史
│   └── canvasStore.ts           ← Pinia: 元素树状态
│
├── types/
│   └── element.ts               ← ElementTree 类型定义
│
├── App.vue
└── main.ts

scripts/
└── extract-icons.ts             ← build 时: 复制 SVG + 生成索引
```

### 关键类型定义

```typescript
// src/types/element.ts
interface ElementTree {
  type: 'Frame' | 'Rect' | 'Text' | 'Icon' | 'Ellipse' | 'Image' | 'Group' | 'Box'
  id?: string
  x?: number
  y?: number
  width?: number | 'fill'
  height?: number | 'fill'
  fill?: string
  cornerRadius?: number
  opacity?: number
  visible?: boolean
  autoLayout?: {
    direction: 'row' | 'column'
    gap?: number
    padding?: number
    align?: 'start' | 'center' | 'end' | 'stretch'
  }
  // Text 专有
  text?: string
  fontSize?: number
  fontWeight?: number
  fontFamily?: string
  textAlign?: 'left' | 'center' | 'right'
  lineHeight?: number
  // Icon 专有
  name?: string
  size?: number
  color?: string
  // Image 专有
  url?: string
  // Path 专有
  path?: string
  // Line 专有
  points?: number[]
  stroke?: string
  strokeWidth?: number
  // 递归子元素
  children?: ElementTree[]
}
```

### Renderer 核心

```typescript
// src/canvas/renderer.ts
import { Leafer, Rect, Text, Frame, Image, Group, Ellipse, Box, Path, Line } from 'leafer-ui'
import { createLeaferIcon } from '../icons/icon-loader'

export function buildElement(node: ElementTree): ILeaf | Promise<ILeaf> {
  switch (node.type) {
    case 'Frame':
      return new Frame({
        id: node.id,
        width: node.width,
        height: node.height,
        fill: node.fill,
        cornerRadius: node.cornerRadius,
        display: node.autoLayout ? 'flex' : 'block',
        flexDirection: node.autoLayout?.direction === 'column' ? 'column' : 'row',
        padding: node.autoLayout?.padding,
        gap: node.autoLayout?.gap,
        children: node.children?.map(buildElement),
      })
    case 'Rect':
      return new Rect({ /* ... */ })
    case 'Text':
      return new Text({ /* ... */ })
    case 'Icon':
      return createLeaferIcon(node.name!, node.size ?? 24, node.color ?? '#333')
    // ... 其他类型
  }
}
```

---

## 11. 实施路线

### Phase 1 — 基础渲染 (2 天)

```
├── npm install leafer-ui
├── 将 SVG 图标放入 frontend/public/icons/
├── 运行 npm run icons 生成 icon-index.json
├── 创建 Vue CanvasWrapper 组件 (初始化 Leafer 实例)
├── 实现 renderer.ts (Rect + Text + Frame + Icon 映射)
├── 实现 icon-loader.ts (加载 SVG → data URL → Leafer Image)
├── 创建对话面板 ChatPanel.vue (输入框 + 消息列表)
├── 集成 LLM API (基础调用)
└── 验证: "画一个红色按钮，上面有 search 图标和'搜索'文字"
```

### Phase 2 — 完善交互 (3 天)

```
├── 完整元素类型 (Ellipse, Image, Path, Line, Group, Box)
├── Flex 自动布局全面支持
├── Streaming 流式渲染 (边生成边渲染)
├── 增量 diff 更新 (不闪屏)
├── AI 图标搜索集成 (Function Calling)
├── 多轮上下文管理 (AI 记住之前的状态)
└── 验证: "医疗 App 首页，包含问诊/数据/收藏三个卡片"
```

### Phase 3 — 导出与打磨 (3 天)

```
├── HTML 导出引擎 (元素树 → 自包含 HTML)
├── SVG/PNG 截图导出备选
├── "回到上一步" 对话回退
├── 模板/预设 (手机壳 / 桌面 / 平板画布)
├── 导出预览对话框
├── SVG 缓存优化 (预加载 AI 正在生成的图标)
└── 验证: 完整闭环 "设计 → 修改 3 轮 → 导出离线 HTML"
```

---

## 12. 资源清单

| 资源 | 来源 | 大小 | 加载方式 |
|------|------|------|---------|
| LeaferJS | `leafer-ui` npm | 70KB gzip | Vite 构建打包 |
| 3881 个 SVG 图标 | 手动下载 → `frontend/public/icons/` | ~3.6MB | 按需 fetch + 缓存 |
| 图标搜索索引 | build 生成 `frontend/public/icons/icon-index.json` | ~760KB (可压缩) | app 启动时异步加载 |
| 正文字体 | 系统字体回退 | 0KB | 无需下载 |
| Go 后端 | Wails | ~10-15MB | 桌面二进制内置 |

**国内用户零网络依赖** — 全部资源在 npm install / build 阶段获得，Wails 打包到桌面应用中。

---

## 13. 附录：常用图标同义词表

AI 图标搜索的关键词匹配依赖此表，建议维护 ~100 条常见映射：

```
home          → house, index
search        → find, lookup, magnifier, 搜索
settings      → config, preferences, gear, options, 设置
person        → user, profile, account, avatar, 用户
delete        → remove, trash, bin, clear, 删除
add           → create, new, plus, 新增
edit          → pencil, write, modify, 编辑
email         → mail, message, contact, envelope, 邮件
lock          → secure, password, privacy, safety, 锁
notifications → bell, alert, remind, 通知
shopping_cart → cart, buy, shop, purchase, store, 购物车
calendar      → date, schedule, event, day, 日历
image         → photo, picture, photo_library, 图片
file_download → download, save, 下载
file_upload   → upload, 上传
favorite      → heart, like, love, star, 收藏, 喜欢
info          → information, help, about, detail, 信息
warning       → alert, caution, danger, error, 警告
menu          → hamburger, list, 菜单
close         → x, cancel, dismiss, exit, 关闭
arrow_back    → back, left, previous, 返回
arrow_forward → forward, right, next, 前进
check         → done, confirm, ok, tick, verify, success, 完成, 确认
code          → develop, programming, terminal, 代码
terminal      → console, shell, command, 终端
smartphone    → phone, mobile, cellphone, device, 手机
```

---

> **文档版本**: v1.0  
> **最后更新**: 2025-07-17  
> **关联**: [LeaferJS 官网](https://www.leaferjs.com/) · [Material Symbols](https://fonts.google.com/icons) · [Wails](https://wails.io/)
