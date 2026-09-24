export const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]

export function formatNumber(value: number, maxDecimals = 4): string {
  if (!Number.isFinite(value)) return '0'
  const rounded = Number(value.toFixed(maxDecimals))
  const [integer, decimal] = String(rounded).split('.')
  const sign = integer.startsWith('-') ? '-' : ''
  const digits = sign ? integer.slice(1) : integer
  const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
  return `${sign}${grouped}${decimal ? `.${decimal}` : ''}`
}

export function monthShort(month: number): string {
  return MONTHS[month - 1]?.slice(0, 3) ?? ''
}
