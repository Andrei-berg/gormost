'use client'
import { useMemo, useState } from 'react'
import { CATEGORIES, QUICK_CATEGORY, type ObjectRef, type ServiceRef, type PlanItem, type AddInput } from './data'
import type { UI } from './ui'
import type { AddCtx } from './AddItemModal'
import ObjectCombobox from './ObjectCombobox'
import { Counts, WorkerIcon, MasterIcon, ItrIcon, TruckIcon } from './icons'
import { requiresWorkPermit } from '@/lib/highRiskWorks'

function Stepper({ icon, label, v, set, ui }: { icon: React.ReactNode; label: string; v: number; set: (n: number) => void; ui: UI }) {
  return (
    <div className="inline-flex items-center gap-1.5" title={label}>
      <span className="inline-flex w-[18px] justify-center">{icon}</span>
      <div className={`inline-flex items-center ${ui.inset} ${ui.radiusSm} overflow-hidden`}>
        <button onClick={() => set(Math.max(0, v - 1))} className={`px-2 py-1 text-sm ${ui.textSub} ${ui.hoverText}`}>−</button>
        <span className={`w-6 text-center text-sm font-mono ${ui.text}`}>{v}</span>
        <button onClick={() => set(v + 1)} className={`px-2 py-1 text-sm ${ui.textSub} ${ui.hoverText}`}>+</button>
      </div>
    </div>
  )
}

interface Props {
  items: PlanItem[]
  objects: ObjectRef[]
  services: ServiceRef[]
  ui: UI
  onAdd: (item: AddInput) => Promise<void>
  onDelete: (id: string) => void
  onReassign: (id: string, serviceId: string) => void
  onOpenAdd: (ctx: AddCtx) => void
  onOpenPermit: (item: PlanItem) => void
}

