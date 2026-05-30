export interface IconEntry {
  name: string
  keywords: string[]
}

let iconIndex: IconEntry[] | null = null

async function loadIconIndex(): Promise<IconEntry[]> {
  if (iconIndex) return iconIndex
  try {
    const resp = await fetch('/icons/icon-index.json')
    iconIndex = await resp.json()
    return iconIndex!
  } catch (e) {
    console.error('Failed to load icon index:', e)
    return []
  }
}

export async function searchIcons(query: string, limit = 10): Promise<IconEntry[]> {
  const index = await loadIconIndex()
  const q = query.toLowerCase()

  return index
    .filter((entry) =>
      entry.keywords.some((k) => k.includes(q) || q.includes(k))
    )
    .slice(0, limit)
}

export const searchIconsToolDefinition = {
  name: 'search_icons',
  description: '搜索 Material Symbols 图标库，根据关键词找到匹配的图标',
  parameters: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: '搜索关键词，如 "search"、"设置"、"medical"',
      },
      limit: { type: 'number', default: 10 },
    },
    required: ['query'],
  },
}
