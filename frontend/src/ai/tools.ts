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

export async function searchIcons(query: string, limit = 5): Promise<IconEntry[]> {
  const index = await loadIconIndex()
  if (index.length === 0) return []

  const q = query.toLowerCase()

  const exact: IconEntry[] = []
  const partial: IconEntry[] = []

  for (const entry of index) {
    const nameMatch = entry.name.toLowerCase().includes(q)
    const keywordMatch = entry.keywords.some(k => k.toLowerCase() === q)

    if (nameMatch || keywordMatch) {
      exact.push(entry)
    } else if (entry.keywords.some(k => k.toLowerCase().includes(q))) {
      partial.push(entry)
    }
  }

  const results = [...exact, ...partial]
  if (results.length > 0) return results.slice(0, limit)

  const shuffled = [...index].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, limit)
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
