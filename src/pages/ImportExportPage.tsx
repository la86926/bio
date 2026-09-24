import { Download, FileJson, FileSpreadsheet, RotateCcw, Upload } from 'lucide-react'
import { useRef, useState } from 'react'
import { PageHeader } from '../components/PageHeader'
import { useBioLog } from '../context/BioLogContext'
import { backupJson, createAnnualExport, createMonthlyExport, createTemplateWorkbook, downloadWorkbook, parseBioLogWorkbook } from '../services/excel'
import type { BioLogState, ImportProblem } from '../models'
import { MONTHS } from '../utils/format'

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function ImportExportPage() {
  const { state, replaceImported, restoreBackup, currentUser } = useBioLog()
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [problems, setProblems] = useState<ImportProblem[]>([])
  const [message, setMessage] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const backupRef = useRef<HTMLInputElement>(null)
  const year = state.settings.selectedYear
  const isAdmin = currentUser?.role === 'admin'

  async function importExcel(file?: File) {
    if (!file) return
    setMessage('')
    const result = parseBioLogWorkbook(await file.arrayBuffer())
    setProblems(result.problems)
    if (result.problems.length) return
    replaceImported(result.state ?? {})
    setMessage(`Importación completada: ${file.name}`)
  }

  async function restore(file?: File) {
    if (!file) return
    try {
      const parsed = JSON.parse(await file.text()) as BioLogState
      if (!parsed.schemaVersion || !Array.isArray(parsed.areas) || !Array.isArray(parsed.samples)) throw new Error('Estructura inválida')
      if (!confirm('¿Restaurar este respaldo? Los datos actuales serán reemplazados.')) return
      restoreBackup(parsed)
      setMessage('Respaldo restaurado correctamente.')
    } catch {
      setMessage('El archivo JSON no es un respaldo válido de BioLog.')
    }
  }

  return <>
    <PageHeader title="Importar / Exportar" description="Intercambia información con Excel y genera respaldos completos sin incluir costos ni precios." />
    <div className="dashboard-grid">
      <section className="card pad">
        <div className="card-head"><div><h2>Importar Excel</h2><p>BioLog valida hojas, filas, columnas y relaciones antes de guardar.</p></div><Upload size={18}/></div>
        <div className="section-stack">
          <button className="button primary" disabled={!isAdmin} onClick={() => fileRef.current?.click()}><Upload size={16}/>Seleccionar .xlsx</button>
          <input ref={fileRef} hidden type="file" accept=".xlsx,.xls" onChange={e => void importExcel(e.target.files?.[0])}/>
          {!isAdmin && <div className="notice warn">Solo un administrador puede importar y reemplazar catálogos.</div>}
          <button className="button ghost" onClick={() => downloadWorkbook(createTemplateWorkbook(), 'BioLog_Plantilla.xlsx')}><FileSpreadsheet size={16}/>Descargar plantilla estándar</button>
        </div>
        {problems.length > 0 && <div style={{ marginTop: 14 }}><div className="notice error"><strong>No se importó ningún dato.</strong> Corrige los problemas indicados.</div><div className="table-wrap" style={{ marginTop: 10 }}><table><thead><tr><th>Hoja</th><th>Fila</th><th>Columna</th><th>Problema</th></tr></thead><tbody>{problems.map((p,i)=><tr key={`${p.sheet}-${p.row}-${p.column}-${i}`}><td>{p.sheet}</td><td>{p.row}</td><td><span className="code">{p.column}</span></td><td>{p.message}</td></tr>)}</tbody></table></div></div>}
      </section>

      <section className="card pad">
        <div className="card-head"><div><h2>Exportar resultados</h2><p>Archivos listos para continuar trabajando en Excel.</p></div><Download size={18}/></div>
        <label className="field" style={{ marginBottom: 10 }}><span>Mes para exportación mensual</span><select value={month} onChange={e=>setMonth(Number(e.target.value))}>{MONTHS.map((m,i)=><option key={m} value={i+1}>{m}</option>)}</select></label>
        <div className="section-stack">
          <button className="button primary" onClick={() => downloadWorkbook(createMonthlyExport(state,year,month),`BioLog_${year}_${String(month).padStart(2,'0')}.xlsx`)}><FileSpreadsheet size={16}/>Exportar mes</button>
          <button className="button subtle" onClick={() => downloadWorkbook(createAnnualExport(state,year),`BioLog_${year}_Anual.xlsx`)}><FileSpreadsheet size={16}/>Exportar año</button>
        </div>
      </section>

      <section className="card pad">
        <div className="card-head"><div><h2>Respaldo completo</h2><p>JSON estructurado con catálogos, reglas, muestras y auditoría.</p></div><FileJson size={18}/></div>
        <div className="section-stack">
          <button className="button subtle" onClick={()=>downloadBlob(backupJson(state),`BioLog_respaldo_${new Date().toISOString().slice(0,10)}.json`)}><Download size={16}/>Descargar respaldo JSON</button>
          <button className="button ghost" disabled={!isAdmin} onClick={()=>backupRef.current?.click()}><RotateCcw size={16}/>Restaurar respaldo</button>
          <input ref={backupRef} hidden type="file" accept="application/json,.json" onChange={e=>void restore(e.target.files?.[0])}/>
        </div>
      </section>

      <section className="card pad">
        <div className="card-head"><div><h2>Estructura esperada</h2><p>Cinco hojas obligatorias.</p></div></div>
        <div className="trace"><strong>Áreas</strong><div className="trace-row"><span>código_area · nombre_area · activo</span></div></div>
        <div className="trace"><strong>Análisis</strong><div className="trace-row"><span>código_analisis · nombre_analisis · código_area · jornal_por_muestra · activo</span></div></div>
        <div className="trace"><strong>Insumos / Consumos / Muestras</strong><div className="trace-row"><span>Usa la plantilla para conservar nombres y tipos exactos.</span></div></div>
      </section>
    </div>
    {message && <div className="notice" style={{ marginTop: 16 }}>{message}</div>}
  </>
}
