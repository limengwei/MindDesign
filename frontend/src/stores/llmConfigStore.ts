import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface LLMConfig {
  provider: 'openai' | 'deepseek' | 'glm' | 'custom'
  apiKey: string
  baseUrl: string
  model: string
}

const PROVIDER_PRESETS: Record<string, { baseUrl: string; model: string }> = {
  openai:    { baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o' },
  deepseek:  { baseUrl: 'https://api.deepseek.com/v1', model: 'deepseek-chat' },
  glm:       { baseUrl: 'https://open.bigmodel.cn/api/paas/v4', model: 'glm-4-plus' },
  custom:    { baseUrl: '', model: '' },
}

export const useLLMConfigStore = defineStore('llmConfig', () => {
  const provider = ref<LLMConfig['provider']>('openai')
  const apiKey = ref('')
  const baseUrl = ref('https://api.openai.com/v1')
  const model = ref('gpt-4o')

  const isConfigured = computed(() => !!apiKey.value.trim() && !!baseUrl.value.trim() && !!model.value.trim())

  function setProvider(p: LLMConfig['provider']) {
    provider.value = p
    const preset = PROVIDER_PRESETS[p]
    if (preset) {
      baseUrl.value = preset.baseUrl
      model.value = preset.model
    }
  }

  function getConfig(): LLMConfig {
    return {
      provider: provider.value,
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
        if (data.provider) provider.value = data.provider
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
    provider,
    apiKey,
    baseUrl,
    model,
    isConfigured,
    setProvider,
    getConfig,
    loadFromStorage,
    saveToStorage,
  }
})
