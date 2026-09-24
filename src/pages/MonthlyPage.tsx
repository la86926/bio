import { useMemo, useState } from 'react'
import { PageHeader } from '../components/PageHeader'
import { EmptyState } from '../components/EmptyState'
import { useBioLog } from '../context/BioLogContext'
import { calculateJournals, consolidateSupplies, totalJournals, totalSamples } from '../core/calculations'
import { formatNumber, MONTHS } from '../utils/format'

export function MonthlyPage() {
  const { state } = useBioLog()
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [areaId, setAreaId] = useState('')
  const year = state.settings.selectedYear
  const filters = { year, month, ...(areaId ? { areaId } : {}) }
  const samples = state.samples.filter(s => !s.deleted && s.year === year && s.month === month && (!areaId || s.areaId === areaId))
  const supplies = useMemo(() => consolidateSupplies(state, filters), [state, year, month, areaId])
  const journals = useMemo(() => calculateJournals(state, filters), [state, year, month, areaId])
  const byAnalysis = state.analyses.filter(a => !a.deleted && (!areaId || a.areaId === areaId)).map(a => ({
    analysis: a,
    samples: totalSamples(state, { year, month, analysisId: a.id })
  })).filter(x => x.samples > 0).sort((a, b) => b.samples - a.samples)

  return <>
    <PageHeader title="Análisis mensual" description="Consolidado del mes con trazabilidad hasta cada análisis que originó el consumo o los jornales." />
    <div className="filters">
      <label className="field"><span>Año</span><input value={year} readOnly /></label>
      <label className="field"><span>Mes</span><select value={month} onChange={e => setMonth(Number(e.target.value))}>{MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}</select></label>
      <label className="field"><span>Área</span><select value={areaId} onChange={e => setAreaId(e.target.value)}><option value="">Todas las áreas</option>{state.areas.filter(a => !a.deleted && a.active).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
    </div>
    <div className="kpi-grid">
      <div className="card kpi-card"><div><span className="eyebrow">Muestras</span><strong className="kpi-value">{formatNumber(totalSamples(state, filters), 0)}</strong><small>{MONTHS[month - 1]}</small></div></div>
      <div className="card kpi-card"><div><span className="eyebrow">Jornales</span><strong className="kpi-value">{formatNumber(totalJournals(state, filters))}</strong><small>Resultado exacto</small></div></div>
      <div className="card kpi-card"><div><span className="eyebrow">Análisis con actividad</span><strong className="kpi-value">{byAnalysis.length}</strong><small>En el filtro actual</small></div></div>
      <div className="card kpi-card"><div><span className="eyebrow">Insumos requeridos</span><strong className="kpi-value">{supplies.length}</strong><small>Consolidados sin duplicar</small></div></div>
    </div>

    <div className="split-grid">
      <section className="card pad">
        <div className="card-head"><div><h2>Insumos consolidados</h2><p>Primero se suma el consumo exacto y después se calculan las presentaciones.</p></div></div>
        {supplies.length === 0 ? <EmptyState /> : <div className="table-wrap"><table><thead><tr><th>Insumo</th><th>Cantidad exacta</th><th>Presentación</th><th>Presentaciones</th></tr></thead><tbody>{supplies.map(item => {
          const supply = state.supplies.find(s => s.id === item.supplyId)
          return <tr key={item.supplyId}><td className="td-strong">{supply?.name ?? item.supplyId}</td><td>{formatNumber(item.exactQuantity)} {supply?.baseUnit}</td><td>{supply?.presentation} × {formatNumber(supply?.quantityPerPresentation ?? 0)} {supply?.baseUnit}</td><td className="td-strong">{item.presentations}</td></tr>
        })}</tbody></table></div>}
      </section>
      <section className="card pad">
        <div className="card-head"><div><h2>Muestras por análisis</h2><p>Distribución del mes seleccionado</p></div></div>
        {byAnalysis.length === 0 ? <EmptyState /> : <div className="progress-list">{byAnalysis.map(item => <div className="progress-item" key={item.analysis.id}><div className="progress-label"><strong>{item.analysis.name}</strong><span>{formatNumber(item.samples, 0)}</span></div><div className="progress-bar"><span style={{ width: `${Math.max(3, item.samples / Math.max(...byAnalysis.map(x => x.samples)) * 100)}%` }}/></div></div>)}</div>}
      </section>
    </div>

    <div className="split-grid" style={{ marginTop: 16 }}>
      <section className="card pad">
        <div className="card-head"><div><h2>Trazabilidad de insumos</h2><p>Origen de cada cantidad consolidada</p></div></div>
        {supplies.map(item => {
          const supply = state.supplies.find(s => s.id === item.supplyId)
          const grouped = new Map<string, number>()
          item.contributions.forEach(c => grouped.set(c.analysisId, (grouped.get(c.analysisId) ?? 0) + c.exactQuantity))
          return <div className="trace" key={item.supplyId}><strong>{supply?.name ?? item.supplyId}</strong>{[...grouped.entries()].map(([analysisId, value]) => <div className="trace-row" key={analysisId}><span>{state.analyses.find(a => a.id === analysisId)?.name ?? analysisId}</span><span>{formatNumber(value)} {supply?.baseUnit}</span></div>)}<div className="trace-row"><strong>Total</strong><strong>{formatNumber(item.exactQuantity)} {supply?.baseUnit}</strong></div></div>
        })}
      </section>
      <section className="card pad">
        <div className="card-head"><div><h2>Trazabilidad de jornales</h2><p>Detalle por análisis</p></div></div>
        {journals.length === 0 ? <EmptyState /> : (() => {
          const grouped = new Map<string, number>()
          journals.forEach(j => grouped.set(j.analysisId, (grouped.get(j.analysisId) ?? 0) + j.journals))
          return <>{[...grouped.entries()].map(([analysisId, value]) => <div className="trace-row" key={analysisId}><span>{state.analyses.find(a => a.id === analysisId)?.name ?? analysisId}</span><strong>{formatNumber(value)}</strong></div>)}<div className="trace-row"><strong>Total</strong><strong>{formatNumber(journals.reduce((s, j) => s + j.journals, 0))}</strong></div></>
        })()}
      </section>
    </div>

    {samples.length > 0 && <section className="card pad" style={{ marginTop: 16 }}><div className="card-head"><div><h2>Registros semanales incluidos</h2><p>{samples.length} registros aportan al consolidado</p></div></div><div className="table-wrap"><table><thead><tr><th>Semana</th><th>Área</th><th>Análisis</th><th>Muestras</th></tr></thead><tbody>{samples.sort((a,b)=>a.week-b.week).map(s => <tr key={s.id}><td>{s.week}</td><td>{state.areas.find(a=>a.id===s.areaId)?.name}</td><td>{state.analyses.find(a=>a.id===s.analysisId)?.name}</td><td className="td-strong">{formatNumber(s.sampleCount,0)}</td></tr>)}</tbody></table></div></section>}
  </>
}
