'use client'
import { useState, useEffect, useCallback } from 'react'
import { createWorkPlan, createWorkPlanItem, createCrossServiceRequest, fetchUsers } from '@/lib/api'
import type { WorkPlan, AuthSession, ShiftType, User } from '@/types'
import { SERVICE_META } from '@/types'

// ── Shift slot helpers ─────────────────────────────────────────────────────

interface SlotOption {
  date: string
  shift: ShiftType
  label: string
}

function getPlanOptions(existing: WorkPlan[]): SlotOption[] {
  const taken = new Set(existing.map(p => `${p.plan_date}_${p.shift_type}`))
  const options: SlotOption[] = []
  const today = new Date()
  const dow = today.getDay()
  const dayNames = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']

  const add = (offset: number, shift: ShiftType) => {
    const d = new Date(today)
    d.setDate(d.getDate() + offset)
    const dateStr = d.toISOString().split('T')[0]
    if (taken.has(`${dateStr}_${shift}`)) return
    const dd = d.getDate().toString().padStart(2, '0')
    const mm = (d.getMonth() + 1).toString().padStart(2, '0')
    const shiftLabel = shift === 'DAY' ? '☀️ День · 07:30–19:00' : '🌙 Ночь · 19:00–07:00'
    options.push({ date: dateStr, shift, label: `${dayNames[d.getDay()]} ${dd}.${mm} · ${shiftLabel}` })
  }

  add(0, 'NIGHT')
  add(1, 'DAY'); add(1, 'NIGHT')
  if (dow === 5) { add(2, 'DAY'); add(2, 'NIGHT'); add(3, 'DAY'); add(3, 'NIGHT') }

  return options
}