export default function FeedView({ items, objects, services, ui, onAdd, onDelete, onReassign, onOpenAdd, onOpenPermit }: Props) {
  const svc = useMemo(() => new Map(services.map(s => [s.id, s])), [services])
  const cat = useMemo(() => new Map(CATEGORIES.map(c => [c.id, c])), [])

  const [work, setWork]         = useState('')
  const [objQuery, setObjQuery] = useState('')
  const [objId, setObjId]       = useState<string | null>(null)
  const [serviceId, setService] = useState(services[0].id)
  const [workers, setWorkers]   = useState(2)
  const [foremen, setForemen]   = useState(1)
  const [itr, setItr]           = useState(0)
  const [vehicles, setVehicles] = useState(0)
  const [busy, setBusy]         = useState(false)

  const canAdd = !!work.trim() && !!(objId || objQuery.trim()) && !busy

  const quickAdd = async () => {
    if (!canAdd) return
    setBusy(true)
    try {
      const object = objId
        ? { id: objId }
        : { newName: objQuery.trim(), categoryId: QUICK_CATEGORY, address: objQuery.trim() }
      await onAdd({ object, serviceId, work: work.trim(), workers, foremen, itr, vehicles })
      setWork(''); setObjQuery(''); setObjId(null)
    } finally {
      setBusy(false)
    }
  }

  // group items by object, preserving object order
  const groups = objects
    .map(o => ({ o, list: items.filter(i => i.objectId === o.id) }))
    .filter(g => g.list.length > 0)

  return (
    <div className="space-y-4">
      {/* Quick add bar */}
      <div className={`${ui.card} p-3`}>
        <div className="flex flex-col gap-2">
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              value={work} onChange={e => setWork(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') quickAdd() }}
              placeholder="＋ что планируем?…"
              className={`${ui.input} flex-1`}
            />
            <ObjectCombobox
              objects={objects} ui={ui}
              value={objQuery} onChange={setObjQuery}
              selectedId={objId} onSelect={setObjId}
              placeholder="объект…" className="sm:w-56"
            />
            <select value={serviceId} onChange={e => setService(e.target.value)} className={`${ui.input} sm:w-44`}>
              {services.map(s => <option key={s.id} value={s.id} className="text-black">{s.em} {s.name}</option>)}
            </select>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Stepper icon={<WorkerIcon />} label="Рабочие"  v={workers} set={setWorkers} ui={ui} />
            <Stepper icon={<MasterIcon />} label="Мастера"   v={foremen} set={setForemen} ui={ui} />
            <Stepper icon={<ItrIcon />}    label="ИТР"       v={itr}     set={setItr}     ui={ui} />
            <Stepper icon={<TruckIcon />}  label="Техника"   v={vehicles} set={setVehicles} ui={ui} />
            <button
              onClick={quickAdd} disabled={!canAdd}
              className="ml-auto px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-40 shrink-0"
              style={{ background: '#2563eb' }}
            >
              ⏎ Добавить
            </button>
          </div>
        </div>
        <div className="flex justify-end mt-2">
          <button onClick={() => onOpenAdd({})} className={`text-xs ${ui.textSub} hover:underline`}>
            ＋ детальная запись (техника, новый объект с адресом)
          </button>
        </div>
      </div>

      {/* Grouped feed */}
      {groups.length === 0 && (
        <div className={`text-center py-16 ${ui.textMuted} text-sm`}>Пусто — добавьте первую запись плана</div>
      )}

      {groups.map(({ o, list }) => {
        const c = cat.get(o.categoryId)
        return (
          <div key={o.id} className={`${ui.card} overflow-hidden`}>
            <div className={`flex items-center gap-2 px-4 py-2.5 border-b ${ui.border}`}>
              <span className="text-base">{c?.em}</span>
              <span className={`text-sm font-semibold ${ui.text}`}>{o.name}</span>
              <span className={`text-[11px] ${ui.textMuted}`}>· {o.address}</span>
              <span className={`ml-auto text-[10px] ${ui.textMuted} font-mono`}>{c?.name} · {list.length}</span>
            </div>
            <div className={`divide-y ${ui.divide}`}>
              {list.map(it => {
                const s = svc.get(it.serviceId)!
                return (
                  <div key={it.id} className="flex items-center gap-3 px-4 py-2.5 group">
                    {it.period === 'NIGHT' && <span title="Ночная смена" className="shrink-0">🌙</span>}
                    <span
                      className="text-[11px] px-2 py-0.5 rounded-full border shrink-0"
                      style={{ color: s.color, borderColor: s.color + '55', background: s.color + '18' }}
                    >
                      {s.em} {s.name}
                    </span>
                    <span className={`flex-1 text-sm ${ui.text} truncate`}>
                      {it.work}
                      {requiresWorkPermit(it.work) && (
                        <span title="Требуется наряд-допуск (п.15)" className="ml-1.5 text-[10px] px-1 py-0.5 rounded bg-amber-500/15 text-amber-500 border border-amber-500/30">🔺 наряд</span>
                      )}
                    </span>
                    <Counts workers={it.workers} masters={it.foremen} itr={it.itr} vehicles={it.vehicles}
                      className={`text-[11px] ${ui.textSub} shrink-0`} />
                    <button
                      onClick={() => onOpenPermit(it)}
                      title="Оформить наряд-допуск"
                      className={`text-[11px] ${ui.textMuted} ${ui.hoverText} shrink-0 transition-colors`}
                    >
                      📄
                    </button>
                    <select
                      value={it.serviceId}
                      onChange={e => onReassign(it.id, e.target.value)}
                      className={`text-[11px] bg-transparent ${ui.textMuted} outline-none cursor-pointer shrink-0`}
                      title="Сменить службу"
                    >
                      {services.map(s2 => <option key={s2.id} value={s2.id} className="text-black">{s2.em}</option>)}
                    </select>
                    <button
                      onClick={() => onDelete(it.id)}
                      className={`text-sm ${ui.textMuted} hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0`}
                    >
                      ✕
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
