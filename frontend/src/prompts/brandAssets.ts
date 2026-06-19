/**
 * 品牌资产（Brand Asset）
 *
 * 从 DesignSpec 派生的"5 步品牌资产卡片"数据结构，用于：
 * 1. 在 ChatPanel 顶部以卡片形式可视化"规范摘要"
 * 2. 在 system prompt 中以 JSON 形式注入，让 LLM 直接获得可量化的设计 token
 *
 * 不替代 DesignSpec.fullPrompt（保留编辑式叙述），而是它的"结构化补全"。
 */
import type { ColorSet, DesignSpec } from './designSpecs'

export interface BrandAssetColors {
  primary: string
  secondary: string
  background: string
  surface: string
  text: string
  textSecondary: string
  accent: string
  error: string
  success: string
}

export interface BrandAssetTypography {
  fontStack: string
  h1Size: number
  h2Size: number
  h3Size: number
  h4Size: number
  h5Size: number
  h6Size: number
  bodySize: number
  captionSize: number
  weightRegular: number
  weightMedium: number
  weightBold: number
  lineHeightTight: number
  lineHeightNormal: number
  lineHeightRelaxed: number
}

export interface BrandAssetSpacing {
  base: number
  scale: number[]
}

export interface BrandAssetComponents {
  button: {
    shape: 'pill' | 'rounded' | 'square'
    height: number
    radius: string
  }
  card: {
    radius: string
    padding: number
  }
  input: {
    height: number
    radius: string
  }
}

export interface BrandAssetLayout {
  maxWidth: number
  columns: number
  heroRatio: 'wide' | 'square' | 'tall'
}

export interface BrandAsset {
  specId: string
  specName: string
  colors: BrandAssetColors
  typography: BrandAssetTypography
  spacing: BrandAssetSpacing
  components: BrandAssetComponents
  layout: BrandAssetLayout
  meta: {
    industry: string
    tags: string[]
    mood: string[]
    spacing: 'tight' | 'normal' | 'spacious'
    density: 'compact' | 'normal' | 'airy'
  }
}

const DEFAULT_TYPOGRAPHY: BrandAssetTypography = {
  fontStack: "-apple-system, 'PingFang SC', 'Inter', sans-serif",
  h1Size: 48, h2Size: 32, h3Size: 24, h4Size: 20, h5Size: 18, h6Size: 16,
  bodySize: 16, captionSize: 13,
  weightRegular: 400, weightMedium: 500, weightBold: 700,
  lineHeightTight: 1.2, lineHeightNormal: 1.5, lineHeightRelaxed: 1.7,
}

const FONT_HINTS: Array<{ test: RegExp; defaults: Partial<BrandAssetTypography> }> = [
  { test: /inter|sf pro|system|pingfang|helvetica|arial/i,
    defaults: { h1Size: 48, h2Size: 32, bodySize: 16 } },
  { test: /futura|helvetica now/i, defaults: { h1Size: 64, h2Size: 40, bodySize: 16 } },
  { test: /monocle|georgia|times|charter|serif|noto serif|didot|bodoni/i,
    defaults: { h1Size: 40, h2Size: 28, bodySize: 17, lineHeightNormal: 1.6 } },
  { test: /din|nunito|rubik|charter|gt america|klarna|uber|chirp|gg sans/i,
    defaults: { h1Size: 40, h2Size: 28, bodySize: 16 } },
]

function pickTypographyDefaults(fontStack: string): Partial<BrandAssetTypography> {
  for (const hint of FONT_HINTS) {
    if (hint.test.test(fontStack)) return hint.defaults
  }
  return {}
}

function parseBorderRadius(br: string): { shape: 'pill' | 'rounded' | 'square'; radius: string } {
  if (br === '9999px' || br === '100px' || /^50%$/.test(br)) return { shape: 'pill', radius: br }
  if (br === '0px' || br === '0') return { shape: 'square', radius: br }
  return { shape: 'rounded', radius: br }
}

function deriveMaxWidth(category: string): number {
  const lc = category.toLowerCase()
  if (lc.includes('consumer') || lc.includes('media') || lc.includes('e-commerce')) return 1280
  if (lc.includes('mobility') || lc.includes('fintech')) return 1200
  if (lc.includes('social') || lc.includes('productivity')) return 1280
  return 1200
}

function deriveColumns(category: string): number {
  const lc = category.toLowerCase()
  if (lc.includes('mobility') || lc.includes('mobile')) return 1
  if (lc.includes('e-commerce')) return 4
  if (lc.includes('social') || lc.includes('media')) return 3
  if (lc.includes('fintech') || lc.includes('saas')) return 3
  return 2
}

function deriveHeroRatio(styleHint: string): 'wide' | 'square' | 'tall' {
  const s = styleHint.toLowerCase()
  if (s.includes('full-bleed') || s.includes('cinematic') || s.includes('photography')) return 'wide'
  if (s.includes('data-dense') || s.includes('dashboard')) return 'tall'
  return 'square'
}

/**
 * 从 DesignSpec 派生 BrandAsset。
 * 接受 v1 / v2 任一形态（v1 数据会被 `migrateDesignSpec` 隐式调用上游补全）。
 */
export function buildBrandAssetFromSpec(spec: DesignSpec): BrandAsset {
  const colors: ColorSet = spec.lightMode ?? spec.colors
  const typoDefaults = pickTypographyDefaults(spec.fontStack)
  const shape = parseBorderRadius(spec.borderRadius)
  const density = spec.density ?? 'normal'
  const spacing: BrandAssetSpacing = {
    base: 4,
    scale: density === 'compact'
      ? [0, 2, 4, 8, 12, 16, 24, 32]
      : density === 'airy'
        ? [0, 4, 8, 16, 24, 40, 64, 96]
        : [0, 4, 8, 12, 20, 32, 48, 64],
  }
  const components: BrandAssetComponents = {
    button: {
      shape: shape.shape,
      height: 44,
      radius: shape.shape === 'pill' ? '9999px' : shape.radius,
    },
    card: {
      radius: shape.shape === 'pill' ? '12px' : shape.radius,
      padding: spacing.base * 4,
    },
    input: {
      height: 40,
      radius: shape.shape === 'pill' ? '9999px' : shape.radius,
    },
  }
  return {
    specId: spec.id,
    specName: spec.name,
    colors: {
      primary: colors.primary,
      secondary: colors.accent,
      background: colors.background,
      surface: colors.surface,
      text: colors.text,
      textSecondary: colors.textSecondary,
      accent: colors.accent,
      error: colors.error,
      success: colors.success,
    },
    typography: {
      ...DEFAULT_TYPOGRAPHY,
      fontStack: spec.fontStack,
      ...typoDefaults,
    },
    spacing,
    components,
    layout: {
      maxWidth: deriveMaxWidth(spec.category),
      columns: deriveColumns(spec.category),
      heroRatio: deriveHeroRatio(spec.styleHint),
    },
    meta: {
      industry: spec.industry ?? '',
      tags: Array.isArray(spec.tags) ? spec.tags : [],
      mood: Array.isArray(spec.mood) ? spec.mood : [],
      spacing: spec.spacing ?? 'normal',
      density: spec.density ?? 'normal',
    },
  }
}

/**
 * 将 BrandAsset 序列化为可读 JSON，用于注入 system prompt。
 */
export function brandAssetToPromptJSON(asset: BrandAsset): string {
  return JSON.stringify(asset, null, 2)
}
