import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type {
  Area,
  BioLogState,
  BioLogUser,
  ConsumptionRule,
  LabAnalysis,
  RuntimeConfig,
  Supply,
  WeeklySample
} from '../models'
import { demoState } from '../data/demo'
import { loadLocalState, saveLocalState } from '../services/db'
import { loadRuntimeConfig } from '../services/runtimeConfig'
import { microsoftAuth } from '../services/auth'
import { synchronize } from '../services/sync'

const now = () => new Date().toISOString()

interface ContextValue {
  state: BioLogState
  config?: RuntimeConfig
  loading: boolean
  syncStatus: 'local' | 'syncing' | 'synced' | 'pending' | 'error'
  syncError?: string
  currentUser?: BioLogUser
  accountEmail?: string
  saveArea(area: Omit<Area, 'createdAt' | 'updatedAt' | 'updatedBy'>): void
  saveAnalysis(analysis: Omit<LabAnalysis, 'createdAt' | 'updatedAt' | 'updatedBy'>): void
  saveSupply(supply: Omit<Supply, 'createdAt' | 'updatedAt' | 'updatedBy'>): void
  saveRule(rule: Omit<ConsumptionRule, 'createdAt' | 'updatedAt' | 'updatedBy'>): void
  saveSample(sample: Omit<WeeklySample, 'createdAt' | 'updatedAt' | 'updatedBy'>): void
  saveUser(user: Omit<BioLogUser, 'createdAt' | 'updatedAt' | 'updatedBy'>): void
  deleteEntity(type: 'area' | 'analysis' | 'supply' | 'rule' | 'sample' | 'user', id: string): void
  replaceImported(partial: Partial<BioLogState>): void
  restoreBackup(next: BioLogState): void
  setSelectedYear(year: number): void
  signIn(): Promise<void>
  signOut(): Promise<void>
  syncNow(): Promise<void>
}

const BioLogContext = createContext<ContextValue | undefined>(undefined)

function audit(state: BioLogState, action: 'create' | 'update' | 'delete' | 'import' | 'restore' | 'sync', entityType: string, entityId?: string, detail?: string, user = 'local@biolog'): BioLogState {
  return {
    ...state,
    audit: [{ id: crypto.randomUUID(), at: now(), user, action, entityType, entityId, detail }, ...state.audit].slice(0, 1000),
    pendingSync: true
  }
}

function upsert<T extends { id: string; createdAt: string; updatedAt: string; updatedBy: string }>(items: T[], incoming: Omit<T, 'createdAt' | 'updatedAt' | 'updatedBy'>, user: string): T[] {
  const index = items.findIndex(x => x.id === incoming.id)
  const timestamp = now()
  const item = {
    ...incoming,
    createdAt: index >= 0 ? items[index].createdAt : timestamp,
    updatedAt: timestamp,
    updatedBy: user
  } as T
  if (index < 0) return [item, ...items]
  return items.map((x, i) => i === index ? item : x)
}

