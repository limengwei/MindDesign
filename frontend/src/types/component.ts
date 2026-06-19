/**
 * 组件库类型（Phase 4 · Task 17）
 *
 * 实际定义在 canvasStore.ts（避免循环依赖）。此处 re-export 以便外部模块按
 * "src/types/component.ts" 的约定路径引用。
 */
export type { Component } from '../stores/canvasStore'
