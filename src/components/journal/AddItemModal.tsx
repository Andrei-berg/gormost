'use client'
import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { CATEGORIES, norm, type ObjectRef, type Category, type ServiceRef, type AddInput } from './data'
import type { UI } from './ui'
import ObjectCombobox from './ObjectCombobox'
import { WorkerIcon, MasterIcon, ItrIcon, TruckIcon } from './icons'

export interface AddCtx { objectId?: string; serviceId?: string }

interface Props {
  ctx: AddCtx
  objects: ObjectRef[]
  services: ServiceRef[]
  ui: UI
  onClose: () => void
  onAdd: (item: AddInput) => Promise<void>
}

export default function AddItemModal({ ctx, objects, services, ui, onClose, onAdd }: Props) {
  const preset = ctx.objectId ? objects.find(o => o.id === ctx.objectId) : undefined
  const [objQuery, setObjQuery] = useState(preset?.name ?? '')
  const [objId, setObjId]       = useState<string | null>(ctx.objectId ?? null)
  const [newCat, setNewCat]     = useState<Category['id']>(CATEGORIES[0].id)
  const [newAddr, setNewAddr]   = useState('')
  const [serviceId, setService] = useState(ctx.serviceId ?? services[0].id)
  const [work, setWork]         = useState('')
  const [workers, setWorkers]   = useState(2)
  const [foremen, setForemen]   = useState(1)
  const [itr, setItr]           = useState(0)
  const [vehicles, setVehicles] = useState(0)
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
      await onAdd({ object, serviceId, work: work.trim(), workers, foremen, itr, vehicles })
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
          <span className="text-sm font-semibold">＋ Новая запись плана</span>
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

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {num(workers, setWorkers, <WorkerIcon className="w-3.5 h-3.5" />, 'Рабочие')}
            {num(foremen, setForemen, <MasterIcon className="w-3.5 h-3.5" />, 'Мастера')}
            {num(itr, setItr, <ItrIcon className="w-3.5 h-3.5" />, 'ИТР')}
            {num(vehicles, setVehicles, <TruckIcon className="w-3.5 h-3.5" />, 'Техника')}
          </div>
        </div>

        <div className={`px-5 py-4 flex justify-end gap-2 border-t ${ui.border}`}>
          <button onClick={onClose} className={ui.ghostBtn}>Отмена</button>
          <button
            onClick={submit} disabled={!valid}
            className="px-5 py-2 rounded-xl text-sm font-semibold text-white transition-colors disabled:opacity-40"
            style={{ background: '#2563eb' }}
          >
            Добавить
          </button>
        </div>
      </div>
    </div>
  )

  if (typeof document === 'undefined') return null
  return createPortal(modal, document.body)
}
