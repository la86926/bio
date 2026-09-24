export type Role = 'admin' | 'area' | 'consulta'

export interface AuditedEntity {
  createdAt: string
  updatedAt: string
  updatedBy: string
  deleted?: boolean
}

export interface Area extends AuditedEntity {
  id: string
  code: string
  name: string
  active: boolean
}

export interface LabAnalysis extends AuditedEntity {
  id: string
  code: string
  name: string
  areaId: string
  jornalPerSample: number
  active: boolean
}

export interface Supply extends AuditedEntity {
  id: string
  code: string
  name: string
  baseUnit: string
  presentation: string
  quantityPerPresentation: number
  areaIds: string[]
  active: boolean
  notes?: string
}

export interface ConsumptionRule extends AuditedEntity {
  id: string
  analysisId: string
  supplyId: string
  quantityPerSample: number
}

export interface WeeklySample extends AuditedEntity {
  id: string
  year: number
  week: number
  startDate: string
  endDate: string
  month: number
  areaId: string
  analysisId: string
  sampleCount: number
  monthOverridden?: boolean
}

export interface BioLogUser extends AuditedEntity {
  id: string
  email: string
  displayName: string
  role: Role
  areaIds: string[]
  active: boolean
}

export interface AuditEntry {
  id: string
  at: string
  user: string
  action: 'create' | 'update' | 'delete' | 'import' | 'restore' | 'sync'
  entityType: string
  entityId?: string
  detail?: string
}

export interface BioLogSettings {
  roundJornalsToInteger: boolean
  decimalPlaces: number
  selectedYear: number
}

export interface BioLogState {
  areas: Area[]
  analyses: LabAnalysis[]
  supplies: Supply[]
  rules: ConsumptionRule[]
  samples: WeeklySample[]
  users: BioLogUser[]
  audit: AuditEntry[]
  settings: BioLogSettings
  lastSyncedAt?: string
  pendingSync: boolean
  schemaVersion: number
}

export interface CalculationFilters {
  year?: number
  month?: number
  week?: number
  areaId?: string
  analysisId?: string
  supplyId?: string
}

export interface JournalContribution {
  sampleId: string
  areaId: string
  analysisId: string
  year: number
  month: number
  week: number
  sampleCount: number
  journals: number
}

export interface SupplyContribution {
  sampleId: string
  areaId: string
  analysisId: string
  supplyId: string
  year: number
  month: number
  week: number
  sampleCount: number
  exactQuantity: number
}

export interface ConsolidatedSupply {
  supplyId: string
  exactQuantity: number
  presentations: number
  contributions: SupplyContribution[]
}

export interface RuntimeConfig {
  microsoft: {
    enabled: boolean
    clientId: string
    tenantId: string
    siteId: string
    dataListId: string
    usersListId: string
  }
}

export interface ImportProblem {
  sheet: string
  row: number
  column: string
  message: string
}

export interface ImportResult {
  state?: Partial<BioLogState>
  problems: ImportProblem[]
}
