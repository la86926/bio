import type { BioLogState, RuntimeConfig } from '../models'
import { GraphSharePointStore } from './graph'

export interface SyncResult {
  state: BioLogState
  status: 'synced' | 'local-only'
}

export async function synchronize(state: BioLogState, config: RuntimeConfig): Promise<SyncResult> {
  if (!config.microsoft.enabled) return { state: { ...state, pendingSync: false }, status: 'local-only' }
  const store = new GraphSharePointStore(config)
  const merged = await store.sync(state)
  return { state: merged, status: 'synced' }
}
