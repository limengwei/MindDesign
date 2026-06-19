/**
 * 品牌分析器（Brand Analyzer）
 *
 * 用户提供品牌 URL / Logo 描述 / Logo 链接后，由 LLM 推断并输出符合
 * DesignSpec v2 形态的 JSON 规范。解析后存入 canvasStore.customDesignSpecs，
 * 之后可在 DesignSpecSelector 中选用。
 *
 * 输出约定：使用 `<!-- BRAND_SPEC ... BRAND_SPEC -->` 块包裹 JSON，
 * 便于我们可靠地解析（参考 blueprint.ts / chat.ts 中的同类约定）。
 */
import type { DesignSpecV2 } from './designSpecs'

export interface BrandAnalyzerInput {
  /** 用户输入的品牌名 / URL / 描述 */
  rawInput: string
  /** 可选：logo 图片 dataURL（base64）或 URL */
  logoDataUrl?: string
}

/**
 * 注入到 system prompt 的"品牌分析器角色"指令。
 * 让 LLM 根据用户输入输出符合 DesignSpec v2 形态的 JSON 规范。
 */
export const BRAND_ANALYZER_PROMPT = `你是一名资深品牌设计分析师。请根据用户提供的品牌名称、官网 URL、Logo 描述或 Logo 图片，
**严格按照以下 JSON 结构**输出一个 DesignSpec v2 形态的设计规范：

## 规则

1. **必须**用 \`<!-- BRAND_SPEC ... BRAND_SPEC -->\` 包裹 JSON，禁止任何额外文字；
2. 严格遵守 JSON 语法（双引号、无尾逗号）；
3. 所有 ColorSet 字段（primary/background/surface/text/textSecondary/border/accent/error/success）都必须填；
4. lightMode 与 darkMode 都必须填（可以是同一组颜色或两套不同的）；
5. tags 给 3-5 个（参考词表：dark-mode / light-mode / minimal / editorial / photography / gradient / monochrome / playful / serious / data-dense / mobile-first / consumer-friendly / landing-page / e-commerce / finance / ai / social / open-source / developer-friendly / travel）；
6. industry 用一个最贴切的行业名（如 Fintech / Consumer / Media/AI / E-commerce / SaaS/Developer / Social/Content / Mobility/Booking / Productivity / Design Tools）；
7. mood 给 2-4 个情绪词（如 calm / serious / playful / bold / premium / editorial / energetic / friendly / professional / authentic）；
8. spacing: 'tight' | 'normal' | 'spacious' 之一；
9. density: 'compact' | 'normal' | 'airy' 之一；
10. fullPrompt 部分必须用中文（如果品牌是中文）或英文（如果是英文品牌）写一段详细的 Markdown 设计规范，至少覆盖：配色方案（含色值）、排版（字体/字重/字号/行高）、组件风格（按钮/卡片/输入框）、布局原则、品牌气质描述。

## JSON 结构（所有字段必填）

\`\`\`json
{
  "id": "brand_<slugified-name>",          // kebab-case，基于品牌名生成
  "name": "<品牌名>",
  "category": "<行业分类>",
  "description": "<一句话描述>",
  "source": "<用户提供的 URL 或 'user-supplied'>",
  "colors": {                              // 默认 / 浅色模式
    "primary": "#xxx",
    "background": "#xxx",
    "surface": "#xxx",
    "text": "#xxx",
    "textSecondary": "#xxx",
    "border": "#xxx",
    "accent": "#xxx",
    "error": "#xxx",
    "success": "#xxx"
  },
  "lightMode": { /* 同 colors 结构 */ },
  "darkMode": { /* 同 colors 结构（可与 lightMode 不同） */ },
  "fontStack": "<CSS fontStack>",
  "borderRadius": "<如 '12px' / '9999px' / '0px'>",
  "styleHint": "<简短风格描述，逗号分隔 3-5 个关键词>",
  "tags": ["...", "..."],
  "industry": "<industry>",
  "mood": ["...", "..."],
  "spacing": "normal",
  "density": "normal",
  "fullPrompt": "## 设计规范：<品牌名> 风格\\n\\n你必须严格遵循以下设计语言生成 UI：\\n\\n### 配色方案\\n- ..."
}
\`\`\`

只输出 \`<!-- BRAND_SPEC { ... } BRAND_SPEC -->\` 一个块，不要解释、不要评论、不要 Markdown 列表。`

