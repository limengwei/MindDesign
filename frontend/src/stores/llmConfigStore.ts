import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface LLMConfig {
  protocol: 'openai' | 'claude'
  apiKey: string
  baseUrl: string
  model: string
}

export const useLLMConfigStore = defineStore('llmConfig', () => {
  const protocol = ref<LLMConfig['protocol']>('openai')
  const apiKey = ref('')
  const baseUrl = ref('https://api.openai.com/v1')
  const model = ref('gpt-4o')

  const isConfigured = computed(() => !!apiKey.value.trim() && !!baseUrl.value.trim() && !!model.value.trim())

  function getConfig(): LLMConfig {
    return {
      protocol: protocol.value,
      apiKey: apiKey.value,
      baseUrl: baseUrl.value,
      model: model.value,
    }
  }

  function loadFromStorage() {
    try {
      const raw = localStorage.getItem('minddesign:llmConfig')
      if (raw) {
        const data = JSON.parse(raw) as Partial<LLMConfig>
        // 兼容旧字段 provider
        const proto = (data as Record<string, unknown>).provider || data.protocol
        if (proto === 'claude') protocol.value = 'claude'
        else if (typeof proto === 'string') protocol.value = 'openai'
        if (data.apiKey) apiKey.value = data.apiKey
        if (data.baseUrl) baseUrl.value = data.baseUrl
        if (data.model) model.value = data.model
      }
    } catch {}
  }

  function saveToStorage() {
    localStorage.setItem(
      'minddesign:llmConfig',
      JSON.stringify(getConfig())
    )
  }

  loadFromStorage()

  return {
    protocol,
    apiKey,
    baseUrl,
    model,
    isConfigured,
    getConfig,
    loadFromStorage,
    saveToStorage,
  }
})
