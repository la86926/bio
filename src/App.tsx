import { Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { DashboardPage } from './pages/DashboardPage'
import { SamplesPage } from './pages/SamplesPage'
import { MonthlyPage } from './pages/MonthlyPage'
import { AnnualPage } from './pages/AnnualPage'
import { SuppliesPage } from './pages/SuppliesPage'
import { JournalsPage } from './pages/JournalsPage'
import { ImportExportPage } from './pages/ImportExportPage'
import { SettingsPage } from './pages/SettingsPage'
import { useBioLog } from './context/BioLogContext'

export default function App() {
  const { loading } = useBioLog()
  if (loading) return <div className="loading-screen"><img className="brand-logo brand-logo-loading" src="https://raw.githubusercontent.com/la86926/bio/main/resultados-de-la-prueba.png" alt="BioLog" /><p>Cargando BioLog…</p></div>
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<DashboardPage />} />
        <Route path="muestras" element={<SamplesPage />} />
        <Route path="mensual" element={<MonthlyPage />} />
        <Route path="anual" element={<AnnualPage />} />
        <Route path="insumos" element={<SuppliesPage />} />
        <Route path="jornales" element={<JournalsPage />} />
        <Route path="excel" element={<ImportExportPage />} />
        <Route path="configuracion" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
