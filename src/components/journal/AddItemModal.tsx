'use client'
import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { CATEGORIES, norm, formatSpecialties, FLAG_META, FLAG_OPTIONS, type ObjectRef, type Category, type ServiceRef, type AddInput, type PlanItem, type SpecialtyCount, type DailyPlanItemFlag } from './data'
import type { UI } from './ui'
import ObjectCombobox from './ObjectCombobox'
import SpecialtyEditor from './SpecialtyEditor'
import VehicleNumbersEditor from './VehicleNumbersEditor'
import WorkerPicker from './WorkerPicker'
import type { WorkerName } from '@/types'
import { WorkerIcon, MasterIcon, ItrIcon, TruckIcon } from './icons'

export interface AddCtx { objectId?: string; serviceId?: string }

interface Props {
  ctx: AddCtx
  objects: ObjectRef[]
  services: ServiceRef[]
  ui: UI
  planDate: string // active slice date — for the crew on-duty highlight
  onClose: () => void
  onAdd: (item: AddInput) => Promise<void>
  // When set, the modal edits an existing row instead of adding a new one.
  editItem?: PlanItem
  onSave?: (id: string, item: AddInput) => Promise<void>
}

export default function AddItemModal({ ctx, objects, services, ui, planDate, onClose, onAdd, editItem, onSave }: Props) {
  const isEdit = !!editItem
  const editObj = editItem ? objects.find(o => o.id === editItem.objectId) : undefined
  const preset = ctx.objectId ? objects.find(o => o.id === ctx.objectId) : undefined
  const [objQuery, setObjQuery] = useState(editObj?.name ?? preset?.name ?? '')
  const [objId, setObjId]       = useState<string | null>(editItem?.objectId ?? ctx.objectId ?? null)
  const [newCat, setNewCat]     = useState<Category['id']>(CATEGORIES[0].id)
  const [newAddr, setNewAddr]   = useState('')
  const [serviceId, setService] = useState(editItem?.serviceId ?? ctx.serviceId ?? services[0].id)
  const [work, setWork]         = useState(editItem?.work ?? '')
  const [workers, setWorkers]   = useState(editItem?.workers ?? 2)
  const [foremen, setForemen]   = useState(editItem?.foremen ?? 1)
  const [itr, setItr]           = useState(editItem?.itr ?? 0)
  const [vehicles, setVehicles] = useState(editItem?.vehicles ?? 0)
  const [specialties, setSpecialties] = useState<SpecialtyCount[]>(editItem?.specialties ?? [])
  const [showSpecialties, setShowSpecialties] = useState((editItem?.specialties.length ?? 0) > 0)
  const [vehicleNumbers, setVehicleNumbers] = useState<string[]>(editItem?.vehicleNumbers ?? [])
  const [showVehicles, setShowVehicles] = useState((editItem?.vehicleNumbers.length ?? 0) > 0)
  const [workerNames, setWorkerNames] = useState<WorkerName[]>(editItem?.workerNames ?? [])
  const [showWorkers, setShowWorkers] = useState((editItem?.workerNames.length ?? 0) > 0)
  const [flag, setFlag]         = useState<DailyPlanItemFlag | null>(editItem?.flag ?? null)
  const [busy, setBusy]         = useState(false)

  // Existing object with exactly this name? → reuse, hide the new-object form.
  const exact = useMemo(() => objects.find(o => norm(o.name) === norm(objQuery)), [objects, objQuery])
  const isNew = objQuery.trim().length > 0 && !exact
  const valid = !!work.trim() && !!(objId || objQuery.trim()) && !busy

  const submit = async () => {
    if (!valid) return
    setBusy(true)
    try {
      const existingId = objId ?? exact?.id
      const object = existingId
        ? { id: existingId }
        : { newName: objQuery.trim(), categoryId: newCat, address: newAddr.trim() || objQuery.trim() }
      const input: AddInput = { object, serviceId, work: work.trim(), workers, foremen, itr, vehicles, specialties: specialties.filter(s => s.count > 0), vehicleNumbers, workerNames, flag }
      if (isEdit && editItem && onSave) await onSave(editItem.id, input)
      else await onAdd(input)
      onClose()
    } finally {
      setBusy(false)
    }
  }

  const num = (v: number, set: (n: number) => void, icon: React.ReactNode, lbl: string) => (
    <div>
      <label className={`${ui.label} mb-1 flex items-center gap-1`}>
        <span className="inline-flex w-3.5 justify-center">{icon}</span>{lbl}
      </label>
      <input
        type="number" min={0} value={v}
        onChange={e => set(Math.max(0, Number(e.target.value) || 0))}
        className={ui.input}
      />
    </div>
  )

  const modal = (
    <div className="fixed inset-0 z-[9990] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative z-10 w-full max-w-lg glass-popup rounded-2xl ${ui.text} shadow-2xl`}>
        <div className={`flex items-center justify-between px-5 py-4 border-b ${ui.border}`}>
          <span className="text-sm font-semibold">{isEdit ? '✎ Изменить запись плана' : '＋ Новая запись плана'}</span>
          <button onClick={onClose} className={`text-lg ${ui.textMuted} ${ui.hoverText}`}>✕</button>
        </div>

        <div className="p-5 space-y-4">
          {/* Object */}
          <div>
            <label className={`${ui.label} mb-1 block`}>Объект</label>
            <ObjectCombobox
              objects={objects} ui={ui}
              value={objQuery} onChange={setObjQuery}
              selectedId={objId} onSelect={setObjId}
              placeholder="введите или выберите объект…"
            />
          </div>

          {isNew && (
            <div className={`${ui.inset} ${ui.radiusSm} p-3 space-y-3`}>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`${ui.label} mb-1 block`}>Категория</label>
                  <select value={newCat} onChange={e => setNewCat(e.target.value)} className={ui.input}>
                    {CATEGORIES.map(c => <option key={c.id} value={c.id} className="text-black">{c.em} {c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className={`${ui.label} mb-1 block`}>Адрес (для наряда-допуска)</label>
                  <input value={newAddr} onChange={e => setNewAddr(e.target.value)} placeholder="можно совпадать с названием" className={ui.input} />
                </div>
              </div>
            </div>
          )}

          {/* Service */}
          <div>
            <label className={`${ui.label} mb-1 block`}>Служба</label>
            <div className="flex flex-wrap gap-1.5">
              {services.map(s => {
                const on = s.id === serviceId
                return (
                  <button
                    key={s.id} onClick={() => setService(s.id)}
                    className="px-2.5 py-1.5 rounded-xl text-xs border transition-all"
                    style={on
                      ? { color: s.color, borderColor: s.color + '80', background: s.color + '22' }
                      : { color: 'var(--text-muted)', borderColor: 'var(--border)' }}
                  >
                    {s.em} {s.name}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Work */}
          <div>
            <label className={`${ui.label} mb-1 block`}>Работа</label>
            <input value={work} onChange={e => setWork(e.target.value)} autoFocus placeholder="Что делаем на объекте…" className={ui.input}
              onKeyDown={e => { if (e.key === 'Enter') submit() }} />
          </div>

          {/* Тип строки — обычная или стоячая/условная (по распоряжению и т.п.) */}
          <div>
            <label className={`${ui.label} mb-1 block`}>Тип строки</label>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setFlag(null)}
                className="px-2.5 py-1.5 rounded-xl text-xs border transition-all"
                style={!flag
                  ? { color: 'var(--text-primary)', borderColor: 'var(--border-strong)', background: 'var(--bg-card-strong)' }
                  : { color: 'var(--text-muted)', borderColor: 'var(--border)' }}
              >
                обычная
              </button>
              {FLAG_OPTIONS.map(f => {
                const m = FLAG_META[f]
                const on = flag === f
                return (
                  <button
                    key={f} onClick={() => setFlag(f)}
                    className="px-2.5 py-1.5 rounded-xl text-xs border transition-all"
                    style={on
                      ? { color: m.color, borderColor: m.color + '80', background: m.bg }
                      : { color: 'var(--text-muted)', borderColor: 'var(--border)' }}
                  >
                    {m.em} {m.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {num(workers, setWorkers, <WorkerIcon className="w-3.5 h-3.5" />, 'Рабочие')}
            {num(foremen, setForemen, <MasterIcon className="w-3.5 h-3.5" />, 'Мастера')}
            {num(itr, setItr, <ItrIcon className="w-3.5 h-3.5" />, 'ИТР')}
            {num(vehicles, setVehicles, <TruckIcon className="w-3.5 h-3.5" />, 'Техника')}
          </div>

          {/* Optional detailed crew breakdown by specialty (11д+3эл+3итр) */}
          <div className={`${ui.inset} ${ui.radiusSm} p-3`}>
            <button
              onClick={() => setShowSpecialties(s => !s)}
              className={`flex items-center gap-2 text-xs ${ui.textSub} ${ui.hoverText} transition-colors w-full`}
            >
              <span>{showSpecialties ? '▾' : '▸'}</span>
              <span>Состав по специальностям</span>
              <span className={`ml-auto font-mono ${ui.textMuted}`}>{formatSpecialties(specialties) || 'не задан'}</span>
            </button>
            {showSpecialties && (
              <div className="mt-3">
                <SpecialtyEditor value={specialties} onChange={setSpecialties} ui={ui} />
              </div>
            )}
          </div>

          {/* Optional garage numbers (335, 196, 533с …) — prominent everywhere */}
          <div className={`${ui.inset} ${ui.radiusSm} p-3`}>
            <button
              onClick={() => setShowVehicles(s => !s)}
              className={`flex items-center gap-2 text-xs ${ui.textSub} ${ui.hoverText} transition-colors w-full`}
            >
              <span>{showVehicles ? '▾' : '▸'}</span>
              <span>№ машин (гаражные)</span>
              <span className={`ml-auto font-mono ${ui.textMuted}`}>{vehicleNumbers.join(', ') || 'не заданы'}</span>
            </button>
            {showVehicles && (
              <div className="mt-3">
                <VehicleNumbersEditor value={vehicleNumbers} onChange={setVehicleNumbers} ui={ui} />
              </div>
            )}
          </div>

          {/* Optional named crew — picked from this service, feeds the work permit */}
          <div className={`${ui.inset} ${ui.radiusSm} p-3`}>
            <button
              onClick={() => setShowWorkers(s => !s)}
              className={`flex items-center gap-2 text-xs ${ui.textSub} ${ui.hoverText} transition-colors w-full`}
            >
              <span>{showWorkers ? '▾' : '▸'}</span>
              <span>Состав по фамилиям</span>
              <span className={`ml-auto font-mono ${ui.textMuted}`}>{workerNames.length ? `${workerNames.length} чел.` : 'не задан'}</span>
            </button>
            {showWorkers && (
              <div className="mt-3">
                <WorkerPicker serviceId={serviceId} date={planDate} value={workerNames} onChange={setWorkerNames} />
              </div>
            )}
          </div>
        </div>

        <div className={`px-5 py-4 flex justify-end gap-2 border-t ${ui.border}`}>
          <button onClick={onClose} className={ui.ghostBtn}>Отмена</button>
          <button
            onClick={submit} disabled={!valid}
            className="px-5 py-2 rounded-xl text-sm font-semibold text-white transition-colors disabled:opacity-40"
            style={{ background: '#2563eb' }}
          >
            {isEdit ? 'Сохранить' : 'Добавить'}
          </button>
        </div>
      </div>
    </div>
  )

  if (typeof document === 'undefined') return null
  return createPortal(modal, document.body)
}
