import { useMemo, useState } from 'react'
import { PageHeader } from '../components/PageHeader'
import { MonthlyChart } from '../components/MonthlyChart'
import { EmptyState } from '../components/EmptyState'
import { useBioLog } from '../context/BioLogContext'
import { calculateJournals, journalsByMonth } from '../core/calculations'
import { formatNumber } from '../utils/format'

export function JournalsPage() {
  const { state } = useBioLog()
  const year = state.settings.selectedYear
  const [areaId, setAreaId] = useState('')
  const [analysisId, setAnalysisId] = useState('')
  const filters = { year, ...(areaId?{areaId}:{}), ...(analysisId?{analysisId}:{}) }
  const rows = useMemo(()=>calculateJournals(state,filters),[state,year,areaId,analysisId])
  const grouped = useMemo(()=>{
    const m=new Map<string,{samples:number;journals:number}>()
    rows.forEach(r=>{const x=m.get(r.analysisId)??{samples:0,journals:0};x.samples+=r.sampleCount;x.journals+=r.journals;m.set(r.analysisId,x)})
    return [...m.entries()].sort((a,b)=>b[1].journals-a[1].journals)
  },[rows])
  const analyses = state.analyses.filter(a=>!a.deleted&&(!areaId||a.areaId===areaId))
  return <>
    <PageHeader title="Jornales" description="Consulta los jornales requeridos sin redondeo automático y revisa su origen por análisis." />
    <div className="filters">
      <label className="field"><span>Área</span><select value={areaId} onChange={e=>{setAreaId(e.target.value);setAnalysisId('')}}><option value="">Todas</option>{state.areas.filter(a=>!a.deleted).map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
      <label className="field"><span>Análisis</span><select value={analysisId} onChange={e=>setAnalysisId(e.target.value)}><option value="">Todos</option>{analyses.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
    </div>
    <section className="card pad" style={{marginBottom:16}}><div className="card-head"><div><h2>Evolución mensual</h2><p>Año {year}</p></div></div><MonthlyChart series={[{key:'j',label:'Jornales',values:journalsByMonth(state,filters)}]}/></section>
    <section className="card pad"><div className="card-head"><div><h2>Consolidado por análisis</h2><p>Total del periodo filtrado</p></div></div>{grouped.length===0?<EmptyState/>:<div className="table-wrap"><table><thead><tr><th>Análisis</th><th>Área</th><th>Muestras</th><th>Coeficiente</th><th>Jornales</th></tr></thead><tbody>{grouped.map(([id,v])=>{const a=state.analyses.find(x=>x.id===id);return <tr key={id}><td className="td-strong">{a?.name??id}</td><td>{state.areas.find(x=>x.id===a?.areaId)?.name}</td><td>{formatNumber(v.samples,0)}</td><td>{formatNumber(a?.jornalPerSample??0)}</td><td className="td-strong">{formatNumber(v.journals)}</td></tr>})}</tbody></table></div>}</section>
  </>
}
