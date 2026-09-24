import { Plus, Save, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { PageHeader } from '../components/PageHeader'
import { useBioLog } from '../context/BioLogContext'
import type { Role } from '../models'
import { formatNumber } from '../utils/format'

type Tab = 'areas' | 'analyses' | 'supplies' | 'rules' | 'users'
const tabs: { key: Tab; label: string }[] = [
  { key:'areas', label:'Áreas' }, { key:'analyses', label:'Análisis' }, { key:'supplies', label:'Insumos' }, { key:'rules', label:'Reglas' }, { key:'users', label:'Usuarios' }
]
const cleanCode = (value:string) => value.trim().toUpperCase().replace(/\s+/g,'-')

export function SettingsPage() {
  const { state, currentUser, saveArea, saveAnalysis, saveSupply, saveRule, saveUser, deleteEntity } = useBioLog()
  const [tab, setTab] = useState<Tab>('areas')
  const [bulkOpen, setBulkOpen] = useState(false)
  const [bulk, setBulk] = useState('')
  const [bulkMessage, setBulkMessage] = useState('')
  const isAdmin = currentUser?.role === 'admin'
  const activeAreas = state.areas.filter(x=>!x.deleted)
  const activeAnalyses = state.analyses.filter(x=>!x.deleted)
  const activeSupplies = state.supplies.filter(x=>!x.deleted)

  const canDeleteArea = (id:string) => !state.analyses.some(a=>!a.deleted&&a.areaId===id) && !state.samples.some(s=>!s.deleted&&s.areaId===id)
  const canDeleteAnalysis = (id:string) => !state.samples.some(s=>!s.deleted&&s.analysisId===id) && !state.rules.some(r=>!r.deleted&&r.analysisId===id)
  const canDeleteSupply = (id:string) => !state.rules.some(r=>!r.deleted&&r.supplyId===id)

  function bulkImport() {
    setBulkMessage('')
    const lines = bulk.split(/\r?\n/).map(x=>x.trim()).filter(Boolean).map(x=>x.split('\t'))
    try {
      if (tab==='areas') lines.forEach(c=>{const code=cleanCode(c[0]??''); if(!code||!c[1]) throw new Error('Formato: código [TAB] nombre [TAB] activo'); saveArea({id:code,code,name:c[1].trim(),active:(c[2]??'sí').toLowerCase()!=='no'})})
      else if (tab==='analyses') lines.forEach(c=>{const code=cleanCode(c[0]??''); if(!code||!c[1]||!c[2]) throw new Error('Formato: código [TAB] nombre [TAB] código área [TAB] jornal'); saveAnalysis({id:code,code,name:c[1].trim(),areaId:cleanCode(c[2]),jornalPerSample:Number(String(c[3]??'0').replace(',','.')),active:(c[4]??'sí').toLowerCase()!=='no'})})
      else if (tab==='supplies') lines.forEach(c=>{const code=cleanCode(c[0]??''); if(!code||!c[1]) throw new Error('Formato: código [TAB] nombre [TAB] unidad [TAB] presentación [TAB] contenido'); saveSupply({id:code,code,name:c[1].trim(),baseUnit:c[2]?.trim()||'unidad',presentation:c[3]?.trim()||'caja',quantityPerPresentation:Number(String(c[4]??'1').replace(',','.')),areaIds:(c[5]??'').split(',').map(cleanCode).filter(Boolean),active:(c[6]??'sí').toLowerCase()!=='no',notes:''})})
      else if (tab==='rules') lines.forEach(c=>{const analysisId=cleanCode(c[0]??''); const supplyId=cleanCode(c[1]??''); if(!analysisId||!supplyId) throw new Error('Formato: código análisis [TAB] código insumo [TAB] cantidad por muestra'); saveRule({id:`${analysisId}|${supplyId}`,analysisId,supplyId,quantityPerSample:Number(String(c[2]??'0').replace(',','.'))})})
      else throw new Error('La carga masiva de usuarios se gestiona fila por fila por seguridad.')
      setBulkMessage(`${lines.length} filas procesadas.`); setBulk('')
    } catch (e) { setBulkMessage(e instanceof Error?e.message:'No se pudo procesar.') }
  }

  if (!isAdmin) return <><PageHeader title="Configuración"/><div className="notice warn">Tu rol actual no permite modificar la configuración. Puedes consultar resultados desde las demás secciones.</div></>

  return <>
    <PageHeader title="Configuración" description="Catálogos y reglas que convierten las muestras en necesidades de jornales e insumos." actions={<button className="button ghost" onClick={()=>setBulkOpen(v=>!v)}>Pegar desde Excel</button>} />
    <div className="tabs">{tabs.map(t=><button key={t.key} className={`tab ${tab===t.key?'active':''}`} onClick={()=>{setTab(t.key);setBulkOpen(false)}}>{t.label}</button>)}</div>
    {bulkOpen && <div className="bulk-box"><label className="field"><span>Pega filas separadas por tabulaciones</span><textarea value={bulk} onChange={e=>setBulk(e.target.value)} placeholder={tab==='areas'?'MIC\tMicrobiología\tsí':tab==='analyses'?'ANA-A\tAnálisis A\tMIC\t0.02\tsí':tab==='supplies'?'RX\tReactivo X\tml\tfrasco\t100\tMIC\tsí':tab==='rules'?'ANA-A\tRX\t2':'Usuarios: edición individual'}/></label><div style={{display:'flex',gap:8,marginTop:8}}><button className="button primary" onClick={bulkImport}>Procesar filas</button>{bulkMessage&&<span className="notice" style={{padding:'8px 10px'}}>{bulkMessage}</span>}</div></div>}
    {tab==='areas' && <Areas/>}
    {tab==='analyses' && <Analyses/>}
    {tab==='supplies' && <Supplies/>}
    {tab==='rules' && <Rules/>}
    {tab==='users' && <Users/>}
  </>

  function Areas(){
    const [code,setCode]=useState(''); const [name,setName]=useState('')
    return <section className="card pad"><div className="card-head"><div><h2>Áreas</h2><p>Se eliminan solo si no tienen información asociada.</p></div></div><div className="toolbar"><label className="field"><span>Código</span><input value={code} onChange={e=>setCode(e.target.value)}/></label><label className="field grow"><span>Nombre</span><input value={name} onChange={e=>setName(e.target.value)}/></label><button className="button primary" onClick={()=>{const id=cleanCode(code);if(id&&name.trim()){saveArea({id,code:id,name:name.trim(),active:true});setCode('');setName('')}}}><Plus size={15}/>Agregar</button></div><div className="table-wrap"><table><thead><tr><th>Código</th><th>Nombre</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>{activeAreas.map(a=><tr key={a.id}><td className="td-strong">{a.code}</td><td><input className="inline-input" value={a.name} onChange={e=>saveArea({id:a.id,code:a.code,name:e.target.value,active:a.active})}/></td><td><select className="inline-input" value={a.active?'1':'0'} onChange={e=>saveArea({id:a.id,code:a.code,name:a.name,active:e.target.value==='1'})}><option value="1">Activa</option><option value="0">Inactiva</option></select></td><td><button className="button danger small" disabled={!canDeleteArea(a.id)} title={canDeleteArea(a.id)?'Eliminar':'Tiene información asociada'} onClick={()=>confirm('¿Eliminar esta área?')&&deleteEntity('area',a.id)}><Trash2 size={14}/></button></td></tr>)}</tbody></table></div></section>
  }

  function Analyses(){
    const [code,setCode]=useState('');const [name,setName]=useState('');const [area,setArea]=useState(activeAreas[0]?.id??'');const [jornal,setJornal]=useState(0)
    return <section className="card pad"><div className="card-head"><div><h2>Análisis</h2><p>El coeficiente de jornal admite decimales.</p></div></div><div className="toolbar"><label className="field"><span>Código</span><input value={code} onChange={e=>setCode(e.target.value)}/></label><label className="field grow"><span>Nombre</span><input value={name} onChange={e=>setName(e.target.value)}/></label><label className="field"><span>Área</span><select value={area} onChange={e=>setArea(e.target.value)}>{activeAreas.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></label><label className="field"><span>Jornal/muestra</span><input type="number" step="0.0001" min="0" value={jornal} onChange={e=>setJornal(Number(e.target.value))}/></label><button className="button primary" onClick={()=>{const id=cleanCode(code);if(id&&name&&area&&jornal>=0){saveAnalysis({id,code:id,name,areaId:area,jornalPerSample:jornal,active:true});setCode('');setName('');setJornal(0)}}}><Plus size={15}/>Agregar</button></div><div className="table-wrap"><table><thead><tr><th>Código</th><th>Nombre</th><th>Área</th><th>Jornal/muestra</th><th>Estado</th><th></th></tr></thead><tbody>{activeAnalyses.map(a=><tr key={a.id}><td className="td-strong">{a.code}</td><td><input className="inline-input" value={a.name} onChange={e=>saveAnalysis({...stripMetaAnalysis(a),name:e.target.value})}/></td><td><select className="inline-input" value={a.areaId} onChange={e=>saveAnalysis({...stripMetaAnalysis(a),areaId:e.target.value})}>{activeAreas.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></td><td><input className="inline-input" type="number" min="0" step="0.0001" value={a.jornalPerSample} onChange={e=>saveAnalysis({...stripMetaAnalysis(a),jornalPerSample:Number(e.target.value)})}/></td><td><select className="inline-input" value={a.active?'1':'0'} onChange={e=>saveAnalysis({...stripMetaAnalysis(a),active:e.target.value==='1'})}><option value="1">Activo</option><option value="0">Inactivo</option></select></td><td><button className="button danger small" disabled={!canDeleteAnalysis(a.id)} onClick={()=>confirm('¿Eliminar este análisis?')&&deleteEntity('analysis',a.id)}><Trash2 size={14}/></button></td></tr>)}</tbody></table></div></section>
  }

  function Supplies(){
    const [code,setCode]=useState('');const [name,setName]=useState('');const [unit,setUnit]=useState('unidad');const [presentation,setPresentation]=useState('caja');const [quantity,setQuantity]=useState(1)
    return <section className="card pad"><div className="card-head"><div><h2>Insumos</h2><p>La cantidad por presentación debe ser mayor que cero.</p></div></div><div className="toolbar"><label className="field"><span>Código</span><input value={code} onChange={e=>setCode(e.target.value)}/></label><label className="field grow"><span>Nombre</span><input value={name} onChange={e=>setName(e.target.value)}/></label><label className="field"><span>Unidad</span><input value={unit} onChange={e=>setUnit(e.target.value)}/></label><label className="field"><span>Presentación</span><input value={presentation} onChange={e=>setPresentation(e.target.value)}/></label><label className="field"><span>Contenido</span><input type="number" min="0.000001" step="any" value={quantity} onChange={e=>setQuantity(Number(e.target.value))}/></label><button className="button primary" onClick={()=>{const id=cleanCode(code);if(id&&name&&quantity>0){saveSupply({id,code:id,name,baseUnit:unit,presentation,quantityPerPresentation:quantity,areaIds:[],active:true,notes:''});setCode('');setName('')}}}><Plus size={15}/>Agregar</button></div><div className="table-wrap"><table><thead><tr><th>Código</th><th>Nombre</th><th>Unidad</th><th>Presentación</th><th>Contenido</th><th>Estado</th><th></th></tr></thead><tbody>{activeSupplies.map(s=><tr key={s.id}><td className="td-strong">{s.code}</td><td><input className="inline-input" value={s.name} onChange={e=>saveSupply({...stripMetaSupply(s),name:e.target.value})}/></td><td><input className="inline-input" value={s.baseUnit} onChange={e=>saveSupply({...stripMetaSupply(s),baseUnit:e.target.value})}/></td><td><input className="inline-input" value={s.presentation} onChange={e=>saveSupply({...stripMetaSupply(s),presentation:e.target.value})}/></td><td><input className="inline-input" type="number" min="0.000001" step="any" value={s.quantityPerPresentation} onChange={e=>saveSupply({...stripMetaSupply(s),quantityPerPresentation:Number(e.target.value)})}/></td><td><select className="inline-input" value={s.active?'1':'0'} onChange={e=>saveSupply({...stripMetaSupply(s),active:e.target.value==='1'})}><option value="1">Activo</option><option value="0">Inactivo</option></select></td><td><button className="button danger small" disabled={!canDeleteSupply(s.id)} onClick={()=>confirm('¿Eliminar este insumo?')&&deleteEntity('supply',s.id)}><Trash2 size={14}/></button></td></tr>)}</tbody></table></div></section>
  }

  function Rules(){
    const [analysisId,setAnalysisId]=useState(activeAnalyses[0]?.id??'');const [supplyId,setSupplyId]=useState(activeSupplies[0]?.id??'');const [quantity,setQuantity]=useState(0)
    const rules=state.rules.filter(r=>!r.deleted)
    return <section className="card pad"><div className="card-head"><div><h2>Reglas de consumo</h2><p>Consumo de cada insumo por muestra procesada.</p></div></div><div className="toolbar"><label className="field grow"><span>Análisis</span><select value={analysisId} onChange={e=>setAnalysisId(e.target.value)}>{activeAnalyses.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></label><label className="field grow"><span>Insumo</span><select value={supplyId} onChange={e=>setSupplyId(e.target.value)}>{activeSupplies.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label><label className="field"><span>Cantidad/muestra</span><input type="number" min="0" step="any" value={quantity} onChange={e=>setQuantity(Number(e.target.value))}/></label><button className="button primary" onClick={()=>analysisId&&supplyId&&quantity>=0&&saveRule({id:`${analysisId}|${supplyId}`,analysisId,supplyId,quantityPerSample:quantity})}><Save size={15}/>Guardar regla</button></div><div className="table-wrap"><table><thead><tr><th>Análisis</th><th>Insumo</th><th>Cantidad por muestra</th><th></th></tr></thead><tbody>{rules.map(r=><tr key={r.id}><td>{activeAnalyses.find(a=>a.id===r.analysisId)?.name??r.analysisId}</td><td>{activeSupplies.find(s=>s.id===r.supplyId)?.name??r.supplyId}</td><td><input className="inline-input" type="number" min="0" step="any" value={r.quantityPerSample} onChange={e=>saveRule({id:r.id,analysisId:r.analysisId,supplyId:r.supplyId,quantityPerSample:Number(e.target.value)})}/></td><td><button className="button danger small" onClick={()=>confirm('¿Eliminar esta regla?')&&deleteEntity('rule',r.id)}><Trash2 size={14}/></button></td></tr>)}</tbody></table></div></section>
  }

  function Users(){
    const [email,setEmail]=useState('');const [name,setName]=useState('');const [role,setRole]=useState<Role>('consulta');const [areas,setAreas]=useState('')
    const users=state.users.filter(u=>!u.deleted)
    return <section className="card pad"><div className="card-head"><div><h2>Usuarios y permisos</h2><p>Roles simples: Administrador, Responsable de área y Consulta.</p></div></div><div className="toolbar"><label className="field grow"><span>Correo Microsoft</span><input type="email" value={email} onChange={e=>setEmail(e.target.value)}/></label><label className="field grow"><span>Nombre</span><input value={name} onChange={e=>setName(e.target.value)}/></label><label className="field"><span>Rol</span><select value={role} onChange={e=>setRole(e.target.value as Role)}><option value="admin">Administrador</option><option value="area">Responsable de área</option><option value="consulta">Consulta</option></select></label><label className="field"><span>Códigos de área</span><input value={areas} placeholder="MIC,HEM" onChange={e=>setAreas(e.target.value)}/></label><button className="button primary" onClick={()=>{const mail=email.trim().toLowerCase();if(mail){saveUser({id:mail,email:mail,displayName:name||mail,role,areaIds:areas.split(',').map(cleanCode).filter(Boolean),active:true});setEmail('');setName('');setAreas('')}}}><Plus size={15}/>Agregar</button></div><div className="table-wrap"><table><thead><tr><th>Usuario</th><th>Rol</th><th>Áreas</th><th>Estado</th><th></th></tr></thead><tbody>{users.map(u=><tr key={u.id}><td><strong>{u.displayName}</strong><br/><span className="td-muted">{u.email}</span></td><td><select className="inline-input" value={u.role} onChange={e=>saveUser({...stripMetaUser(u),role:e.target.value as Role})}><option value="admin">Administrador</option><option value="area">Responsable de área</option><option value="consulta">Consulta</option></select></td><td>{u.areaIds.join(', ')||'—'}</td><td>{u.active?'Activo':'Inactivo'}</td><td><button className="button danger small" onClick={()=>confirm('¿Eliminar este usuario?')&&deleteEntity('user',u.id)}><Trash2 size={14}/></button></td></tr>)}</tbody></table></div></section>
  }
}

function stripMetaAnalysis(a:any){const {createdAt,updatedAt,updatedBy,deleted,...rest}=a;return rest}
function stripMetaSupply(s:any){const {createdAt,updatedAt,updatedBy,deleted,...rest}=s;return rest}
function stripMetaUser(u:any){const {createdAt,updatedAt,updatedBy,deleted,...rest}=u;return rest}
