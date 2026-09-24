import type { BioLogState } from '../models'
import { weeksInIsoYear } from './date'

export interface ValidationIssue {
  field: string
  message: string
}

export function validateState(state: BioLogState): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const unique = <T>(items: T[], key: (item: T) => string, label: string) => {
    const seen = new Set<string>()
    for (const item of items) {
      const value = key(item).trim().toLowerCase()
      if (!value) continue
      if (seen.has(value)) issues.push({ field: label, message: `Código duplicado: ${key(item)}` })
      seen.add(value)
    }
  }

  unique(state.areas.filter(x => !x.deleted), x => x.code, 'areas.code')
  unique(state.analyses.filter(x => !x.deleted), x => x.code, 'analyses.code')
  unique(state.supplies.filter(x => !x.deleted), x => x.code, 'supplies.code')

  const areaIds = new Set(state.areas.filter(x => !x.deleted).map(x => x.id))
  const analysisIds = new Set(state.analyses.filter(x => !x.deleted).map(x => x.id))
  const supplyIds = new Set(state.supplies.filter(x => !x.deleted).map(x => x.id))

  for (const analysis of state.analyses.filter(x => !x.deleted)) {
    if (!areaIds.has(analysis.areaId)) issues.push({ field: analysis.code, message: 'Análisis sin área válida.' })
    if (analysis.jornalPerSample < 0) issues.push({ field: analysis.code, message: 'El jornal por muestra no puede ser negativo.' })
  }
  for (const supply of state.supplies.filter(x => !x.deleted)) {
    if (supply.quantityPerPresentation <= 0) issues.push({ field: supply.code, message: 'La cantidad por presentación debe ser mayor que cero.' })
  }
  for (const rule of state.rules.filter(x => !x.deleted)) {
    if (!analysisIds.has(rule.analysisId)) issues.push({ field: rule.id, message: 'Regla asociada a análisis inexistente.' })
    if (!supplyIds.has(rule.supplyId)) issues.push({ field: rule.id, message: 'Regla asociada a insumo inexistente.' })
    if (rule.quantityPerSample < 0) issues.push({ field: rule.id, message: 'El consumo por muestra no puede ser negativo.' })
  }
  const sampleKeys = new Set<string>()
  for (const sample of state.samples.filter(x => !x.deleted)) {
    const key = `${sample.year}-${sample.week}-${sample.analysisId}`
    if (sampleKeys.has(key)) issues.push({ field: sample.id, message: 'Registro semanal duplicado para el mismo análisis.' })
    sampleKeys.add(key)
    if (sample.sampleCount < 0) issues.push({ field: sample.id, message: 'La cantidad de muestras no puede ser negativa.' })
    if (!analysisIds.has(sample.analysisId)) issues.push({ field: sample.id, message: 'Registro con análisis inexistente.' })
    if (!areaIds.has(sample.areaId)) issues.push({ field: sample.id, message: 'Registro con área inexistente.' })
    if (sample.week < 1 || sample.week > weeksInIsoYear(sample.year)) issues.push({ field: sample.id, message: 'Número de semana fuera de rango.' })
    if (sample.month < 1 || sample.month > 12) issues.push({ field: sample.id, message: 'Mes fuera de rango.' })
  }
  return issues
}
