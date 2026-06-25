'use client'
import { useMemo } from 'react'
import type { ObjectRef, ServiceRef, PlanItem } from './data'
import { CATEGORIES, PERIOD_META, FLAG_META } from './data'
import type { UI } from './ui'
import type { AddCtx } from './AddItemModal'
import type { JournalShiftHeader, SpecialtyCount, DailyPlanItemFlag } from '@/types'
import PermitReadiness from './PermitReadiness'
import CrewDetail from './CrewDetail'
import TransportDetail from './TransportDetail'
import FlagSelect from './FlagSelect'
import { Counts } from './icons'
import { requiresWorkPermit } from '@/lib/highRiskWorks'

interface Props {
  items: PlanItem[]
  objects: ObjectRef[]
  services: ServiceRef[]
  ui: UI
  header: JournalShiftHeader | null
  onDelete: (id: string) => void
  onReassign: (id: string, serviceId: string) => void
  onOpenAdd: (ctx: AddCtx) => void
  onOpenPermit: (item: PlanItem) => void
  onEdit: (item: PlanItem) => void
  onUpdateSpecialties: (id: string, specialties: SpecialtyCount[]) => void
  onUpdateVehicleNumbers: (id: string, numbers: string[]) => void
  onUpdateFlag: (id: string, flag: DailyPlanItemFlag | null) => void
}

export default function TableView({ items, objects, services, ui, header, onDelete, onReassign, onOpenAdd, onOpenPermit, onEdit, onUpdateSpecialties, onUpdateVehicleNumbers, onUpdateFlag }: Props) {
  const svc = useMemo(() => new Map(services.map(s => [s.id, s])), [services])
  const obj = useMemo(() => new Map(objects.map(o => [o.id, o])), [objects])
  const cat = useMemo(() => new Map(CATEGORIES.map(c => [c.id, c])), [])

  const th = `text-left px-3 py-2 ${ui.label}`
  const td = `px-3 py-2 text-sm ${ui.text} align-middle`

  return (
    <div className={`${ui.card} overflow-x-auto`}>
      <table className="w-full border-collapse min-w-[820px]">
        <thead>
          <tr className={`border-b ${ui.border}`}>
            <th className={th}>Объект</th>
            <th className={th}>Категория</th>
            <th className={th}>Служба</th>
            <th className={th}>Работа</th>
            <th className={`${th} text-center`}>Смена</th>
            <th className={th}>Состав</th>
            <th className={`${th} text-center`}>Наряд</th>
            <th className={th}></th>
          </tr>
        </thead>
        <tbody className={`divide-y ${ui.divide}`}>
          {items.map(it => {
            const s = svc.get(it.serviceId)!
            const o = obj.get(it.objectId)!
            const c = cat.get(o.categoryId)
            const p = PERIOD_META[it.period]
            return (
              <tr key={it.id} className="group">
                <td className={td}>
                  <div className="font-medium">{o.name}</div>
                  <div className={`text-[11px] ${ui.textMuted}`}>{o.address}</div>
                </td>
                <td className={`${td} whitespace-nowrap`}>
                  <span className={`text-xs ${ui.textSub}`}>{c?.em} {c?.name}</span>
                </td>
                <td className={`${td} whitespace-nowrap`}>
                  <select
                    value={it.serviceId} onChange={e => onReassign(it.id, e.target.value)}
                    className="text-xs px-2 py-1 rounded-full border bg-transparent outline-none cursor-pointer"
                    style={{ color: s.color, borderColor: s.color + '55' }}
                  >
                    {services.map(s2 => <option key={s2.id} value={s2.id} className="text-black">{s2.em} {s2.name}</option>)}
                  </select>
                </td>
                <td className={`${td} w-full`}>
                  <div className={it.flag ? 'font-semibold' : undefined} style={it.flag ? { color: FLAG_META[it.flag].color } : undefined}>
                    {it.flag && <span className="mr-1">{FLAG_META[it.flag].em}</span>}{it.work}
                  </div>
                  <div className="mt-0.5"><FlagSelect flag={it.flag} ui={ui} onChange={f => onUpdateFlag(it.id, f)} /></div>
                </td>
                <td className={`${td} text-center whitespace-nowrap`} title={p.label}>{p.em}</td>
                <td className={td}>
                  <Counts workers={it.workers} masters={it.foremen} itr={it.itr} vehicles={it.vehicles} className={`${ui.textSub} whitespace-nowrap`} />
                  <div className="mt-1"><CrewDetail item={it} ui={ui} onUpdate={onUpdateSpecialties} /></div>
                  <div className="mt-1"><TransportDetail item={it} ui={ui} onUpdate={onUpdateVehicleNumbers} /></div>
                </td>
                <td className={`${td} text-center whitespace-nowrap`}>
                  {requiresWorkPermit(it.work) ? (
                    <PermitReadiness item={it} header={header} ui={ui} onOpen={() => onOpenPermit(it)} />
                  ) : (
                    <button
                      onClick={() => onOpenPermit(it)}
                      title="Оформить наряд-допуск из этой строки"
                      className={`text-xs px-2 py-1 ${ui.radiusSm} border ${ui.border} ${ui.textSub} ${ui.hoverText} hover:border-blue-400/40 transition-colors`}
                    >
                      📄 наряд
                    </button>
                  )}
                </td>
                <td className={`${td} text-center whitespace-nowrap`}>
                  <button onClick={() => onEdit(it)} title="Изменить запись" className={`${ui.textMuted} ${ui.hoverText} opacity-0 group-hover:opacity-100 transition-opacity mr-1`}>✎</button>
                  <button onClick={() => onDelete(it.id)} className={`${ui.textMuted} hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity`}>✕</button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <button
        onClick={() => onOpenAdd({})}
        className={`w-full py-2.5 text-sm border-t ${ui.border} ${ui.textMuted} ${ui.hoverText} transition-colors`}
      >
        ＋ строка
      </button>
    </div>
  )
}