const BRAND_SPEC_BLOCK = /<!--\s*BRAND_SPEC\s*([\s\S]*?)\s*BRAND_SPEC\s*-->/i

/** 把品牌名 slugify 成 kebab-case id */
export function slugifyBrandName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/['']/g, '')
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-/g, '-') || 'brand'
}

/** 必填字段检查：缺一返回 false */
function isValidBrandSpec(obj: unknown): obj is DesignSpecV2 {
  if (!obj || typeof obj !== 'object') return false
  const o = obj as Record<string, unknown>
  const colorFields = ['primary', 'background', 'surface', 'text', 'textSecondary', 'border', 'accent', 'error', 'success']
  const checkColorSet = (cs: unknown): boolean => {
    if (!cs || typeof cs !== 'object') return false
    const c = cs as Record<string, unknown>
    return colorFields.every(f => typeof c[f] === 'string' && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(c[f] as string))
  }
  return (
    typeof o.id === 'string' && o.id.length > 0 &&
    typeof o.name === 'string' && o.name.length > 0 &&
    typeof o.industry === 'string' &&
    Array.isArray(o.tags) && o.tags.length >= 1 &&
    Array.isArray(o.mood) &&
    typeof o.fontStack === 'string' &&
    typeof o.borderRadius === 'string' &&
    checkColorSet(o.colors) &&
    checkColorSet(o.lightMode) &&
    checkColorSet(o.darkMode) &&
    typeof o.fullPrompt === 'string' &&
    (o.spacing === 'tight' || o.spacing === 'normal' || o.spacing === 'spacious') &&
    (o.density === 'compact' || o.density === 'normal' || o.density === 'airy')
  )
}

/**
 * 解析 LLM 输出文本中的 <!-- BRAND_SPEC ... BRAND_SPEC --> 块。
 *
 * 容错策略：
 * 1. 先尝试严格匹配（带代码围栏的 JSON）；
 * 2. 若直接 JSON.parse 失败，剥掉 ```json ... ``` 围栏再 parse；
 * 3. 验证 v2 必填字段，缺一返回 null。
 */
export function parseBrandAnalyzerResponse(text: string): DesignSpecV2 | null {
  const match = text.match(BRAND_SPEC_BLOCK)
  if (!match) return null
  let raw = match[1].trim()
  // 去掉可能存在的 ```json ... ``` 围栏
  raw = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch (err) {
    console.warn('[brandAnalyzer] JSON parse failed:', (err as Error).message)
    return null
  }
  if (!isValidBrandSpec(parsed)) {
    console.warn('[brandAnalyzer] parsed object fails v2 schema validation', parsed)
    return null
  }
  return parsed
}

/**
 * 通过 LLM 推断品牌规范（由 ChatPanel 调用）。
 *
 * 直接走 useLLMConfigStore 中的 config（OpenAI 兼容 / Claude），返回解析后的 spec 或 null。
 */
export interface AnalyzeBrandOptions {
  config: import('../stores/llmConfigStore').LLMConfig
  input: BrandAnalyzerInput
}

export async function analyzeBrandWithLLM(options: AnalyzeBrandOptions): Promise<DesignSpecV2 | null> {
  const { config, input } = options
  const userText = input.logoDataUrl
    ? `${input.rawInput}\n\n[logo data: ${input.logoDataUrl.slice(0, 64)}...]`
    : input.rawInput

  const messages: Array<{ role: 'system' | 'user'; content: string }> = [
    { role: 'system', content: BRAND_ANALYZER_PROMPT },
    { role: 'user', content: userText },
  ]
  try {
    const { callOpenAICompatible, callClaude } = await import('../ai/llmClient')
    const response = config.protocol === 'claude'
      ? await callClaude(config, messages as any)
      : await callOpenAICompatible(config, messages as any)
    return parseBrandAnalyzerResponse(response.content || '')
  } catch (err) {
    console.error('[brandAnalyzer] LLM call failed:', err)
    return null
  }
}
