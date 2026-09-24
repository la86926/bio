import type { RuntimeConfig } from '../models'

const fallback: RuntimeConfig = {
  microsoft: {
    enabled: false,
    clientId: '',
    tenantId: 'common',
    siteId: '',
    dataListId: '',
    usersListId: ''
  }
}

export async function loadRuntimeConfig(): Promise<RuntimeConfig> {
  try {
    const response = await fetch(`${import.meta.env.BASE_URL}biolog-config.json`, { cache: 'no-store' })
    if (!response.ok) return fallback
    const parsed = await response.json() as RuntimeConfig
    return {
      microsoft: {
        ...fallback.microsoft,
        ...parsed.microsoft
      }
    }
  } catch {
    return fallback
  }
}
