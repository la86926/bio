import * as XLSX from 'xlsx'
import type { BioLogState, ImportProblem, ImportResult } from '../models'
import { isoWeekRange } from '../core/date'
import { MONTHS } from '../utils/format'
import { calculateJournals, consolidateSupplies, totalJournals, totalSamples } from '../core/calculations'

const now = () => new Date().toISOString()
const actor = 'excel@biolog'
const baseMeta = () => ({ createdAt: now(), updatedAt: now(), updatedBy: actor })

type Row = Record<string, unknown>

const required: Record<string, string[]> = {
  Áreas: ['código_area', 'nombre_area', 'activo'],
  Análisis: ['código_analisis', 'nombre_analisis', 'código_area', 'jornal_por_muestra', 'activo'],
  Insumos: ['código_insumo', 'nombre_insumo', 'unidad_base', 'presentación', 'cantidad_por_presentación', 'activo'],
  Consumos: ['código_analisis', 'código_insumo', 'cantidad_por_muestra'],
  Muestras: ['año', 'semana', 'fecha_inicio', 'fecha_fin', 'mes', 'código_area', 'código_analisis', 'cantidad_muestras']
}

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, '_')
}

function boolValue(value: unknown): boolean {
  if (typeof value === 'boolean') return value
  const text = String(value ?? '').trim().toLowerCase()
  return ['1', 'true', 'sí', 'si', 'activo', 'x'].includes(text)
}

function numberValue(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  const normalized = String(value ?? '').trim().replace(',', '.')
  if (!normalized) return undefined
  const result = Number(normalized)
  return Number.isFinite(result) ? result : undefined
}

function textValue(value: unknown): string {
  return String(value ?? '').trim()
}

function excelDate(value: unknown): string {
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  if (typeof value === 'number') {
    const parsed = XLSX.SSF.parse_date_code(value)
    if (parsed) return `${parsed.y}-${String(parsed.m).padStart(2, '0')}-${String(parsed.d).padStart(2, '0')}`
  }
  const text = textValue(value)
  if (!text) return ''
  const date = new Date(text)
  return Number.isNaN(date.getTime()) ? text : date.toISOString().slice(0, 10)
}

function monthValue(value: unknown): number | undefined {
  const n = numberValue(value)
  if (n && n >= 1 && n <= 12) return n
  const text = textValue(value).toLowerCase()
  const index = MONTHS.findIndex(m => m.toLowerCase() === text)
  return index >= 0 ? index + 1 : undefined
}

function sheetRows(workbook: XLSX.WorkBook, sheetName: string, problems: ImportProblem[]): Row[] {
  const sheet = workbook.Sheets[sheetName]
  if (!sheet) {
    problems.push({ sheet: sheetName, row: 1, column: 'A', message: `Falta la hoja obligatoria “${sheetName}”.` })
    return []
  }
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '', raw: true })
  const headers = (matrix[0] ?? []).map(v => normalizeHeader(String(v)))
  for (const expected of required[sheetName]) {
    if (!headers.includes(normalizeHeader(expected))) {
      problems.push({ sheet: sheetName, row: 1, column: expected, message: `Falta la columna obligatoria “${expected}”.` })
    }
  }
  return matrix.slice(1).map(row => Object.fromEntries(headers.map((header, i) => [header, row[i]])))
}

function problem(problems: ImportProblem[], sheet: string, row: number, column: string, message: string) {
  problems.push({ sheet, row, column, message })
}

