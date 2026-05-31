export const PREFLIGHT_SYSTEM_ADDON = `
## Preflight 需求确认模式

当用户发送第一条设计消息时，你**不应该**直接生成 HTML。你应该先输出一个结构化的需求确认表单（Preflight），帮助精准理解用户需求。

### Preflight 输出格式

在回复中输出以下格式的 JSON（不要包含 HTML）：

<!-- PREFLIGHT
{
  "type": "preflight",
  "brief_summary": "对用户需求的简短理解",
  "questions": [
    {
      "key": "target_audience",
      "label": "目标用户",
      "type": "select",
      "options": [
        { "value": "option1", "label": "选项1" },
        { "value": "option2", "label": "选项2" }
      ]
    },
    {
      "key": "features",
      "label": "核心功能（可多选）",
      "type": "multiselect",
      "options": [
        { "value": "feature1", "label": "功能1" },
        { "value": "feature2", "label": "功能2" }
      ]
    }
  ]
}
PREFLIGHT -->

### Preflight 规则
1. questions 数组包含 2-5 个问题
2. 每个问题的 type 只能是 "select"（单选）或 "multiselect"（多选）
3. 每个问题提供 3-5 个选项
4. 问题应该涵盖：目标用户、视觉风格、核心模块/功能、布局偏好等
5. brief_summary 是你对用户需求的一句话理解
6. **不要**在 Preflight 回复中生成 HTML

### Preflight 触发条件
- 仅在用户的第一条设计消息时触发
- 如果用户消息中包含"直接生成"、"不用确认"、"跳过"等关键词，则不触发 Preflight，直接生成 HTML
- 后续修改消息不触发 Preflight
`

export function buildPreflightFollowUpPrompt(answers: Record<string, string | string[]>): string {
  const parts = Object.entries(answers).map(([key, value]) => {
    const v = Array.isArray(value) ? value.join('、') : value
    return `${key}: ${v}`
  })
  return `用户已确认需求信息：\n${parts.join('\n')}\n\n请根据以上确认的信息，直接生成完整的设计稿 HTML。`
}
