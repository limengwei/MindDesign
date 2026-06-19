# MindDesign 贡献指南

> 本文档说明 MindDesign 仓库的改动分类、开发流程与 spec/plan 强制规则。
> 阅读 [README § 开发流程](../README.md#开发流程) 获得入口；想看完整示例请看 [`.trae/specs/design-quality-optimization/spec.md`](../.trae/specs/design-quality-optimization/spec.md)。

---

## 一、改动分类

| 类别 | 典型场景 | 是否强制 spec |
|------|----------|----------------|
| **Bug 修复** | 编译报错、运行崩溃、明确的功能错误 | 否（但要在 PR 描述里写复现步骤） |
| **小修小补** | typo、单文案调整、配色微调、单个图标替换、依赖小版本升级 | 否 |
| **中等改动** | 新增 1~2 个组件、新增 1 个 prompt 模板、单个 store 的字段扩展、单个 Go service 函数 | 否（建议补，但不强求） |
| **重大改动** | 跨前后端（Go + Vue/TS）、改数据模型（项目 JSON / DesignSpec / CanvasStore）、引入新模块、影响导出/项目加载链路 | **是，强制 spec** |

判断标准以"改动造成的风险面"为准，而不是"代码行数"。

---

## 二、什么情况下**必须**走 spec/plan 流程

满足以下任意条件，即视为"重大改动"，**必须**在动手写代码之前建好 spec 三件套：

1. **单次 PR 涉及 ≥ 3 个文件**（不论新增、修改、删除）
2. **跨前后端 / 数据模型**：同时改动 Go 后端（`*.go`）与前端（`frontend/src/**`）或数据结构（`canvasStore.ts` / `project.ts` / `designSpecs.ts` 等）
3. **数据模型 / Schema 演进**：项目 JSON、DesignSpec、CanvasStore、画板/变体结构等字段的增删
4. **影响项目加载/保存链路**：如 `project_service.go`、`canvasStore.ts`、`autoSave.ts`、`projectBridge.ts` 中的任意两个

> 上述任一条件触发，PR 描述会被打回要求补 spec；详见 [`pull_request_template.md`](../.github/pull_request_template.md)。

---

## 三、Spec/Plan 流程具体步骤

### 1. 创建目录

在 `.trae/specs/` 下新建一个以改动主题命名的目录（kebab-case）：

```
.trae/specs/
└── <change-id>/          # 例：design-quality-optimization、export-pdf-zip
    ├── spec.md           # 契约：为什么/做什么/影响/ADDED/MODIFIED/REMOVED
    ├── tasks.md          # 任务分解：按 Phase × Task × SubTask 拆开
    └── checklist.md      # 验收清单：每条 [ ] 都是可验证的 checkpoint
```

`<change-id>` 的命名建议：
- 复用一个已有 spec 目录（同一主题的多个 PR 共享一个 spec）
- 新建目录时简短、明确，例如 `export-pdf-zip`、`design-spec-v2`、`pages-hotspot-link`

### 2. 写 spec.md

至少包含 5 个段落：

- **Why** — 这个改动要解决什么问题 / 当前痛点
- **What Changes** — 改什么、达到什么效果（不写细节）
- **Impact** — 影响哪些 spec / 哪些代码文件 / 哪些上下游
- **ADDED Requirements** — 新增行为（含 Scenario 描述）
- **MODIFIED / REMOVED Requirements**（可选）— 已有行为变化或废弃

参考样例：`.trae/specs/design-quality-optimization/spec.md`

### 3. 写 tasks.md

按 **Phase → Task → SubTask** 三级拆解：

- **Phase 1** 通常是"基础设施 / 流程 / 数据底座"，强制先做
- **Phase 2+** 按业务优先级可裁剪
- 每个 SubTask 都是**可独立验证**的最小单元

### 4. 写 checklist.md

每条 checkpoint 形如 `- [ ] xxx`，验证通过后改成 `- [x] xxx` 并写明验证人/日期。

### 5. 提交 PR 时

- 在 PR 描述中勾选 PR 模板的"已附 spec"项
- 在 PR 描述里加一行：`Spec: .trae/specs/<change-id>/`
- 三个 md 文件随 PR 一起提交

---

## 四、与 docs/ 文档的分工

| 位置 | 角色 | 适用场景 |
|------|------|----------|
| `.trae/specs/<change-id>/` | **契约**：明确"做什么 / 不做什么 / 影响什么"，是开发的入口 | 任何"中等以上"改动的强制前置 |
| `docs/` | **思路 & 调研**：背景、对比、调研、Why 详细论证 | 长期沉淀的设计决策、技术调研、对外方案 |
| `README.md` | **入口**：项目介绍、快速开始、开发流程指针 | 用户与新贡献者的第一站 |
| `.trae/rules/`（如有） | **规则**：项目级 AI/工程规则，跨所有 spec 生效 | 通用约束（命名、风格、提交流程） |

> **简单记忆**：
> - `spec/` 回答"这次 PR 要改什么、怎么验收"
> - `docs/` 回答"我们为什么决定这么做、对比了哪些方案"
> - 两者配合使用，不重复也不冲突

---

## 五、完整 Spec 样例

推荐在动手前先通读：

- **`.trae/specs/design-quality-optimization/`** — 现有最完整的 spec 样例
  - [spec.md](../.trae/specs/design-quality-optimization/spec.md)
  - [tasks.md](../.trae/specs/design-quality-optimization/tasks.md)
  - [checklist.md](../.trae/specs/design-quality-optimization/checklist.md)

任何一次新增/修改 spec 时，建议：

1. 复制该目录作为模板
2. 替换 Why / What / Impact 段落
3. 按需重写 ADDED Requirements
4. 任务清单与验收清单从 0 写，不复制粘贴（避免遗留过时项）

---

## 六、版本与向前兼容

任何触及以下对象的改动，**必须**同时给出 migration 函数或兼容策略：

- `frontend/src/types/project.ts`（项目 JSON Schema）
- `frontend/src/prompts/designSpecs.ts`（DesignSpec）
- `frontend/src/stores/canvasStore.ts`（画布模型）
- `project_service.go`（项目读写）

最小要求：

1. 旧文件可以被新代码无错打开（字段缺失有默认值、字段多余被忽略）
2. 提供 `migrate*` 纯函数，单元测试覆盖典型输入
3. 写入时使用新 schema（写 v2 写 v2、写 v4 写 v4）
4. 不要主动删除旧字段（保留回读能力）

---

## 七、提交流程速查

```text
1. 改动分类 → 命中"重大改动"？
2. 是 → 复制 .trae/specs/design-quality-optimization/ 作为模板
3. 写 spec.md / tasks.md / checklist.md
4. 写代码 + 单元测试
5. 提交 PR，勾选 "已附 spec"
6. Reviewer 校验 checklist.md
7. 全部勾完 → Merge
```