export function parseBioLogWorkbook(data: ArrayBuffer | Uint8Array): ImportResult {
  const workbook = XLSX.read(data, { type: 'array', cellDates: true })
  const problems: ImportProblem[] = []
  const areaRows = sheetRows(workbook, 'Áreas', problems)
  const analysisRows = sheetRows(workbook, 'Análisis', problems)
  const supplyRows = sheetRows(workbook, 'Insumos', problems)
  const ruleRows = sheetRows(workbook, 'Consumos', problems)
  const sampleRows = sheetRows(workbook, 'Muestras', problems)
  if (problems.some(p => p.row === 1)) return { problems }

  const areaCodes = new Set<string>()
  const areas = areaRows.flatMap((row, index) => {
    const r = index + 2
    const code = textValue(row['código_area'])
    const name = textValue(row['nombre_area'])
    if (!code && !name) return []
    if (!code) problem(problems, 'Áreas', r, 'código_area', 'El código de área es obligatorio.')
    if (!name) problem(problems, 'Áreas', r, 'nombre_area', 'El nombre del área es obligatorio.')
    if (areaCodes.has(code.toLowerCase())) problem(problems, 'Áreas', r, 'código_area', `Código duplicado: ${code}.`)
    areaCodes.add(code.toLowerCase())
    return [{ id: code, code, name, active: boolValue(row.activo), ...baseMeta() }]
  })

  const analysisCodes = new Set<string>()
  const analyses = analysisRows.flatMap((row, index) => {
    const r = index + 2
    const code = textValue(row['código_analisis'])
    const name = textValue(row['nombre_analisis'])
    if (!code && !name) return []
    const areaId = textValue(row['código_area'])
    const jornal = numberValue(row['jornal_por_muestra'])
    if (!code) problem(problems, 'Análisis', r, 'código_analisis', 'El código de análisis es obligatorio.')
    if (!name) problem(problems, 'Análisis', r, 'nombre_analisis', 'El nombre del análisis es obligatorio.')
    if (!areaCodes.has(areaId.toLowerCase())) problem(problems, 'Análisis', r, 'código_area', `El área “${areaId}” no existe.`)
    if (jornal === undefined || jornal < 0) problem(problems, 'Análisis', r, 'jornal_por_muestra', 'Debe ser un número mayor o igual que 0.')
    if (analysisCodes.has(code.toLowerCase())) problem(problems, 'Análisis', r, 'código_analisis', `Código duplicado: ${code}.`)
    analysisCodes.add(code.toLowerCase())
    return [{ id: code, code, name, areaId, jornalPerSample: jornal ?? 0, active: boolValue(row.activo), ...baseMeta() }]
  })

  const supplyCodes = new Set<string>()
  const supplies = supplyRows.flatMap((row, index) => {
    const r = index + 2
    const code = textValue(row['código_insumo'])
    const name = textValue(row['nombre_insumo'])
    if (!code && !name) return []
    const quantity = numberValue(row['cantidad_por_presentación'])
    if (!code) problem(problems, 'Insumos', r, 'código_insumo', 'El código de insumo es obligatorio.')
    if (!name) problem(problems, 'Insumos', r, 'nombre_insumo', 'El nombre del insumo es obligatorio.')
    if (quantity === undefined || quantity <= 0) problem(problems, 'Insumos', r, 'cantidad_por_presentación', 'Debe ser un número mayor que 0.')
    if (supplyCodes.has(code.toLowerCase())) problem(problems, 'Insumos', r, 'código_insumo', `Código duplicado: ${code}.`)
    supplyCodes.add(code.toLowerCase())
    return [{
      id: code,
      code,
      name,
      baseUnit: textValue(row['unidad_base']) || 'unidad',
      presentation: textValue(row['presentación']) || 'presentación',
      quantityPerPresentation: quantity ?? 1,
      areaIds: textValue(row['áreas']).split(',').map(x => x.trim()).filter(Boolean),
      active: boolValue(row.activo),
      notes: textValue(row['observaciones']),
      ...baseMeta()
    }]
  })

  const rules = ruleRows.flatMap((row, index) => {
    const r = index + 2
    const analysisId = textValue(row['código_analisis'])
    const supplyId = textValue(row['código_insumo'])
    const quantity = numberValue(row['cantidad_por_muestra'])
    if (!analysisCodes.has(analysisId.toLowerCase())) problem(problems, 'Consumos', r, 'código_analisis', `El análisis “${analysisId}” no existe.`)
    if (!supplyCodes.has(supplyId.toLowerCase())) problem(problems, 'Consumos', r, 'código_insumo', `El insumo “${supplyId}” no existe.`)
    if (quantity === undefined || quantity < 0) problem(problems, 'Consumos', r, 'cantidad_por_muestra', 'Debe ser un número mayor o igual que 0.')
    if (!analysisId || !supplyId) return []
    return [{ id: `${analysisId}|${supplyId}`, analysisId, supplyId, quantityPerSample: quantity ?? 0, ...baseMeta() }]
  })

  const sampleKeys = new Set<string>()
  const samples = sampleRows.flatMap((row, index) => {
    const r = index + 2
    const year = numberValue(row['año'])
    const week = numberValue(row['semana'])
    const areaId = textValue(row['código_area'])
    const analysisId = textValue(row['código_analisis'])
    const count = numberValue(row['cantidad_muestras'])
    if ([year, week, count].every(x => x === undefined) && !areaId && !analysisId) return []
    if (!year || year < 2000 || year > 2200) problem(problems, 'Muestras', r, 'año', 'Año inválido.')
    if (!week || week < 1 || week > 53) problem(problems, 'Muestras', r, 'semana', 'Semana inválida.')
    if (!areaCodes.has(areaId.toLowerCase())) problem(problems, 'Muestras', r, 'código_area', `El área “${areaId}” no existe.`)
    if (!analysisCodes.has(analysisId.toLowerCase())) problem(problems, 'Muestras', r, 'código_analisis', `El análisis “${analysisId}” no existe.`)
    if (count === undefined || count < 0) problem(problems, 'Muestras', r, 'cantidad_muestras', 'Debe ser un número mayor o igual que 0.')
    const key = `${year}-${week}-${analysisId}`
    if (sampleKeys.has(key)) problem(problems, 'Muestras', r, 'código_analisis', 'Registro semanal duplicado para el mismo análisis.')
    sampleKeys.add(key)
    const range = year && week ? isoWeekRange(year, week) : { startDate: '', endDate: '', month: 1 }
    const month = monthValue(row.mes) ?? range.month
    const startDate = excelDate(row['fecha_inicio']) || range.startDate
    const endDate = excelDate(row['fecha_fin']) || range.endDate
    return [{
      id: key,
      year: year ?? new Date().getFullYear(),
      week: week ?? 1,
      startDate,
      endDate,
      month,
      monthOverridden: Boolean(row.mes),
      areaId,
      analysisId,
      sampleCount: count ?? 0,
      ...baseMeta()
    }]
  })

  if (problems.length) return { problems }
  return { problems: [], state: { areas, analyses, supplies, rules, samples } }
}

