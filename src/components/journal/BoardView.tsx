'use client'
import { useMemo } from 'react'
import type { ObjectRef, ServiceRef, PlanItem } from './data'
import { CATEGORIES } from './data'
import type { UI } from './ui'
import type { AddCtx } from './AddItemModal'
import { Counts } from './icons'

interface Props {
  items: PlanItem[]
  objects: ObjectRef[]
  services: ServiceRef[]
  ui: UI
  pivot: 'service' | 'object'
  onDelete: (id: string) => void
  onReassign: (id: string, serviceId: string) => void
  onOpenAdd: (ctx: AddCtx) => void
}

export default function BoardView({ items, objects, services, ui, pivot, onDelete, onReassign, onOpenAdd }: Props) {
  const svc = useMemo(() => new Map(services.map(s => [s.id, s])), [services])
  const obj = useMemo(() => new Map(objects.map(o => [o.id, o])), [objects])
  const cat = useMemo(() => new Map(CATEGORIES.map(c => [c.id, c])), [])

  const columns =
    pivot === 'service'
      ? services.map(s => ({ key: s.id, title: `${s.em} ${s.name}`, accent: s.color, list: items.filter(i => i.serviceId === s.id), ctx: { serviceId: s.id } as AddCtx }))
      : objects
          .map(o => ({ o, list: items.filter(i => i.objectId === o.id) }))
          .filter(g => g.list.length > 0)
          .map(({ o, list }) => ({ key: o.id, title: `${cat.get(o.categoryId)?.em ?? ''} ${o.name}`, accent: '#64748b', list, ctx: { objectId: o.id } as AddCtx }))

  const Card = ({ it }: { it: PlanItem }) => {
    const s = svc.get(it.serviceId)!
    const o = obj.get(it.objectId)!
    return (
      <div className={`${ui.inset} ${ui.radiusSm} p-2.5 group`}>
        <div className="flex items-start justify-between gap-2">
          {pivot === 'service'
            ? <span className={`text-xs font-medium ${ui.text} leading-snug`}>{cat.get(o.categoryId)?.em} {o.name}</span>
            : <span className="text-[11px] px-1.5 py-0.5 rounded-full border" style={{ color: s.color, borderColor: s.color + '55', background: s.color + '18' }}>{s.em} {s.name}</span>}
          <button onClick={() => onDelete(it.id)} className={`text-xs ${ui.textMuted} hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity`}>✕</button>
        </div>
        <div className={`text-[13px] ${ui.text} mt-1 leading-snug`}>
          {it.period === 'NIGHT' && <span title="Ночная смена">🌙 </span>}{it.work}
        </div>
        <div className="flex items-center justify-between mt-2">
          <Counts workers={it.workers} masters={it.foremen} itr={it.itr} vehicles={it.vehicles}
            className={`text-[10px] ${ui.textSub}`} />
          <select
            value={it.serviceId} onChange={e => onReassign(it.id, e.target.value)}
            className={`text-[10px] bg-transparent ${ui.textMuted} outline-none cursor-pointer`} title="Сменить службу"
          >
            {services.map(s2 => <option key={s2.id} value={s2.id} className="text-black">{s2.em} {s2.name}</option>)}
          </select>
        </div>
      </div>
    )
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {columns.map(col => (
        <div key={col.key} className={`${ui.card} w-64 shrink-0 flex flex-col`} style={{ minHeight: '60vh' }}>
          <div className="flex items-center gap-2 px-3 py-2.5 border-b" style={{ borderColor: col.accent + '40' }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: col.accent }} />
            <span className={`text-xs font-semibold ${ui.text} truncate`}>{col.title}</span>
            <span className={`ml-auto text-[10px] ${ui.textMuted} font-mono`}>{col.list.length}</span>
          </div>
          <div className="flex-1 p-2 space-y-2 overflow-y-auto">
            {col.list.map(it => <Card key={it.id} it={it} />)}
            <button
              onClick={() => onOpenAdd(col.ctx)}
              className={`w-full py-2 ${ui.radiusSm} border border-dashed ${ui.border} text-xs ${ui.textMuted} ${ui.hoverText} transition-colors`}
            >
              ＋
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
