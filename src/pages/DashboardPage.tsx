import { Activity, Boxes, FlaskConical, Layers3, TestTube2, UsersRound } from 'lucide-react'
import { useMemo, useState } from 'react'
import { KpiCard } from '../components/KpiCard'
import { MonthlyChart } from '../components/MonthlyChart'
import { PageHeader } from '../components/PageHeader'
import { useBioLog } from '../context/BioLogContext'
import { consolidateSupplies, journalsByMonth, samplesByMonth, supplyByMonth, totalJournals, totalSamples } from '../core/calculations'
import { formatNumber } from '../utils/format'

export function DashboardPage() {
  const { state } = useBioLog()
  const year = state.settings.selectedYear
  const [selectedSupply, setSelectedSupply] = useState(state.supplies.find(s => s.active && !s.deleted)?.id ?? '')
  const samples = totalSamples(state, { year })
  const journals = totalJournals(state, { year })
  const topSupplies = useMemo(() => consolidateSupplies(state, { year }).slice(0, 6), [state, year])
  const maxSupply = Math.max(1, ...topSupplies.map(x => x.exactQuantity))
  const selected = state.supplies.find(s => s.id === selectedSupply)

  return <>
    <PageHeader title="Panel general" description="Producción, jornales e insumos consolidados a partir de las muestras semanales registradas." />
    <div className="kpi-grid">
      <KpiCard label="Muestras del año" value={formatNumber(samples, 0)} icon={<TestTube2 size={18}/>} hint={`Año ${year}`} />
      <KpiCard label="Jornales acumulados" value={formatNumber(journals)} icon={<UsersRound size={18}/>} hint="Sin redondeo automático" />
      <KpiCard label="Áreas activas" value={String(state.areas.filter(a => a.active && !a.deleted).length)} icon={<Layers3 size={18}/>} hint="Configurables" />
      <KpiCard label="Análisis activos" value={String(state.analyses.filter(a => a.active && !a.deleted).length)} icon={<FlaskConical size={18}/>} hint="Con reglas de consumo" />
    </div>

    <div className="dashboard-grid">
      <section className="card">
        <div className="card-head"><div><h2>Muestras por mes</h2><p>Evolución mensual de la producción</p></div><Activity size={18}/></div>
        <MonthlyChart type="bar" series={[{ key: 'muestras', label: 'Muestras', values: samplesByMonth(state, { year }) }]} />
      </section>
      <section className="card">
        <div className="card-head"><div><h2>Jornales por mes</h2><p>Jornales calculados desde los coeficientes</p></div><UsersRound size={18}/></div>
        <MonthlyChart series={[{ key: 'jornales', label: 'Jornales', values: journalsByMonth(state, { year }) }]} />
      </section>
      <section className="card">
        <div className="card-head"><div><h2>Principales insumos</h2><p>Necesidad exacta acumulada del año</p></div><Boxes size={18}/></div>
        <div className="progress-list">
          {topSupplies.length === 0 ? <div className="empty-state">Sin consumos registrados.</div> : topSupplies.map(item => {
            const supply = state.supplies.find(s => s.id === item.supplyId)
            return <div className="progress-item" key={item.supplyId}><div className="progress-label"><strong>{supply?.name ?? item.supplyId}</strong><span>{formatNumber(item.exactQuantity)} {supply?.baseUnit}</span></div><div className="progress-bar"><span style={{ width: `${Math.max(2, item.exactQuantity / maxSupply * 100)}%` }}/></div></div>
          })}
        </div>
      </section>
      <section className="card">
        <div className="card-head"><div><h2>Consumo mensual de insumo</h2><p>Selecciona un insumo para seguir su evolución</p></div><Boxes size={18}/></div>
        <label className="field"><span>Insumo</span><select value={selectedSupply} onChange={e => setSelectedSupply(e.target.value)}>{state.supplies.filter(s => s.active && !s.deleted).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
        {selected && <MonthlyChart series={[{ key: 'consumo', label: `${selected.name} (${selected.baseUnit})`, values: supplyByMonth(state, selected.id, { year }) }]} height={235} />}
      </section>
    </div>
  </>
}
