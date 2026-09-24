import { useMemo, useState } from 'react'
import { PageHeader } from '../components/PageHeader'
import { MonthlyChart } from '../components/MonthlyChart'
import { EmptyState } from '../components/EmptyState'
import { useBioLog } from '../context/BioLogContext'
import { consolidateSupplies, supplyByMonth } from '../core/calculations'
import { formatNumber } from '../utils/format'

export function SuppliesPage() {
  const { state } = useBioLog()
  const year = state.settings.selectedYear
  const [areaId, setAreaId] = useState('')
  const [supplyId, setSupplyId] = useState('')
  const results = useMemo(() => consolidateSupplies(state, { year, ...(areaId ? { areaId } : {}), ...(supplyId ? { supplyId } : {}) }), [state, year, areaId, supplyId])
  const chartSupplies = (supplyId ? state.supplies.filter(s => s.id === supplyId) : state.supplies.filter(s => !s.deleted).slice(0, 3))
  return <>
    <PageHeader title="Insumos" description="Necesidad exacta, presentaciones comerciales y evolución mensual de los insumos consolidados." />
    <div className="filters">
      <label className="field"><span>Área</span><select value={areaId} onChange={e => setAreaId(e.target.value)}><option value="">Todas</option>{state.areas.filter(a=>!a.deleted).map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
      <label className="field"><span>Insumo</span><select value={supplyId} onChange={e => setSupplyId(e.target.value)}><option value="">Todos</option>{state.supplies.filter(s=>!s.deleted).map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
    </div>
    <section className="card pad" style={{ marginBottom: 16 }}>
      <div className="card-head"><div><h2>Consumo mensual</h2><p>Hasta tres series simultáneas para mantener el gráfico legible.</p></div></div>
      {chartSupplies.length ? <MonthlyChart series={chartSupplies.map((s,i)=>({key:`s${i}`,label:`${s.name} (${s.baseUnit})`,values:supplyByMonth(state,s.id,{year,...(areaId?{areaId}:{})})}))}/> : <EmptyState/>}
    </section>
    <section className="card pad">
      <div className="card-head"><div><h2>Necesidades del año</h2><p>Las presentaciones se calculan después de consolidar el consumo exacto.</p></div></div>
      {results.length === 0 ? <EmptyState/> : <div className="table-wrap"><table><thead><tr><th>Insumo</th><th>Cantidad exacta</th><th>Presentación</th><th>Presentaciones necesarias</th><th>Áreas</th></tr></thead><tbody>{results.map(item=>{const s=state.supplies.find(x=>x.id===item.supplyId); return <tr key={item.supplyId}><td className="td-strong">{s?.name??item.supplyId}</td><td>{formatNumber(item.exactQuantity)} {s?.baseUnit}</td><td>{s?.presentation} × {formatNumber(s?.quantityPerPresentation??0)} {s?.baseUnit}</td><td className="td-strong">{item.presentations}</td><td>{s?.areaIds.map(id=>state.areas.find(a=>a.id===id)?.name??id).join(', ') || 'Compartido'}</td></tr>})}</tbody></table></div>}
    </section>
  </>
}