export function createTemplateWorkbook(): XLSX.WorkBook {
  const wb = XLSX.utils.book_new()
  const add = (name: string, rows: Row[]) => XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), name)
  add('Áreas', [{ código_area: 'MIC', nombre_area: 'Microbiología', activo: true }])
  add('Análisis', [{ código_analisis: 'ANA-A', nombre_analisis: 'Análisis A', código_area: 'MIC', jornal_por_muestra: 0.02, activo: true }])
  add('Insumos', [{ código_insumo: 'RX', nombre_insumo: 'Reactivo X', unidad_base: 'ml', presentación: 'frasco', cantidad_por_presentación: 100, activo: true, áreas: 'MIC', observaciones: '' }])
  add('Consumos', [{ código_analisis: 'ANA-A', código_insumo: 'RX', cantidad_por_muestra: 2 }])
  add('Muestras', [{ año: new Date().getFullYear(), semana: 12, fecha_inicio: '', fecha_fin: '', mes: '', código_area: 'MIC', código_analisis: 'ANA-A', cantidad_muestras: 250 }])
  return wb
}

function addSheet(wb: XLSX.WorkBook, name: string, rows: Row[]) {
  const sheet = XLSX.utils.json_to_sheet(rows.length ? rows : [{ Sin_datos: '' }])
  sheet['!cols'] = Object.keys(rows[0] ?? { Sin_datos: '' }).map(key => ({ wch: Math.min(40, Math.max(12, key.length + 3)) }))
  XLSX.utils.book_append_sheet(wb, sheet, name.slice(0, 31))
}

