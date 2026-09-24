import { BarChart3, Boxes, CalendarRange, ClipboardList, Gauge, Menu, Settings, Sheet, UsersRound, X, Cloud, CloudOff, RefreshCw } from 'lucide-react'
import { NavLink, Outlet } from 'react-router-dom'
import { useState } from 'react'
import { useBioLog } from '../context/BioLogContext'

const items = [
  { to: '/', label: 'Inicio', icon: Gauge, end: true },
  { to: '/muestras', label: 'Muestras', icon: ClipboardList },
  { to: '/mensual', label: 'Análisis mensual', icon: CalendarRange },
  { to: '/anual', label: 'Resumen anual', icon: BarChart3 },
  { to: '/insumos', label: 'Insumos', icon: Boxes },
  { to: '/jornales', label: 'Jornales', icon: UsersRound },
  { to: '/excel', label: 'Importar / Exportar', icon: Sheet },
  { to: '/configuracion', label: 'Configuración', icon: Settings }
]

export function Layout() {
  const [open, setOpen] = useState(false)
  const { state, setSelectedYear, syncStatus, config, accountEmail, signIn, signOut, syncNow } = useBioLog()
  const years = Array.from(new Set([...state.samples.filter(x => !x.deleted).map(s => s.year), state.settings.selectedYear, new Date().getFullYear()])).sort((a, b) => b - a)
  const statusText = syncStatus === 'syncing' ? 'Sincronizando…' : syncStatus === 'synced' ? 'Sincronizado' : syncStatus === 'pending' ? 'Cambios pendientes' : syncStatus === 'error' ? 'Error de sincronización' : 'Modo local'
  const StatusIcon = syncStatus === 'synced' ? Cloud : CloudOff

  return <div className="app-shell">
    <aside className={`sidebar ${open ? 'open' : ''}`}>
      <div className="sidebar-head">
        <div className="logo-wrap"><img className="brand-logo" src={`${import.meta.env.BASE_URL}../resultados-de-la-prueba.png`} alt="BioLog" /><div><strong>BioLog</strong><span>Laboratorio</span></div></div>
        <button className="icon-button mobile-only" onClick={() => setOpen(false)} aria-label="Cerrar menú"><X size={20}/></button>
      </div>
      <nav>
        {items.map(({ to, label, icon: Icon, end }) => <NavLink key={to} to={to} end={end} onClick={() => setOpen(false)} className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}><Icon size={18}/><span>{label}</span></NavLink>)}
      </nav>
      <div className="sidebar-foot">
        <div className="sync-state"><StatusIcon size={16}/><div><strong>{statusText}</strong><span>{accountEmail ?? (config?.microsoft.enabled ? 'Microsoft no conectado' : 'Datos en este dispositivo')}</span></div></div>
        {config?.microsoft.enabled && <div className="sidebar-actions">
          {accountEmail ? <><button className="button subtle small" onClick={() => void syncNow()}><RefreshCw size={15}/>Sincronizar</button><button className="button ghost small" onClick={() => void signOut()}>Salir</button></> : <button className="button subtle small" onClick={() => void signIn()}>Conectar Microsoft</button>}
        </div>}
      </div>
    </aside>
    {open && <button className="scrim" aria-label="Cerrar menú" onClick={() => setOpen(false)} />}
    <main className="main-panel">
      <header className="topbar">
        <button className="icon-button mobile-only" onClick={() => setOpen(true)} aria-label="Abrir menú"><Menu size={21}/></button>
        <div className="topbar-spacer" />
        <label className="year-picker">Año<select value={state.settings.selectedYear} onChange={e => setSelectedYear(Number(e.target.value))}>{years.map(y => <option key={y}>{y}</option>)}</select></label>
      </header>
      <div className="page-container"><Outlet /></div>
    </main>
  </div>
}