function getDeadlineCountdown(): string {
  const now = new Date()
  const deadline = new Date(now)
  deadline.setHours(16, 0, 0, 0)
  if (now >= deadline) return 'Срок истёк'
  const diff = deadline.getTime() - now.getTime()
  const h = Math.floor(diff / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  return h > 0 ? `${h}ч ${m}м` : `${m} мин`
}

// ── Draft item types ───────────────────────────────────────────────────────

interface CrossServiceDraft {
  to_service_id: string
  description: string
  needed_count: number
  time_start: string
  time_end: string
}

interface DraftItem {
  _id: string  // temp client-side id
  location: string
  work_description: string
  time_start: string
  time_end: string
  required_workers: number
  required_foremen: number
  required_vehicles: number
  named_workers: string[]
  cross_service: CrossServiceDraft | null
  showNamed: boolean
  showCross: boolean
}

function emptyItem(): DraftItem {
  return {
    _id: Math.random().toString(36).slice(2),
    location: '',
    work_description: '',
    time_start: '07:30',
    time_end: '16:00',
    required_workers: 2,
    required_foremen: 1,
    required_vehicles: 0,
    named_workers: [],
    cross_service: null,
    showNamed: false,
    showCross: false,
  }
}

// ── Other services (excluding current) ────────────────────────────────────

const ALL_SERVICES = Object.entries(SERVICE_META).map(([id]) => id)

// ── Main component ─────────────────────────────────────────────────────────

interface Props {
  session: AuthSession
  existingPlans: WorkPlan[]
  onClose: () => void
  onSaved: () => void
}

export default function WorkPlanModal({ session, existingPlans, onClose, onSaved }: Props) {
  const options = getPlanOptions(existingPlans)
  const [selected, setSelected] = useState(options[0] ? `${options[0].date}_${options[0].shift}` : '')
  const [items, setItems] = useState<DraftItem[]>([emptyItem()])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [serviceUsers, setServiceUsers] = useState<User[]>([])
  const [workerSearch, setWorkerSearch] = useState<Record<string, string>>({})
  const [countdown, setCountdown] = useState(getDeadlineCountdown())

  // Deadline countdown timer
  useEffect(() => {
    const t = setInterval(() => setCountdown(getDeadlineCountdown()), 30000)
    return () => clearInterval(t)
  }, [])

  // Load service employees for named worker selection
  useEffect(() => {
    fetchUsers(true).then(all => {
      setServiceUsers(all.filter(u => u.service_id === session.service_id))
    })
  }, [session.service_id])

  const updateItem = useCallback((id: string, patch: Partial<DraftItem>) => {
    setItems(prev => prev.map(it => it._id === id ? { ...it, ...patch } : it))
  }, [])

  const removeItem = useCallback((id: string) => {
    setItems(prev => prev.filter(it => it._id !== id))
  }, [])

  const addNamedWorker = useCallback((itemId: string, name: string) => {
    if (!name.trim()) return
    setItems(prev => prev.map(it =>
      it._id === itemId && !it.named_workers.includes(name)
        ? { ...it, named_workers: [...it.named_workers, name] }
        : it
    ))
    setWorkerSearch(prev => ({ ...prev, [itemId]: '' }))
  }, [])

  const removeNamedWorker = useCallback((itemId: string, name: string) => {
    setItems(prev => prev.map(it =>
      it._id === itemId ? { ...it, named_workers: it.named_workers.filter(w => w !== name) } : it
    ))
  }, [])

  const handleCreate = async () => {
    if (!selected) return
    if (!session.service_id) {
      setError('У вашего аккаунта не указана служба. Назначьте в Админ-панели.')
      return
    }
    const filledItems = items.filter(it => it.location.trim() || it.work_description.trim())
    setError(null)
    setSaving(true)
    try {
      const [date, shift] = selected.split('_') as [string, ShiftType]
      const plan = await createWorkPlan(
        { service_id: session.service_id, plan_date: date, shift_type: shift },
        session.user_id
      )
      if (!plan) throw new Error('Не удалось создать план')

      for (let i = 0; i < filledItems.length; i++) {
        const it = filledItems[i]
        const item = await createWorkPlanItem({
          plan_id: plan.id,
          location: it.location.trim() || '—',
          work_description: it.work_description.trim() || '—',
          time_start: it.time_start || null,
          time_end: it.time_end || null,
          sort_order: i,
          notes: null,
          workers: it.named_workers,
          required_workers: it.required_workers,
          required_foremen: it.required_foremen,
          required_vehicles: it.required_vehicles,
          is_redirected: false,
          redirect_reason: null,
        })
        if (item && it.cross_service) {
          await createCrossServiceRequest({
            from_plan_item_id: item.id,
            from_plan_id: plan.id,
            from_service_id: session.service_id,
            to_service_id: it.cross_service.to_service_id,
            description: it.cross_service.description,
            needed_count: it.cross_service.needed_count,
            time_start: it.cross_service.time_start || null,
            time_end: it.cross_service.time_end || null,
            created_by: session.user_id,
          })
        }
      }
      onSaved()
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка при создании плана')
    } finally {
      setSaving(false)
    }
  }

  const otherServices = ALL_SERVICES.filter(id => id !== session.service_id)
  const deadlinePassed = countdown === 'Срок истёк'

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[999] flex items-start justify-center p-4 pt-6 overflow-y-auto"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="glass-strong rounded-2xl w-full max-w-4xl border border-white/10 shadow-2xl flex flex-col mb-6">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-white">📋 Новый план работ</h2>
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
              deadlinePassed
                ? 'bg-red-500/20 border-red-500/30 text-red-400'
                : 'bg-amber-500/20 border-amber-500/30 text-amber-400'
            }`}>
              <span>⏰</span>
              <span>До совещания 16:00: {countdown}</span>
            </div>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors text-xl leading-none">✕</button>
        </div>

        {/* Shift selector */}
        <div className="px-6 py-4 border-b border-white/10">
          <div className="text-xs text-white/40 uppercase tracking-widest mb-3">Выберите смену</div>
          {options.length === 0 ? (
            <div className="text-white/30 text-sm">Все ближайшие смены уже запланированы</div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {options.map(opt => {
                const key = `${opt.date}_${opt.shift}`
                return (
                  <button
                    key={key}
                    onClick={() => setSelected(key)}
                    className={`px-4 py-2 rounded-xl text-sm border transition-all ${
                      selected === key
                        ? 'bg-blue-600/30 border-blue-500/50 text-white font-medium'
                        : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {opt.label}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Items */}
        <div className="px-6 py-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-xs text-white/40 uppercase tracking-widest">Позиции плана ({items.length})</div>
            <button
              onClick={() => setItems(prev => [...prev, emptyItem()])}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600/20 border border-blue-500/30 text-blue-400 hover:bg-blue-600/30 text-sm transition-all"
            >
              + Добавить позицию
            </button>
          </div>

          {items.map((item, idx) => (
            <ItemCard
              key={item._id}
              item={item}
              index={idx}
              serviceUsers={serviceUsers}
              otherServices={otherServices}
              workerSearch={workerSearch[item._id] ?? ''}
              onWorkerSearchChange={val => setWorkerSearch(prev => ({ ...prev, [item._id]: val }))}
              onUpdate={patch => updateItem(item._id, patch)}
              onRemove={() => removeItem(item._id)}
              onAddWorker={name => addNamedWorker(item._id, name)}
              onRemoveWorker={name => removeNamedWorker(item._id, name)}
            />
          ))}

          {items.length === 0 && (
            <div className="text-center text-white/30 text-sm py-8 border-2 border-dashed border-white/10 rounded-xl">
              Нет позиций — нажмите «+ Добавить позицию»
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/10">
          {error && (
            <div className="mb-3 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
              {error}
            </div>
          )}
          <div className="flex gap-3">
            <button
              onClick={handleCreate}
              disabled={!selected || saving || options.length === 0}
              className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-medium text-sm transition-all"
            >
              {saving
                ? 'Создаётся...'
                : `Создать план${items.filter(it => it.location.trim() || it.work_description.trim()).length > 0
                    ? ` · ${items.filter(it => it.location.trim() || it.work_description.trim()).length} поз.`
                    : ''}`
              }
            </button>
            <button
              onClick={onClose}
              className="px-6 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/50 text-sm transition-all"
            >
              Отмена
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Item card sub-component ────────────────────────────────────────────────

interface ItemCardProps {
  item: DraftItem
  index: number
  serviceUsers: User[]
  otherServices: string[]
  workerSearch: string
  onWorkerSearchChange: (val: string) => void
  onUpdate: (patch: Partial<DraftItem>) => void
  onRemove: () => void
  onAddWorker: (name: string) => void
  onRemoveWorker: (name: string) => void
}

function ItemCard({
  item, index, serviceUsers, otherServices,
  workerSearch, onWorkerSearchChange,
  onUpdate, onRemove, onAddWorker, onRemoveWorker
}: ItemCardProps) {
  const filteredUsers = serviceUsers.filter(u =>
    !item.named_workers.includes(u.full_name) &&
    (workerSearch === '' || u.full_name.toLowerCase().includes(workerSearch.toLowerCase()))
  )

  const initCrossService = () => {
    if (item.cross_service) { onUpdate({ cross_service: null, showCross: false }); return }
    onUpdate({
      cross_service: {
        to_service_id: otherServices[0] ?? '',
        description: '',
        needed_count: 1,
        time_start: item.time_start,
        time_end: item.time_end,
      },
      showCross: true,
    })
  }

  return (
    <div className="glass rounded-xl p-4 border border-white/10 space-y-3">
      {/* Row 1: index + location + delete */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-bold text-white/30 w-6 shrink-0">#{index + 1}</span>
        <input
          type="text"
          value={item.location}
          onChange={e => onUpdate({ location: e.target.value })}
          placeholder="Объект / место работ"
          className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-blue-500/50"
        />
        <button
          onClick={onRemove}
          className="p-2 rounded-lg text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-all"
          title="Удалить позицию"
        >
          🗑️
        </button>
      </div>

      {/* Row 2: description */}
      <textarea
        value={item.work_description}
        onChange={e => onUpdate({ work_description: e.target.value })}
        placeholder="Описание работ"
        rows={2}
        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-blue-500/50 resize-none"
      />

      {/* Row 3: times + headcount */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2">
          <span className="text-xs text-white/40">Начало</span>
          <input
            type="time"
            value={item.time_start}
            onChange={e => onUpdate({ time_start: e.target.value })}
            className="bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500/50"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-white/40">Конец</span>
          <input
            type="time"
            value={item.time_end}
            onChange={e => onUpdate({ time_end: e.target.value })}
            className="bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500/50"
          />
        </div>
        <div className="flex items-center gap-1.5 ml-auto">
          <NumberInput label="Рабочих" value={item.required_workers} onChange={v => onUpdate({ required_workers: v })} />
          <NumberInput label="ИТР" value={item.required_foremen} onChange={v => onUpdate({ required_foremen: v })} />
          <NumberInput label="Водит." value={item.required_vehicles} onChange={v => onUpdate({ required_vehicles: v })} />
        </div>
      </div>

      {/* Row 4: named workers toggle */}
      <div>
        <button
          onClick={() => onUpdate({ showNamed: !item.showNamed })}
          className={`flex items-center gap-2 text-xs font-medium transition-colors ${
            item.named_workers.length > 0 ? 'text-emerald-400' : 'text-white/40 hover:text-white/70'
          }`}
        >
          <span>{item.showNamed ? '▾' : '▸'}</span>
          <span>👷 Назначить поимённо (опционально)</span>
          {item.named_workers.length > 0 && (
            <span className="bg-emerald-500/20 border border-emerald-500/30 px-1.5 py-0.5 rounded-full text-[10px]">
              {item.named_workers.length}
            </span>
          )}
        </button>
        {item.showNamed && (
          <div className="mt-2 pl-4 space-y-2">
            {/* Added workers */}
            {item.named_workers.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {item.named_workers.map(name => (
                  <span key={name} className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-xs text-emerald-300">
                    {name}
                    <button onClick={() => onRemoveWorker(name)} className="text-emerald-500/60 hover:text-red-400 transition-colors">×</button>
                  </span>
                ))}
              </div>
            )}
            {/* Search + add */}
            <div className="relative">
              <input
                type="text"
                value={workerSearch}
                onChange={e => onWorkerSearchChange(e.target.value)}
                placeholder="Поиск сотрудника..."
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-emerald-500/50"
              />
              {workerSearch && filteredUsers.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-slate-800 border border-white/10 rounded-xl shadow-2xl z-20 max-h-40 overflow-y-auto">
                  {filteredUsers.slice(0, 10).map(u => (
                    <button
                      key={u.user_id}
                      onClick={() => onAddWorker(u.full_name)}
                      className="w-full flex items-center justify-between px-3 py-2 hover:bg-white/10 text-left transition-colors"
                    >
                      <span className="text-xs text-white">{u.full_name}</span>
                      {u.position && <span className="text-[10px] text-white/40">{u.position}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Row 5: cross-service toggle */}
      <div>
        <button
          onClick={initCrossService}
          className={`flex items-center gap-2 text-xs font-medium transition-colors ${
            item.cross_service ? 'text-violet-400' : 'text-white/40 hover:text-white/70'
          }`}
        >
          <span>{item.showCross && item.cross_service ? '▾' : '▸'}</span>
          <span>🔗 Привлечь другую службу</span>
          {item.cross_service && (
            <span className="bg-violet-500/20 border border-violet-500/30 px-1.5 py-0.5 rounded-full text-[10px] text-violet-300">
              {SERVICE_META[item.cross_service.to_service_id]?.emoji ?? ''} запрос отправится
            </span>
          )}
        </button>
        {item.cross_service && item.showCross && (
          <div className="mt-2 pl-4 space-y-2">
            <div className="flex flex-wrap gap-2 items-start">
              {/* Service selector */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-white/40 shrink-0">Служба</span>
                <select
                  value={item.cross_service.to_service_id}
                  onChange={e => onUpdate({ cross_service: { ...item.cross_service!, to_service_id: e.target.value } })}
                  className="bg-slate-800 border border-white/10 rounded-lg px-2 py-1.5 text-sm text-white focus:outline-none focus:border-violet-500/50"
                >
                  {otherServices.map(sid => (
                    <option key={sid} value={sid}>{SERVICE_META[sid]?.emoji ?? ''} {sid}</option>
                  ))}
                </select>
              </div>
              {/* Count */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-white/40">Человек</span>
                <input
                  type="number" min={1} max={20}
                  value={item.cross_service.needed_count}
                  onChange={e => onUpdate({ cross_service: { ...item.cross_service!, needed_count: Number(e.target.value) } })}
                  className="w-16 bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-sm text-white text-center focus:outline-none focus:border-violet-500/50"
                />
              </div>
              {/* Time */}
              <div className="flex items-center gap-1.5">
                <input
                  type="time"
                  value={item.cross_service.time_start}
                  onChange={e => onUpdate({ cross_service: { ...item.cross_service!, time_start: e.target.value } })}
                  className="bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-violet-500/50"
                />
                <span className="text-white/30">–</span>
                <input
                  type="time"
                  value={item.cross_service.time_end}
                  onChange={e => onUpdate({ cross_service: { ...item.cross_service!, time_end: e.target.value } })}
                  className="bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-violet-500/50"
                />
              </div>
            </div>
            {/* Description */}
            <input
              type="text"
              value={item.cross_service.description}
              onChange={e => onUpdate({ cross_service: { ...item.cross_service!, description: e.target.value } })}
              placeholder="Что нужно сделать (для другой службы)"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-violet-500/50"
            />
          </div>
        )}
      </div>
    </div>
  )
}

// ── Small number input ─────────────────────────────────────────────────────

function NumberInput({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="text-[10px] text-white/40">{label}</span>
      <input
        type="number" min={0} max={50}
        value={value}
        onChange={e => onChange(Math.max(0, Number(e.target.value)))}
        className="w-14 bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-sm text-white text-center focus:outline-none focus:border-blue-500/50"
      />
    </div>
  )
}
