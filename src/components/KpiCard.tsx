import type { ReactNode } from 'react'

export function KpiCard({ label, value, hint, icon }: { label: string; value: string; hint?: string; icon?: ReactNode }) {
  return <div className="card kpi-card"><div className="kpi-icon">{icon}</div><div><span className="eyebrow">{label}</span><strong className="kpi-value">{value}</strong>{hint && <small>{hint}</small>}</div></div>
}
