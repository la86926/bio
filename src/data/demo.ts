import type { BioLogState } from '../models'
import { isoWeekRange } from '../core/date'

const now = new Date().toISOString()
const actor = 'local@biolog'
const meta = { createdAt: now, updatedAt: now, updatedBy: actor }
const year = new Date().getFullYear()

export const demoState: BioLogState = {
  areas: [
    { id: 'MIC', code: 'MIC', name: 'Microbiología', active: true, ...meta },
    { id: 'HEM', code: 'HEM', name: 'Hematología', active: true, ...meta },
    { id: 'BIO', code: 'BIO', name: 'Bioquímica', active: true, ...meta }
  ],
  analyses: [
    { id: 'ANA-A', code: 'ANA-A', name: 'Análisis A', areaId: 'MIC', jornalPerSample: 0.02, active: true, ...meta },
    { id: 'ANA-B', code: 'ANA-B', name: 'Análisis B', areaId: 'MIC', jornalPerSample: 0.03, active: true, ...meta },
    { id: 'HEM-D', code: 'HEM-D', name: 'Análisis D', areaId: 'HEM', jornalPerSample: 0.01, active: true, ...meta }
  ],
  supplies: [
    { id: 'RX', code: 'RX', name: 'Reactivo X', baseUnit: 'ml', presentation: 'frasco', quantityPerPresentation: 100, areaIds: ['MIC'], active: true, notes: '', ...meta },
    { id: 'TY', code: 'TY', name: 'Tubo de ensayo', baseUnit: 'unidad', presentation: 'caja', quantityPerPresentation: 100, areaIds: ['MIC', 'HEM'], active: true, notes: '', ...meta },
    { id: 'COL', code: 'COL', name: 'Colorante', baseUnit: 'ml', presentation: 'frasco', quantityPerPresentation: 500, areaIds: ['HEM'], active: true, notes: '', ...meta }
  ],
  rules: [
    { id: 'ANA-A|RX', analysisId: 'ANA-A', supplyId: 'RX', quantityPerSample: 2, ...meta },
    { id: 'ANA-A|TY', analysisId: 'ANA-A', supplyId: 'TY', quantityPerSample: 1, ...meta },
    { id: 'ANA-B|RX', analysisId: 'ANA-B', supplyId: 'RX', quantityPerSample: 0.5, ...meta },
    { id: 'HEM-D|TY', analysisId: 'HEM-D', supplyId: 'TY', quantityPerSample: 1, ...meta },
    { id: 'HEM-D|COL', analysisId: 'HEM-D', supplyId: 'COL', quantityPerSample: 1.5, ...meta }
  ],
  samples: [
    { id: `${year}-12-ANA-A`, year, week: 12, ...isoWeekRange(year, 12), areaId: 'MIC', analysisId: 'ANA-A', sampleCount: 250, ...meta },
    { id: `${year}-12-ANA-B`, year, week: 12, ...isoWeekRange(year, 12), areaId: 'MIC', analysisId: 'ANA-B', sampleCount: 180, ...meta },
    { id: `${year}-12-HEM-D`, year, week: 12, ...isoWeekRange(year, 12), areaId: 'HEM', analysisId: 'HEM-D', sampleCount: 420, ...meta },
    { id: `${year}-16-ANA-A`, year, week: 16, ...isoWeekRange(year, 16), areaId: 'MIC', analysisId: 'ANA-A', sampleCount: 215, ...meta },
    { id: `${year}-20-ANA-B`, year, week: 20, ...isoWeekRange(year, 20), areaId: 'MIC', analysisId: 'ANA-B', sampleCount: 190, ...meta }
  ],
  users: [
    { id: 'local-admin', email: actor, displayName: 'Administrador local', role: 'admin', areaIds: [], active: true, ...meta }
  ],
  audit: [],
  settings: { roundJornalsToInteger: false, decimalPlaces: 4, selectedYear: year },
  pendingSync: false,
  schemaVersion: 1
}
