import { Pencil, Plus, Save, Trash2, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { PageHeader } from '../components/PageHeader'
import { EmptyState } from '../components/EmptyState'
import { useBioLog } from '../context/BioLogContext'
import { isoWeekRange, weeksInIsoYear } from '../core/date'
import { formatNumber, MONTHS } from '../utils/format'

interface FormState {
  editingId?: string
  year: number
  week: number
  areaId: string
  analysisId: string
  sampleCount: number
  month: number
  monthOverridden: boolean
}

export function SamplesPage() {
  const { state, saveSample, deleteEntity, currentUser } = useBioLog()
  const year = state.settings.selectedYear
  const activeAreas = state.areas.filter(a => a.active && !a.deleted)
  const defaultArea = activeAreas[0]?.id ?? ''
  const defaultAnalysis = state.analyses.find(a => a.active && !a.deleted && a.areaId === defaultArea)?.id ?? ''
  const defaultRange = isoWeekRange(year, 1)
  const [form, setForm] = useState<FormState>({ year, week: 1, areaId: defaultArea, analysisId: defaultAnalysis, sampleCount: 0, month: defaultRange.month, monthOverridden: false })
  const [filterArea, setFilterArea] = useState('')
  const [filterWeek, setFilterWeek] = useState('')
  const [error, setError] = useState('')
  const canEdit = currentUser?.role === 'admin' || currentUser?.role === 'area'

  const availableAreas = currentUser?.role === 'area' ? activeAreas.filter(a => currentUser.areaIds.includes(a.id)) : activeAreas
  const analysesForForm = state.analyses.filter(a => a.active && !a.deleted && a.areaId === form.areaId)
  const rows = useMemo(() => state.samples.filter(s => !s.deleted && s.year === year && (!filterArea || s.areaId === filterArea) && (!filterWeek || s.week === Number(filterWeek))).sort((a, b) => b.week - a.week || a.areaId.localeCompare(b.areaId)), [state.samples, year, filterArea, filterWeek])

  function changeWeek(week: number) {
    const range = isoWeekRange(form.year, week)
    setForm(f => ({ ...f, week, month: f.monthOverridden ? f.month : range.month }))
  }

  function changeArea(areaId: string) {
    const analysisId = state.analyses.find(a => a.active && !a.deleted && a.areaId === areaId)?.id ?? ''
    setForm(f => ({ ...f, areaId, analysisId }))
  }

  function reset() {
    const areaId = availableAreas[0]?.id ?? ''
    const analysisId = state.analyses.find(a => a.active && !a.deleted && a.areaId === areaId)?.id ?? ''
    const range = isoWeekRange(year, 1)
    setForm({ year, week: 1, areaId, analysisId, sampleCount: 0, month: range.month, monthOverridden: false })
    setError('')
  }

  function submit() {
    setError('')
    if (!form.areaId || !form.analysisId) return setError('Selecciona un área y un análisis.')
    if (form.sampleCount < 0 || !Number.isFinite(form.sampleCount)) return setError('La cantidad de muestras debe ser mayor o igual que 0.')
    const analysis = state.analyses.find(a => a.id === form.analysisId)
    if (!analysis || analysis.areaId !== form.areaId) return setError('El análisis no pertenece al área seleccionada.')
    const id = form.editingId ?? `${form.year}-${form.week}-${form.analysisId}`
    const duplicate = state.samples.find(s => !s.deleted && s.id !== form.editingId && s.year === form.year && s.week === form.week && s.analysisId === form.analysisId)
    if (duplicate) return setError('Ya existe un registro para este análisis en esa semana.')
    const range = isoWeekRange(form.year, form.week)
    saveSample({ id, year: form.year, week: form.week, startDate: range.startDate, endDate: range.endDate, month: form.month, monthOverridden: form.monthOverridden, areaId: form.areaId, analysisId: form.analysisId, sampleCount: form.sampleCount })
    reset()
  }

  function edit(id: string) {
    const item = state.samples.find(s => s.id === id)
    if (!item) return
    setForm({ editingId: item.id, year: item.year, week: item.week, areaId: item.areaId, analysisId: item.analysisId, sampleCount: item.sampleCount, month: item.month, monthOverridden: Boolean(item.monthOverridden) })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return <>
    <PageHeader title="Registro semanal" description="Ingresa las muestras procesadas por semana. BioLog calcula automáticamente jornales e insumos a partir de las reglas configuradas." />
    {canEdit && <section className="card pad" style={{ marginBottom: 16 }}>
      <div className="card-head"><div><h2>{form.editingId ? 'Editar registro' : 'Nuevo registro'}</h2><p>El mes se asigna automáticamente y puede corregirse manualmente.</p></div></div>
      <div className="form-grid">
        <label className="field"><span>Año</span><input type="number" value={form.year} min={2000} max={2200} onChange={e => setForm(f => ({ ...f, year: Number(e.target.value) }))}/></label>
        <label className="field"><span>Semana</span><input type="number" value={form.week} min={1} max={weeksInIsoYear(form.year)} onChange={e => changeWeek(Number(e.target.value))}/></label>
        <label className="field"><span>Área</span><select value={form.areaId} onChange={e => changeArea(e.target.value)}>{availableAreas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
        <label className="field"><span>Análisis</span><select value={form.analysisId} onChange={e => setForm(f => ({ ...f, analysisId: e.target.value }))}>{analysesForForm.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
        <label className="field"><span>Cantidad de muestras</span><input type="number" min={0} step={1} value={form.sampleCount} onChange={e => setForm(f => ({ ...f, sampleCount: Number(e.target.value) }))}/></label>
        <label className="field"><span>Mes asignado</span><select value={form.month} onChange={e => setForm(f => ({ ...f, month: Number(e.target.value), monthOverridden: true }))}>{MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}</select></label>
        <div className="field"><span>Periodo ISO</span><div className="notice">{isoWeekRange(form.year, form.week).startDate} → {isoWeekRange(form.year, form.week).endDate}</div></div>
        <div className="field"><span>Acciones</span><div style={{ display: 'flex', gap: 8 }}><button className="button primary" onClick={submit}><Save size={16}/>{form.editingId ? 'Guardar cambios' : 'Registrar'}</button>{form.editingId && <button className="button ghost" onClick={reset}><X size={16}/>Cancelar</button>}</div></div>
      </div>
      {error && <div className="notice error" style={{ marginTop: 12 }}>{error}</div>}
    </section>}

    <section className="card pad">
      <div className="card-head"><div><h2>Registros de {year}</h2><p>{formatNumber(rows.reduce((sum, r) => sum + r.sampleCount, 0), 0)} muestras visibles</p></div><Plus size={18}/></div>
      <div className="toolbar">
        <label className="field"><span>Área</span><select value={filterArea} onChange={e => setFilterArea(e.target.value)}><option value="">Todas</option>{activeAreas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
        <label className="field"><span>Semana</span><input type="number" placeholder="Todas" min={1} max={53} value={filterWeek} onChange={e => setFilterWeek(e.target.value)}/></label>
      </div>
      {rows.length === 0 ? <EmptyState text="No hay muestras registradas para estos filtros."/> : <div className="table-wrap"><table><thead><tr><th>Semana</th><th>Periodo</th><th>Mes</th><th>Área</th><th>Análisis</th><th>Muestras</th>{canEdit && <th>Acciones</th>}</tr></thead><tbody>{rows.map(row => <tr key={row.id}><td className="td-strong">{row.week}</td><td className="td-muted">{row.startDate}<br/>{row.endDate}</td><td>{MONTHS[row.month - 1]} {row.monthOverridden && <span className="pill warn">Manual</span>}</td><td>{state.areas.find(a => a.id === row.areaId)?.name ?? row.areaId}</td><td>{state.analyses.find(a => a.id === row.analysisId)?.name ?? row.analysisId}</td><td className="td-strong">{formatNumber(row.sampleCount, 0)}</td>{canEdit && <td><div className="table-actions"><button className="button ghost small" onClick={() => edit(row.id)}><Pencil size={14}/>Editar</button><button className="button danger small" onClick={() => { if (confirm('¿Eliminar este registro?')) deleteEntity('sample', row.id) }}><Trash2 size={14}/></button></div></td>}</tr>)}</tbody></table></div>}
    </section>
  </>
}