export function createMonthlyExport(state: BioLogState, year: number, month: number): XLSX.WorkBook {
  const wb = XLSX.utils.book_new()
  const filters = { year, month }
  addSheet(wb, 'Resumen', [{ Año: year, Mes: MONTHS[month - 1], Muestras: totalSamples(state, filters), Jornales: totalJournals(state, filters) }])
  addSheet(wb, 'Muestras', state.samples.filter(s => !s.deleted && s.year === year && s.month === month).map(s => ({ Semana: s.week, Área: state.areas.find(a => a.id === s.areaId)?.name ?? s.areaId, Análisis: state.analyses.find(a => a.id === s.analysisId)?.name ?? s.analysisId, Muestras: s.sampleCount, Inicio: s.startDate, Fin: s.endDate })))
  addSheet(wb, 'Jornales', calculateJournals(state, filters).map(j => ({ Semana: j.week, Área: state.areas.find(a => a.id === j.areaId)?.name ?? j.areaId, Análisis: state.analyses.find(a => a.id === j.analysisId)?.name ?? j.analysisId, Muestras: j.sampleCount, Jornales: j.journals })))
  addSheet(wb, 'Insumos', consolidateSupplies(state, filters).map(item => { const supply = state.supplies.find(s => s.id === item.supplyId)!; return { Insumo: supply?.name ?? item.supplyId, Cantidad_exacta: item.exactQuantity, Unidad: supply?.baseUnit ?? '', Presentación: supply ? `${supply.presentation} × ${supply.quantityPerPresentation} ${supply.baseUnit}` : '', Presentaciones_necesarias: item.presentations } }))
  return wb
}

export function createAnnualExport(state: BioLogState, year: number): XLSX.WorkBook {
  const wb = XLSX.utils.book_new()
  addSheet(wb, 'Resumen anual', [{ Año: year, Muestras: totalSamples(state, { year }), Jornales: totalJournals(state, { year }) }])
  addSheet(wb, 'Resultados por mes', Array.from({ length: 12 }, (_, i) => ({ Mes: MONTHS[i], Muestras: totalSamples(state, { year, month: i + 1 }), Jornales: totalJournals(state, { year, month: i + 1 }) })))
  addSheet(wb, 'Jornales mensuales', Array.from({ length: 12 }, (_, i) => ({ Mes: MONTHS[i], Jornales: totalJournals(state, { year, month: i + 1 }) })))
  const supplyRows: Row[] = []
  state.supplies.filter(s => !s.deleted).forEach(supply => {
    Array.from({ length: 12 }, (_, i) => i + 1).forEach(month => {
      const item = consolidateSupplies(state, { year, month, supplyId: supply.id })[0]
      if (item?.exactQuantity) supplyRows.push({ Insumo: supply.name, Mes: MONTHS[month - 1], Cantidad_exacta: item.exactQuantity, Unidad: supply.baseUnit, Presentaciones_necesarias: item.presentations })
    })
  })
  addSheet(wb, 'Insumos mensuales', supplyRows)
  addSheet(wb, 'Muestras por análisis', state.analyses.filter(a => !a.deleted).map(a => ({ Análisis: a.name, Muestras: totalSamples(state, { year, analysisId: a.id }) })))
  addSheet(wb, 'Muestras por área', state.areas.filter(a => !a.deleted).map(a => ({ Área: a.name, Muestras: totalSamples(state, { year, areaId: a.id }) })))
  return wb
}

export function downloadWorkbook(workbook: XLSX.WorkBook, filename: string) {
  XLSX.writeFile(workbook, filename, { compression: true })
}

export function backupJson(state: BioLogState): Blob {
  return new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' })
}
