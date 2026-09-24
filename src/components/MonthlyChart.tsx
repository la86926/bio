import { ResponsiveContainer, Line, LineChart, CartesianGrid, Tooltip, XAxis, YAxis, BarChart, Bar, Legend } from 'recharts'
import { monthShort, formatNumber } from '../utils/format'

export interface Series { key: string; label: string; values: number[] }

export function MonthlyChart({ series, type = 'line', height = 290 }: { series: Series[]; type?: 'line' | 'bar'; height?: number }) {
  const data = Array.from({ length: 12 }, (_, i) => Object.fromEntries([['month', monthShort(i + 1)], ...series.map(s => [s.key, s.values[i] ?? 0])]))
  const common = { data, margin: { top: 10, right: 8, left: -12, bottom: 0 } }
  const content = <>
    <CartesianGrid strokeDasharray="3 5" vertical={false} stroke="#e8ebf0" />
    <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={12}/>
    <YAxis tickLine={false} axisLine={false} fontSize={12} tickFormatter={(v) => formatNumber(Number(v), 1)}/>
    <Tooltip formatter={(v) => formatNumber(Number(v), 4)} contentStyle={{ borderRadius: 14, border: '1px solid #e3e7ee', boxShadow: '0 8px 30px rgba(15,23,42,.08)' }}/>
    {series.length > 1 && <Legend />}
    {series.map((s, index) => type === 'bar'
      ? <Bar key={s.key} dataKey={s.key} name={s.label} fill={index === 0 ? '#607d72' : '#8295a8'} radius={[6, 6, 0, 0]} />
      : <Line key={s.key} type="monotone" dataKey={s.key} name={s.label} stroke={index === 0 ? '#607d72' : index === 1 ? '#8295a8' : '#a28276'} strokeWidth={2.4} dot={{ r: 3 }} activeDot={{ r: 5 }} />)}
  </>
  return <div style={{ width: '100%', height }}><ResponsiveContainer>{type === 'bar' ? <BarChart {...common}>{content}</BarChart> : <LineChart {...common}>{content}</LineChart>}</ResponsiveContainer></div>
}
