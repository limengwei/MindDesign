<!--
请先阅读 docs/CONTRIBUTING.md 与 .trae/specs/design-quality-optimization/spec.md。
满足以下任一条件，请在提交前补 spec 三件套（spec.md / tasks.md / checklist.md）：

  - 单次 PR 涉及 ≥ 3 个文件
  - 跨前后端 / 数据模型（Go + 前端 / DesignSpec / CanvasStore / 项目 JSON）
  - 触及项目加载或保存链路

未附 spec 的 PR 会被要求先补 spec 再 review。
-->

## 改动说明

<!-- 简述本次 PR 做什么、为什么做、解决了什么问题 -->

## 改动分类

- [ ] Bug 修复
- [ ] 小修小补（typo / 文案 / 配色微调 / 单图标）
- [ ] 中等改动
- [ ] 重大改动 → **必须**附 spec

## Spec 流程

- [ ] **已附 spec**（路径：`.trae/specs/<change-id>/`）
  - [ ] `spec.md` 写完（Why / What / Impact / ADDED Requirements）
  - [ ] `tasks.md` 拆完（Phase × Task × SubTask）
  - [ ] `checklist.md` 验收项已勾选

> 若本次为 Bug 修复或小修小补，可不附 spec，但仍建议在"改动说明"中写清复现步骤 / 影响面。

## Spec 路径（如有）

```
.trae/specs/<change-id>/
```

## 兼容性影响

<!-- 涉及数据模型/Schema 演进时填写：旧文件是否能被新代码打开？是否需要 migration？ -->

- [ ] 不涉及数据模型
- [ ] 涉及数据模型，已提供 `migrate*` 兼容函数与单元测试
- [ ] 写入路径强制使用新 Schema

## 验证

<!-- 列出验证步骤、截图或测试命令 -->

```bash
# 例如
cd frontend && npm run lint
go build ./...
```

## Checklist

- [ ] 本地已通过 lint / typecheck / build
- [ ] 单元测试已加（涉及 migration / 新工具函数时）
- [ ] 已更新对应 spec 的 `checklist.md`（如适用）
