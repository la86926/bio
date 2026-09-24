import { Inbox } from 'lucide-react'
export function EmptyState({ text = 'No hay información para mostrar.' }: { text?: string }) { return <div className="empty-state"><Inbox size={26}/><span>{text}</span></div> }
