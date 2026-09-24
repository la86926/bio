import type { BioLogState, RuntimeConfig } from '../models'
import { microsoftAuth } from './auth'

type EntityType = 'area' | 'analysis' | 'supply' | 'rule' | 'sample' | 'user' | 'settings'
interface RemoteEntity {
  itemId?: string
  entityType: EntityType
  entityId: string
  payload: string
  updatedAt: string
  deleted: boolean
}

const graphRoot = 'https://graph.microsoft.com/v1.0'

function stateToEntities(state: BioLogState): RemoteEntity[] {
  const map = <T extends { id: string; updatedAt: string; deleted?: boolean }>(entityType: EntityType, items: T[]) =>
    items.map(item => ({ entityType, entityId: item.id, payload: JSON.stringify(item), updatedAt: item.updatedAt, deleted: Boolean(item.deleted) }))
  return [
    ...map('area', state.areas),
    ...map('analysis', state.analyses),
    ...map('supply', state.supplies),
    ...map('rule', state.rules),
    ...map('sample', state.samples),
    ...map('user', state.users),
    { entityType: 'settings' as const, entityId: 'settings', payload: JSON.stringify(state.settings), updatedAt: state.lastSyncedAt ?? new Date(0).toISOString(), deleted: false }
  ]
}

function newer<T extends { updatedAt: string }>(local: T | undefined, remote: T): T {
  if (!local) return remote
  return Date.parse(remote.updatedAt) > Date.parse(local.updatedAt) ? remote : local
}

export class GraphSharePointStore {
  constructor(private config: RuntimeConfig) {}

  private async request(path: string, init?: RequestInit) {
    const token = await microsoftAuth.token()
    const response = await fetch(`${graphRoot}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...(init?.headers ?? {})
      }
    })
    if (!response.ok) {
      const body = await response.text()
      throw new Error(`Microsoft Graph ${response.status}: ${body || response.statusText}`)
    }
    if (response.status === 204) return undefined
    return response.json()
  }

  private listPath(): string {
    const { siteId, dataListId } = this.config.microsoft
    if (!siteId || !dataListId) throw new Error('Falta configurar siteId o dataListId de SharePoint.')
    return `/sites/${encodeURIComponent(siteId)}/lists/${encodeURIComponent(dataListId)}`
  }

  async pull(): Promise<RemoteEntity[]> {
    const output: RemoteEntity[] = []
    let path = `${this.listPath()}/items?expand=fields&$top=999`
    while (path) {
      const data = await this.request(path.startsWith('http') ? path.replace(graphRoot, '') : path)
      for (const item of data.value ?? []) {
        const fields = item.fields ?? {}
        output.push({
          itemId: item.id,
          entityType: fields.EntityType,
          entityId: fields.EntityId,
          payload: fields.Payload ?? '{}',
          updatedAt: fields.UpdatedAt ?? new Date(0).toISOString(),
          deleted: Boolean(fields.Deleted)
        })
      }
      const next = data['@odata.nextLink'] as string | undefined
      path = next ? next.replace(graphRoot, '') : ''
    }
    return output.filter(x => x.entityType && x.entityId)
  }

  async sync(local: BioLogState): Promise<BioLogState> {
    const remote = await this.pull()
    const byKey = new Map(remote.map(item => [`${item.entityType}:${item.entityId}`, item]))
    const localEntities = stateToEntities(local)

    for (const entity of localEntities) {
      const key = `${entity.entityType}:${entity.entityId}`
      const remoteEntity = byKey.get(key)
      const body = {
        fields: {
          Title: key,
          EntityType: entity.entityType,
          EntityId: entity.entityId,
          Payload: entity.payload,
          UpdatedAt: entity.updatedAt,
          Deleted: entity.deleted
        }
      }
      if (!remoteEntity) {
        await this.request(`${this.listPath()}/items`, { method: 'POST', body: JSON.stringify(body) })
      } else if (Date.parse(entity.updatedAt) > Date.parse(remoteEntity.updatedAt)) {
        await this.request(`${this.listPath()}/items/${remoteEntity.itemId}/fields`, { method: 'PATCH', body: JSON.stringify(body.fields) })
      }
    }

    const merged = structuredClone(local)
    const collections: Record<string, keyof Pick<BioLogState, 'areas' | 'analyses' | 'supplies' | 'rules' | 'samples' | 'users'>> = {
      area: 'areas', analysis: 'analyses', supply: 'supplies', rule: 'rules', sample: 'samples', user: 'users'
    }
    for (const entity of remote) {
      if (entity.entityType === 'settings') continue
      const collection = collections[entity.entityType]
      if (!collection) continue
      try {
        const item = JSON.parse(entity.payload) as { id: string; updatedAt: string }
        const items = merged[collection] as Array<{ id: string; updatedAt: string }>
        const index = items.findIndex(x => x.id === item.id)
        if (index === -1) items.push(item)
        else items[index] = newer(items[index], item)
      } catch { /* malformed remote item is ignored; local data remains intact */ }
    }
    const remoteSettings = remote.find(x => x.entityType === 'settings')
    if (remoteSettings) {
      try { merged.settings = { ...merged.settings, ...JSON.parse(remoteSettings.payload) } } catch { /* keep local settings */ }
    }
    merged.lastSyncedAt = new Date().toISOString()
    merged.pendingSync = false
    return merged
  }
}