export function BioLogProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<BioLogState>(demoState)
  const [config, setConfig] = useState<RuntimeConfig>()
  const [loading, setLoading] = useState(true)
  const [syncStatus, setSyncStatus] = useState<ContextValue['syncStatus']>('local')
  const [syncError, setSyncError] = useState<string>()
  const [accountEmail, setAccountEmail] = useState<string>()

  useEffect(() => {
    ;(async () => {
      const [stored, runtime] = await Promise.all([loadLocalState(), loadRuntimeConfig()])
      const initial = stored ?? demoState
      setState(initial)
      setConfig(runtime)
      await microsoftAuth.configure(runtime)
      const account = microsoftAuth.getAccount()
      setAccountEmail(account?.username)
      setSyncStatus(initial.pendingSync ? 'pending' : runtime.microsoft.enabled ? 'local' : 'local')
      setLoading(false)
    })()
  }, [])

  useEffect(() => {
    if (loading) return
    saveLocalState(state).catch(() => setSyncStatus('error'))
  }, [state, loading])

  useEffect(() => {
    const online = () => {
      if (state.pendingSync && config?.microsoft.enabled && accountEmail) void syncNow()
    }
    window.addEventListener('online', online)
    return () => window.removeEventListener('online', online)
  })

  const actor = accountEmail ?? 'local@biolog'
  const currentUser = useMemo(() => {
    if (!accountEmail) return state.users.find(u => u.id === 'local-admin')
    return state.users.find(u => u.active && u.email.toLowerCase() === accountEmail.toLowerCase())
      ?? { id: accountEmail, email: accountEmail, displayName: accountEmail, role: 'consulta' as const, areaIds: [], active: true, createdAt: now(), updatedAt: now(), updatedBy: accountEmail }
  }, [state.users, accountEmail])

  const mutate = useCallback((fn: (previous: BioLogState) => BioLogState) => {
    setState(previous => fn(previous))
    setSyncStatus(config?.microsoft.enabled ? 'pending' : 'local')
  }, [config])

  const saveArea: ContextValue['saveArea'] = area => mutate(previous => audit({ ...previous, areas: upsert(previous.areas, area, actor) }, previous.areas.some(x => x.id === area.id) ? 'update' : 'create', 'area', area.id, undefined, actor))
  const saveAnalysis: ContextValue['saveAnalysis'] = analysis => mutate(previous => audit({ ...previous, analyses: upsert(previous.analyses, analysis, actor) }, previous.analyses.some(x => x.id === analysis.id) ? 'update' : 'create', 'analysis', analysis.id, undefined, actor))
  const saveSupply: ContextValue['saveSupply'] = supply => mutate(previous => audit({ ...previous, supplies: upsert(previous.supplies, supply, actor) }, previous.supplies.some(x => x.id === supply.id) ? 'update' : 'create', 'supply', supply.id, undefined, actor))
  const saveRule: ContextValue['saveRule'] = rule => mutate(previous => audit({ ...previous, rules: upsert(previous.rules, rule, actor) }, previous.rules.some(x => x.id === rule.id) ? 'update' : 'create', 'rule', rule.id, undefined, actor))
  const saveSample: ContextValue['saveSample'] = sample => mutate(previous => audit({ ...previous, samples: upsert(previous.samples, sample, actor) }, previous.samples.some(x => x.id === sample.id) ? 'update' : 'create', 'sample', sample.id, undefined, actor))
  const saveUser: ContextValue['saveUser'] = user => mutate(previous => audit({ ...previous, users: upsert(previous.users, user, actor) }, previous.users.some(x => x.id === user.id) ? 'update' : 'create', 'user', user.id, undefined, actor))

  const deleteEntity: ContextValue['deleteEntity'] = (type, id) => mutate(previous => {
    const key = ({ area: 'areas', analysis: 'analyses', supply: 'supplies', rule: 'rules', sample: 'samples', user: 'users' } as const)[type]
    const collection = previous[key] as Array<{ id: string; updatedAt: string; updatedBy: string; deleted?: boolean }>
    const updated = collection.map(item => item.id === id ? { ...item, deleted: true, updatedAt: now(), updatedBy: actor } : item)
    return audit({ ...previous, [key]: updated } as BioLogState, 'delete', type, id, undefined, actor)
  })

  const replaceImported: ContextValue['replaceImported'] = partial => mutate(previous => audit({
    ...previous,
    ...partial,
    settings: { ...previous.settings, ...(partial.settings ?? {}) },
    audit: previous.audit,
    pendingSync: true,
    schemaVersion: 1
  }, 'import', 'excel', undefined, 'Importación desde Excel', actor))

  const restoreBackup: ContextValue['restoreBackup'] = next => mutate(() => audit({ ...next, pendingSync: true }, 'restore', 'backup', undefined, 'Restauración de respaldo', actor))

  const setSelectedYear = (year: number) => mutate(previous => ({ ...previous, settings: { ...previous.settings, selectedYear: year } }))

  async function signIn() {
    const account = await microsoftAuth.signIn()
    setAccountEmail(account.username)
    setSyncError(undefined)
    if (config?.microsoft.enabled) await syncNow()
  }

  async function signOut() {
    await microsoftAuth.signOut()
    setAccountEmail(undefined)
    setSyncStatus(state.pendingSync ? 'pending' : 'local')
  }

  async function syncNow() {
    if (!config?.microsoft.enabled) {
      setSyncStatus('local')
      return
    }
    if (!navigator.onLine) {
      setSyncStatus('pending')
      return
    }
    setSyncStatus('syncing')
    setSyncError(undefined)
    try {
      const result = await synchronize(state, config)
      const synced = audit({ ...result.state, pendingSync: false }, 'sync', 'state', undefined, 'Sincronización con SharePoint', actor)
      synced.pendingSync = false
      setState(synced)
      setSyncStatus('synced')
    } catch (error) {
      setSyncError(error instanceof Error ? error.message : 'No fue posible sincronizar.')
      setSyncStatus('error')
    }
  }

  const value: ContextValue = {
    state, config, loading, syncStatus, syncError, currentUser, accountEmail,
    saveArea, saveAnalysis, saveSupply, saveRule, saveSample, saveUser,
    deleteEntity, replaceImported, restoreBackup, setSelectedYear,
    signIn, signOut, syncNow
  }

  return <BioLogContext.Provider value={value}>{children}</BioLogContext.Provider>
}

export function useBioLog() {
  const context = useContext(BioLogContext)
  if (!context) throw new Error('useBioLog debe usarse dentro de BioLogProvider.')
  return context
}
