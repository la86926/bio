import type {
  BioLogState,
  CalculationFilters,
  ConsolidatedSupply,
  JournalContribution,
  SupplyContribution
} from '../models'

function matchFilters(
  item: { year: number; month: number; week: number; areaId: string; analysisId: string },
  filters: CalculationFilters
): boolean {
  return (!filters.year || item.year === filters.year)
    && (!filters.month || item.month === filters.month)
    && (!filters.week || item.week === filters.week)
    && (!filters.areaId || item.areaId === filters.areaId)
    && (!filters.analysisId || item.analysisId === filters.analysisId)
}

export function calculateJournals(state: BioLogState, filters: CalculationFilters = {}): JournalContribution[] {
  const analyses = new Map(state.analyses.filter(a => !a.deleted).map(a => [a.id, a]))
  return state.samples
    .filter(s => !s.deleted && matchFilters(s, filters))
    .flatMap(sample => {
      const analysis = analyses.get(sample.analysisId)
      if (!analysis) return []
      return [{
        sampleId: sample.id,
        areaId: sample.areaId,
        analysisId: sample.analysisId,
        year: sample.year,
        month: sample.month,
        week: sample.week,
        sampleCount: sample.sampleCount,
        journals: sample.sampleCount * analysis.jornalPerSample
      }]
    })
}

export function calculateSupplyContributions(state: BioLogState, filters: CalculationFilters = {}): SupplyContribution[] {
  const rulesByAnalysis = new Map<string, typeof state.rules>()
  state.rules.filter(r => !r.deleted).forEach(rule => {
    const list = rulesByAnalysis.get(rule.analysisId) ?? []
    list.push(rule)
    rulesByAnalysis.set(rule.analysisId, list)
  })

  const output: SupplyContribution[] = []
  for (const sample of state.samples.filter(s => !s.deleted && matchFilters(s, filters))) {
    for (const rule of rulesByAnalysis.get(sample.analysisId) ?? []) {
      if (filters.supplyId && rule.supplyId !== filters.supplyId) continue
      output.push({
        sampleId: sample.id,
        areaId: sample.areaId,
        analysisId: sample.analysisId,
        supplyId: rule.supplyId,
        year: sample.year,
        month: sample.month,
        week: sample.week,
        sampleCount: sample.sampleCount,
        exactQuantity: sample.sampleCount * rule.quantityPerSample
      })
    }
  }
  return output
}

export function consolidateSupplies(state: BioLogState, filters: CalculationFilters = {}): ConsolidatedSupply[] {
  const supplies = new Map(state.supplies.filter(s => !s.deleted).map(s => [s.id, s]))
  const grouped = new Map<string, SupplyContribution[]>()
  for (const contribution of calculateSupplyContributions(state, filters)) {
    const list = grouped.get(contribution.supplyId) ?? []
    list.push(contribution)
    grouped.set(contribution.supplyId, list)
  }

  return [...grouped.entries()].map(([supplyId, contributions]) => {
    const exactQuantity = contributions.reduce((sum, item) => sum + item.exactQuantity, 0)
    const supply = supplies.get(supplyId)
    const capacity = supply?.quantityPerPresentation ?? 0
    return {
      supplyId,
      exactQuantity,
      presentations: capacity > 0 ? Math.ceil(exactQuantity / capacity) : 0,
      contributions
    }
  }).sort((a, b) => b.exactQuantity - a.exactQuantity)
}

export function totalSamples(state: BioLogState, filters: CalculationFilters = {}): number {
  return state.samples
    .filter(s => !s.deleted && matchFilters(s, filters))
    .reduce((sum, item) => sum + item.sampleCount, 0)
}

export function totalJournals(state: BioLogState, filters: CalculationFilters = {}): number {
  return calculateJournals(state, filters).reduce((sum, item) => sum + item.journals, 0)
}

export function samplesByMonth(state: BioLogState, filters: CalculationFilters = {}): number[] {
  return Array.from({ length: 12 }, (_, index) => totalSamples(state, { ...filters, month: index + 1 }))
}

export function journalsByMonth(state: BioLogState, filters: CalculationFilters = {}): number[] {
  return Array.from({ length: 12 }, (_, index) => totalJournals(state, { ...filters, month: index + 1 }))
}

export function supplyByMonth(state: BioLogState, supplyId: string, filters: CalculationFilters = {}): number[] {
  return Array.from({ length: 12 }, (_, index) =>
    consolidateSupplies(state, { ...filters, month: index + 1, supplyId })[0]?.exactQuantity ?? 0
  )
}
