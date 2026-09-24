import { useState } from 'react'
import { PageHeader } from '../components/PageHeader'
import { useBioLog } from '../context/BioLogContext'
import { consolidateSupplies, totalJournals, totalSamples } from '../core/calculations'
import { formatNumber, monthShort } from '../utils/format'

export function AnnualPage() {
  const { state } = useBioLog()
  const year = state.settings.selectedYear
  const [areaId, setAreaId] = useState('')
  const [analysisId, setAnalysisId] = useState('')
  const [supplyId, setSupplyId] = useState('')
  const base = { year, ...(areaId ? { areaId } : {}), ...(analysisId ? { analysisId } : {}) }
  const months = Array.from({ length: 12 }, (_, i) => i + 1)
  const analyses = state.analyses.filter(a => !a.deleted && (!areaId || a.areaId === areaId))
  const supplies = state.supplies.filter(s => !s.deleted && (!supplyId || s.id === supplyId))

  return <>
    <PageHeader title="Resumen anual" description="Matriz mensual de muestras, jornales e insumos con filtros por área, análisis e insumo." />
    <div className="filters">
      <label className="field"><span>Área</span><select value={areaId} onChange={e => { setAreaId(e.target.value); setAnalysisId('') }}><option value="">Todo el laboratorio</option>{state.areas.filter(a=>!a.deleted).map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
      <label className="field"><span>Análisis</span><select value={analysisId} onChange={e => setAnalysisId(e.target.value)}><option value="">Todos</option>{analyses.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
      <label className="field"><span>Insumo</span><select value={supplyId} onChange={e => setSupplyId(e.target.value)}><option value="">Todos</option>{state.supplies.filter(s=>!s.deleted).map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
    </div>

    <div className="section-stack">
      <section className="card pad">
        <div className="card-head"><div><h2>Muestras</h2><p>Total mensual y anual</p></div></div>
        <div className="table-wrap"><table className="month-matrix"><thead><tr><th>Concepto</th>{months.map(m=><th key={m}>{monthShort(m)}</th>)}<th>Total</th></tr></thead><tbody><tr><td className="td-strong">Muestras</td>{months.map(m=><td key={m}>{formatNumber(totalSamples(state, { ...base, month:m }),0)}</td>)}<td className="td-strong">{formatNumber(totalSamples(state, base),0)}</td></tr>{analyses.filter(a => !analysisId || a.id === analysisId).map(a => <tr key={a.id}><td>{a.name}</td>{months.map(m=><td key={m}>{formatNumber(totalSamples(state,{year,month:m,analysisId:a.id}),0)}</td>)}<td>{formatNumber(totalSamples(state,{year,analysisId:a.id}),0)}</td></tr>)}</tbody></table></div>
      </section>

      <section className="card pad">
        <div className="card-head"><div><h2>Jornales</h2><p>Coeficientes aplicados a las muestras de cada mes</p></div></div>
        <div className="table-wrap"><table className="month-matrix"><thead><tr><th>Concepto</th>{months.map(m=><th key={m}>{monthShort(m)}</th>)}<th>Total</th></tr></thead><tbody><tr><td className="td-strong">Jornales</td>{months.map(m=><td key={m}>{formatNumber(totalJournals(state,{...base,month:m}))}</td>)}<td className="td-strong">{formatNumber(totalJournals(state,base))}</td></tr>{analyses.filter(a => !analysisId || a.id === analysisId).map(a => <tr key={a.id}><td>{a.name}</td>{months.map(m=><td key={m}>{formatNumber(totalJournals(state,{year,month:m,analysisId:a.id}))}</td>)}<td>{formatNumber(totalJournals(state,{year,analysisId:a.id}))}</td></tr>)}</tbody></table></div>
      </section>

      <section className="card pad">
        <div className="card-head"><div><h2>Insumos</h2><p>Cantidad exacta consolidada por mes</p></div></div>
        <div className="table-wrap"><table className="month-matrix"><thead><tr><th>Insumo</th>{months.map(m=><th key={m}>{monthShort(m)}</th>)}<th>Total</th></tr></thead><tbody>{supplies.map(s => <tr key={s.id}><td className="td-strong">{s.name} <span className="td-muted">({s.baseUnit})</span></td>{months.map(m=>{const item=consolidateSupplies(state,{...base,month:m,supplyId:s.id})[0];return <td key={m}>{formatNumber(item?.exactQuantity??0)}</td>})}<td className="td-strong">{formatNumber(consolidateSupplies(state,{...base,supplyId:s.id})[0]?.exactQuantity??0)}</td></tr>)}</tbody></table></div>
      </section>
    </div>
  </>
}
