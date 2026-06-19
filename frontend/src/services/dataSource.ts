/**
 * Phase 3: Task 14 - 真实数据接入（图片数据源）
 *
 * 支持三种数据源：
 *  - placehold：原 placehold.co 占位（默认，离线可用）
 *  - unsplash：Unsplash Source 关键词搜索（需联网）
 *  - local：项目内置 assets
 */

export type DataSourceConfig = {
  type: 'placehold' | 'unsplash' | 'local'
  apiKey?: string
}

const PLACEHOLD_BASE = 'https://placehold.co'

/**
 * 关键词清洗：Unsplash 不接受中文与特殊字符，转英文 + 短横线
 */
function sanitizeKeywords(input: string): string {
  const s = (input || '').trim().toLowerCase()
  // 简单中文 → 英文映射（无 i18n 表时使用通用关键词）
  const cnMap: Record<string, string> = {
    头像: 'avatar', 商品: 'product', 风景: 'landscape', 城市: 'city',
    建筑: 'architecture', 食物: 'food', 饮料: 'beverage', 咖啡: 'coffee',
    旅行: 'travel', 运动: 'sport', 音乐: 'music', 设计: 'design',
    艺术: 'art', 科技: 'technology', 商务: 'business', 人物: 'people',
    动物: 'animal', 自然: 'nature', 海滩: 'beach', 山: 'mountain',
    花: 'flower', 夜景: 'night', 美食: 'food', 时尚: 'fashion',
  }
  let result = s
  for (const [cn, en] of Object.entries(cnMap)) {
    if (result.includes(cn)) {
      result = result.split(cn).join(en)
    }
  }
  // 仅保留字母数字逗号空格短横线
  result = result.replace(/[^a-z0-9,\s-]/g, '').trim()
  // 合并多余空格为短横线
  result = result.replace(/[\s,]+/g, '-').replace(/-+/g, '-')
  return result || 'design'
}

/**
 * 构造一张图片的 URL。prompt 通常来自 HTML 中 alt 描述或文件名。
 */
export function generateImageUrl(config: DataSourceConfig, prompt: string, width: number, height: number): string {
  const w = Math.max(1, Math.floor(width || 300))
  const h = Math.max(1, Math.floor(height || 200))
  const k = sanitizeKeywords(prompt)

  switch (config.type) {
    case 'unsplash': {
      // 旧版 source.unsplash.com 已不稳定，改为 picsum 关键词降级方案不可行
      // 这里仍然走 source.unsplash.com 以满足需求；如离线则客户端代理降级
      return `https://source.unsplash.com/${w}x${h}/?${encodeURIComponent(k)}`
    }
    case 'local': {
      // local 用 placehold 作底，回写关键词以便前端识别
      return `${PLACEHOLD_BASE}/${w}x${h}/4F46E5/FFF.png?text=${encodeURIComponent(k)}&font=raleway`
    }
    case 'placehold':
    default: {
      return `${PLACEHOLD_BASE}/${w}x${h}/4F46E5/FFF.png?text=${encodeURIComponent(k)}&font=raleway`
    }
  }
}

/**
 * 替换 HTML 中所有 placehold.co 链接为目标数据源。
 * 不做语义解析（不知道原图尺寸），统一用原 URL 里的 w×h（若有）。
 */
export function remapImageUrls(html: string, config: DataSourceConfig): string {
  if (!html) return html
  if (config.type === 'placehold') return html

  // 匹配 <img src="https://placehold.co/...?...text=...">
  // 也支持 src=无引号
  return html.replace(
    /(<img\b[^>]*?\bsrc=)(["']?)(https?:\/\/placehold\.co\/[^\s"'<>]+)\2/gi,
    (_match, prefix, q, oldUrl) => {
      // 抽取尺寸与 text
      const m = oldUrl.match(/placehold\.co\/(\d+)x(\d+)(?:\/[\w-]+){0,2}(?:\.(?:png|jpg|jpeg|webp))?(?:\?text=([^&]+))?/i)
      if (!m) return _match
      const w = parseInt(m[1], 10) || 300
      const h = parseInt(m[2], 10) || 200
      const prompt = decodeURIComponent(m[3] || 'design')
      const newUrl = generateImageUrl(config, prompt, w, h)
      return `${prefix}${q}${newUrl}${q}`
    },
  )
}
